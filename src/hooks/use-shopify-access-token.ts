import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { ApiError, getMarketplaceConnections } from '@/lib/api';

export function useShopifyAccessToken() {
  const { accessToken } = useAuth();
  const [shopifyAccessToken, setShopifyAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const refetch = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setIsLoading(true); setError(null);
    getMarketplaceConnections(accessToken)
      .then((connections) => {
        if (cancelled) return;
        const connection = connections.find((item) => item.marketplace?.slug === 'shopify' && item.encrypted_access_token && item.marketplace.is_connected !== false);
        setShopifyAccessToken(connection?.encrypted_access_token ?? null);
      })
      .catch((err) => { if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not check the Shopify connection.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [accessToken, reloadKey]);

  return { shopifyAccessToken, isConnected: Boolean(shopifyAccessToken), isLoading, error, refetch };
}
