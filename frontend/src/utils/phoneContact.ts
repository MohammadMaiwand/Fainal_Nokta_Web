import { digitsOnly, isValidAfghanPhone } from './formValidation';

export { isPhoneLikeFieldName } from './formValidation';

/** Normalize local Afghan numbers (07xxxxxxxx) to international digits for wa.me. */
export function normalizePhoneForWhatsApp(value?: string | null): string {
  let digits = digitsOnly(value);
  if (!digits) return '';

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  if (digits.startsWith('93') && digits.length >= 11) {
    return digits;
  }

  if (digits.startsWith('0') && digits.length === 10) {
    return `93${digits.slice(1)}`;
  }

  if (digits.length === 9 && digits.startsWith('7')) {
    return `93${digits}`;
  }

  return digits;
}

export function buildWhatsAppUrl(phone?: string | null, whatsapp?: string | null): string {
  const primary = whatsapp?.trim() ? whatsapp : phone;
  if (!isValidAfghanPhone(primary)) return '';
  const normalized = normalizePhoneForWhatsApp(primary);
  return normalized ? `https://wa.me/${normalized}` : '';
}

export function buildTelUri(phone?: string | null): string {
  const digits = normalizePhoneForWhatsApp(phone);
  return digits ? `tel:+${digits}` : '';
}

export function buildPhoneQrValue(phone?: string | null, whatsapp?: string | null): string {
  const whatsappUrl = buildWhatsAppUrl(phone, whatsapp);
  if (whatsappUrl) return whatsappUrl;
  return buildTelUri(phone);
}

export function formatPhoneDisplay(value?: string | null): string {
  const trimmed = String(value ?? '').trim();
  return trimmed;
}
