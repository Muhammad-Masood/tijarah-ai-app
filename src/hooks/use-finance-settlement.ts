import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useDarazAccessToken } from "@/hooks/use-daraz-access-token";
import {
  ApiError,
  getSettlementReconciliation,
  type ReconcileSettlementResponse,
} from "@/lib/api";

type UseSettlementReconciliationResult = {
  data: ReconcileSettlementResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useSettlementReconciliation(
  payoutId: string | null,
): UseSettlementReconciliationResult {
  const { accessToken } = useAuth();
  const {
    darazAccessToken,
    isLoading: isTokenLoading,
    error: tokenError,
  } = useDarazAccessToken();

  const [data, setData] = useState<ReconcileSettlementResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!accessToken || isTokenLoading || !payoutId) return;
    if (tokenError) {
      setError(tokenError);
      setIsLoading(false);
      return;
    }
    if (!darazAccessToken) {
      setData(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getSettlementReconciliation(accessToken, darazAccessToken, payoutId)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not load settlement reconciliation.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [accessToken, darazAccessToken, isTokenLoading, tokenError, payoutId, reloadKey]);

  return { data, isLoading: isTokenLoading || isLoading, error, refetch };
}
