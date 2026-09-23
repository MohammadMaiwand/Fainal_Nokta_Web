import { describe, expect, it } from 'vitest';
import { formatCurrency, formatNumber, getAppLocale, roundMoney } from './formatters';

describe('formatters', () => {
  it('maps app locales for Afghanistan', () => {
    expect(getAppLocale('fa')).toBe('fa-AF');
    expect(getAppLocale('ps')).toBe('ps-AF');
    expect(getAppLocale('en')).toBe('en-AF');
  });

  it('formats numbers safely', () => {
    expect(formatNumber(1200, 'en')).toContain('1');
    expect(formatNumber(null, 'en')).toBe('0');
  });

  it('formats Afghan currency with AF code', () => {
    expect(formatCurrency(1500, 'fa')).toContain('AF');
    expect(formatCurrency(1500, 'en')).toBe('1,500 AF');
    expect(formatCurrency(1500, 'en')).not.toMatch(/\$/);
  });

  it('uses Eastern digits for Dari/Pashto and Latin for English', () => {
    expect(formatNumber(1280, 'fa')).toMatch(/[۰-۹]/);
    expect(formatNumber(1280, 'fa')).not.toMatch(/[0-9]/);
    expect(formatNumber(1280, 'ps')).toMatch(/[۰-۹]/);
    expect(formatNumber(1280, 'en')).toBe('1,280');
    expect(formatCurrency(1500, 'fa')).toMatch(/۱٬?۵۰۰|۱٫۵۰۰|۱۵۰۰/);
  });

  it('rounds floating-point money noise', () => {
    expect(roundMoney(1500.499)).toBe(1500);
    expect(formatCurrency(1234567.89, 'en')).not.toMatch(/\.[0-9]{3,}/);
    expect(formatNumber(999999.99, 'en')).toBe('1,000,000');
  });
});
