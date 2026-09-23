/** Weekday cycle for hard-copy monthly attendance (جمعه omitted). */
export const ATTENDANCE_WEEK_DAYS = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه شنبه',
  'چهارشنبه',
  'پنجشنبه'
] as const;

export type HardCopyDayColumn = {
  key: string;
  weekday: string;
  isThursday: boolean;
  week: number;
  /** Soft pastel fill — 24 distinct colors, neighbors contrast strongly */
  color: string;
};

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

/**
 * Soft pastels for 24 day columns.
 * Adjacent colors stay clearly different for accurate marking; no neon/harsh tones.
 */
export const ATTENDANCE_DAY_COLORS = [
  '#D6F5E8', // mint
  '#D6E6FF', // soft blue
  '#FFE8CC', // peach
  '#E8D6F5', // lavender
  '#D6F0F5', // aqua
  '#FFF0B8', // soft cream (Thu week 1)
  '#FFD6E0', // rose
  '#E0F5D6', // light green
  '#D6F0FF', // sky
  '#F5E0D6', // sand
  '#E0D6F5', // periwinkle
  '#FFF5CC', // pale gold (Thu week 2)
  '#D6FFF0', // seafoam
  '#FFE0F0', // pink
  '#E8F5D6', // lime soft
  '#D6E0FF', // cornflower soft
  '#F5D6E8', // orchid soft
  '#F5F0C8', // butter (Thu week 3)
  '#C8F0E0', // teal soft
  '#FFE8E0', // apricot
  '#E0E8FF', // ice blue
  '#F0D6FF', // lilac
  '#E8FFD6', // chartreuse soft
  '#F5ECC0' // warm cream (Thu week 4)
] as const;

export function getJalaliMonthName(month: number) {
  return afghanMonthNames[Math.max(0, Math.min(11, month - 1))] ?? '';
}

/**
 * Fixed Excel-style grid: 4 weeks × Sat–Thu = 24 day columns.
 * Matches the academy hard-copy attendance template.
 */
export function getHardCopyAttendanceColumns(weeks = 4): HardCopyDayColumn[] {
  const columns: HardCopyDayColumn[] = [];
  let index = 0;
  for (let week = 1; week <= weeks; week += 1) {
    for (const weekday of ATTENDANCE_WEEK_DAYS) {
      columns.push({
        key: `w${week}-${weekday}`,
        weekday,
        isThursday: weekday === 'پنجشنبه',
        week,
        color: ATTENDANCE_DAY_COLORS[index % ATTENDANCE_DAY_COLORS.length]
      });
      index += 1;
    }
  }
  return columns;
}
