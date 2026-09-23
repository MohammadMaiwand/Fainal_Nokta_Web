import { describe, expect, it } from 'vitest';
import { formatIsoToJalaliInput, isValidJalaliDateInput, jalaliInputToIsoDate } from './jalaliDateInput';

describe('jalaliDateInput', () => {
  it('validates hijri date format', () => {
    expect(isValidJalaliDateInput('1405/2/1')).toBe(true);
    expect(isValidJalaliDateInput('2026-02-01')).toBe(false);
  });

  it('converts between jalali input and iso', () => {
    const iso = jalaliInputToIsoDate('1404/1/1');
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(formatIsoToJalaliInput(iso)).toBe('1404/01/01');
  });
});
