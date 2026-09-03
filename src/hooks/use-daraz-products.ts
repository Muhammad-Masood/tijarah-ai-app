import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useDarazAccessToken } from "@/hooks/use-daraz-access-token";
import { ApiError, dedupeProductsById, getDarazAllProducts, type DarazRawProduct, type Product } from "@/lib/api";

type UseDarazProductsResult = {
  /** Daraz catalog items, normalized to the same shape as the local `Product` list. */
  products: Product[];
  /** True once a Daraz connection with a stored access token was found for this merchant. */
  isConnected: boolean;
  /** True while resolving the connection and/or fetching products (including refetches). */
  isLoading: boolean;
  /** Human-readable message from the last failed request, if any. */
  error: string | null;
  refetch: () => void;
};

/**
 * Mapping from Daraz's Open Platform `GetProducts` item shape to our
 * `Product` type. Confirmed field-by-field against a live sample response
 * from this backend's `/daraz/get_all_products`: `{ data: { products: [...] } }`,
 * each item has `item_id`, `attributes` (`name`/`description` plus an
 * English variant, `name_en`/`description_en`, when the store's listing was
 * localized — other keys are category-specific), and a `skus` array whose
 * entries have lowercase `price`/`special_price` and a capitalized `Images`
 * array (frequently empty in practice; the product-level `images` array is
 * the reliable fallback).
 */
function mapDarazProduct(raw: DarazRawProduct): Product {
  const itemId = raw.item_id;
  const attributes = (raw.attributes ?? {}) as Record<string, unknown>;
  const skus = raw.skus as Record<string, unknown>[] | undefined;
  const firstSku = Array.isArray(skus) ? skus[0] : undefined;

  const rawPrice = firstSku?.special_price ?? firstSku?.price;
  const price =
    typeof rawPrice === "number"
      ? rawPrice
      : parseFloat(String(rawPrice ?? "0")) || 0;

  const skuImages = firstSku?.Images as string[] | undefined;
  const productImages = raw.images as string[] | undefined;

  // Gallery = product-level images first (the reliable source), then any
  // SKU images not already included, de-duplicated and stripped of blanks.
  const images = Array.from(
    new Set(
      [
        ...(Array.isArray(productImages) ? productImages : []),
        ...(Array.isArray(skuImages) ? skuImages : []),
      ].filter(
        (url): url is string => typeof url === "string" && url.length > 0,
      ),
    ),
  );
  const image = images[0] ?? "";

  // Prefer the English variant for this app's (English) UI when the listing has one.
  const title = attributes.name_en ?? attributes.name;
  const description = attributes.description_en ?? attributes.description;
  const brand = attributes.brand;
  const model = attributes.model;
  const warrantyType = attributes.warranty_type;

  const readNumericValue = (...values: unknown[]): number | null => {
    for (const value of values) {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string") {
        const parsed = Number.parseFloat(value);
        if (Number.isFinite(parsed)) return parsed;
      }
    }
    return null;
  };

  const rating = readNumericValue(
    attributes.rating_score,
    attributes.ratingScore,
    attributes.average_rating,
    attributes.averageRating,
    attributes.rating,
    raw.rating_score,
    raw.ratingScore,
    raw.average_rating,
    raw.averageRating,
  );
  const reviewCount = readNumericValue(
    attributes.review_count,
    attributes.reviewCount,
    attributes.reviews,
    raw.review_count,
    raw.reviewCount,
    raw.reviews,
  );

  const stockQuantity = Array.isArray(skus)
    ? skus.reduce((total, sku) => {
      const quantity = sku.quantity ?? sku.Available;
      return total + (typeof quantity === "number" ? quantity : 0);
    }, 0)
    : undefined;

  const url = (firstSku?.Url as string) ?? null;

  return {
    id: itemId != null ? String(itemId) : undefined,
    title:
      typeof title === "string" && title
        ? title
        : `Daraz product ${itemId ?? ""}`.trim(),
    description: typeof description === "string" ? description : "",
    price,
    image,
    images,
    category: raw.primary_category_name as string,
    rating,
    reviewCount: reviewCount != null ? Math.round(reviewCount) : undefined,
    brand: typeof brand === "string" && brand ? brand : undefined,
    model: typeof model === "string" && model ? model : undefined,
    warrantyType:
      typeof warrantyType === "string" && warrantyType
        ? warrantyType
        : undefined,
    stockQuantity,
    url,
  };
}

/**
 * Extracts the product-item array out of `/daraz/get_all_products`'s untyped
 * response body. Daraz's own `GetProducts` wraps the array as
 * `{ data: { products: [...] } }`; checked first, then looser shapes in case
 * the backend unwraps a level before passing the response through.
 */
function extractDarazProducts(response: unknown): DarazRawProduct[] {
  if (Array.isArray(response)) return response as DarazRawProduct[];
  if (response && typeof response === "object") {
    const body = response as Record<string, unknown>;
    const nested = (body.data as Record<string, unknown> | undefined)?.products;
    if (Array.isArray(nested)) return nested as DarazRawProduct[];
    if (Array.isArray(body.products)) return body.products as DarazRawProduct[];
  }
  return [];
}

/**
 * Resolves the merchant's Daraz connection via `useDarazAccessToken` and, if
 * one exists, fetches its full catalog via `GET /daraz/get_all_products`
 * using the connection's stored access token.
 */
export function useDarazProducts(): UseDarazProductsResult {
  const { accessToken } = useAuth();
  const {
    darazAccessToken,
    isConnected,
    isLoading: isTokenLoading,
    error: tokenError,
    refetch: refetchToken,
  } = useDarazAccessToken();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => {
    refetchToken();
    setReloadKey((key) => key + 1);
  }, [refetchToken]);

  useEffect(() => {
    // Still resolving the connection — wait rather than firing early.
    if (!accessToken || isTokenLoading) return;

    if (tokenError) {
      setError(tokenError);
      setIsLoading(false);
      return;
    }

    if (!darazAccessToken) {
      setProducts([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getDarazAllProducts(accessToken, darazAccessToken)
      .then((response) => {
        if (cancelled) return;
        setProducts(dedupeProductsById(extractDarazProducts(response).map(mapDarazProduct)));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not load Daraz products. Please try again.",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, darazAccessToken, isTokenLoading, tokenError, reloadKey]);

  return { products, isConnected, isLoading: isTokenLoading || isLoading, error, refetch };
}
