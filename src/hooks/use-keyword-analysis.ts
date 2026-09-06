import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useDarazAccessToken } from '@/hooks/use-daraz-access-token';
import {
  analyzeKeywords,
  ApiError,
  type KeywordAnalysisProgressEvent,
  type KeywordAnalysisResult,
  type SeedKeyword,
  type UserProductInfo,
} from '@/lib/api';

export type KeywordAnalysisProgress = {
  userProduct: UserProductInfo | null;
  seedKeywords: SeedKeyword[];
  catalogSize: number | null;
  relevantProducts: number | null;
  candidateKeywords: number | null;
  clusterCount: number | null;
  communityCount: number | null;
  scoredCount: number | null;
  iterationsRun: number | null;
  finalCatalogSize: number | null;
};

const INITIAL_PROGRESS: KeywordAnalysisProgress = {
  userProduct: null,
  seedKeywords: [],
  catalogSize: null,
  relevantProducts: null,
  candidateKeywords: null,
  clusterCount: null,
  communityCount: null,
  scoredCount: null,
  iterationsRun: null,
  finalCatalogSize: null,
};

export type UseKeywordAnalysisResult = {
  result: KeywordAnalysisResult | null;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  /** The backend stage string currently executing (e.g. `building_catalog`). `null` before start / after completion. */
  currentStage: string | null;
  /** Incremental counters populated as SSE data events arrive. */
  progress: KeywordAnalysisProgress;
  refetch: () => void;
};

/**
 * Streams `POST /keyword-analysis` for a Daraz `item_id`.
 *
 * The hook resolves the Daraz marketplace access token, fires the SSE request,
 * and exposes incremental progress so the UI can render a stepper while the
 * pipeline runs (30–90 s). The final `result` is populated once the `result`
 * SSE event arrives.
 *
 * `enabled` (default `true`) lets callers defer the fetch until the screen is
 * actually visible. A `reloadKey` bump re-runs the analysis.
 */
export function useKeywordAnalysis(
  itemId: number | null,
  options?: { enabled?: boolean },
): UseKeywordAnalysisResult {
  const enabled = options?.enabled ?? true;
  const { accessToken } = useAuth();
  const {
    darazAccessToken,
    isLoading: isTokenLoading,
    refetch: refetchToken,
  } = useDarazAccessToken();

  const [result, setResult] = useState<KeywordAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [progress, setProgress] = useState<KeywordAnalysisProgress>(INITIAL_PROGRESS);
  const [reloadKey, setReloadKey] = useState(0);

  const fetchedKeyRef = useRef<string | null>(null);

  const refetch = useCallback(() => {
    refetchToken();
    setReloadKey((k) => k + 1);
  }, [refetchToken]);

  useEffect(() => {
    if (!enabled) return;
    if (!accessToken || isTokenLoading) return;
    if (itemId == null || !darazAccessToken) {
      setResult(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const fetchKey = `${itemId}:${reloadKey}`;
    if (fetchedKeyRef.current === fetchKey) return;
    fetchedKeyRef.current = fetchKey;

    let cancelled = false;
    setIsLoading(true);
    setIsStreaming(true);
    setResult(null);
    setError(null);
    setCurrentStage(null);
    setProgress(INITIAL_PROGRESS);

    analyzeKeywords(accessToken, darazAccessToken, { item_id: itemId }, {
      onProgress: (event: KeywordAnalysisProgressEvent) => {
        if (!cancelled) setCurrentStage(event.stage);
      },
      onProductFetched: (data) => {
        if (!cancelled) setProgress((p) => ({ ...p, userProduct: data.user_product }));
      },
      onSeedKeywords: (data) => {
        if (!cancelled) setProgress((p) => ({ ...p, seedKeywords: data.seed_keywords }));
      },
      onCatalogBuilt: (data) => {
        if (!cancelled) setProgress((p) => ({ ...p, catalogSize: data.total_catalog_size }));
      },
      onSimilarityFilterDone: (data) => {
        if (!cancelled) setProgress((p) => ({ ...p, relevantProducts: data.relevant_products }));
      },
      onKeywordsMined: (data) => {
        if (!cancelled) setProgress((p) => ({ ...p, candidateKeywords: data.candidate_keywords }));
      },
      onKeywordsClustered: (data) => {
        if (!cancelled) setProgress((p) => ({ ...p, clusterCount: data.cluster_count }));
      },
      onGraphBuilt: (data) => {
        if (!cancelled) setProgress((p) => ({ ...p, communityCount: data.community_count }));
      },
      onClustersScored: (data) => {
        if (!cancelled) setProgress((p) => ({ ...p, scoredCount: data.scored_count }));
      },
      onExpansionDone: (data) => {
        if (!cancelled) setProgress((p) => ({
          ...p,
          iterationsRun: data.iterations_run,
          finalCatalogSize: data.final_catalog_size,
        }));
      },
    })
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'Could not analyze keywords for this product. Please try again.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
          setIsStreaming(false);
          setCurrentStage(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, accessToken, darazAccessToken, isTokenLoading, itemId, reloadKey]);

  return {
    result,
    isLoading,
    isStreaming,
    error,
    currentStage,
    progress,
    refetch,
  };
}
