/**
 * تبدیل عدد به حروف به سبک افغانی (دری افغانستان).
 * مثال: 1280 → یک هزار و دو صد و هشتاد
 */

const ONES = [
  'صفر',
  'یک',
  'دو',
  'سه',
  'چهار',
  'پنج',
  'شش',
  'هفت',
  'هشت',
  'نه',
  'ده',
  'یازده',
  'دوازده',
  'سیزده',
  'چهارده',
  'پانزده',
  'شانزده',
  'هفده',
  'هجده',
  'نوزده'
];

const TENS = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];

/** صدگان به سبک افغانی: دو صد، سه صد، ... (نه دویست/سیصد) */
const HUNDREDS = [
  '',
  'یک صد',
  'دو صد',
  'سه صد',
  'چهار صد',
  'پنج صد',
  'شش صد',
  'هفت صد',
  'هشت صد',
  'نه صد'
];

function underThousand(n: number): string {
  const value = Math.floor(Math.abs(n));
  if (value === 0) return '';
  if (value < 20) return ONES[value];

  const hundred = Math.floor(value / 100);
  const rest = value % 100;
  const parts: string[] = [];

  if (hundred > 0) parts.push(HUNDREDS[hundred]);

  if (rest > 0) {
    if (rest < 20) {
      parts.push(ONES[rest]);
    } else {
      const ten = Math.floor(rest / 10);
      const one = rest % 10;
      if (one === 0) parts.push(TENS[ten]);
      else parts.push(`${TENS[ten]} و ${ONES[one]}`);
    }
  }

  return parts.join(' و ');
}

function scaleChunkWords(chunk: number, scaleName: string): string {
  // همیشه «یک هزار» نه فقط «هزار»
  if (chunk === 1) return `یک ${scaleName}`;
  return `${underThousand(chunk)} ${scaleName}`;
}

function integerToDariWords(n: number): string {
  const value = Math.floor(Math.abs(n));
  if (value === 0) return ONES[0];

  const scales = [
    { div: 1_000_000_000, name: 'میلیارد' },
    { div: 1_000_000, name: 'میلیون' },
    { div: 1_000, name: 'هزار' }
  ];

  let remaining = value;
  const parts: string[] = [];

  for (const scale of scales) {
    const chunk = Math.floor(remaining / scale.div);
    if (chunk > 0) {
      parts.push(scaleChunkWords(chunk, scale.name));
      remaining %= scale.div;
    }
  }

  if (remaining > 0) parts.push(underThousand(remaining));
  return parts.join(' و ');
}

function decimalPartToDari(fractionTwoDigits: number): string {
  if (fractionTwoDigits <= 0) return '';
  return `${integerToDariWords(fractionTwoDigits)} پول`;
}

export function numberToDariWords(value: number): string {
  const amount = Number(value || 0);
  const negative = amount < 0;
  const abs = Math.abs(amount);
  const whole = Math.floor(abs);
  const fraction = Math.round((abs - whole) * 100);

  let words = integerToDariWords(whole);
  if (fraction > 0) {
    words = `${words} و ${decimalPartToDari(fraction)}`;
  }
  return negative ? `منفی ${words}` : words;
}

export function formatPercentWordsAndNumber(rate: number): string {
  const value = Number(rate || 0);
  const numeric = value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  const whole = Math.floor(Math.abs(value));
  const fraction = Math.round((Math.abs(value) - whole) * 100);
  let words = integerToDariWords(whole);
  if (fraction > 0) {
    words = `${words} و ${decimalPartToDari(fraction)}`;
  }
  if (value < 0) words = `منفی ${words}`;
  return `${words} فیصد (${numeric}٪)`;
}

export function formatMoneyWordsOnly(amount: number): string {
  return `${numberToDariWords(amount)} افغانی`;
}

export function formatPercentWordsOnly(rate: number): string {
  const value = Number(rate || 0);
  const whole = Math.floor(Math.abs(value));
  const fraction = Math.round((Math.abs(value) - whole) * 100);
  let words = integerToDariWords(whole);
  if (fraction > 0) {
    words = `${words} و ${decimalPartToDari(fraction)}`;
  }
  if (value < 0) words = `منفی ${words}`;
  return `${words} فیصد`;
}

export function formatMoneyWordsAndNumber(amount: number): string {
  const value = Number(amount || 0);
  const numeric = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const signedNumeric = value < 0 ? `(${numeric})` : numeric;
  return `${formatMoneyWordsOnly(value)} (${signedNumeric})`;
}

/** فقط حروفی — برای سلول‌های جدول */
export function formatTaxRateAndAmountWordsOnly(rate: number, amount: number): string {
  return `${formatPercentWordsOnly(rate)} — ${formatMoneyWordsOnly(amount)}`;
}

/** نمایش کامل فیصدی + مبلغ مالیه: حروفی و عددی */
export function formatTaxRateAndAmountDisplay(rate: number, amount: number): string {
  return `${formatPercentWordsAndNumber(rate)} — ${formatMoneyWordsAndNumber(amount)}`;
}
