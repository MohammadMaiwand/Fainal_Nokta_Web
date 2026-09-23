import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'messages');
const namespaces = ['payments', 'finance', 'filters'] as const;

function load(lang: string, ns: string) {
  return JSON.parse(fs.readFileSync(path.join(root, lang, `${ns}.json`), 'utf8')) as Record<string, string>;
}

describe('finance/payments locale parity', () => {
  for (const ns of namespaces) {
    it(`${ns} en/fa/ps keys match`, () => {
      const enKeys = Object.keys(load('en', ns)).sort();
      expect(Object.keys(load('fa', ns)).sort()).toEqual(enKeys);
      expect(Object.keys(load('ps', ns)).sort()).toEqual(enKeys);
    });
  }

  it('payments reverse/refund/receipt strings exist in all locales', () => {
    for (const lang of ['en', 'fa', 'ps'] as const) {
      const messages = load(lang, 'payments');
      for (const key of ['status_reversed', 'status_refunded', 'confirm_reverse', 'confirm_refund', 'view_receipt', 'submit_payment']) {
        expect(messages[key], `${lang}.payments.${key}`).toBeTruthy();
      }
    }
  });

  it('english finance payroll tabs are not leftover Dari', () => {
    const enFinance = load('en', 'finance');
    expect(enFinance.tab_summary).not.toMatch(/خلاصه/);
    expect(enFinance.toggle_paid).not.toMatch(/^تبدیل/);
  });
});
