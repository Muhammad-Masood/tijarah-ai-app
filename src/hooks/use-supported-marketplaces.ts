import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { ApiError, getSupportedMarketplaces, type Marketplace } from '@/lib/api';

type UseSupportedMarketplacesResult = {
  marketplaces: Marketplace[];
  /** True while the request is in flight (including refetches). */
  isLoading: boolean;
  /** Human-readable message from the last failed request, if any. */
  error: string | null;
  refetch: () => void;
};

/** Fetches `GET /marketplace/` (Bearer-protected) for the signed-in user. */
export function useSupportedMarketplaces(): UseSupportedMarketplacesResult {
  const { accessToken } = useAuth();
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
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

    getSupportedMarketplaces(accessToken)
      .then((data) => {
        if (cancelled) return;
        setMarketplaces(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, reloadKey]);

  return { marketplaces, isLoading, error, refetch };
}
