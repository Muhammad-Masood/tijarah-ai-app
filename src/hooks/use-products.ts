import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { ApiError, getProducts, type Product } from "@/lib/api";

type UseProductsResult = {
  products: Product[];
  /** True while the request is in flight (including refetches). */
  isLoading: boolean;
  /** Human-readable message from the last failed request, if any. */
  error: string | null;
  refetch: () => void;
};

/** Fetches `GET /product/get_products` (Bearer-protected) for the signed-in merchant. */
export function useProducts(): UseProductsResult {
  const { accessToken } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
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

    getProducts(accessToken)
      .then((data) => {
        if (cancelled) return;
        setProducts(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Something went wrong. Please try again.",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, reloadKey]);

  return { products, isLoading, error, refetch };
}
