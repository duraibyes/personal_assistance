import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { api } from './api';

type Page<T> = { data: T[]; total: number; page: number; totalPages: number };

/**
 * Loads a paginated list endpoint (loans, expenses, incomes) with filters.
 * Empty filter values are dropped; `search` is debounced so typing doesn't fire a request per key.
 */
export function usePagedList<T>(path: string, filters: Record<string, string>, pageSize = 20) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [debounced, setDebounced] = useState(filters);
  const key = JSON.stringify(filters);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(JSON.parse(key)), 350);
    return () => clearTimeout(t);
  }, [key]);

  const request = useRef(0);
  const fetchPage = useCallback(
    async (pageNo: number) => {
      const params = new URLSearchParams({ page: String(pageNo), pageSize: String(pageSize) });
      Object.entries(debounced).forEach(([k, v]) => v && params.set(k, v));
      return api<Page<T>>(`${path}?${params.toString()}`);
    },
    [path, debounced, pageSize]
  );

  const reload = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      const ticket = ++request.current;
      if (mode === 'refresh') setRefreshing(true);
      try {
        const res = await fetchPage(1);
        if (ticket !== request.current) return;
        setItems(res.data || []);
        setTotal(res.total || 0);
        setPage(1);
        setTotalPages(res.totalPages || 1);
      } catch {
        if (ticket === request.current) setItems([]);
      } finally {
        if (ticket === request.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [fetchPage]
  );

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const loadMore = useCallback(async () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    try {
      const res = await fetchPage(page + 1);
      setItems((prev) => [...prev, ...(res.data || [])]);
      setPage(page + 1);
      setTotalPages(res.totalPages || 1);
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, loadingMore, page, totalPages]);

  return {
    items,
    total,
    loading,
    refreshing,
    loadingMore,
    hasMore: page < totalPages,
    refresh: () => reload('refresh'),
    loadMore,
  };
}
