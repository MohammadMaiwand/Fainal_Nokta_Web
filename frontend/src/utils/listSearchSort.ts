import { formatIsoToJalaliInput } from './jalaliDateInput';

export type ListSortField = 'name' | 'date' | 'role';
export type ListSortDirection = 'asc' | 'desc';

const sortFieldCandidates: Record<ListSortField, string[]> = {
  name: ['name', 'title', 'className', 'firstName', 'lastName', 'studentName', 'teacherName', 'guardianName'],
  date: ['date', 'publishDate', 'attendanceDate', 'paymentDate', 'createdAt', 'updatedAt', 'joinDate'],
  role: ['role']
};

function toSearchTokens(value: unknown, tokens: string[], visited: WeakSet<object>) {
  if (value === null || value === undefined) {
    return;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const normalized = String(value).trim();
    if (normalized) {
      tokens.push(normalized.toLowerCase());
    }
    return;
  }

  if (value instanceof Date) {
    tokens.push(value.toISOString().toLowerCase());
    const jalali = formatIsoToJalaliInput(value);
    if (jalali) tokens.push(jalali.toLowerCase());
    return;
  }

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value.trim())) {
    const normalized = value.trim().toLowerCase();
    tokens.push(normalized);
    const jalali = formatIsoToJalaliInput(value);
    if (jalali) tokens.push(jalali.toLowerCase());
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => toSearchTokens(item, tokens, visited));
    return;
  }

  if (typeof value === 'object') {
    if (visited.has(value as object)) {
      return;
    }

    visited.add(value as object);
    Object.values(value as Record<string, unknown>).forEach((item) => toSearchTokens(item, tokens, visited));
  }
}

function readCandidateValue(item: Record<string, any>, field: ListSortField) {
  if (field === 'name' && (item.firstName || item.lastName)) {
    const fullName = [item.firstName, item.lastName].filter(Boolean).join(' ').trim();
    if (fullName) {
      return fullName;
    }
  }

  for (const key of sortFieldCandidates[field]) {
    const value = item[key];
    if (value === null || value === undefined || value === '') {
      continue;
    }

    return value;
  }

  return null;
}

function normalizeSortValue(item: Record<string, any>, field: ListSortField) {
  const rawValue = readCandidateValue(item, field);

  if (rawValue === null || rawValue === undefined) {
    return field === 'date' ? 0 : '';
  }

  if (field === 'date') {
    const timestamp = rawValue instanceof Date ? rawValue.getTime() : Date.parse(String(rawValue));
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  if (Array.isArray(rawValue)) {
    return rawValue.map((entry) => String(entry ?? '')).filter(Boolean).join(' ').toLowerCase();
  }

  return String(rawValue).trim().toLowerCase();
}

export function hasSortSupport(keys: Iterable<string>, field: ListSortField) {
  const availableKeys = new Set(Array.from(keys));
  return sortFieldCandidates[field].some((key) => availableKeys.has(key));
}

export function matchesSearch<T>(item: T, searchTerm: string) {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  if (!normalizedSearch) {
    return true;
  }

  const tokens: string[] = [];
  toSearchTokens(item, tokens, new WeakSet<object>());
  return tokens.join(' ').includes(normalizedSearch);
}

export function sortCollection<T>(items: T[], field: ListSortField, direction: ListSortDirection) {
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  const modifier = direction === 'asc' ? 1 : -1;

  return [...items].sort((left, right) => {
    const leftValue = normalizeSortValue(left as Record<string, any>, field);
    const rightValue = normalizeSortValue(right as Record<string, any>, field);

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return (leftValue - rightValue) * modifier;
    }

    return collator.compare(String(leftValue), String(rightValue)) * modifier;
  });
}
