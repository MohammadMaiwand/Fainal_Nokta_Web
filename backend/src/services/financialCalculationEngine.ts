/**
 * Central financial calculation engine (authoritative, fixed-precision AFN).
 * All money values are rounded to 2 decimal places (Afghani pul).
 * Pure functions — no database I/O.
 */

export const MONEY_SCALE = 100; // 2 decimal places

export type Money = number;

export type SalaryMode = 'fixed_salary' | 'percentage' | 'fixed_plus_percentage';

export type FeePaymentLifecycleStatus = 'pending' | 'partially_paid' | 'paid' | 'overpaid';

export type SalaryPayoutLifecycleStatus = 'unpaid' | 'partially_paid' | 'paid';

export type PaymentRecordStatus =
  | 'pending'
  | 'partially_paid'
  | 'paid'
  | 'completed'
  | 'reversed'
  | 'refunded'
  | 'cancelled';

export type AfghanistanTaxBracketId = 'exempt' | 'rate_2' | 'rate_10' | 'rate_20';

export type AfghanistanTaxResult = {
  grossSalary: Money;
  taxAmount: Money;
  netSalary: Money;
  taxableAmount: Money;
  baseTax: Money;
  taxRate: number;
  bracketId: AfghanistanTaxBracketId;
  taxCategory: string;
  formula: string;
  explanation: string;
  isTaxExempt: boolean;
};

export type StudentFeeBreakdown = {
  feeAmount: Money;
  previouslyPaid: Money;
  discount: Money;
  paymentAmount: Money;
  appliedAmount: Money;
  remainingBefore: Money;
  remainingAfter: Money;
  totalPaidAfter: Money;
  statusBefore: FeePaymentLifecycleStatus;
  statusAfter: FeePaymentLifecycleStatus;
};

export type PayrollGrossInput = {
  salaryMode: SalaryMode | string;
  fixedAmount: Money;
  commissionBase: Money;
  commissionPercentage: Money;
};

export type PayrollGrossResult = {
  salaryMode: SalaryMode;
  fixedAmount: Money;
  commissionBase: Money;
  commissionPercentage: Money;
  commissionAmount: Money;
  grossSalary: Money;
  formula: string;
};

export type PayrollNetResult = PayrollGrossResult & AfghanistanTaxResult;

export type SalaryPayoutApplication = {
  recordId: string;
  netSalary: Money;
  previouslyPaid: Money;
  remainingBefore: Money;
  applied: Money;
  paidAfter: Money;
  statusAfter: SalaryPayoutLifecycleStatus;
};

/** Round half-up to 2 decimal places using integer arithmetic. */
export function roundMoney(value: number): Money {
  if (!Number.isFinite(value)) return 0;
  const sign = value < 0 ? -1 : 1;
  const absolute = Math.abs(value);
  const scaled = Math.round(absolute * MONEY_SCALE + Number.EPSILON);
  return (sign * scaled) / MONEY_SCALE;
}

export function addMoney(...values: number[]): Money {
  const scaled = values.reduce((sum, value) => sum + Math.round(roundMoney(value) * MONEY_SCALE), 0);
  return scaled / MONEY_SCALE;
}

export function subMoney(left: number, right: number): Money {
  return roundMoney(roundMoney(left) - roundMoney(right));
}

export function mulMoney(left: number, right: number): Money {
  return roundMoney(roundMoney(left) * roundMoney(right));
}

export function percentOf(amount: number, percentage: number): Money {
  return roundMoney((roundMoney(amount) * roundMoney(percentage)) / 100);
}

export function normalizeSalaryMode(salaryType?: string | null): SalaryMode {
  if (salaryType === 'fixed' || salaryType === 'fixed_salary') return 'fixed_salary';
  if (salaryType === 'percentage') return 'percentage';
  if (salaryType === 'fixed_plus_percentage') return 'fixed_plus_percentage';
  return 'fixed_salary';
}

/**
 * Afghanistan monthly wage withholding tax (AFN).
 *
 * Formulas (authoritative):
 * - 0 – 5,000:                Tax = 0
 * - 5,000 – 12,500:           Tax = 2% × (Gross − 5,000)
 * - 12,500 – 100,000:         Tax = 150 + 10% × (Gross − 12,500)
 * - More than 100,000:        Tax = 8,900 + 20% × (Gross − 100,000)
 *
 * Boundary notes (continuous AFN):
 * - Gross = 5,000 → exempt (0)
 * - Gross = 12,500 → 150 (same under 2% or 10% formula)
 * - Gross = 100,000 → 8,900 (top of 10% bracket; 20% starts above 100,000)
 */
export function calculateAfghanistanWageWithholdingTax(grossSalaryInput: number): AfghanistanTaxResult {
  const grossSalary = roundMoney(Math.max(0, Number(grossSalaryInput || 0)));

  if (grossSalary <= 5000) {
    return {
      grossSalary,
      taxAmount: 0,
      netSalary: grossSalary,
      taxableAmount: 0,
      baseTax: 0,
      taxRate: 0,
      bracketId: 'exempt',
      taxCategory: 'معاف از مالیه',
      formula: 'Tax = 0',
      explanation: '0 – 5,000 AFN: Tax = 0',
      isTaxExempt: true
    };
  }

  if (grossSalary <= 12500) {
    const taxableAmount = subMoney(grossSalary, 5000);
    const taxAmount = percentOf(taxableAmount, 2);
    return {
      grossSalary,
      taxAmount,
      netSalary: subMoney(grossSalary, taxAmount),
      taxableAmount,
      baseTax: 0,
      taxRate: 2,
      bracketId: 'rate_2',
      taxCategory: 'کتگوری ۲٪',
      formula: `Tax = 2% × (${grossSalary} − 5,000) = ${taxAmount}`,
      explanation: '5,000 – 12,500 AFN: Tax = 2% × (Gross Salary − 5,000)',
      isTaxExempt: taxAmount <= 0
    };
  }

  if (grossSalary <= 100000) {
    const taxableAmount = subMoney(grossSalary, 12500);
    const progressive = percentOf(taxableAmount, 10);
    const taxAmount = addMoney(150, progressive);
    return {
      grossSalary,
      taxAmount,
      netSalary: subMoney(grossSalary, taxAmount),
      taxableAmount,
      baseTax: 150,
      taxRate: 10,
      bracketId: 'rate_10',
      taxCategory: 'کتگوری ۱۰٪',
      formula: `Tax = 150 + 10% × (${grossSalary} − 12,500) = ${taxAmount}`,
      explanation: '12,500 – 100,000 AFN: Tax = 150 + 10% × (Gross Salary − 12,500)',
      isTaxExempt: false
    };
  }

  const taxableAmount = subMoney(grossSalary, 100000);
  const progressive = percentOf(taxableAmount, 20);
  const taxAmount = addMoney(8900, progressive);
  return {
    grossSalary,
    taxAmount,
    netSalary: subMoney(grossSalary, taxAmount),
    taxableAmount,
    baseTax: 8900,
    taxRate: 20,
    bracketId: 'rate_20',
    taxCategory: 'کتگوری ۲۰٪',
    formula: `Tax = 8,900 + 20% × (${grossSalary} − 100,000) = ${taxAmount}`,
    explanation: 'More than 100,000 AFN: Tax = 8,900 + 20% × (Gross Salary − 100,000)',
    isTaxExempt: false
  };
}

export function deriveFeeLifecycleStatus(feeAmountInput: number, paidAmountInput: number): FeePaymentLifecycleStatus {
  const feeAmount = roundMoney(Math.max(0, feeAmountInput));
  const paidAmount = roundMoney(Math.max(0, paidAmountInput));
  if (paidAmount <= 0) return 'pending';
  if (paidAmount + 0.001 < feeAmount) return 'partially_paid';
  if (paidAmount > feeAmount + 0.001) return 'overpaid';
  return 'paid';
}

export function calculateStudentFeePayment(input: {
  feeAmount: number;
  previouslyPaid: number;
  requestedAmount: number;
  discount?: number;
}): StudentFeeBreakdown {
  const feeAmount = roundMoney(Math.max(0, input.feeAmount));
  const previouslyPaid = roundMoney(Math.max(0, input.previouslyPaid));
  const remainingBefore = Math.max(0, subMoney(feeAmount, previouslyPaid));
  const discount = roundMoney(Math.min(Math.max(0, Number(input.discount || 0)), Math.max(0, Number(input.requestedAmount || 0))));
  const paymentAmount = roundMoney(Math.max(0, Number(input.requestedAmount || 0)));
  const appliedAmount = Math.max(0, subMoney(paymentAmount, discount));

  if (appliedAmount > remainingBefore + 0.001) {
    throw new Error('Payment exceeds remaining balance');
  }

  const totalPaidAfter = addMoney(previouslyPaid, appliedAmount);
  const remainingAfter = Math.max(0, subMoney(feeAmount, totalPaidAfter));

  return {
    feeAmount,
    previouslyPaid,
    discount,
    paymentAmount,
    appliedAmount,
    remainingBefore,
    remainingAfter,
    totalPaidAfter,
    statusBefore: deriveFeeLifecycleStatus(feeAmount, previouslyPaid),
    statusAfter: deriveFeeLifecycleStatus(feeAmount, totalPaidAfter)
  };
}

export function calculateCommissionAmount(commissionBase: number, percentage: number): Money {
  return percentOf(commissionBase, percentage);
}

export function calculatePayrollGross(input: PayrollGrossInput): PayrollGrossResult {
  const salaryMode = normalizeSalaryMode(input.salaryMode);
  const fixedAmount = roundMoney(Math.max(0, Number(input.fixedAmount || 0)));
  const commissionBase = roundMoney(Math.max(0, Number(input.commissionBase || 0)));
  const commissionPercentage = roundMoney(Math.max(0, Number(input.commissionPercentage || 0)));
  const commissionAmount =
    salaryMode === 'percentage' || salaryMode === 'fixed_plus_percentage'
      ? calculateCommissionAmount(commissionBase, commissionPercentage)
      : 0;
  const fixedApplied = salaryMode === 'fixed_salary' || salaryMode === 'fixed_plus_percentage' ? fixedAmount : 0;
  const grossSalary = addMoney(fixedApplied, commissionAmount);

  let formula = '';
  if (salaryMode === 'fixed_salary') {
    formula = `Gross = Fixed(${fixedApplied})`;
  } else if (salaryMode === 'percentage') {
    formula = `Gross = ${commissionPercentage}% × ${commissionBase} = ${commissionAmount}`;
  } else {
    formula = `Gross = Fixed(${fixedApplied}) + ${commissionPercentage}% × ${commissionBase} = ${grossSalary}`;
  }

  return {
    salaryMode,
    fixedAmount: fixedApplied,
    commissionBase,
    commissionPercentage,
    commissionAmount,
    grossSalary,
    formula
  };
}

export function calculateTeacherPayroll(input: PayrollGrossInput): PayrollNetResult {
  const gross = calculatePayrollGross(input);
  const tax = calculateAfghanistanWageWithholdingTax(gross.grossSalary);
  return { ...gross, ...tax };
}

export function calculateManagerPayroll(input: PayrollGrossInput): PayrollNetResult {
  // Manager uses the same gross/tax engine; commission base is branch/system scoped by the caller.
  return calculateTeacherPayroll(input);
}

export function deriveSalaryPayoutStatus(netSalaryInput: number, paidAmountInput: number): SalaryPayoutLifecycleStatus {
  const netSalary = roundMoney(Math.max(0, netSalaryInput));
  const paidAmount = roundMoney(Math.max(0, paidAmountInput));
  if (paidAmount <= 0) return 'unpaid';
  if (paidAmount + 0.001 < netSalary) return 'partially_paid';
  return 'paid';
}

export function applySalaryPayoutAcrossRecords(input: {
  records: Array<{ recordId: string; netSalary: number; paidAmount: number }>;
  payoutNetAmount: number;
}): { applications: SalaryPayoutApplication[]; remainingUnapplied: Money; totalRemainingAfter: Money } {
  let remainingNetToApply = roundMoney(Math.max(0, input.payoutNetAmount));
  const applications: SalaryPayoutApplication[] = [];

  for (const record of input.records) {
    if (remainingNetToApply <= 0) break;
    const netSalary = roundMoney(Math.max(0, record.netSalary));
    const previouslyPaid = roundMoney(Math.max(0, record.paidAmount));
    const remainingBefore = Math.max(0, subMoney(netSalary, previouslyPaid));
    if (remainingBefore <= 0) continue;

    const applied = Math.min(remainingBefore, remainingNetToApply);
    remainingNetToApply = subMoney(remainingNetToApply, applied);
    const paidAfter = addMoney(previouslyPaid, applied);
    applications.push({
      recordId: record.recordId,
      netSalary,
      previouslyPaid,
      remainingBefore,
      applied,
      paidAfter,
      statusAfter: deriveSalaryPayoutStatus(netSalary, paidAfter)
    });
  }

  const totalRemainingAfter = input.records.reduce((sum, record) => {
    const application = applications.find((item) => item.recordId === record.recordId);
    const paidAfter = application ? application.paidAfter : roundMoney(Math.max(0, record.paidAmount));
    const remaining = Math.max(0, subMoney(roundMoney(Math.max(0, record.netSalary)), paidAfter));
    return addMoney(sum, remaining);
  }, 0);

  return {
    applications,
    remainingUnapplied: remainingNetToApply,
    totalRemainingAfter
  };
}

export function mapFeeStatusToPaymentRecordStatus(status: FeePaymentLifecycleStatus): PaymentRecordStatus {
  if (status === 'pending') return 'pending';
  if (status === 'partially_paid') return 'partially_paid';
  return 'paid';
}

export function isTerminalReversalStatus(status?: string | null) {
  return status === 'reversed' || status === 'refunded' || status === 'cancelled';
}

/** Statuses excluded from revenue, payroll totals, and active balance ledgers. */
export const NON_REVENUE_PAYMENT_STATUSES = ['cancelled', 'refunded', 'reversed'] as const;

export function paymentStatusExcludedFromTotals(status?: string | null) {
  return NON_REVENUE_PAYMENT_STATUSES.includes(String(status || '') as (typeof NON_REVENUE_PAYMENT_STATUSES)[number]);
}

export function normalizePaymentRecordStatus(status?: string | null): PaymentRecordStatus {
  const value = String(status || 'pending');
  if (value === 'completed') return 'paid';
  if (
    value === 'pending' ||
    value === 'partially_paid' ||
    value === 'paid' ||
    value === 'reversed' ||
    value === 'refunded' ||
    value === 'cancelled'
  ) {
    return value;
  }
  return 'pending';
}
