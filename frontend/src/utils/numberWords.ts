/**
 * Number-to-words for finance displays in en / fa (Dari) / ps (Pashto).
 */

import { formatDecimal, toLocaleDigits } from './formatters';

type Lang = 'en' | 'fa' | 'ps';

function normalizeLang(language?: string): Lang {
  const base = String(language || 'en').toLowerCase().split('-')[0];
  if (base === 'fa' || base === 'prs' || base === 'dr') return 'fa';
  if (base === 'ps') return 'ps';
  return 'en';
}

const FA_ONES = [
  'صفر', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه', 'ده',
  'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'
];
const FA_TENS = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
/** صدگان افغانی: دو صد، سه صد، ... */
const FA_HUNDREDS = ['', 'یک صد', 'دو صد', 'سه صد', 'چهار صد', 'پنج صد', 'شش صد', 'هفت صد', 'هشت صد', 'نه صد'];

const PS_ONES = [
  'صفر', 'یو', 'دوه', 'درې', 'څلور', 'پنځه', 'شپږ', 'اووه', 'اته', 'نهه', 'لس',
  'یوولس', 'دولس', 'دیرلس', 'څوارلس', 'پنځلس', 'شپاړس', 'اوولس', 'اتلس', 'نولس'
];
const PS_TENS = ['', '', 'شل', 'دیرش', 'څلویښت', 'پنځوس', 'شپیته', 'اویا', 'اتیا', 'نوي'];
const PS_HUNDREDS = ['', 'یو سل', 'دوه سل', 'درې سل', 'څلور سل', 'پنځه سل', 'شپږ سل', 'اووه سل', 'اته سل', 'نهه سل'];

const EN_ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'
];
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function underThousandRtl(n: number, ones: string[], tens: string[], hundreds: string[], andWord: string): string {
  const value = Math.floor(Math.abs(n));
  if (value === 0) return '';
  if (value < 20) return ones[value];
  const hundred = Math.floor(value / 100);
  const rest = value % 100;
  const parts: string[] = [];
  if (hundred > 0) parts.push(hundreds[hundred]);
  if (rest > 0) {
    if (rest < 20) parts.push(ones[rest]);
    else {
      const ten = Math.floor(rest / 10);
      const one = rest % 10;
      parts.push(one === 0 ? tens[ten] : `${tens[ten]} ${andWord} ${ones[one]}`);
    }
  }
  return parts.join(` ${andWord} `);
}

function integerWordsRtl(
  n: number,
  ones: string[],
  tens: string[],
  hundreds: string[],
  scales: Array<{ div: number; name: string }>,
  andWord: string,
  onePrefix: string
): string {
  const value = Math.floor(Math.abs(n));
  if (value === 0) return ones[0];
  let remaining = value;
  const parts: string[] = [];
  for (const scale of scales) {
    const chunk = Math.floor(remaining / scale.div);
    if (chunk > 0) {
      // سبک افغانی: همیشه «یک هزار» / «یو زر»
      if (chunk === 1) parts.push(`${onePrefix} ${scale.name}`);
      else parts.push(`${underThousandRtl(chunk, ones, tens, hundreds, andWord)} ${scale.name}`);
      remaining %= scale.div;
    }
  }
  if (remaining > 0) parts.push(underThousandRtl(remaining, ones, tens, hundreds, andWord));
  return parts.join(` ${andWord} `);
}

function underThousandEn(n: number): string {
  const value = Math.floor(Math.abs(n));
  if (value === 0) return '';
  if (value < 20) return EN_ONES[value];
  const hundred = Math.floor(value / 100);
  const rest = value % 100;
  const parts: string[] = [];
  if (hundred > 0) parts.push(`${EN_ONES[hundred]} hundred`);
  if (rest > 0) {
    if (rest < 20) parts.push(EN_ONES[rest]);
    else {
      const ten = Math.floor(rest / 10);
      const one = rest % 10;
      parts.push(one === 0 ? EN_TENS[ten] : `${EN_TENS[ten]}-${EN_ONES[one]}`);
    }
  }
  return parts.join(' ');
}

function integerWordsEn(n: number): string {
  const value = Math.floor(Math.abs(n));
  if (value === 0) return EN_ONES[0];
  const scales = [
    { div: 1_000_000_000, name: 'billion' },
    { div: 1_000_000, name: 'million' },
    { div: 1_000, name: 'thousand' }
  ];
  let remaining = value;
  const parts: string[] = [];
  for (const scale of scales) {
    const chunk = Math.floor(remaining / scale.div);
    if (chunk > 0) {
      parts.push(`${underThousandEn(chunk)} ${scale.name}`);
      remaining %= scale.div;
    }
  }
  if (remaining > 0) parts.push(underThousandEn(remaining));
  return parts.join(' ');
}

function numberToWords(value: number, lang: Lang): string {
  const amount = Number(value || 0);
  const negative = amount < 0;
  const abs = Math.abs(amount);
  const whole = Math.floor(abs);
  const fraction = Math.round((abs - whole) * 100);

  let words: string;
  if (lang === 'en') {
    words = integerWordsEn(whole);
    if (fraction > 0) words = `${words} and ${integerWordsEn(fraction)} cents`;
  } else if (lang === 'ps') {
    words = integerWordsRtl(
      whole,
      PS_ONES,
      PS_TENS,
      PS_HUNDREDS,
      [
        { div: 1_000_000_000, name: 'میلیارد' },
        { div: 1_000_000, name: 'میلیون' },
        { div: 1_000, name: 'زر' }
      ],
      'او',
      'یو'
    );
    if (fraction > 0) {
      words = `${words} او ${integerWordsRtl(fraction, PS_ONES, PS_TENS, PS_HUNDREDS, [], 'او', 'یو')} پیسې`;
    }
  } else {
    words = integerWordsRtl(
      whole,
      FA_ONES,
      FA_TENS,
      FA_HUNDREDS,
      [
        { div: 1_000_000_000, name: 'میلیارد' },
        { div: 1_000_000, name: 'میلیون' },
        { div: 1_000, name: 'هزار' }
      ],
      'و',
      'یک'
    );
    if (fraction > 0) {
      words = `${words} و ${integerWordsRtl(fraction, FA_ONES, FA_TENS, FA_HUNDREDS, [], 'و', 'یک')} پول`;
    }
  }

  if (lang === 'en') return negative ? `minus ${words}` : words;
  return negative ? (lang === 'ps' ? `منفي ${words}` : `منفی ${words}`) : words;
}

function formatNumeric(value: number, language: string | undefined, digits = 2) {
  return formatDecimal(value, language, digits);
}

export function formatPercentWordsOnly(rate: number, language?: string) {
  const lang = normalizeLang(language);
  const value = Number(rate || 0);
  const words = numberToWords(value, lang);
  if (lang === 'en') return `${words} percent`;
  if (lang === 'ps') return `${words} سلنه`;
  return `${words} فیصد`;
}

export function formatMoneyWordsOnly(amount: number, language?: string) {
  const lang = normalizeLang(language);
  const value = Number(amount || 0);
  const words = numberToWords(value, lang);
  if (lang === 'en') return `${words} afghanis`;
  if (lang === 'ps') return `${words} افغانۍ`;
  return `${words} افغانی`;
}

export function formatPercentWordsAndNumber(rate: number, language?: string) {
  const lang = normalizeLang(language);
  const value = Number(rate || 0);
  const numeric = toLocaleDigits(
    value.toLocaleString('en-US', { maximumFractionDigits: 2 }),
    language
  );
  const words = formatPercentWordsOnly(rate, language);
  if (lang === 'en') return `${words} (${numeric}%)`;
  return `${words} (${numeric}٪)`;
}

export function formatMoneyWordsAndNumber(amount: number, language?: string) {
  const lang = normalizeLang(language);
  const value = Number(amount || 0);
  const numeric = formatDecimal(Math.abs(value), language, 2);
  const signed = value < 0 ? `(${numeric})` : numeric;
  const words = formatMoneyWordsOnly(amount, language);
  return `${words} (${signed})`;
}

export function formatTaxRateAndAmountWordsOnly(rate: number, amount: number, language?: string) {
  return `${formatPercentWordsOnly(rate, language)} — ${formatMoneyWordsOnly(amount, language)}`;
}

export function formatTaxRateAndAmountDisplay(rate: number, amount: number, language?: string) {
  return `${formatPercentWordsAndNumber(rate, language)} — ${formatMoneyWordsAndNumber(amount, language)}`;
}

export function formatReportCurrency(amount: number, language?: string) {
  return formatNumeric(amount, language, 2);
}
