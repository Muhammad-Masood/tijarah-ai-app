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
  /** Message from a failed `analyze-reviews` call, independent of `returnsError` — one source failing shouldn't hide the other. */
  reviewError: string | null;
  /** This product's reverse/return orders, filtered client-side from the merchant-wide list. */
  returns: ReverseOrderData[];
  /** Message from a failed `get_all_reverse_orders_info` call. */
  returnsError: string | null;
  /** True once a Daraz connection with a stored access token was found for this merchant. */
  isConnected: boolean;
  /** True while resolving the connection and/or fetching insights (including refetches). */
  isLoading: boolean;
  /** Set only when the Daraz connection itself couldn't be resolved — both sources are then unavailable. */
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
 *
 * The two calls are independent (one can 500 — e.g. a product URL the
 * backend's scraper can't parse — while the other succeeds), so they're
 * fetched with `Promise.allSettled` and surface separate error states
 * instead of one failure blanking out data the other call already returned.
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
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [returns, setReturns] = useState<ReverseOrderData[]>([]);
  const [returnsError, setReturnsError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => {
    refetchToken();
    setReloadKey((key) => key + 1);
  }, [refetchToken]);

  const productId = product?.id;
  const productUrl = product?.url;
  const productTitle = product?.title;

  useEffect(() => {
    // Still resolving the connection — wait rather than firing early.
    if (!accessToken || isTokenLoading) return;

    if (tokenError) {
      setIsLoading(false);
      return;
    }

    if (!darazAccessToken || !productId || !productUrl) {
      setReviewAnalysis(null);
      setReviewError(null);
      setReturns([]);
      setReturnsError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setReviewError(null);
    setReturnsError(null);

    Promise.allSettled([
      analyzeProductReviews(accessToken, { product_url: productUrl, product_name: productTitle ?? "" }),
      getDarazAllReverseOrdersInfo(accessToken, darazAccessToken),
    ]).then(([analysisResult, reverseOrdersResult]) => {
      if (cancelled) return;

      if (analysisResult.status === "fulfilled") {
        setReviewAnalysis(analysisResult.value);
        setReviewError(null);
      } else {
        setReviewAnalysis(null);
        setReviewError(
          analysisResult.reason instanceof ApiError
            ? analysisResult.reason.message
            : "Could not analyze reviews for this product. Please try again.",
        );
      }

      if (reverseOrdersResult.status === "fulfilled") {
        setReturns(
          reverseOrdersResult.value
            .map((info) => info.data)
            .filter((data) =>
              data.reverseOrderLineDTOList.some(
                (line) => String(line.productDTO.product_id) === productId,
              ),
            ),
        );
        setReturnsError(null);
      } else {
        setReturns([]);
        setReturnsError(
          reverseOrdersResult.reason instanceof ApiError
            ? reverseOrdersResult.reason.message
            : "Could not load return data for this product. Please try again.",
        );
      }

      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [accessToken, darazAccessToken, isTokenLoading, tokenError, productId, productUrl, productTitle, reloadKey]);

  return {
    reviewAnalysis,
    reviewError,
    returns,
    returnsError,
    isConnected,
    isLoading: isTokenLoading || isLoading,
    error: tokenError,
    refetch,
  };
}
