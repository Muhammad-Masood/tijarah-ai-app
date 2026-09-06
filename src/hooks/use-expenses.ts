import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import {
  ApiError,
  createProductExpense,
  deleteProductExpense,
  getProductExpenses,
  updateProductExpense,
  type ProductExpenseCreate,
  type ProductExpenseRead,
  type ProductExpenseUpdate,
} from '@/lib/api';

type UseExpensesResult = {
  expenses: ProductExpenseRead[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  addExpense: (data: ProductExpenseCreate) => Promise<ProductExpenseRead>;
  editExpense: (id: string, data: ProductExpenseUpdate) => Promise<ProductExpenseRead>;
  removeExpense: (id: string) => Promise<void>;
};

/**
 * CRUD hook for product expenses. Fetches the merchant's expense list on
 * mount and exposes `addExpense` / `editExpense` / `removeExpense` helpers
 * that optimistically refresh the list after a successful mutation.
 */
export function useExpenses(params?: { platform?: string; sku_id?: string }): UseExpensesResult {
  const { accessToken } = useAuth();
  const [expenses, setExpenses] = useState<ProductExpenseRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  // --- fetch ---
  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);

    getProductExpenses(accessToken, params)
      .then((data) => {
        if (!cancelled) setExpenses(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Could not load expenses.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, reloadKey, params?.platform, params?.sku_id]);

  // --- create ---
  const addExpense = useCallback(
    async (data: ProductExpenseCreate): Promise<ProductExpenseRead> => {
      if (!accessToken) throw new ApiError(0, 'Not authenticated.');
      const created = await createProductExpense(accessToken, data);
      setExpenses((prev) => [created, ...prev]);
      return created;
    },
    [accessToken],
  );

  // --- update ---
  const editExpense = useCallback(
    async (id: string, data: ProductExpenseUpdate): Promise<ProductExpenseRead> => {
      if (!accessToken) throw new ApiError(0, 'Not authenticated.');
      const updated = await updateProductExpense(accessToken, id, data);
      setExpenses((prev) => prev.map((e) => (e.id === id ? updated : e)));
      return updated;
    },
    [accessToken],
  );

  // --- delete ---
  const removeExpense = useCallback(
    async (id: string): Promise<void> => {
      if (!accessToken) throw new ApiError(0, 'Not authenticated.');
      await deleteProductExpense(accessToken, id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    },
    [accessToken],
  );

  return { expenses, isLoading, error, refetch, addExpense, editExpense, removeExpense };
}
