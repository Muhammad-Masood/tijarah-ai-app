import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { ApiError, getMarketplaceConnections } from "@/lib/api";

type UseDarazAccessTokenResult = {
  /** The connection's stored access token, once resolved; `null` if there's no Daraz connection. */
  darazAccessToken: string | null;
  /** True once a Daraz connection with a stored access token was found for this merchant. */
  isConnected: boolean;
  /** True while resolving the connection (including refetches). */
  isLoading: boolean;
  /** Human-readable message from the last failed request, if any. */
  error: string | null;
  refetch: () => void;
};

/** Resolves the merchant's Daraz connection token from `GET /marketplace/connections`, shared by every Daraz-backed hook. */
export function useDarazAccessToken(): UseDarazAccessTokenResult {
  const { accessToken } = useAuth();
  const [darazAccessToken, setDarazAccessToken] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
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

    getMarketplaceConnections(accessToken)
      .then((connections) => {
        if (cancelled) return;
        const darazConnection = connections.find(
          (connection) => connection.marketplace?.slug === "daraz" && connection.encrypted_access_token,
        );
        setIsConnected(!!darazConnection);
        setDarazAccessToken(darazConnection?.encrypted_access_token ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not check the Daraz connection. Please try again.",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, reloadKey]);

  return { darazAccessToken, isConnected, isLoading, error, refetch };
}
