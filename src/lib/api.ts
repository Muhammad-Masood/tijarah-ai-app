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

/**
 * `product_id` is a Daraz item id (same id space as `Product.id` /
 * `ReverseOrderLineProduct.product_id`). `product_sku_id`/`start_date`/
 * `end_date` are optional — the backend defaults `date_range` to a trailing
 * window (a month, per the sample response) when omitted.
 */
export function getDarazReturnsInsights(
  accessToken: string,
  darazAccessToken: string,
  params: { productId: string; productSkuId?: string; startDate?: string; endDate?: string },
): Promise<ReturnsInsights> {
  const query = new URLSearchParams({ product_id: params.productId });
  if (params.productSkuId) query.set("product_sku_id", params.productSkuId);
  if (params.startDate) query.set("start_date", params.startDate);
  if (params.endDate) query.set("end_date", params.endDate);

  return request<ReturnsInsights>(`/daraz/returns_insights?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-daraz-access-token": darazAccessToken,
    },
  });
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

export function analyzeProductReviews(
  accessToken: string,
  data: AnalysisRequest,
): Promise<ReviewAnalysisResponse> {
  return request<ReviewAnalysisResponse>("/reviews/analyze-reviews", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });
}
