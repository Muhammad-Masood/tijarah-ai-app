import { Platform } from "react-native";

import { API_BASE_URL } from "@/constants/api";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Extracts a human-readable message from a FastAPI error body (401 `detail` string, 422 `HTTPValidationError`). */
function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return (
        detail
          .map((entry) =>
            entry && typeof entry === "object" && "msg" in entry
              ? String(entry.msg)
              : null,
          )
          .filter(Boolean)
          .join(" ") || fallback
      );
    }
    if (detail && typeof detail === "object") {
      const record = detail as Record<string, unknown>;
      const parts: string[] = [];
      if (typeof record.message === "string") parts.push(record.message);
      const nested = record.daraz_details;
      if (Array.isArray(nested)) {
        for (const entry of nested) {
          if (!entry || typeof entry !== "object") continue;
          const error = entry as Record<string, unknown>;
          const field = typeof error.field === "string" && error.field ? error.field + ": " : "";
          const message = typeof error.message === "string" ? error.message : "";
          const code = typeof error.code === "string" && error.code ? " (" + error.code + ")" : "";
          if (message) parts.push(field + message + code);
        }
      }
      return parts.join(" ") || fallback;
    }
  }
  return fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new ApiError(
      0,
      "Could not reach the server. Check your connection and try again.",
    );
  }

  const isJson = response.headers
    .get("content-type")
    ?.includes("application/json");
  const body = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      extractErrorMessage(body, `Request failed (${response.status})`),
    );
  }

  return body as T;
}

/** Parses one SSE frame and invokes `onEvent` when it carries a `data:` payload. */
function dispatchSSEFrame(frame: string, onEvent: (event: string, data: unknown) => void) {
  if (!frame.trim()) return;
  let eventName = "message";
  const dataLines: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) eventName = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return;
  const raw = dataLines.join("\n");
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    data = raw;
  }
  onEvent(eventName, data);
}

/** Drains complete SSE frames out of a growing text buffer. */
function drainSSEBuffer(buffer: string, onEvent: (event: string, data: unknown) => void): string {
  let frameEnd = buffer.indexOf("\n\n");
  while (frameEnd !== -1) {
    dispatchSSEFrame(buffer.slice(0, frameEnd), onEvent);
    buffer = buffer.slice(frameEnd + 2);
    frameEnd = buffer.indexOf("\n\n");
  }
  return buffer;
}

/**
 * Reads a `text/event-stream` body off `response.body`'s `ReadableStream`
 * reader and invokes `onEvent` per frame. Frames are separated by a blank
 * line; each frame may carry an `event:` line (defaults to `"message"`) and
 * one or more `data:` lines, which are joined and JSON-parsed.
 */
async function consumeSSEFromFetch(
  response: Response,
  onEvent: (event: string, data: unknown) => void,
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new ApiError(0, "Streaming isn't supported in this environment.");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    buffer = drainSSEBuffer(buffer, onEvent);
  }

  buffer += decoder.decode();
  dispatchSSEFrame(buffer, onEvent);
}

/**
 * React Native's `fetch` doesn't expose a streaming `response.body`, so we
 * drive SSE through `XMLHttpRequest.onprogress` instead — the same framing
 * parser as the web path, just fed incrementally from `responseText`.
 */
function consumeSSEViaXHR(
  url: string,
  init: RequestInit,
  onEvent: (event: string, data: unknown) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(init.method ?? "GET", url);
    xhr.setRequestHeader("Accept", "text/event-stream");

    const headers = init.headers;
    if (headers) {
      if (headers instanceof Headers) {
        headers.forEach((value, key) => xhr.setRequestHeader(key, value));
      } else if (Array.isArray(headers)) {
        for (const [key, value] of headers) xhr.setRequestHeader(key, value);
      } else {
        for (const [key, value] of Object.entries(headers)) xhr.setRequestHeader(key, value);
      }
    }

    let processedLength = 0;
    let buffer = "";

    const ingest = (chunk: string) => {
      if (!chunk) return;
      buffer += chunk;
      buffer = drainSSEBuffer(buffer, onEvent);
    };

    xhr.onprogress = () => {
      ingest(xhr.responseText.slice(processedLength));
      processedLength = xhr.responseText.length;
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        ingest(xhr.responseText.slice(processedLength));
        processedLength = xhr.responseText.length;
        dispatchSSEFrame(buffer, onEvent);
        resolve();
        return;
      }

      let message = `Request failed (${xhr.status})`;
      try {
        const body = JSON.parse(xhr.responseText);
        message = extractErrorMessage(body, message);
      } catch {
        // keep generic message
      }
      reject(new ApiError(xhr.status, message));
    };

    xhr.onerror = () => {
      reject(new ApiError(0, "Could not reach the server. Check your connection and try again."));
    };

    xhr.send((init.body as string | Document | FormData | null | undefined) ?? null);
  });
}

/** Extracts `{ detail }` from an SSE `error` event's payload, falling back to a generic message. */
function sseErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "detail" in data) {
    const detail = (data as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
  }
  return fallback;
}

async function requestSSE(
  path: string,
  init: RequestInit,
  onEvent: (event: string, data: unknown) => void,
): Promise<void> {
  const url = `${API_BASE_URL}${path}`;

  // RN's fetch has no ReadableStream body — XHR `onprogress` is the portable path.
  if (Platform.OS !== "web") {
    await consumeSSEViaXHR(url, init, onEvent);
    return;
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new ApiError(
      0,
      "Could not reach the server. Check your connection and try again.",
    );
  }

  if (!response.ok) {
    const isJson = response.headers
      .get("content-type")
      ?.includes("application/json");
    const body = isJson ? await response.json().catch(() => null) : null;
    throw new ApiError(
      response.status,
      extractErrorMessage(body, `Request failed (${response.status})`),
    );
  }

  await consumeSSEFromFetch(response, onEvent);
}

/**
 * Drives an SSE request that resolves with a `"complete"` event's payload
 * (rejecting on an `"error"` event, a request-level failure, or the stream
 * ending without either). `onEvent` handles every other named event so
 * callers can surface incremental progress.
 */
function streamToResult<T>(
  path: string,
  init: RequestInit,
  onEvent: (event: string, data: unknown) => void,
  fallbackErrorMessage: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;

    requestSSE(path, init, (event, data) => {
      if (settled) return;
      if (event === "complete") {
        settled = true;
        resolve(data as T);
      } else if (event === "error") {
        settled = true;
        reject(new ApiError(0, sseErrorMessage(data, fallbackErrorMessage)));
      } else {
        onEvent(event, data);
      }
    })
      .then(() => {
        if (!settled) reject(new ApiError(0, "Stream ended without a result."));
      })
      .catch((err) => {
        if (!settled) reject(err instanceof ApiError ? err : new ApiError(0, fallbackErrorMessage));
      });
  });
}

export type UserRole = "admin" | "user";

export type MerchantCreate = {
  full_name: string;
  business_name: string;
  email: string;
  password: string;
  phone_number?: string | null;
};

export type MerchantRead = {
  id: string;
  full_name: string;
  business_name: string;
  email: string;
  role: UserRole;
  phone_number?: string | null;
};

export type Token = {
  access_token: string;
  token_type: string;
};

// `GET /auth/me` returns `MerchantRead` directly — the backend only has a
// merchant auth flow (`/auth/signup`, `/auth/login`, `/auth/me`), no
// customer login exists.
export type CurrentUserResponse = MerchantRead;

export function signupMerchant(data: MerchantCreate): Promise<MerchantRead> {
  return request<MerchantRead>("/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function loginMerchant(email: string, password: string): Promise<Token> {
  const form = new URLSearchParams();
  form.set("grant_type", "password");
  form.set("username", email);
  form.set("password", password);

  return request<Token>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
}

export function getMe(accessToken: string): Promise<CurrentUserResponse> {
  return request<CurrentUserResponse>("/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export type Marketplace = {
  id: string;
  name: string;
  slug: string;
  url: string;
  logo_url: string;
  is_connected?: boolean;
};

export function getSupportedMarketplaces(accessToken: string): Promise<Marketplace[]> {
  return request<Marketplace[]>("/marketplace/", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export type MarketplaceConnection = {
  id: string;
  marketplace_id: string;
  merchant_id: string;
  connected_at: string;
  encrypted_access_token?: string | null;
  marketplace?: Marketplace | null;
};

export function getMarketplaceConnections(accessToken: string): Promise<MarketplaceConnection[]> {
  return request<MarketplaceConnection[]>("/marketplace/connections", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// `GET /daraz/get_auth_code` is Bearer-protected and responds with a 302 to
// Daraz's OAuth authorize page (built from server-side `DARAZ_APP_KEY`/
// `APP_CALLBACK_URL`). `fetch` follows that redirect itself, so the
// authorize URL is just the final `response.url` — no need to parse a
// `Location` header (unreliable across RN's fetch redirect modes).
export async function getDarazAuthorizeUrl(accessToken: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/daraz/get_auth_code`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    throw new ApiError(
      0,
      "Could not reach the server. Check your connection and try again.",
    );
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      `Could not start the Daraz connection (${response.status}).`,
    );
  }

  return response.url;
}

// `GET /shopify/get_auth_code?shop=<shop-domain>` is Bearer-protected and
// responds with a 302 to Shopify's OAuth authorize page. `fetch` follows
// redirects, so the final authorize URL is available at `response.url`.
export async function getShopifyAuthorizeUrl(
  accessToken: string,
  shop: string,
): Promise<string> {
  const normalizedShop = shop.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  if (!normalizedShop) {
    throw new ApiError(400, "Shop domain is required.");
  }

  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}/shopify/get_auth_code?shop=${encodeURIComponent(normalizedShop)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    console.log('response', response);
  } catch {
    throw new ApiError(
      0,
      "Could not reach the server. Check your connection and try again.",
    );
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      `Could not start the Shopify connection (${response.status}).`,
    );
  }

  return response.url;
}

// `GET /daraz/get_all_products` declares an untyped (`{}`) response body in
// the backend's schema (no `response_model` set) — it's the raw pass-through
// of Daraz's Open Platform `GetProducts` response (confirmed field names via
// open.daraz.com's API reference for `/products/get`: `item_id`,
// `primary_category`, `attributes`, `skus`, `images`, `status`,
// `created_time`, `updated_time`, wrapped as `{ data: { products: [...] } }`).
// The backend's own wrapping isn't confirmed, so callers should still read
// fields defensively — see `mapDarazProduct` in `use-daraz-products.ts`.
export type DarazRawProduct = Record<string, unknown>;

/** `darazAccessToken` is a connection's `encrypted_access_token` from `GET /marketplace/connections`. */
export function getDarazAllProducts(
  accessToken: string,
  darazAccessToken: string,
): Promise<unknown> {
  return request<unknown>("/daraz/get_all_products", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-daraz-access-token": darazAccessToken,
    },
  });
}

// Confirmed against `GET /openapi.json` on the running backend — the real
// `Product` schema has no `stock`/`cost`/channel-availability fields, and
// the field is `title`, not `name`. `create_product`/`update_product`/
// `get_product/{id}`/`get_products`/`delete_product/{id}` all declare an
// untyped (`{}`) response body in the schema (no `response_model` set on
// the backend), so the response types below are a reasonable inference
// (the backend echoing back the resource), not schema-guaranteed.
export type Product = {
  /** Absent on create; required (embedded in the body, not a path param) for update. */
  id?: string | null;
  title: string;
  price: number;
  description: string;
  image: string;
  category: string;
  /**
   * Full image gallery, when the source has more than one photo (e.g. a
   * Daraz listing's `images`/SKU images). Falls back to `[image]` when
   * absent — the local product backend only stores a single `image`.
   */
  images?: string[];
  /** Present for Daraz-sourced products only (from `attributes.brand`). */
  brand?: string;
  /** Present for Daraz-sourced products only (from `attributes.model`). */
  model?: string;
  /** Present for Daraz-sourced products only (from `attributes.warranty_type`). */
  warrantyType?: string;
  /** Present for Daraz-sourced products only — summed SKU quantity. */
  stockQuantity?: number;
  url: string;
  platform?: ProductPlatform;
};

export type ProductPlatform = "daraz" | "shopify";

export type ListingDraft = {
  title: string;
  description: string;
  category: string;
  price: number;
  imageUri: string;
  attributes?: Record<string, string>;
};

export type ExpoMarketplaceImageAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
  assetId?: string | null;
};

export type UploadedMarketplaceImageResponse = {
  path: string;
  public_url: string;
  content_type: string;
  size: number;
};

export type DarazProductAttribute = {
  name?: string | null;
  title?: string | null;
  [key: string]: string | number | boolean | null | undefined;
};

export type DarazProductSku = {
  SellerSku: string;
  [key: string]: unknown;
  color_family?: string;
  size?: string;
  quantity: number;
  price: number;
  package_length: number;
  package_height: number;
  package_weight: number;
  package_width: number;
  package_content: string;
  Images: string[];
};

export type DarazCreateProductPayload = {
  PrimaryCategory: number | string;
  Title: string;
  Images: string[];
  Attributes: DarazProductAttribute;
  Skus: DarazProductSku[];
};

export type DarazCreateProductResponse = {
  item_id?: string | number | null;
  sku_id?: string | number | null;
  status?: string | null;
  message?: string | null;
  code?: string | null;
  request_id?: string | null;
  data?: Record<string, unknown> | null;
};

export type DarazUploadImagesResult = {
  uploaded: UploadedMarketplaceImageResponse[];
  failed: { index: number; image: ExpoMarketplaceImageAsset; error: string }[];
};

/** Typed boundary for marketplace features not exposed by the current backend. */
export class UnsupportedBackendCapabilityError extends ApiError {
  constructor(capability: string) {
    super(501, `${capability} is not available in the connected backend yet.`);
    this.name = "UnsupportedBackendCapabilityError";
  }
}

export type GenerateListingRequest = {
  primary_category_id: number;
  image_urls: string[];
  attributes: DarazCategoryAttribute[];
  title_hint?: string | null;
  brand_hint?: string | null;
};

export type GeneratedListingSku = {
  SellerSku?: string | null;
  quantity?: number | null;
  price?: number | null;
  package_length?: number | null;
  package_height?: number | null;
  package_weight?: number | null;
  package_width?: number | null;
  package_content?: string | null;
  color_family?: string | null;
  size?: string | null;
  Images?: string[];
};

export type GeneratedListingDraft = {
  Title?: string | null;
  PrimaryCategory: number;
  Images: string[];
  Attributes: Record<string, string | null>;
  Skus: GeneratedListingSku[];
};

export type GeneratedFieldMetadata = {
  name: string;
  value?: string | null;
  source: "vision" | "user_required" | "skipped";
  confidence?: number | null;
};

export type GenerateListingResponse = {
  draft: GeneratedListingDraft;
  filled: GeneratedFieldMetadata[];
  user_required: string[];
  vision_skipped: string[];
};

export function generateProductListing(
  accessToken: string,
  data: GenerateListingRequest,
): Promise<GenerateListingResponse> {
  return request<GenerateListingResponse>("/product-listing/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
}
export type DarazCategory = {
  id?: string | number | null;
  name?: string | null;
  category_id?: string | number | null;
  category_name?: string | null;
  parent_id?: string | number | null;
  children?: DarazCategory[] | null;
  leaf?: boolean | null;
  status?: string | null;
  is_active?: boolean | null;
};

function normalizeDarazCategory(raw: unknown): DarazCategory | null {
  if (!raw || typeof raw !== "object") return null;

  const item = raw as Record<string, unknown>;
  const id = item.id ?? item.category_id ?? item.categoryId ?? item.categoryid ?? null;
  const name =
    item.name ??
    item.category_name ??
    item.categoryName ??
    item.category ??
    item.title ??
    item.label ??
    null;

  if (id == null && name == null) return null;

  const parentId = item.parent_id ?? item.parentId ?? item.parentID ?? null;
  const safeParentId = typeof parentId === "string" || typeof parentId === "number" ? parentId : null;

  return {
    id: id == null ? undefined : String(id),
    name: typeof name === "string" ? name : name == null ? undefined : String(name),
    category_id: id == null ? undefined : String(id),
    category_name: typeof name === "string" ? name : name == null ? undefined : String(name),
    parent_id: safeParentId,
    children: Array.isArray(item.children) ? item.children.map(normalizeDarazCategory).filter(Boolean) as DarazCategory[] : undefined,
    leaf: typeof item.leaf === "boolean" ? item.leaf : null,
    status: typeof item.status === "string" ? item.status : null,
    is_active: typeof item.is_active === "boolean" ? item.is_active : null,
  };
}

function isLiveDarazCategory(category: DarazCategory): boolean {
  return category.is_active !== false && !["inactive", "disabled", "deleted"].includes(category.status?.toLowerCase() ?? "");
}

function normalizeDarazCategoryList(response: unknown): DarazCategory[] {
  if (Array.isArray(response)) {
    return (response.map(normalizeDarazCategory).filter(Boolean) as DarazCategory[]).filter(isLiveDarazCategory);
  }

  if (response && typeof response === "object") {
    const body = response as Record<string, unknown>;
    const nestedData = body.data && typeof body.data === "object" ? (body.data as Record<string, unknown>) : undefined;
    const directCandidates: unknown[] = [
      body.categories,
      body.data,
      body.result,
      body.items,
      body.category_list,
      body.categoryList,
      nestedData?.categories,
    ];

    for (const candidate of directCandidates) {
      if (Array.isArray(candidate)) {
        return (candidate.map(normalizeDarazCategory).filter(Boolean) as DarazCategory[]).filter(isLiveDarazCategory);
      }
      if (candidate && typeof candidate === "object") {
        const nested = candidate as Record<string, unknown>;
        const nestedList = nested.categories ?? nested.items ?? nested.data ?? nested.result;
        if (Array.isArray(nestedList)) {
          return (nestedList.map(normalizeDarazCategory).filter(Boolean) as DarazCategory[]).filter(isLiveDarazCategory);
        }
      }
    }
  }

  return [];
}

export function getDarazAllCategories(accessToken: string): Promise<DarazCategory[]> {
  return request<unknown>("/daraz/get_all_categories", {
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then((response) => normalizeDarazCategoryList(response));
}

export type DarazCategoryAttributeOption = {
  name: string;
};

export type DarazCategoryAttribute = {
  id?: string | number | null;
  name: string;
  label: string;
  is_mandatory: string | number | boolean;
  is_sale_prop: string | number | boolean;
  input_type: string;
  attribute_type?: string | null;
  options: DarazCategoryAttributeOption[];
};

function normalizeDarazCategoryAttributes(response: unknown): DarazCategoryAttribute[] {
  if (!response || typeof response !== "object") return [];
  const data = (response as Record<string, unknown>).data;
  if (!Array.isArray(data)) return [];
  const normalized = data.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (!name) return [];
    const options = Array.isArray(item.options)
      ? item.options.flatMap((option) =>
          option && typeof option === "object" && typeof (option as Record<string, unknown>).name === "string"
            ? [{ name: String((option as Record<string, unknown>).name) }]
            : [],
        )
      : [];
    return [{
      id: typeof item.id === "string" || typeof item.id === "number" ? item.id : null,
      name,
      label: typeof item.label === "string" && item.label.trim() ? item.label.trim() : name,
      is_mandatory: typeof item.is_mandatory === "string" || typeof item.is_mandatory === "number" || typeof item.is_mandatory === "boolean" ? item.is_mandatory : 0,
      is_sale_prop: typeof item.is_sale_prop === "string" || typeof item.is_sale_prop === "number" || typeof item.is_sale_prop === "boolean" ? item.is_sale_prop : 0,
      input_type: typeof item.input_type === "string" ? item.input_type : "text",
      attribute_type: typeof item.attribute_type === "string" ? item.attribute_type : null,
      options,
    }];
  });

  const seen = new Set<string>();
  return normalized.filter((attribute) => {
    const identity = attribute.id != null ? `id:${String(attribute.id)}` : `name:${attribute.name}`;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

export function getDarazCategoryAttributes(accessToken: string, darazAccessToken: string, categoryId: string): Promise<DarazCategoryAttribute[]> {
  return request<unknown>("/daraz/get_category_attributes?primary_category_id=" + encodeURIComponent(categoryId) + "&language_code=en_US", {
    headers: { Authorization: "Bearer " + accessToken, "x-daraz-access-token": darazAccessToken },
  }).then(normalizeDarazCategoryAttributes);
}

function extractNestedString(value: unknown, keys: string[]): string | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim().length > 0) return candidate.trim();
  }

  for (const key of ["data", "result", "response", "payload", "image"]) {
    const nested = record[key];
    const nestedValue = nested && typeof nested === "object" ? extractNestedString(nested, keys) : null;
    if (nestedValue) return nestedValue;
  }

  return null;
}

function normalizeHttpsUrl(value: string, label: string): string {
  const candidate = value.trim();
  if (!candidate) throw new ApiError(400, `${label} is missing.`);
  if (!/^https:\/\//i.test(candidate)) {
    throw new ApiError(400, `${label} must be a public HTTPS URL.`);
  }
  return candidate;
}

function normalizePublicHttpsUrl(value: string, label: string): string {
  const candidate = normalizeHttpsUrl(value, label);
  if (!candidate.includes("/product-images/")) {
    throw new ApiError(400, `${label} must point to the public product-images bucket.`);
  }
  return candidate;
}

export function uploadMarketplaceProductImage(
  accessToken: string,
  marketplace: ProductPlatform,
  image: ExpoMarketplaceImageAsset,
): Promise<UploadedMarketplaceImageResponse> {
  if (!image?.uri) {
    throw new ApiError(400, "Select an image before uploading it.");
  }

  const mimeType = image.mimeType ?? "image/jpeg";
  if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(mimeType)) {
    throw new ApiError(400, "Unsupported image type. Use JPEG, PNG, or WebP.");
  }

  const size = image.fileSize ?? 0;
  if (size <= 0) {
    throw new ApiError(400, "The selected image is empty. Please choose a valid file.");
  }
  if (size > 5 * 1024 * 1024) {
    throw new ApiError(400, "The selected image is too large. Keep it under 5 MB.");
  }

  const sanitizedName = (image.fileName ?? "product-image")
    .split(/[\\/]/)
    .pop()
    ?.replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "") || "product-image";

  const formData = new FormData();
  const fileValue = {
    uri: image.uri,
    name: sanitizedName || "product-image",
    type: mimeType,
  } as any;
  formData.append("file", fileValue);
  formData.append("marketplace", marketplace);

  return request<UploadedMarketplaceImageResponse>("/storage/product-images", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  }).then((response) => {
    const publicUrl = extractNestedString(response, ["public_url", "publicUrl", "url", "image_url", "imageUrl"]) ?? "";
    if (!publicUrl) {
      throw new ApiError(400, "The upload succeeded but the backend did not return a public image URL.");
    }

    return { ...response, path: response.path ?? "", public_url: normalizePublicHttpsUrl(publicUrl, "Uploaded image URL") };
  });
}

export async function uploadMarketplaceProductImages(
  accessToken: string,
  marketplace: ProductPlatform,
  images: ExpoMarketplaceImageAsset[],
  onProgress?: (completed: number, total: number) => void,
): Promise<DarazUploadImagesResult> {
  const uploaded: UploadedMarketplaceImageResponse[] = [];
  const failed: DarazUploadImagesResult["failed"] = [];

  for (const [index, image] of images.entries()) {
    try {
      const result = await uploadMarketplaceProductImage(accessToken, marketplace, image);
      uploaded.push(result);
    } catch (error) {
      failed.push({
        index,
        image,
        error: error instanceof ApiError ? error.message : "The image upload failed.",
      });
    } finally {
      onProgress?.(index + 1, images.length);
    }
  }

  return { uploaded, failed };
}

export function cleanupMarketplaceProductImages(accessToken: string, paths: string[]): Promise<{ deleted: string[] }> {
  return request<{ deleted: string[] }>("/storage/product-images/cleanup", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ paths }),
  });
}

export function migrateDarazImage(
  accessToken: string,
  darazAccessToken: string,
  imageUrl: string,
): Promise<{ imageUrl: string }> {
  const normalizedImageUrl = normalizePublicHttpsUrl(imageUrl, "Daraz migration input");

  return request<unknown>("/daraz/migrate_image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "x-daraz-access-token": darazAccessToken,
    },
    body: JSON.stringify({ image_url: normalizedImageUrl }),
  }).then((response) => {
    const migratedUrl = extractNestedString(response, ["migrated_url", "migratedUrl", "image_url", "imageUrl", "url", "public_url"]);
    if (!migratedUrl || migratedUrl === normalizedImageUrl) {
      throw new ApiError(502, "Daraz did not return a migrated image URL.");
    }

    return { imageUrl: normalizeHttpsUrl(migratedUrl, "Daraz migrated image URL") };
  });
}

function normalizeDarazCreateProductResponse(response: unknown): DarazCreateProductResponse {
  if (!response || typeof response !== "object") {
    return { message: "Daraz product creation returned an unexpected empty response." };
  }

  const record = response as Record<string, unknown>;
  const nestedData = record.data && typeof record.data === "object" ? (record.data as Record<string, unknown>) : null;
  const itemId =
    record.item_id ??
    record.itemId ??
    (nestedData && "item_id" in nestedData ? nestedData.item_id : null) ??
    null;

  const rawSkuId =
    record.sku_id ??
    (nestedData && "sku_id" in nestedData ? nestedData.sku_id : null) ??
    null;

  return {
    item_id: itemId == null ? null : String(itemId),
    sku_id: typeof rawSkuId === "string" || typeof rawSkuId === "number" ? rawSkuId : null,
    status: typeof record.status === "string" ? record.status : undefined,
    message: typeof record.message === "string" ? record.message : undefined,
    code: typeof record.code === "string" ? record.code : undefined,
    request_id: typeof record.request_id === "string" ? record.request_id : undefined,
    data: record.data && typeof record.data === "object" ? (record.data as Record<string, unknown>) : undefined,
  };
}

export function createNewDarazProduct(
  accessToken: string,
  darazAccessToken: string,
  data: DarazCreateProductPayload,
): Promise<DarazCreateProductResponse> {
  return request<unknown>("/daraz/create_new_product", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "x-daraz-access-token": darazAccessToken,
    },
    body: JSON.stringify(data),
  }).then((response) => {
    const normalized = normalizeDarazCreateProductResponse(response);
    if (normalized.code && normalized.code !== "0") {
      throw new ApiError(422, normalized.message || `Daraz rejected product creation (code ${normalized.code}).`);
    }
    if (!normalized.item_id) {
      throw new ApiError(502, normalized.message || "Daraz did not return a product item ID.");
    }
    return normalized;
  });
}

export type ShopifyMediaInput = {
  originalSource: string;
  alt?: string | null;
  mediaContentType?: string;
};
export type ShopifyTaxonomyCategory = { id: string; name: string; fullName?: string | null };
export type ShopifyCollection = { id: string; title: string; handle?: string | null; description?: string | null; image?: string | null };
export type ShopifyVariant = { id: string; title: string; price?: string | null; inventoryQuantity?: number | null };
export type ShopifyProduct = {
  id: string;
  title: string;
  handle?: string | null;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  description?: string | null;
  productType?: string | null;
  totalInventory?: number | null;
  tags: string[];
  category?: { id: string; name: string } | null;
  images: { src: string; altText?: string | null }[];
  variants: ShopifyVariant[];
};
export type ShopifyProductCreate = {
  title: string;
  descriptionHtml: string;
  vendor?: string | null;
  tags?: string[] | null;
  collectionsToJoin?: string[] | null;
  category?: string | null;
  inventory: number;
  price: string;
  images?: ShopifyMediaInput[] | null;
};
export type ConnectedStorePublishResult = {
  connection_id: string;
  marketplace_id: string;
  marketplace: string;
  store_identifier: string;
  success: boolean;
  result?: Record<string, unknown> | null;
  error?: string | null;
};
export type PublishConnectedProductResponse = {
  results: ConnectedStorePublishResult[];
  succeeded: number;
  failed: number;
};
export type ShopifyOrder = {
  id: string;
  name: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  processedAt?: string | null;
  displayFinancialStatus?: string | null;
  displayFulfillmentStatus?: string | null;
  totalAmount?: string | null;
  currencyCode?: string | null;
  customer?: { id?: string | null; displayName?: string | null; email?: string | null } | null;
  lineItems: { id: string; title: string; quantity: number; price?: string | null; currency?: string | null }[];
};

function shopifyHeaders(accessToken: string, shopifyAccessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}`, "x-shopify-access-token": shopifyAccessToken };
}

export function getShopifyProducts(accessToken: string, shopifyAccessToken: string): Promise<ShopifyProduct[]> {
  return request<{ products: ShopifyProduct[] }>("/shopify/get_all_products", { headers: shopifyHeaders(accessToken, shopifyAccessToken) }).then((body) => body.products ?? []);
}
export function getShopifyProductById(accessToken: string, shopifyAccessToken: string, productId: string): Promise<ShopifyProduct | null> {
  return request<{ product?: ShopifyProduct | null }>(`/shopify/get_product_by_id?product_id=${encodeURIComponent(productId)}`, { headers: shopifyHeaders(accessToken, shopifyAccessToken) }).then((body) => body.product ?? null);
}
export function getShopifyCategories(accessToken: string, shopifyAccessToken: string): Promise<ShopifyTaxonomyCategory[]> {
  return request<{ categories: ShopifyTaxonomyCategory[] }>("/shopify/get_all_categories", { headers: shopifyHeaders(accessToken, shopifyAccessToken) }).then((body) => body.categories ?? []);
}
export function getShopifySubcategories(accessToken: string, shopifyAccessToken: string, categoryId: string): Promise<ShopifyTaxonomyCategory[]> {
  return request<{ categories: ShopifyTaxonomyCategory[] }>(`/shopify/get_subcategories/${encodeURIComponent(categoryId)}`, { headers: shopifyHeaders(accessToken, shopifyAccessToken) }).then((body) => body.categories ?? []);
}
export function getShopifyCollections(accessToken: string, shopifyAccessToken: string): Promise<ShopifyCollection[]> {
  return request<{ collections: ShopifyCollection[] }>("/shopify/get_all_collections", { headers: shopifyHeaders(accessToken, shopifyAccessToken) }).then((body) => body.collections ?? []);
}
export function getShopifyOrders(accessToken: string, shopifyAccessToken: string): Promise<ShopifyOrder[]> {
  return request<{ orders: ShopifyOrder[] }>("/shopify/get_all_orders", { headers: shopifyHeaders(accessToken, shopifyAccessToken) }).then((body) => body.orders ?? []);
}
export function createShopifyProduct(accessToken: string, shopifyAccessToken: string, data: ShopifyProductCreate): Promise<unknown> {
  return request<unknown>("/shopify/create_new_product", {
    method: "POST",
    headers: { ...shopifyHeaders(accessToken, shopifyAccessToken), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
export function publishToConnectedStores(accessToken: string, data: { shopify?: ShopifyProductCreate; daraz?: DarazCreateProductPayload }): Promise<PublishConnectedProductResponse> {
  return request<PublishConnectedProductResponse>("/marketplace/publish-to-connected-stores", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function getProducts(accessToken: string): Promise<Product[]> {
  return request<Product[]>("/product/get_products", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getProduct(accessToken: string, productId: string): Promise<Product> {
  return request<Product>(`/product/get_product/${productId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/** `id` is intentionally omitted from the body — the backend assigns it. */
export function createProduct(
  accessToken: string,
  data: Omit<Product, "id">,
): Promise<Product> {
  return request<Product>("/product/create_product", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });
}

/** There is no `/product/update_product/{id}` route — the id goes in the body. */
export function updateProduct(accessToken: string, data: Product): Promise<Product> {
  return request<Product>("/product/update_product", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });
}

export function deleteProduct(accessToken: string, productId: string): Promise<void> {
  return request<void>(`/product/delete_product/${productId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// Confirmed against `GET /openapi.json`: `ReverseOrderLineProduct.product_id`
// is the same id as a Daraz item's `item_id` (i.e. `Product.id` for a
// Daraz-sourced product from `mapDarazProduct`), so callers can filter this
// endpoint's merchant-wide list down to one product's returns client-side.
export type ReverseOrderLineProduct = {
  product_id: number;
  sku: string;
};

export type ReverseOrderLine = {
  reverse_order_line_id: number;
  trade_order_line_id: number;
  platform_sku_id: string;
  seller_sku_id: string;
  productDTO: ReverseOrderLineProduct;
  reason_code: number;
  reason_text: string;
  reverse_status: string;
  ofc_status: string;
  is_need_refund: boolean;
  is_dispute: boolean;
  item_unit_price: number;
  refund_amount: number;
  refund_payment_method: string;
  tracking_number: string;
};

export type ReverseOrderData = {
  reverse_order_id: number;
  trade_order_id: number;
  request_type: string;
  shipping_type: string;
  is_rtm: boolean;
  reverseOrderLineDTOList: ReverseOrderLine[];
};

export type ReverseOrderInfo = {
  data: ReverseOrderData;
  code: string;
};

/** `darazAccessToken` is a connection's `encrypted_access_token` from `GET /marketplace/connections`. */
export function getDarazAllReverseOrdersInfo(
  accessToken: string,
  darazAccessToken: string,
): Promise<ReverseOrderInfo[]> {
  return request<ReverseOrderInfo[]>("/daraz/get_all_reverse_orders_info", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-daraz-access-token": darazAccessToken,
    },
  });
}

export type ReturnReasonBreakdown = {
  reason: string;
  count: number;
  percentage: number;
  likely_cause: string;
};

export type ReturnsMonthlyTrendEntry = {
  month: string;
  returns_count: number;
};

export type ReturnsInsights = {
  scope: string;
  product_id: number;
  product_sku_id: string | null;
  date_range: { start_date: string; end_date: string };
  total_units_sold: number;
  total_units_returned: number;
  overall_return_rate: number;
  total_refund_amount: number;
  dispute_rate: number;
  refund_request_rate: number;
  return_reason_breakdown: ReturnReasonBreakdown[];
  monthly_trend: ReturnsMonthlyTrendEntry[];
  recommendations: string[];
};

export type ReturnsInsightsProgressEvent =
  | { stage: "fetching_returns" }
  | { stage: "fetched_returns"; count: number }
  | { stage: "fetching_orders" }
  | { stage: "fetched_orders"; count: number };

export type ReturnsInsightsStreamHandlers = {
  onProgress?: (event: ReturnsInsightsProgressEvent) => void;
};

/**
 * `product_id` is a Daraz item id (same id space as `Product.id` /
 * `ReverseOrderLineProduct.product_id`). `product_sku_id`/`start_date`/
 * `end_date` are optional — the backend defaults `date_range` to a trailing
 * window (a month, per the sample response) when omitted.
 *
 * Requested as an SSE stream (`?stream=true`): `progress` events report
 * fetch stages as they happen, and the final `ReturnsInsights` arrives on
 * `complete` — see `streamToResult`.
 */
export function getDarazReturnsInsights(
  accessToken: string,
  darazAccessToken: string,
  params: { productId: string; productSkuId?: string; startDate?: string; endDate?: string },
  handlers?: ReturnsInsightsStreamHandlers,
): Promise<ReturnsInsights> {
  const query = new URLSearchParams({ product_id: params.productId, stream: "true" });
  if (params.productSkuId) query.set("product_sku_id", params.productSkuId);
  if (params.startDate) query.set("start_date", params.startDate);
  if (params.endDate) query.set("end_date", params.endDate);

  return streamToResult<ReturnsInsights>(
    `/daraz/returns_insights?${query.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-daraz-access-token": darazAccessToken,
      },
    },
    (event, data) => {
      if (event === "progress") handlers?.onProgress?.(data as ReturnsInsightsProgressEvent);
    },
    "Could not load return data for this product. Please try again.",
  );
}

export type AnalysisRequest = {
  product_url: string;
  product_name: string;
};

export type ActionItem = {
  issue: string;
  severity: string;
  affected_review_count: number;
  recommendation: string;
};

export type ClusterDebugEntry = {
  size: number;
  label: string;
};

export type ReviewAnalysisResponse = {
  sentiment_score: number;
  /** Keyed by month (`YYYY-MM`), value is the average rating that month. */
  rating_trend: Record<string, number>;
  summary: string;
  topics: string[];
  action_plan: ActionItem[];
  cluster_debug: Record<string, ClusterDebugEntry>;
};

export type ReviewAnalysisScoreEvent = {
  sentiment_score: number;
  /** Same shape as `ReviewAnalysisResponse.rating_trend` — keyed by `YYYY-MM`. */
  rating_trend: Record<string, number>;
};

export type ReviewAnalysisProgressEvent =
  | { stage: "deduped"; review_count: number }
  | { stage: "clustered"; cluster_count: number };

export type ReviewAnalysisClusterEvent = {
  label: string;
  size: number;
  topic_label: string;
  sentiment: number;
  key_points: string[];
};

export type ReviewAnalysisStreamHandlers = {
  /** Fires once, before clustering, with a preliminary score. */
  onScore?: (event: ReviewAnalysisScoreEvent) => void;
  onProgress?: (event: ReviewAnalysisProgressEvent) => void;
  /** Fires once per topic cluster as the pipeline finishes it. */
  onCluster?: (event: ReviewAnalysisClusterEvent) => void;
};

/**
 * Requested as an SSE stream (`stream: true` in the body): `score` arrives
 * early, `progress`/`cluster` events report pipeline stages as they happen,
 * and the final `ReviewAnalysisResponse` arrives on `complete` — see
 * `streamToResult`.
 */
export function analyzeProductReviews(
  accessToken: string,
  data: AnalysisRequest,
  handlers?: ReviewAnalysisStreamHandlers,
): Promise<ReviewAnalysisResponse> {
  return streamToResult<ReviewAnalysisResponse>(
    "/reviews/analyze-reviews",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ ...data, stream: true }),
    },
    (event, payload) => {
      if (event === "score") handlers?.onScore?.(payload as ReviewAnalysisScoreEvent);
      else if (event === "progress") handlers?.onProgress?.(payload as ReviewAnalysisProgressEvent);
      else if (event === "cluster") handlers?.onCluster?.(payload as ReviewAnalysisClusterEvent);
    },
    "Could not analyze reviews for this product. Please try again.",
  );
}
