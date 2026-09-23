import { describe, expect, it } from 'vitest';
import { getPrintDirection, printInternals } from './printElement';

describe('printElement helpers', () => {
  it('resolves RTL for Dari and Pashto', () => {
    expect(getPrintDirection('en')).toBe('ltr');
    expect(getPrintDirection('fa')).toBe('rtl');
    expect(getPrintDirection('ps')).toBe('rtl');
  });

  it('detects empty printable content', () => {
    const empty = document.createElement('div');
    empty.textContent = '   ';
    expect(printInternals.hasPrintableContent(empty)).toBe(false);

    const withText = document.createElement('div');
    withText.textContent = 'Loan report summary totals';
    expect(printInternals.hasPrintableContent(withText)).toBe(true);

    const withRow = document.createElement('div');
    withRow.innerHTML = '<table><tbody><tr data-print-row><td>1</td></tr></tbody></table>';
    expect(printInternals.hasPrintableContent(withRow)).toBe(true);
  });

  it('resolves target by id', () => {
    const node = document.createElement('div');
    node.id = 'print-target-test';
    document.body.appendChild(node);
    expect(printInternals.resolveTarget({ targetId: 'print-target-test' })).toBe(node);
    node.remove();
  });
});
