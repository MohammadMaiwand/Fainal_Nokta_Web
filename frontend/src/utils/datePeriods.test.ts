import { describe, expect, it } from 'vitest';
import { resolveQuickDatePeriod } from '@/utils/datePeriods';

describe('datePeriods', () => {
  it('resolves today and this_month ranges', () => {
    const now = new Date(2026, 6, 16, 12, 0, 0);
    const today = resolveQuickDatePeriod('today', now);
    expect(today?.from).toBe('2026-07-16');
    expect(today?.to).toBe('2026-07-16');

    const month = resolveQuickDatePeriod('this_month', now);
    expect(month?.from).toBe('2026-07-01');
    expect(month?.to).toBe('2026-07-31');
  });

  it('resolves quarters', () => {
    const now = new Date(2026, 6, 16);
    const q3 = resolveQuickDatePeriod('q3', now);
    expect(q3?.from).toBe('2026-07-01');
    expect(q3?.to).toBe('2026-09-30');
  });

  it('returns null for all', () => {
    expect(resolveQuickDatePeriod('all')).toBeNull();
  });
});
