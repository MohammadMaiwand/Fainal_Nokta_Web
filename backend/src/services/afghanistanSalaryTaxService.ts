import dayjs from 'dayjs';
import jalaliday from 'jalaliday';
import { TaxRule } from '../models/TaxRule';
import {
  calculateAfghanistanWageWithholdingTax,
  type AfghanistanTaxResult
} from './financialCalculationEngine';

dayjs.extend(jalaliday);

type TaxRuleInput = {
  minAmount: number;
  maxAmount: number | null;
  baseTax: number;
  percentage: number;
  categoryNameDari: string;
  explanationDari: string;
};

export type SalaryTaxResult = AfghanistanTaxResult;

const defaultTaxRules: TaxRuleInput[] = [
  {
    minAmount: 0,
    maxAmount: 5000,
    baseTax: 0,
    percentage: 0,
    categoryNameDari: 'معاف از مالیه',
    explanationDari: '0 – 5,000 AFN: Tax = 0'
  },
  {
    minAmount: 5001,
    maxAmount: 12500,
    baseTax: 0,
    percentage: 2,
    categoryNameDari: 'کتگوری ۲٪',
    explanationDari: '5,000 – 12,500 AFN: Tax = 2% × (Gross Salary − 5,000)'
  },
  {
    minAmount: 12501,
    maxAmount: 100000,
    baseTax: 150,
    percentage: 10,
    categoryNameDari: 'کتگوری ۱۰٪',
    explanationDari: '12,500 – 100,000 AFN: Tax = 150 + 10% × (Gross Salary − 12,500)'
  },
  {
    minAmount: 100001,
    maxAmount: null,
    baseTax: 8900,
    percentage: 20,
    categoryNameDari: 'کتگوری ۲۰٪',
    explanationDari: 'More than 100,000 AFN: Tax = 8,900 + 20% × (Gross Salary − 100,000)'
  }
];

export async function getActiveTaxRules(atDate = new Date()) {
  try {
    const rules = await TaxRule.find({
      isActive: true,
      effectiveFrom: { $lte: atDate },
      $or: [{ effectiveTo: null }, { effectiveTo: { $gte: atDate } }]
    })
      .sort({ minAmount: 1 })
      .lean<TaxRuleInput[]>();
    return rules.length ? rules : defaultTaxRules;
  } catch {
    return defaultTaxRules;
  }
}

export async function ensureDefaultTaxRules() {
  const existing = await TaxRule.countDocuments();
  if (existing > 0) return;
  await TaxRule.insertMany(defaultTaxRules.map((rule) => ({ ...rule, effectiveFrom: new Date() })));
}

/**
 * Authoritative tax calculation uses the central fixed-precision engine.
 * DB tax rules remain for admin display; statutory brackets come from the engine.
 */
export async function calculateAfghanistanSalaryTax(grossSalaryInput: number): Promise<SalaryTaxResult> {
  await getActiveTaxRules();
  return calculateAfghanistanWageWithholdingTax(grossSalaryInput);
}

export function getHijriYearMonth(dateInput?: Date | string) {
  const date = dateInput ? dayjs(dateInput) : dayjs();
  const jalali = date.calendar('jalali');
  return {
    year: jalali.year(),
    month: jalali.month() + 1
  };
}
