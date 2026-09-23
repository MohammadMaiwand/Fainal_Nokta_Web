import { addMoney, roundMoney, subMoney } from './financialCalculationEngine';

export type LoanLifecycleStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'active'
  | 'partially_repaid'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'reversed';

export function deriveLoanStatus(input: {
  originalAmount: number;
  repaidAmount: number;
  dueDate?: Date | string | null;
  now?: Date;
  forcedStatus?: LoanLifecycleStatus | null;
}): LoanLifecycleStatus {
  if (input.forcedStatus === 'cancelled' || input.forcedStatus === 'reversed' || input.forcedStatus === 'draft') {
    return input.forcedStatus;
  }

  const original = roundMoney(Math.max(0, input.originalAmount));
  const repaid = roundMoney(Math.max(0, input.repaidAmount));
  const remaining = Math.max(0, subMoney(original, repaid));

  if (remaining <= 0) return 'paid';
  if (repaid > 0) {
    const overdue =
      input.dueDate && new Date(input.dueDate).getTime() < (input.now || new Date()).getTime();
    return overdue ? 'overdue' : 'partially_repaid';
  }

  if (input.dueDate && new Date(input.dueDate).getTime() < (input.now || new Date()).getTime()) {
    return 'overdue';
  }

  if (input.forcedStatus === 'approved' || input.forcedStatus === 'pending_approval') {
    return input.forcedStatus;
  }

  return 'active';
}

export function applyLoanRepaymentAmounts(input: {
  originalAmount: number;
  repaidAmount: number;
  repaymentAmount: number;
}) {
  const original = roundMoney(Math.max(0, input.originalAmount));
  const previouslyRepaid = roundMoney(Math.max(0, input.repaidAmount));
  const remainingBefore = Math.max(0, subMoney(original, previouslyRepaid));
  const repayment = roundMoney(input.repaymentAmount);

  if (!(repayment > 0)) {
    throw Object.assign(new Error('Repayment amount must be greater than zero'), { statusCode: 400 });
  }
  if (repayment > remainingBefore) {
    throw Object.assign(new Error('Repayment cannot exceed remaining loan balance'), { statusCode: 400 });
  }

  const repaidAfter = addMoney(previouslyRepaid, repayment);
  const remainingAfter = Math.max(0, subMoney(original, repaidAfter));
  const status = deriveLoanStatus({ originalAmount: original, repaidAmount: repaidAfter });

  return {
    original,
    previouslyRepaid,
    remainingBefore,
    repayment,
    repaidAfter,
    remainingAfter,
    status
  };
}

export function resolvePayrollLoanInstallment(input: {
  remainingAmount: number;
  installmentAmount: number;
  availableNetSalary: number;
}) {
  const remaining = roundMoney(Math.max(0, input.remainingAmount));
  const planned = roundMoney(Math.max(0, input.installmentAmount));
  const available = roundMoney(Math.max(0, input.availableNetSalary));
  const cappedByRemaining = Math.min(remaining, planned || remaining);
  const applied = Math.min(cappedByRemaining, available);
  return {
    plannedInstallment: planned,
    appliedInstallment: roundMoney(applied),
    carriedForward: Math.max(0, subMoney(cappedByRemaining, applied)),
    warning: applied < cappedByRemaining ? 'installment_capped_by_available_salary' : ''
  };
}
