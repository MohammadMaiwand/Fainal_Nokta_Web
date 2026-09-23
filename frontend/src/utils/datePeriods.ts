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

export const HISTORICAL_DATE_PERIODS: QuickDatePeriod[] = [
  'all',
  'today',
  'yesterday',
  'last_7_days',
  'last_30_days',
  'this_week',
  'previous_week',
  'this_month',
  'previous_month',
  'this_quarter',
  'previous_quarter',
  'q1',
  'q2',
  'q3',
  'q4',
  'this_year',
  'previous_year',
  'custom'
];

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

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function quarterBounds(year: number, quarter: 1 | 2 | 3 | 4) {
  const startMonth = (quarter - 1) * 3;
  return {
    start: new Date(year, startMonth, 1, 0, 0, 0, 0),
    end: new Date(year, startMonth + 3, 0, 23, 59, 59, 999)
  };
}

/** Mirrors backend listQuery.resolveQuickDatePeriod for URL/API params. */
export function resolveQuickDatePeriod(period: QuickDatePeriod | string, now = new Date()): { from?: string; to?: string } | null {
  const normalized = String(period || 'all').trim().toLowerCase() as QuickDatePeriod;
  if (!normalized || normalized === 'all' || normalized === 'custom') return null;

  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const pair = (start: Date, end: Date) => ({ from: toIsoDate(start), to: toIsoDate(end) });

  switch (normalized) {
    case 'today':
      return pair(todayStart, todayEnd);
    case 'yesterday': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 1);
      return pair(start, endOfDay(start));
    }
    case 'last_7_days': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 6);
      return pair(start, todayEnd);
    }
    case 'last_30_days': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 29);
      return pair(start, todayEnd);
    }
    case 'this_week':
      return pair(startOfWeek(now), endOfDay(new Date(startOfWeek(now).getTime() + 6 * 86400000)));
    case 'previous_week': {
      const start = startOfWeek(now);
      start.setDate(start.getDate() - 7);
      return pair(start, endOfDay(new Date(start.getTime() + 6 * 86400000)));
    }
    case 'this_month':
      return pair(new Date(now.getFullYear(), now.getMonth(), 1), endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
    case 'previous_month':
      return pair(new Date(now.getFullYear(), now.getMonth() - 1, 1), endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)));
    case 'this_quarter': {
      const q = (Math.floor(now.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
      const bounds = quarterBounds(now.getFullYear(), q);
      return pair(bounds.start, bounds.end);
    }
    case 'previous_quarter': {
      const current = Math.floor(now.getMonth() / 3) + 1;
      const previous = current === 1 ? 4 : ((current - 1) as 1 | 2 | 3 | 4);
      const year = current === 1 ? now.getFullYear() - 1 : now.getFullYear();
      const bounds = quarterBounds(year, previous);
      return pair(bounds.start, bounds.end);
    }
    case 'q1':
    case 'q2':
    case 'q3':
    case 'q4': {
      const q = Number(normalized.slice(1)) as 1 | 2 | 3 | 4;
      const bounds = quarterBounds(now.getFullYear(), q);
      return pair(bounds.start, bounds.end);
    }
    case 'this_year':
      return pair(new Date(now.getFullYear(), 0, 1), endOfDay(new Date(now.getFullYear(), 11, 31)));
    case 'previous_year':
      return pair(new Date(now.getFullYear() - 1, 0, 1), endOfDay(new Date(now.getFullYear() - 1, 11, 31)));
    default:
      return null;
  }
}

export function periodLabelKey(period: QuickDatePeriod | string) {
  return `filters.period_${String(period || 'all')}`;
}
