import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { ApiError, productHunt, type CatalogFilterOption, type CatalogProductItem } from '@/lib/api';

export const CATALOG_HUNT_PAGE_SIZE = 12;

type UseProductHuntOptions = {
  niche: string;
  enabled?: boolean;
  maxPages?: number;
  minRating?: number;
  minReviews?: number;
  maxPrice?: number | null;
};

type UseProductHuntResult = {
  products: CatalogProductItem[];
  visibleProducts: CatalogProductItem[];
  subcategories: CatalogFilterOption[];
  totalScraped: number;
  totalRecommended: number;
  visibleCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  refetch: () => void;
  loadMore: () => void;
};

function dedupeCatalogProducts(products: CatalogProductItem[]): CatalogProductItem[] {
  const seen = new Set<string>();
  return products.filter((product) => {
    if (!product.item_id || seen.has(product.item_id)) return false;
    seen.add(product.item_id);
    return true;
  });
}

export function useProductHunt({
  niche,
  enabled = true,
  maxPages = 3,
  minRating = 0,
  minReviews = 0,
  maxPrice = null,
}: UseProductHuntOptions): UseProductHuntResult {
  const { accessToken } = useAuth();
  const normalizedNiche = niche.trim();
  const [products, setProducts] = useState<CatalogProductItem[]>([]);
  const [subcategories, setSubcategories] = useState<CatalogFilterOption[]>([]);
  const [totalScraped, setTotalScraped] = useState(0);
  const [totalRecommended, setTotalRecommended] = useState(0);
  const [visibleCount, setVisibleCount] = useState(CATALOG_HUNT_PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const visibleProducts = products.slice(0, visibleCount);
  const hasMore = visibleCount < products.length;

  const fetchHunt = useCallback(async () => {
    if (!accessToken || !normalizedNiche || !enabled) return;

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    setVisibleCount(CATALOG_HUNT_PAGE_SIZE);

    try {
      const response = await productHunt(accessToken, {
        niche: normalizedNiche,
        max_pages: maxPages,
        min_rating: minRating,
        min_reviews: minReviews,
        max_price: maxPrice,
      });

      if (requestId !== requestIdRef.current) return;

      setProducts(dedupeCatalogProducts(response.recommended_products));
      setSubcategories(response.subcategories);
      setTotalScraped(response.total_scraped);
      setTotalRecommended(response.total_recommended);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setProducts([]);
      setSubcategories([]);
      setTotalScraped(0);
      setTotalRecommended(0);
      setError(err instanceof ApiError ? err.message : 'Could not load recommendations. Please try again.');
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [accessToken, enabled, maxPages, maxPrice, minRating, minReviews, normalizedNiche]);

  const refetch = useCallback(() => {
    void fetchHunt();
  }, [fetchHunt]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading || isLoadingMore) return;
    setIsLoadingMore(true);
    setVisibleCount((count) => Math.min(count + CATALOG_HUNT_PAGE_SIZE, products.length));
    setIsLoadingMore(false);
  }, [hasMore, isLoading, isLoadingMore, products.length]);

  useEffect(() => {
    if (!enabled || !normalizedNiche) {
      setProducts([]);
      setSubcategories([]);
      setTotalScraped(0);
      setTotalRecommended(0);
      setVisibleCount(CATALOG_HUNT_PAGE_SIZE);
      setError(null);
      setIsLoading(false);
      return;
    }

    void fetchHunt();
  }, [enabled, fetchHunt, normalizedNiche, maxPages, minRating, minReviews, maxPrice]);

  return {
    products,
    visibleProducts,
    subcategories,
    totalScraped,
    totalRecommended,
    visibleCount,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    refetch,
    loadMore,
  };
}
