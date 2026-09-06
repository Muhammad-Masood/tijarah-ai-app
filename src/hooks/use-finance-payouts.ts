import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useDarazAccessToken } from "@/hooks/use-daraz-access-token";
import {
  ApiError,
  getPayoutAnalytics,
  type PayoutAnalyticsResponse,
} from "@/lib/api";

type UsePayoutAnalyticsParams = {
  startDate: string;
  endDate: string;
};

type UsePayoutAnalyticsResult = {
  data: PayoutAnalyticsResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

export function usePayoutAnalytics(
  params: UsePayoutAnalyticsParams,
): UsePayoutAnalyticsResult {
  const { accessToken } = useAuth();
  const {
    darazAccessToken,
    isLoading: isTokenLoading,
    error: tokenError,
  } = useDarazAccessToken();

  const [data, setData] = useState<PayoutAnalyticsResponse | null>(null);
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

    getPayoutAnalytics(accessToken, darazAccessToken, params)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Could not load payout analytics.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, darazAccessToken, isTokenLoading, tokenError, params.startDate, params.endDate, reloadKey]);

  return { data, isLoading: isTokenLoading || isLoading, error, refetch };
}
