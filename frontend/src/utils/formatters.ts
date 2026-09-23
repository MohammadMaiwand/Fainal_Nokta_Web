import { formatJalaliDate, formatJalaliDateTime } from './date';

export const APP_CURRENCY_CODE = 'AF';

const EASTERN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

const localeMap: Record<string, string> = {
  en: 'en-AF',
  fa: 'fa-AF',
  ps: 'ps-AF'
};

export function getAppLocale(language?: string) {
  const normalized = (language || 'en').split('-')[0];
  return localeMap[normalized] ?? 'en-AF';
}

export function usesEasternDigits(language?: string) {
  const normalized = String(language || 'en').toLowerCase().split('-')[0];
  return normalized === 'fa' || normalized === 'ps' || normalized === 'prs' || normalized === 'dr';
}

/** تبدیل ارقام لاتین به ارقام دری/افغانی برای fa و ps */
export function toLocaleDigits(value: string | number, language?: string) {
  const text = String(value ?? '');
  if (!usesEasternDigits(language)) return text;
  return text.replace(/[0-9]/g, (digit) => EASTERN_DIGITS[Number(digit)]);
}

export function roundMoney(value: number | string | null | undefined) {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }
  return Math.round(numericValue);
}

export function formatNumber(value: number | string | null | undefined, language?: string) {
  const numericValue = roundMoney(value);
  const eastern = usesEasternDigits(language);
  const formatted = new Intl.NumberFormat(getAppLocale(language), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    numberingSystem: eastern ? 'arabext' : 'latn'
  }).format(numericValue);
  // اطمینان از ارقام دری حتی اگر محیط numberingSystem را نادیده بگیرد
  return eastern ? toLocaleDigits(formatted, language) : formatted;
}

export function formatDecimal(value: number | string | null | undefined, language?: string, fractionDigits = 2) {
  const numericValue = Number(value ?? 0);
  const safe = Number.isFinite(numericValue) ? numericValue : 0;
  const eastern = usesEasternDigits(language);
  const formatted = new Intl.NumberFormat(getAppLocale(language), {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    numberingSystem: eastern ? 'arabext' : 'latn'
  }).format(safe);
  return eastern ? toLocaleDigits(formatted, language) : formatted;
}

export function formatCurrency(value: number | string | null | undefined, language?: string) {
  const rounded = roundMoney(value);
  const absolute = Math.abs(rounded);
  const formatted = `${formatNumber(absolute, language)} ${APP_CURRENCY_CODE}`;
  return rounded < 0 ? `(${formatted})` : formatted;
}

/** Use an explicit minus sign for profit/loss values instead of accounting parentheses. */
export function formatSignedCurrency(value: number | string | null | undefined, language?: string) {
  const rounded = roundMoney(value);
  const formatted = `${formatNumber(Math.abs(rounded), language)} ${APP_CURRENCY_CODE}`;
  if (rounded < 0) return `−${formatted}`;
  if (rounded > 0) return `+${formatted}`;
  return formatted;
}

export function formatDate(value: string | Date | null | undefined, language?: string) {
  return formatJalaliDate(value, language);
}

export function formatDateTime(value: string | Date | null | undefined, language?: string) {
  return formatJalaliDateTime(value, language);
}

