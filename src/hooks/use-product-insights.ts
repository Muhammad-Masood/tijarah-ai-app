import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useDarazAccessToken } from "@/hooks/use-daraz-access-token";
import {
  analyzeProductReviews,
  ApiError,
  getDarazAllReverseOrdersInfo,
  type Product,
  type ReverseOrderData,
  type ReviewAnalysisResponse,
} from "@/lib/api";

type UseProductInsightsResult = {
  reviewAnalysis: ReviewAnalysisResponse | null;
  /** This product's reverse/return orders, filtered client-side from the merchant-wide list. */
  returns: ReverseOrderData[];
  /** True once a Daraz connection with a stored access token was found for this merchant. */
  isConnected: boolean;
  /** True while resolving the connection and/or fetching insights (including refetches). */
  isLoading: boolean;
  /** Human-readable message from the last failed request, if any. */
  error: string | null;
  refetch: () => void;
};

/**
 * Loads AI review analysis (`POST /reviews/analyze-reviews`) and this
 * product's return/reverse orders (`GET /daraz/get_all_reverse_orders_info`,
 * which returns every reverse order for the merchant — filtered down here by
 * matching `productDTO.product_id` against the product's Daraz item id).
 * Both need a Daraz marketplace connection and a real marketplace `url`, so
 * this only produces data for Daraz-sourced products.
 */
export function useProductInsights(product: Product | null): UseProductInsightsResult {
  const { accessToken } = useAuth();
  const {
    darazAccessToken,
    isConnected,
    isLoading: isTokenLoading,
    error: tokenError,
    refetch: refetchToken,
  } = useDarazAccessToken();
  const [reviewAnalysis, setReviewAnalysis] = useState<ReviewAnalysisResponse | null>(null);
  const [returns, setReturns] = useState<ReverseOrderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => {
    refetchToken();
    setReloadKey((key) => key + 1);
  }, [refetchToken]);

  const productId = product?.id;
  const productUrl = product?.url;
  const productTitle = product?.title;
  console.log("🚀 ~ useProductInsights ~ productId:", productId, productUrl, productTitle)

  useEffect(() => {
    // Still resolving the connection — wait rather than firing early.
    if (!accessToken || isTokenLoading) return;

    if (tokenError) {
      setError(tokenError);
      setIsLoading(false);
      return;
    }

    if (!darazAccessToken || !productId || !productUrl) {
      setReviewAnalysis(null);
      setReturns([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([
      analyzeProductReviews(accessToken, { product_url: productUrl, product_name: productTitle ?? "" }),
      getDarazAllReverseOrdersInfo(accessToken, darazAccessToken),
    ])
      .then(([analysis, reverseOrders]) => {
        console.log("🚀 ~ useProductInsights ~ analysis:", analysis)
        if (cancelled) return;
        setReviewAnalysis(analysis);
        setReturns(
          reverseOrders
            .map((info) => info.data)
            .filter((data) =>
              data.reverseOrderLineDTOList.some(
                (line) => String(line.productDTO.product_id) === productId,
              ),
            ),
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Could not load insights. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, darazAccessToken, isTokenLoading, tokenError, productId, productUrl, productTitle, reloadKey]);

  return { reviewAnalysis, returns, isConnected, isLoading: isTokenLoading || isLoading, error, refetch };
}
