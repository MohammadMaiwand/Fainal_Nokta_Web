import { formatIsoToJalaliInput } from './jalaliDateInput';

const afghanMonthNames = [
  'حمل',
  'ثور',
  'جوزا',
  'سرطان',
  'اسد',
  'سنبله',
  'میزان',
  'عقرب',
  'قوس',
  'جدی',
  'دلو',
  'حوت'
];

const easternArabicDigits = '٠١٢٣٤٥٦٧٨٩';
const persianDigits = '۰۱۲۳۴۵۶۷۸۹';

function normalizeDigits(value: string) {
  return value.replace(/[٠-٩۰-۹]/g, (char) => {
    const easternIndex = easternArabicDigits.indexOf(char);
    if (easternIndex >= 0) return String(easternIndex);
    const persianIndex = persianDigits.indexOf(char);
    if (persianIndex >= 0) return String(persianIndex);
    return char;
  });
}

function toNumericPart(value?: string) {
  if (!value) return 0;
  const normalized = normalizeDigits(String(value)).replace(/[^\d.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDate(value?: string | Date | null) {
  if (!value) return new Date();
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toJalaliParts(date: Date) {
  const formatter = new Intl.DateTimeFormat('fa-AF-u-ca-persian', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  const parts = formatter.formatToParts(date);
  const year = toNumericPart(parts.find((part) => part.type === 'year')?.value);
  const month = toNumericPart(parts.find((part) => part.type === 'month')?.value);
  const day = toNumericPart(parts.find((part) => part.type === 'day')?.value);
  return { year, month, day };
}

function toLocaleDigits(value: number, language?: string) {
  const locale = (language || 'fa').startsWith('en') ? 'en-AF' : 'fa-AF';
  return new Intl.NumberFormat(locale).format(value);
}

/** Hijri Shamsi display: `1405/2/1` */
export function formatJalaliDate(value?: string | Date | null, language?: string) {
  const slash = formatIsoToJalaliInput(value);
  if (!slash) return '';
  if (!language || language.startsWith('en')) return slash;
  return slash
    .split('/')
    .map((part) => toLocaleDigits(Number(part), language))
    .join('/');
}

/** Long Hijri label with month name, e.g. for marketing banners */
export function formatJalaliDateLong(value?: string | Date | null, language?: string) {
  const date = toDate(value);
  if (!date) return '';
  const { year, month, day } = toJalaliParts(date);
  const monthName = afghanMonthNames[Math.max(0, month - 1)] ?? '';
  return `${toLocaleDigits(day, language)} ${monthName} ${toLocaleDigits(year, language)}`.trim();
}

export function formatJalaliDateTime(value?: string | Date | null, language?: string) {
  const date = toDate(value);
  if (!date) return '';
  const dateText = formatJalaliDate(date, language);
  const timeText = new Intl.DateTimeFormat('fa-AF', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
  return `${dateText} ${timeText}`.trim();
}

export function formatJalaliTime(value?: string | Date | null) {
  const date = toDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('fa-AF', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

export function getCurrentJalaliDate(language?: string) {
  return formatJalaliDate(new Date(), language);
}

export function getCurrentJalaliYearMonth() {
  const { year, month } = toJalaliParts(new Date());
  return { year, month };
}

export function formatJalaliMonth(year: number, month: number, language?: string) {
  const gregorianDate = new Date(year, month - 1, 1);
  const jalali = toJalaliParts(gregorianDate);
  const monthName = afghanMonthNames[Math.max(0, jalali.month - 1)] ?? '';
  return `${monthName} ${toLocaleDigits(jalali.year, language)}`.trim();
}
