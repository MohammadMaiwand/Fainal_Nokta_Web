import { describe, expect, it } from 'vitest';
import { buildTelUri, buildWhatsAppUrl, isPhoneLikeFieldName, normalizePhoneForWhatsApp } from './phoneContact';

describe('phoneContact', () => {
  it('normalizes Afghan local numbers', () => {
    expect(normalizePhoneForWhatsApp('0701234567')).toBe('93701234567');
    expect(normalizePhoneForWhatsApp('+93 70 123 4567')).toBe('93701234567');
  });

  it('builds WhatsApp links', () => {
    expect(buildWhatsAppUrl('0701234567')).toBe('https://wa.me/93701234567');
    expect(buildWhatsAppUrl('0701111111', '0782222222')).toBe('https://wa.me/93782222222');
  });

  it('builds tel URIs for QR', () => {
    expect(buildTelUri('0701234567')).toBe('tel:+93701234567');
  });

  it('detects phone-like field names', () => {
    expect(isPhoneLikeFieldName('guardianPhone')).toBe(true);
    expect(isPhoneLikeFieldName('email')).toBe(false);
  });
});
