import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { ApiError, catalogSearch, type CatalogProductItem } from '@/lib/api';

const MAX_PAGES_PER_REQUEST = 1;

type UseCatalogSearchOptions = {
  query: string;
  enabled?: boolean;
  sortBy?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
};

type UseCatalogSearchResult = {
  products: CatalogProductItem[];
  totalProducts: number;
  totalPages: number;
  currentPage: number;
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

export function useCatalogSearch({
  query,
  enabled = true,
  sortBy = null,
  priceMin = null,
  priceMax = null,
}: UseCatalogSearchOptions): UseCatalogSearchResult {
  const { accessToken } = useAuth();
  const normalizedQuery = query.trim();
  const [products, setProducts] = useState<CatalogProductItem[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const inFlightRef = useRef(false);

  const hasMore = currentPage < totalPages;

  const fetchPage = useCallback(
    async (page: number, mode: 'replace' | 'append') => {
      if (!accessToken || !normalizedQuery || !enabled) return;
      if (inFlightRef.current) return;

      inFlightRef.current = true;
      const requestId = ++requestIdRef.current;

      if (mode === 'replace') setIsLoading(true);
      else setIsLoadingMore(true);
      setError(null);

      try {
        const response = await catalogSearch(accessToken, {
          query: normalizedQuery,
          page,
          max_pages: MAX_PAGES_PER_REQUEST,
          sort_by: sortBy,
          price_min: priceMin,
          price_max: priceMax,
        });

        if (requestId !== requestIdRef.current) return;

        setTotalProducts(response.total_products);
        setTotalPages(response.total_pages);
        setCurrentPage(response.page);

        setProducts((previous) =>
          dedupeCatalogProducts(mode === 'replace' ? response.products : [...previous, ...response.products]),
        );
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setError(err instanceof ApiError ? err.message : 'Could not search the catalog. Please try again.');
      } finally {
        if (requestId === requestIdRef.current) {
          inFlightRef.current = false;
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [accessToken, enabled, normalizedQuery, priceMax, priceMin, sortBy],
  );

  const refetch = useCallback(() => {
    setProducts([]);
    setCurrentPage(0);
    setTotalPages(1);
    setTotalProducts(0);
    void fetchPage(1, 'replace');
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading || isLoadingMore || !normalizedQuery) return;
    void fetchPage(currentPage + 1, 'append');
  }, [currentPage, fetchPage, hasMore, isLoading, isLoadingMore, normalizedQuery]);

  useEffect(() => {
    if (!enabled || !normalizedQuery) {
      setProducts([]);
      setCurrentPage(0);
      setTotalPages(1);
      setTotalProducts(0);
      setError(null);
      setIsLoading(false);
      setIsLoadingMore(false);
      return;
    }

    setProducts([]);
    setCurrentPage(0);
    setTotalPages(1);
    setTotalProducts(0);
    void fetchPage(1, 'replace');
  }, [enabled, fetchPage, normalizedQuery, priceMax, priceMin, sortBy]);

  return {
    products,
    totalProducts,
    totalPages,
    currentPage,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    refetch,
    loadMore,
  };
}
