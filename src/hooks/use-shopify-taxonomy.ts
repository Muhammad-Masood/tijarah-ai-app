import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useShopifyAccessToken } from '@/hooks/use-shopify-access-token';
import { ApiError, getShopifyCategories, getShopifyCollections, getShopifySubcategories, type ShopifyCollection, type ShopifyTaxonomyCategory } from '@/lib/api';

export function useShopifyTaxonomy(enabled = true) {
  const { accessToken } = useAuth();
  const connection = useShopifyAccessToken();
  const [categories, setCategories] = useState<ShopifyTaxonomyCategory[]>([]);
  const [collections, setCollections] = useState<ShopifyCollection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const refetch = useCallback(() => { connection.refetch(); setReloadKey((key) => key + 1); }, [connection]);

  useEffect(() => {
    if (!enabled || !accessToken || connection.isLoading) return;
    if (!connection.shopifyAccessToken) { setCategories([]); setCollections([]); setIsLoading(false); return; }
    let cancelled = false;
    setIsLoading(true); setError(null);
    Promise.all([
      getShopifyCategories(accessToken, connection.shopifyAccessToken),
      getShopifyCollections(accessToken, connection.shopifyAccessToken),
    ]).then(([nextCategories, nextCollections]) => {
      if (!cancelled) { setCategories(nextCategories); setCollections(nextCollections); }
    }).catch((err) => { if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load Shopify categories.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [accessToken, connection.isLoading, connection.shopifyAccessToken, enabled, reloadKey]);

  const getSubcategories = useCallback(async (categoryId: string) => {
    if (!accessToken || !connection.shopifyAccessToken) return [];
    return getShopifySubcategories(accessToken, connection.shopifyAccessToken, categoryId);
  }, [accessToken, connection.shopifyAccessToken]);

  return { categories, collections, getSubcategories, isConnected: connection.isConnected, isLoading: connection.isLoading || isLoading, error: connection.error ?? error, refetch };
}
