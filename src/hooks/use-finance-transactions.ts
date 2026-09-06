import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useDarazAccessToken } from "@/hooks/use-daraz-access-token";
import {
  ApiError,
  getFinancialTransactions,
  type TransactionDetailsResponse,
} from "@/lib/api";

type UseFinancialTransactionsParams = {
  startDate: string;
  endDate: string;
  page?: number;
  pageSize?: number;
};

type UseFinancialTransactionsResult = {
  data: TransactionDetailsResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useFinancialTransactions(
  params: UseFinancialTransactionsParams,
): UseFinancialTransactionsResult {
  const { accessToken } = useAuth();
  const {
    darazAccessToken,
    isLoading: isTokenLoading,
    error: tokenError,
  } = useDarazAccessToken();

  const [data, setData] = useState<TransactionDetailsResponse | null>(null);
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

    getFinancialTransactions(accessToken, darazAccessToken, params)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not load transactions.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, darazAccessToken, isTokenLoading, tokenError, params.startDate, params.endDate, params.page, params.pageSize, reloadKey]);

  return { data, isLoading: isTokenLoading || isLoading, error, refetch };
}
