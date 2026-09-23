import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export type ListQueryState = {
  page: number;
  limit: number;
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  period: string;
  from: string;
  to: string;
  status: string;
  branchId: string;
  [key: string]: string | number;
};

type UseListQueryParamsOptions = {
  defaults?: Partial<ListQueryState>;
  extraKeys?: string[];
};

function readNumber(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function useListQueryParams(options: UseListQueryParamsOptions = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaults = options.defaults ?? {};
  const extraKeys = options.extraKeys ?? [];

  const state = useMemo(() => {
    const next: ListQueryState = {
      page: readNumber(searchParams.get('page'), Number(defaults.page ?? 1)),
      limit: readNumber(searchParams.get('limit'), Number(defaults.limit ?? 20)),
      search: searchParams.get('search') ?? String(defaults.search ?? ''),
      sortBy: searchParams.get('sortBy') ?? String(defaults.sortBy ?? ''),
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || (defaults.sortOrder as 'asc' | 'desc') || 'desc',
      period: searchParams.get('period') ?? String(defaults.period ?? 'all'),
      from: searchParams.get('from') ?? String(defaults.from ?? ''),
      to: searchParams.get('to') ?? String(defaults.to ?? ''),
      status: searchParams.get('status') ?? String(defaults.status ?? ''),
      branchId: searchParams.get('branchId') ?? String(defaults.branchId ?? '')
    };
    for (const key of extraKeys) {
      next[key] = searchParams.get(key) ?? String(defaults[key] ?? '');
    }
    return next;
  }, [defaults, extraKeys, searchParams]);

  const setMany = useCallback(
    (patch: Partial<ListQueryState>, options?: { resetPage?: boolean }) => {
      const next = new URLSearchParams(searchParams);
      const resetPage = options?.resetPage !== false;
      const merged = { ...state, ...patch } as ListQueryState;
      if (resetPage && patch.page === undefined) {
        merged.page = 1;
      }

      const write = (key: string, value: string | number | undefined, fallback: string | number = '') => {
        const normalized = value === undefined || value === null ? '' : String(value).trim();
        const fallbackValue = String(fallback ?? '').trim();
        if (!normalized || normalized === fallbackValue) {
          next.delete(key);
        } else {
          next.set(key, normalized);
        }
      };

      write('page', merged.page, 1);
      write('limit', merged.limit, defaults.limit ?? 20);
      write('search', merged.search, '');
      write('sortBy', merged.sortBy, defaults.sortBy ?? '');
      write('sortOrder', merged.sortOrder, defaults.sortOrder ?? 'desc');
      write('period', merged.period, 'all');
      write('from', merged.from, '');
      write('to', merged.to, '');
      write('status', merged.status, '');
      write('branchId', merged.branchId, '');
      for (const key of extraKeys) {
        write(key, merged[key] as string | number, defaults[key] ?? '');
      }

      setSearchParams(next, { replace: true });
    },
    [defaults, extraKeys, searchParams, setSearchParams, state]
  );

  const clearAll = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  const apiParams = useMemo(() => {
    const params: Record<string, string | number> = {
      page: state.page,
      limit: state.limit
    };
    if (state.search) params.search = state.search;
    if (state.sortBy) {
      params.sortBy = state.sortBy;
      params.sortOrder = state.sortOrder;
    }
    if (state.period && state.period !== 'all' && state.period !== 'custom') params.period = state.period;
    if (state.from) params.from = state.from;
    if (state.to) params.to = state.to;
    if (state.status) params.status = state.status;
    if (state.branchId) params.branchId = state.branchId;
    for (const key of extraKeys) {
      const value = state[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        params[key] = value as string | number;
      }
    }
    return params;
  }, [extraKeys, state]);

  const activeCount = useMemo(() => {
    let count = 0;
    if (state.search) count += 1;
    if (state.status) count += 1;
    if (state.branchId) count += 1;
    if (state.period && state.period !== 'all') count += 1;
    if (state.from || state.to) count += 1;
    if (state.sortBy) count += 1;
    for (const key of extraKeys) {
      if (String(state[key] ?? '').trim()) count += 1;
    }
    return count;
  }, [extraKeys, state]);

  return { state, setMany, clearAll, apiParams, activeCount, searchParams };
}
