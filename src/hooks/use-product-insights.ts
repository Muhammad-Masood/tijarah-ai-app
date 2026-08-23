import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useDarazAccessToken } from "@/hooks/use-daraz-access-token";
import {
  analyzeProductReviews,
  ApiError,
  getDarazReturnsInsights,
  type Product,
  type ReturnsInsights,
  type ReviewAnalysisResponse,
} from "@/lib/api";

function toDateParam(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type UseProductInsightsResult = {
  reviewAnalysis: ReviewAnalysisResponse | null;
  /** Message from a failed `analyze-reviews` call, independent of `returnsError` — one source failing shouldn't hide the other. */
  reviewError: string | null;
  /** This product's return/refund analytics, or `null` while unresolved or on failure. */
  returnsInsights: ReturnsInsights | null;
  /** Message from a failed `returns_insights` call. */
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
 * product's return/refund analytics (`GET /daraz/returns_insights`, scoped
 * to this product's Daraz item id). Both need a Daraz marketplace connection
 * and a real marketplace `url`, so this only produces data for Daraz-sourced
 * products.
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
  const [returnsInsights, setReturnsInsights] = useState<ReturnsInsights | null>(null);
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
      setReturnsInsights(null);
      setReturnsError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setReviewError(null);
    setReturnsError(null);

    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 30);

    Promise.allSettled([
      analyzeProductReviews(accessToken, { product_url: productUrl, product_name: productTitle ?? "" }),
      getDarazReturnsInsights(accessToken, darazAccessToken, {
        productId,
        startDate: toDateParam(startDate),
        endDate: toDateParam(endDate),
      }),
    ]).then(([analysisResult, returnsInsightsResult]) => {
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

      if (returnsInsightsResult.status === "fulfilled") {
        setReturnsInsights(returnsInsightsResult.value);
        setReturnsError(null);
      } else {
        setReturnsInsights(null);
        setReturnsError(
          returnsInsightsResult.reason instanceof ApiError
            ? returnsInsightsResult.reason.message
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
    returnsInsights,
    returnsError,
    isConnected,
    isLoading: isTokenLoading || isLoading,
    error: tokenError,
    refetch,
  };
}
