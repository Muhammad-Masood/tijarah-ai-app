import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useDarazAccessToken } from "@/hooks/use-daraz-access-token";
import {
  ApiError,
  getFinancialDashboard,
  type FinancialDashboardResponse,
} from "@/lib/api";

type UseFinancialDashboardResult = {
  data: FinancialDashboardResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useFinancialDashboard(days = 30): UseFinancialDashboardResult {
  const { accessToken } = useAuth();
  const {
    darazAccessToken,
    isLoading: isTokenLoading,
    error: tokenError,
  } = useDarazAccessToken();

  const [data, setData] = useState<FinancialDashboardResponse | null>(null);
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
      setData(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getFinancialDashboard(accessToken, darazAccessToken, days)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not load financial dashboard.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, darazAccessToken, isTokenLoading, tokenError, days, reloadKey]);

  return { data, isLoading: isTokenLoading || isLoading, error, refetch };
}
