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
};

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
