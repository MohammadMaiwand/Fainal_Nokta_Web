import { describe, expect, it } from 'vitest';
import {
  isValidAfghanPhone,
  isValidPersonName,
  sanitizeAfghanPhoneInput,
  sanitizePersonNameInput
} from './formValidation';

describe('formValidation', () => {
  it('accepts valid Afghan mobile numbers', () => {
    expect(isValidAfghanPhone('0781923460')).toBe(true);
    expect(isValidAfghanPhone('0701234567')).toBe(true);
  });

  it('rejects invalid Afghan mobile numbers', () => {
    expect(isValidAfghanPhone('0812345678')).toBe(false);
    expect(isValidAfghanPhone('078192346')).toBe(false);
    expect(isValidAfghanPhone('+93781923460')).toBe(false);
  });

  it('sanitizes phone input progressively', () => {
    expect(sanitizeAfghanPhoneInput('07819234601')).toBe('0781923460');
    expect(sanitizeAfghanPhoneInput('08123')).toBe('0');
  });

  it('validates person names without digits', () => {
    expect(isValidPersonName('احمد')).toBe(true);
    expect(isValidPersonName('Ahmad123')).toBe(false);
    expect(sanitizePersonNameInput('Ali 9')).toBe('Ali ');
  });
});
