import dayjs from 'dayjs';
import jalaliday from 'jalaliday';

dayjs.extend(jalaliday);

const JALALI_INPUT_PATTERN = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/;

function normalizeDigits(value: string) {
  return value.replace(/[٠-٩۰-۹]/g, (char) => {
    const code = char.charCodeAt(0);
    if (code >= 0x06f0 && code <= 0x06f9) return String(code - 0x06f0);
    if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
    return char;
  });
}

export function sanitizeJalaliDateInput(value?: string | null): string {
  return normalizeDigits(String(value ?? ''))
    .replace(/[^\d/]/g, '')
    .replace(/\/{2,}/g, '/')
    .slice(0, 12);
}

export function isValidJalaliDateInput(value?: string | null): boolean {
  const text = sanitizeJalaliDateInput(value).trim();
  const match = JALALI_INPUT_PATTERN.exec(text);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1300 || year > 1500 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const parsed = dayjs(`${year}/${month}/${day}`, { jalali: true } as any);
  return parsed.isValid() && parsed.calendar('jalali').year() === year
    && parsed.calendar('jalali').month() + 1 === month
    && parsed.calendar('jalali').date() === day;
}

export function formatIsoToJalaliInput(value?: string | Date | null): string {
  if (!value) return '';
  const gregorian = dayjs(value);
  if (!gregorian.isValid()) return '';
  const jalali = gregorian.calendar('jalali');
  const month = String(jalali.month() + 1).padStart(2, '0');
  const day = String(jalali.date()).padStart(2, '0');
  return `${jalali.year()}/${month}/${day}`;
}

export function jalaliInputToIsoDate(value?: string | null): string | null {
  const text = sanitizeJalaliDateInput(value).trim();
  if (!isValidJalaliDateInput(text)) return null;
  const match = JALALI_INPUT_PATTERN.exec(text);
  if (!match) return null;

  const parsed = dayjs(`${match[1]}/${match[2]}/${match[3]}`, { jalali: true } as any);
  if (!parsed.isValid()) return null;
  return parsed.calendar('gregory').format('YYYY-MM-DD');
}
