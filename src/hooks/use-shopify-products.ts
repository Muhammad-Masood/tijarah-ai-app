import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useShopifyAccessToken } from '@/hooks/use-shopify-access-token';
import { ApiError, getShopifyProducts, type Product, type ShopifyProduct } from '@/lib/api';

export function mapShopifyProduct(raw: ShopifyProduct): Product {
  const images = raw.images.map((image) => image.src).filter(Boolean);
  const firstVariant = raw.variants[0];
  const price = Number(firstVariant?.price ?? 0);
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? '',
    price: Number.isFinite(price) ? price : 0,
    image: images[0] ?? '', images,
    category: raw.category?.name ?? raw.productType ?? 'Shopify',
    stockQuantity: raw.totalInventory ?? firstVariant?.inventoryQuantity ?? undefined,
    url: '', platform: 'shopify',
  };
}

export function useShopifyProducts() {
  const { accessToken } = useAuth();
  const connection = useShopifyAccessToken();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const refetch = useCallback(() => { connection.refetch(); setReloadKey((key) => key + 1); }, [connection]);

  useEffect(() => {
    if (!accessToken || connection.isLoading) return;
    if (!connection.shopifyAccessToken) { setProducts([]); setIsLoading(false); return; }
    let cancelled = false;
    setIsLoading(true); setError(null);
    getShopifyProducts(accessToken, connection.shopifyAccessToken)
      .then((items) => { if (!cancelled) setProducts(items.map(mapShopifyProduct)); })
      .catch((err) => { if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load Shopify products.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [accessToken, connection.isLoading, connection.shopifyAccessToken, reloadKey]);

  return { products, isConnected: connection.isConnected, isLoading: connection.isLoading || isLoading, error: connection.error ?? error, refetch };
}
