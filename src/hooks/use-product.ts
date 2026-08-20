import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { ApiError, getProduct, type Product } from '@/lib/api';

type UseProductResult = {
  product: Product | null;
  /** True while the request is in flight (including refetches). */
  isLoading: boolean;
  /** Human-readable message from the last failed request, if any. */
  error: string | null;
  refetch: () => void;
};

/** Fetches `GET /product/get_product/{id}` (Bearer-protected) for a single product. */
export function useProduct(productId: string | undefined): UseProductResult {
  const { accessToken } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    if (!accessToken || !productId) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getProduct(accessToken, productId)
      .then((data) => {
        if (cancelled) return;
        setProduct(data);
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
  }, [accessToken, productId, reloadKey]);

  return { product, isLoading, error, refetch };
}
