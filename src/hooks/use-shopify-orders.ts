import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useShopifyAccessToken } from '@/hooks/use-shopify-access-token';
import { ApiError, getShopifyOrders, type ShopifyOrder } from '@/lib/api';

export function useShopifyOrders() {
  const { accessToken } = useAuth();
  const connection = useShopifyAccessToken();
  const [orders, setOrders] = useState<ShopifyOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const refetch = useCallback(() => { connection.refetch(); setReloadKey((key) => key + 1); }, [connection]);
  useEffect(() => {
    if (!accessToken || connection.isLoading) return;
    if (!connection.shopifyAccessToken) { setOrders([]); setIsLoading(false); return; }
    let cancelled = false; setIsLoading(true); setError(null);
    getShopifyOrders(accessToken, connection.shopifyAccessToken)
      .then((items) => { if (!cancelled) setOrders(items); })
      .catch((err) => { if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load Shopify orders.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [accessToken, connection.isLoading, connection.shopifyAccessToken, reloadKey]);
  return { orders, isConnected: connection.isConnected, isLoading: connection.isLoading || isLoading, error: connection.error ?? error, refetch };
}
