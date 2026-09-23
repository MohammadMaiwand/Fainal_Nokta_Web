import { TaxPercentageSetting } from '../models/TaxPercentageSetting';

/**
 * معیار مالیه اکادمی برای «مرکز آموزشی غیرانتفاعی» طبق قوانین افغانستان:
 *
 * - ماده ۱۰ قانون مالیات بر عایدات ۱۳۸۸: عواید عملیات ضروری مراکز آموزشی غیرانتفاعی
 *   از مالیه عایدات معاف است → فیصدی سالانه عایدات = ۰٪
 * - مالیه رسید کسب‌وکار (BRT) روی فیس آموزشی: تا زمان اخذ نامه معافیت رسمی مستوفیت/ARD،
 *   معیار عمومی خدمات آموزشی ۲٪ روی عواید ناخالص شاگردان اعمال می‌شود.
 *
 * منبع: Income Tax Law 2009 Art.10، MoF Guide 23 (معافیت غیرانتفاعی)، MoF BRT Guide.
 */
export const AFGHANISTAN_NONPROFIT_EDUCATION_TAX = {
  entityTypeDari: 'مرکز آموزشی غیرانتفاعی',
  legalBasisDari: 'ماده ۱۰ قانون مالیات بر عایدات ۱۳۸۸ + معیار BRT خدمات آموزشی',
  /** BRT روی عواید فیس شاگردان (خدمات آموزشی) */
  brtRate: 2,
  /** مالیه عایدات سالانه — معاف برای مرکز آموزشی غیرانتفاعی */
  annualIncomeTaxRate: 0,
  monthlyQuarterlyEnabled: true,
  showAnnualEstimatedShare: true,
  sourceLabelDari: 'معیار مالیه مراکز آموزشی غیرانتفاعی افغانستان'
} as const;

/** سازگاری با کد قبلی: quarterlyRate = BRT، annualRate = مالیه عایدات */
export const AFGHANISTAN_ACADEMY_TAX_DEFAULTS = {
  quarterlyRate: AFGHANISTAN_NONPROFIT_EDUCATION_TAX.brtRate,
  annualRate: AFGHANISTAN_NONPROFIT_EDUCATION_TAX.annualIncomeTaxRate,
  monthlyQuarterlyEnabled: AFGHANISTAN_NONPROFIT_EDUCATION_TAX.monthlyQuarterlyEnabled,
  showAnnualEstimatedShare: AFGHANISTAN_NONPROFIT_EDUCATION_TAX.showAnnualEstimatedShare,
  sourceLabelDari: AFGHANISTAN_NONPROFIT_EDUCATION_TAX.sourceLabelDari,
  entityTypeDari: AFGHANISTAN_NONPROFIT_EDUCATION_TAX.entityTypeDari,
  legalBasisDari: AFGHANISTAN_NONPROFIT_EDUCATION_TAX.legalBasisDari
} as const;

export type AcademyTaxSettingResolved = {
  quarterlyRate: number;
  annualRate: number;
  brtRate: number;
  annualIncomeTaxRate: number;
  monthlyQuarterlyEnabled: boolean;
  showAnnualEstimatedShare: boolean;
  isDefault: boolean;
  sourceLabelDari: string;
  entityTypeDari: string;
  legalBasisDari: string;
  percentageExplanationDari: string;
  _id?: string;
};

function buildPercentageExplanation(brtRate: number, annualIncomeTaxRate: number) {
  return (
    `مالیه اکادمی بر اساس ${brtRate}٪ BRT خدمات آموزشی تعیین شده است` +
    ` (نوع نهاد: ${AFGHANISTAN_NONPROFIT_EDUCATION_TAX.entityTypeDari})؛ ` +
    `مالیه عایدات سالانه ${annualIncomeTaxRate}٪ طبق ماده ۱۰ برای مراکز آموزشی غیرانتفاعی.`
  );
}

/** اگر تنظیم فعال نباشد یا فیصدی تجاری قدیمی باشد، معیار غیرانتفاعی آموزشی را ثبت/به‌روز می‌کند. */
export async function ensureDefaultTaxPercentageSetting() {
  const existing = await TaxPercentageSetting.findOne({
    isDeleted: false,
    isActive: true,
    branchId: null
  }).sort({ effectiveFrom: -1 });

  const defaults = {
    quarterlyRate: AFGHANISTAN_ACADEMY_TAX_DEFAULTS.quarterlyRate,
    annualRate: AFGHANISTAN_ACADEMY_TAX_DEFAULTS.annualRate,
    monthlyQuarterlyEnabled: AFGHANISTAN_ACADEMY_TAX_DEFAULTS.monthlyQuarterlyEnabled,
    showAnnualEstimatedShare: AFGHANISTAN_ACADEMY_TAX_DEFAULTS.showAnnualEstimatedShare,
    isActive: true,
    effectiveFrom: new Date('2000-01-01T00:00:00.000Z'),
    effectiveTo: null,
    branchId: null
  };

  if (!existing) {
    const created = await TaxPercentageSetting.create(defaults);
    return created.toObject();
  }

  const quarterlyRate = Number(existing.quarterlyRate);
  const annualRate = Number(existing.annualRate);
  // صفر کامل، یا نرخ تجاری قدیمی ۰٫۳٪ ثابت کسب‌وکار → تبدیل به معیار غیرانتفاعی آموزشی
  const needsHeal =
    !Number.isFinite(quarterlyRate) ||
    !Number.isFinite(annualRate) ||
    (quarterlyRate <= 0 && annualRate <= 0) ||
    annualRate === 0.3;

  if (needsHeal) {
    existing.quarterlyRate = defaults.quarterlyRate;
    existing.annualRate = defaults.annualRate;
    existing.monthlyQuarterlyEnabled = defaults.monthlyQuarterlyEnabled;
    existing.showAnnualEstimatedShare = defaults.showAnnualEstimatedShare;
    existing.isActive = true;
    await existing.save();
  }

  return existing.toObject();
}

/** همیشه یک تنظیم معتبر برای مرکز آموزشی غیرانتفاعی برمی‌گرداند. */
export async function resolveAcademyTaxSetting(branchId?: string | null): Promise<AcademyTaxSettingResolved> {
  const now = new Date();
  const baseFilter: Record<string, any> = {
    isDeleted: false,
    isActive: true,
    effectiveFrom: { $lte: now },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: now } }]
  };

  let setting = branchId
    ? await TaxPercentageSetting.findOne({ ...baseFilter, branchId }).sort({ effectiveFrom: -1 }).lean<any>()
    : null;

  if (!setting) {
    setting = await TaxPercentageSetting.findOne({ ...baseFilter, branchId: null }).sort({ effectiveFrom: -1 }).lean<any>();
  }

  if (!setting || (Number(setting.quarterlyRate) <= 0 && Number(setting.annualRate) <= 0) || Number(setting.annualRate) === 0.3) {
    setting = await ensureDefaultTaxPercentageSetting();
  }

  const quarterlyRate = Number(setting?.quarterlyRate);
  const annualRate = Number(setting?.annualRate);
  const brtRate =
    Number.isFinite(quarterlyRate) && quarterlyRate >= 0
      ? quarterlyRate
      : AFGHANISTAN_ACADEMY_TAX_DEFAULTS.quarterlyRate;
  const annualIncomeTaxRate =
    Number.isFinite(annualRate) && annualRate >= 0
      ? annualRate
      : AFGHANISTAN_ACADEMY_TAX_DEFAULTS.annualRate;

  const hasCustomRates =
    brtRate !== AFGHANISTAN_ACADEMY_TAX_DEFAULTS.quarterlyRate ||
    annualIncomeTaxRate !== AFGHANISTAN_ACADEMY_TAX_DEFAULTS.annualRate;

  return {
    _id: setting?._id ? String(setting._id) : undefined,
    quarterlyRate: brtRate,
    annualRate: annualIncomeTaxRate,
    brtRate,
    annualIncomeTaxRate,
    monthlyQuarterlyEnabled: true,
    showAnnualEstimatedShare: true,
    isDefault: !hasCustomRates,
    sourceLabelDari: hasCustomRates ? 'تنظیم سیستم' : AFGHANISTAN_ACADEMY_TAX_DEFAULTS.sourceLabelDari,
    entityTypeDari: AFGHANISTAN_NONPROFIT_EDUCATION_TAX.entityTypeDari,
    legalBasisDari: AFGHANISTAN_NONPROFIT_EDUCATION_TAX.legalBasisDari,
    percentageExplanationDari: buildPercentageExplanation(brtRate, annualIncomeTaxRate)
  };
}

/**
 * محاسبه مالیه اکادمی روی عواید فیس شاگردان برای هر نوع گزارش.
 * BRT همیشه روی عواید دوره اعمال می‌شود و از مفاد خالص کسر می‌گردد.
 */
export function calculateNonprofitEducationAcademyTax(input: {
  studentRevenue: number;
  brtRate: number;
  annualIncomeTaxRate: number;
}) {
  const studentRevenue = Math.max(0, Number(input.studentRevenue || 0));
  const brtRate = Math.max(0, Number(input.brtRate || 0));
  const annualIncomeTaxRate = Math.max(0, Number(input.annualIncomeTaxRate || 0));

  const brtTax = Number(((studentRevenue * brtRate) / 100).toFixed(2));
  const annualIncomeTax = Number(((studentRevenue * annualIncomeTaxRate) / 100).toFixed(2));
  const totalAcademyTax = Number((brtTax + annualIncomeTax).toFixed(2));

  return {
    brtTax,
    annualIncomeTax,
    /** نام‌های سازگار با گزارش قبلی */
    quarterlyTax: brtTax,
    annualTax: annualIncomeTax,
    totalAcademyTax,
    appliedBrtPercent: brtRate,
    appliedAnnualIncomeTaxPercent: annualIncomeTaxRate
  };
}
