import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useDarazAccessToken } from "@/hooks/use-daraz-access-token";
import {
  ApiError,
  getCashFlow,
  type CashFlowEntry,
} from "@/lib/api";

type UseCashFlowResult = {
  data: CashFlowEntry[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useCashFlow(days = 30): UseCashFlowResult {
  const { accessToken } = useAuth();
  const {
    darazAccessToken,
    isLoading: isTokenLoading,
    error: tokenError,
  } = useDarazAccessToken();

  const [data, setData] = useState<CashFlowEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!accessToken || isTokenLoading) return;
    if (tokenError) {
      setError(tokenError);
      setIsLoading(false);
      return;
    }
    if (!darazAccessToken) {
      setData([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getCashFlow(accessToken, darazAccessToken, days)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Could not load cash flow data.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [accessToken, darazAccessToken, isTokenLoading, tokenError, days, reloadKey]);

  return { data, isLoading: isTokenLoading || isLoading, error, refetch };
}
