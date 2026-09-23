import assert from 'node:assert/strict';
import {
  applyLoanRepaymentAmounts,
  deriveLoanStatus,
  resolvePayrollLoanInstallment
} from './loanCalculation';

function balancesAndStatus() {
  const partial = applyLoanRepaymentAmounts({
    originalAmount: 10000,
    repaidAmount: 0,
    repaymentAmount: 2500
  });
  assert.equal(partial.repaidAfter, 2500);
  assert.equal(partial.remainingAfter, 7500);
  assert.equal(partial.status, 'partially_repaid');

  const full = applyLoanRepaymentAmounts({
    originalAmount: 10000,
    repaidAmount: 7500,
    repaymentAmount: 2500
  });
  assert.equal(full.remainingAfter, 0);
  assert.equal(full.status, 'paid');

  assert.throws(() =>
    applyLoanRepaymentAmounts({
      originalAmount: 1000,
      repaidAmount: 0,
      repaymentAmount: 1001
    })
  );

  assert.equal(deriveLoanStatus({ originalAmount: 5000, repaidAmount: 0 }), 'active');
  assert.equal(deriveLoanStatus({ originalAmount: 5000, repaidAmount: 5000 }), 'paid');
}

function payrollInstallment() {
  const capped = resolvePayrollLoanInstallment({
    remainingAmount: 8000,
    installmentAmount: 3000,
    availableNetSalary: 2000
  });
  assert.equal(capped.appliedInstallment, 2000);
  assert.equal(capped.carriedForward, 1000);
  assert.ok(capped.warning);

  const normal = resolvePayrollLoanInstallment({
    remainingAmount: 1500,
    installmentAmount: 3000,
    availableNetSalary: 5000
  });
  assert.equal(normal.appliedInstallment, 1500);
}

function run() {
  balancesAndStatus();
  payrollInstallment();
  console.log('loanCalculation tests passed');
}

run();
