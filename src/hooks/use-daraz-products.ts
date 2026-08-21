import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import {
  ApiError,
  getDarazAllProducts,
  getMarketplaceConnections,
  type DarazRawProduct,
  type Product,
} from '@/lib/api';

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

  const rawPrice = firstSku?.price;
  const price = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice ?? '0')) || 0;

  const skuImages = firstSku?.Images as string[] | undefined;
  const productImages = raw.images as string[] | undefined;
  const image =
    (Array.isArray(skuImages) ? skuImages.find((url) => url) : undefined) ??
    (Array.isArray(productImages) ? productImages.find((url) => url) : undefined) ??
    '';

  // Prefer the English variant for this app's (English) UI when the listing has one.
  const title = attributes.name_en ?? attributes.name;
  const description = attributes.description_en ?? attributes.description;

  return {
    id: itemId != null ? String(itemId) : undefined,
    title: typeof title === 'string' && title ? title : `Daraz product ${itemId ?? ''}`.trim(),
    description: typeof description === 'string' ? description : '',
    price,
    image,
    category: 'Daraz',
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
  if (response && typeof response === 'object') {
    const body = response as Record<string, unknown>;
    const nested = (body.data as Record<string, unknown> | undefined)?.products;
    if (Array.isArray(nested)) return nested as DarazRawProduct[];
    if (Array.isArray(body.products)) return body.products as DarazRawProduct[];
  }
  return [];
}

/**
 * Resolves the merchant's Daraz connection from `GET /marketplace/connections`
 * and, if one exists, fetches its full catalog via `GET /daraz/get_all_products`
 * using the connection's stored access token.
 */
export function useDarazProducts(): UseDarazProductsResult {
  const { accessToken } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    // Session is still hydrating from SecureStore — wait for a token
    // rather than firing an unauthenticated request.
    if (!accessToken) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      const connections = await getMarketplaceConnections(accessToken);
      const darazConnection = connections.find(
        (connection) => connection.marketplace?.slug === 'daraz' && connection.encrypted_access_token,
      );

      if (cancelled) return;

      if (!darazConnection?.encrypted_access_token) {
        setIsConnected(false);
        setProducts([]);
        return;
      }

      setIsConnected(true);
      const response = await getDarazAllProducts(accessToken, darazConnection.encrypted_access_token);
      if (cancelled) return;

      setProducts(extractDarazProducts(response).map(mapDarazProduct));
    })()
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Could not load Daraz products. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, reloadKey]);

  return { products, isConnected, isLoading, error, refetch };
}
