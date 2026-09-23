import { describe, expect, it } from 'vitest';

function normalizeCaptchaAnswer(answer: string) {
  return String(answer ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

describe('captcha answer normalization', () => {
  it('normalizes case and spaces', () => {
    expect(normalizeCaptchaAnswer(' ab 3k7 ')).toBe('AB3K7');
  });

  it('rejects empty answers', () => {
    expect(normalizeCaptchaAnswer('')).toBe('');
    expect(normalizeCaptchaAnswer('   ')).toBe('');
  });
});
