/**
 * Shared list-query helpers for server-side pagination, search, sorting,
 * multi-select, and date-period filters.
 */

export type QuickDatePeriod =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_week'
  | 'previous_week'
  | 'this_month'
  | 'previous_month'
  | 'this_quarter'
  | 'previous_quarter'
  | 'q1'
  | 'q2'
  | 'q3'
  | 'q4'
  | 'this_year'
  | 'previous_year'
  | 'custom';

export type ListSortOrder = 'asc' | 'desc';

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  next.setDate(next.getDate() + diff);
  return next;
}

function endOfWeek(date: Date) {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return endOfDay(end);
}

function quarterBounds(year: number, quarter: 1 | 2 | 3 | 4) {
  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1, 0, 0, 0, 0);
  const end = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);
  return { start, end };
}

export function resolveQuickDatePeriod(period: string | undefined | null, now = new Date()): { start?: Date; end?: Date } | null {
  const normalized = String(period || 'all').trim().toLowerCase() as QuickDatePeriod;
  if (!normalized || normalized === 'all' || normalized === 'custom') {
    return null;
  }

  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  switch (normalized) {
    case 'today':
      return { start: todayStart, end: todayEnd };
    case 'yesterday': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 1);
      return { start, end: endOfDay(start) };
    }
    case 'last_7_days': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 6);
      return { start, end: todayEnd };
    }
    case 'last_30_days': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 29);
      return { start, end: todayEnd };
    }
    case 'this_week':
      return { start: startOfWeek(now), end: endOfWeek(now) };
    case 'previous_week': {
      const start = startOfWeek(now);
      start.setDate(start.getDate() - 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { start, end: endOfDay(end) };
    }
    case 'this_month':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
        end: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0))
      };
    case 'previous_month':
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0),
        end: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0))
      };
    case 'this_quarter': {
      const q = (Math.floor(now.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
      return quarterBounds(now.getFullYear(), q);
    }
    case 'previous_quarter': {
      const current = Math.floor(now.getMonth() / 3) + 1;
      const previous = current === 1 ? 4 : ((current - 1) as 1 | 2 | 3 | 4);
      const year = current === 1 ? now.getFullYear() - 1 : now.getFullYear();
      return quarterBounds(year, previous);
    }
    case 'q1':
      return quarterBounds(now.getFullYear(), 1);
    case 'q2':
      return quarterBounds(now.getFullYear(), 2);
    case 'q3':
      return quarterBounds(now.getFullYear(), 3);
    case 'q4':
      return quarterBounds(now.getFullYear(), 4);
    case 'this_year':
      return {
        start: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
        end: endOfDay(new Date(now.getFullYear(), 11, 31))
      };
    case 'previous_year':
      return {
        start: new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0),
        end: endOfDay(new Date(now.getFullYear() - 1, 11, 31))
      };
    default:
      return null;
  }
}

export function parseIsoDateBoundary(value: unknown, boundary: 'start' | 'end'): Date | undefined {
  const raw = String(value || '').trim();
  if (!raw) return undefined;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return boundary === 'start' ? startOfDay(parsed) : endOfDay(parsed);
}

export function buildMongoDateRange(input: {
  period?: string | null;
  from?: unknown;
  to?: unknown;
  now?: Date;
}): { $gte?: Date; $lte?: Date } | undefined {
  const fromCustom = parseIsoDateBoundary(input.from, 'start');
  const toCustom = parseIsoDateBoundary(input.to, 'end');
  if (fromCustom || toCustom) {
    if (fromCustom && toCustom && fromCustom > toCustom) {
      throw Object.assign(new Error('Start date must be before or equal to end date'), { statusCode: 400 });
    }
    return {
      ...(fromCustom ? { $gte: fromCustom } : {}),
      ...(toCustom ? { $lte: toCustom } : {})
    };
  }

  const periodRange = resolveQuickDatePeriod(input.period, input.now);
  if (!periodRange?.start && !periodRange?.end) return undefined;
  return {
    ...(periodRange.start ? { $gte: periodRange.start } : {}),
    ...(periodRange.end ? { $lte: periodRange.end } : {})
  };
}

/** Accepts status=a&status=b, status[]=a, or comma-separated status=a,b */
export function parseMultiQueryValue(value: unknown): string[] {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => String(item).split(','))
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parsePagination(query: Record<string, unknown>, defaults?: { page?: number; limit?: number; maxLimit?: number }) {
  const maxLimit = defaults?.maxLimit ?? 100;
  const page = Math.max(1, Number(query.page || defaults?.page || 1) || 1);
  const requestedLimit = Number(query.limit || query.pageSize || defaults?.limit || 20);
  const limit = Math.min(maxLimit, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 20));
  return { page, limit, skip: (page - 1) * limit };
}

export function buildPaginationMeta(page: number, limit: number, total: number) {
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1
  };
}

export function resolveSort(
  query: Record<string, unknown>,
  whitelist: Record<string, string>,
  fallback: Record<string, 1 | -1>
): Record<string, 1 | -1> {
  const sortBy = String(query.sortBy || query.sort || '').trim();
  const sortOrderRaw = String(query.sortOrder || query.order || 'desc').trim().toLowerCase();
  const sortOrder: ListSortOrder = sortOrderRaw === 'asc' ? 'asc' : 'desc';
  if (!sortBy || !whitelist[sortBy]) {
    return fallback;
  }
  return { [whitelist[sortBy]]: sortOrder === 'asc' ? 1 : -1 };
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildTextSearchFilter(search: unknown, fields: string[]) {
  const term = String(search || '').trim();
  if (!term || fields.length === 0) return undefined;
  const regex = { $regex: escapeRegex(term), $options: 'i' };
  return { $or: fields.map((field) => ({ [field]: regex })) };
}
