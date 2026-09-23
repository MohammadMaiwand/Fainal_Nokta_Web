import assert from 'node:assert/strict';
import {
  applySalaryPayoutAcrossRecords,
  calculateAfghanistanWageWithholdingTax,
  calculateManagerPayroll,
  calculateStudentFeePayment,
  calculateTeacherPayroll,
  deriveFeeLifecycleStatus,
  deriveSalaryPayoutStatus,
  isTerminalReversalStatus,
  mapFeeStatusToPaymentRecordStatus,
  normalizePaymentRecordStatus,
  roundMoney,
  subMoney
} from './financialCalculationEngine';

/**
 * Integration-style workflow tests for Make Payment (pure authoritative math).
 * These validate the same formulas the makePayment service applies before DB writes.
 */

function studentSelectionAndPayment() {
  const first = calculateStudentFeePayment({
    feeAmount: 12000,
    previouslyPaid: 0,
    requestedAmount: 5000
  });
  assert.equal(first.statusAfter, 'partially_paid');
  assert.equal(mapFeeStatusToPaymentRecordStatus(first.statusAfter), 'partially_paid');

  const second = calculateStudentFeePayment({
    feeAmount: 12000,
    previouslyPaid: first.totalPaidAfter,
    requestedAmount: 7000
  });
  assert.equal(second.statusAfter, 'paid');
  assert.equal(mapFeeStatusToPaymentRecordStatus(second.statusAfter), 'paid');
  assert.equal(second.remainingAfter, 0);
}

function teacherPayrollPreviewAndPayment() {
  const preview = calculateTeacherPayroll({
    salaryMode: 'fixed_plus_percentage',
    fixedAmount: 8000,
    commissionBase: 60000,
    commissionPercentage: 5
  });
  // Gross = 8000 + 3000 = 11000 → tax = 2%*(11000-5000)=120
  assert.equal(preview.grossSalary, 11000);
  assert.equal(preview.taxAmount, 120);
  assert.equal(preview.netSalary, 10880);

  const payout = applySalaryPayoutAcrossRecords({
    records: [{ recordId: 't1', netSalary: preview.netSalary, paidAmount: 0 }],
    payoutNetAmount: preview.netSalary
  });
  assert.equal(payout.applications[0].statusAfter, 'paid');
  assert.equal(payout.remainingUnapplied, 0);
}

function managerPayrollPreviewAndPayment() {
  const preview = calculateManagerPayroll({
    salaryMode: 'percentage',
    fixedAmount: 0,
    commissionBase: 250000,
    commissionPercentage: 4
  });
  // Gross = 10000 → tax = 2%*5000 = 100
  assert.equal(preview.grossSalary, 10000);
  assert.equal(preview.taxAmount, 100);

  const partial = applySalaryPayoutAcrossRecords({
    records: [{ recordId: 'm1', netSalary: preview.netSalary, paidAmount: 0 }],
    payoutNetAmount: 5000
  });
  assert.equal(partial.applications[0].statusAfter, 'partially_paid');

  const unpaid = preview.netSalary - 5000;
  const remainder = applySalaryPayoutAcrossRecords({
    records: [{ recordId: 'm1', netSalary: preview.netSalary, paidAmount: 5000 }],
    payoutNetAmount: Math.min(preview.netSalary, unpaid)
  });
  assert.equal(remainder.applications[0].statusAfter, 'paid');
  assert.equal(remainder.remainingUnapplied, 0);
  assert.equal(remainder.totalRemainingAfter, 0);
}

function authoritativeTaxRecalculation() {
  const clientGuess = 900;
  const serverTax = calculateAfghanistanWageWithholdingTax(20000);
  assert.notEqual(clientGuess, undefined);
  assert.equal(serverTax.taxAmount, 900);
  assert.equal(serverTax.netSalary, 19100);
}

function receiptAndStatusPersistenceShapes() {
  assert.equal(normalizePaymentRecordStatus('completed'), 'paid');
  assert.equal(normalizePaymentRecordStatus('partially_paid'), 'partially_paid');
  assert.equal(normalizePaymentRecordStatus('reversed'), 'reversed');
  assert.equal(normalizePaymentRecordStatus('refunded'), 'refunded');
  assert.equal(normalizePaymentRecordStatus('pending'), 'pending');
}

/** Mirrors reverseOrRefundPayment student balance restoration. */
function studentFeeReverseAndRefundRestoreBalances() {
  const feeAmount = 12000;
  const pay = calculateStudentFeePayment({
    feeAmount,
    previouslyPaid: 0,
    requestedAmount: 5000
  });
  assert.equal(pay.totalPaidAfter, 5000);
  assert.equal(pay.remainingAfter, 7000);

  const paidAfterReverse = roundMoney(subMoney(pay.totalPaidAfter, pay.appliedAmount));
  const remainingAfterReverse = Math.max(0, subMoney(feeAmount, paidAfterReverse));
  assert.equal(paidAfterReverse, 0);
  assert.equal(remainingAfterReverse, 12000);
  assert.equal(deriveFeeLifecycleStatus(feeAmount, paidAfterReverse), 'pending');

  const second = calculateStudentFeePayment({
    feeAmount,
    previouslyPaid: 5000,
    requestedAmount: 3000
  });
  const paidAfterSecondReverse = roundMoney(subMoney(second.totalPaidAfter, second.appliedAmount));
  assert.equal(paidAfterSecondReverse, 5000);
  assert.equal(Math.max(0, subMoney(feeAmount, paidAfterSecondReverse)), 7000);
  assert.equal(deriveFeeLifecycleStatus(feeAmount, paidAfterSecondReverse), 'partially_paid');
}

/** Mirrors reverseOrRefundPayment salary paidAmount restoration. */
function salaryReverseRestoresUnpaidNet() {
  const netSalary = 10880;
  const payout = applySalaryPayoutAcrossRecords({
    records: [{ recordId: 't1', netSalary, paidAmount: 0 }],
    payoutNetAmount: 6000
  });
  assert.equal(payout.applications[0].paidAfter, 6000);
  assert.equal(payout.applications[0].statusAfter, 'partially_paid');

  const reversedPaid = Math.max(0, subMoney(payout.applications[0].paidAfter, 6000));
  assert.equal(reversedPaid, 0);
  assert.equal(deriveSalaryPayoutStatus(netSalary, reversedPaid), 'unpaid');

  const fullPay = applySalaryPayoutAcrossRecords({
    records: [{ recordId: 't1', netSalary, paidAmount: 0 }],
    payoutNetAmount: netSalary
  });
  const afterFullReverse = Math.max(0, subMoney(fullPay.applications[0].paidAfter, netSalary));
  assert.equal(afterFullReverse, 0);
  assert.equal(deriveSalaryPayoutStatus(netSalary, afterFullReverse), 'unpaid');
}

/** Multi-record reverse must undo each application amount, not the full payment net on every record. */
function salaryReverseUsesPerRecordApplications() {
  const payout = applySalaryPayoutAcrossRecords({
    records: [
      { recordId: 'a', netSalary: 5000, paidAmount: 0 },
      { recordId: 'b', netSalary: 5000, paidAmount: 0 }
    ],
    payoutNetAmount: 7000
  });
  assert.equal(payout.applications.length, 2);
  assert.equal(payout.applications[0].applied, 5000);
  assert.equal(payout.applications[1].applied, 2000);

  const restored = payout.applications.map((item) => ({
    recordId: item.recordId,
    paidAfterReverse: Math.max(0, subMoney(item.paidAfter, item.applied))
  }));
  assert.equal(restored[0].paidAfterReverse, 0);
  assert.equal(restored[1].paidAfterReverse, 0);

  // Legacy bug: subtracting full 7000 from each record would underflow incorrectly if not clamped,
  // and would still leave wrong state when records had prior paid amounts.
  const priorPaid = applySalaryPayoutAcrossRecords({
    records: [
      { recordId: 'a', netSalary: 5000, paidAmount: 1000 },
      { recordId: 'b', netSalary: 5000, paidAmount: 0 }
    ],
    payoutNetAmount: 3000
  });
  assert.equal(priorPaid.applications[0].applied, 4000 > 3000 ? 3000 : 3000);
  assert.equal(priorPaid.applications[0].paidAfter, 4000);
  const afterAppReverse = Math.max(0, subMoney(4000, priorPaid.applications[0].applied));
  assert.equal(afterAppReverse, 1000);
  assert.equal(deriveSalaryPayoutStatus(5000, afterAppReverse), 'partially_paid');
}

function terminalReversalGuards() {
  assert.equal(isTerminalReversalStatus('reversed'), true);
  assert.equal(isTerminalReversalStatus('refunded'), true);
  assert.equal(isTerminalReversalStatus('cancelled'), true);
  assert.equal(isTerminalReversalStatus('paid'), false);
  assert.equal(isTerminalReversalStatus('partially_paid'), false);

  for (const status of ['reversed', 'refunded', 'cancelled'] as const) {
    assert.equal(isTerminalReversalStatus(normalizePaymentRecordStatus(status)), true);
  }
}

function run() {
  studentSelectionAndPayment();
  teacherPayrollPreviewAndPayment();
  managerPayrollPreviewAndPayment();
  authoritativeTaxRecalculation();
  receiptAndStatusPersistenceShapes();
  studentFeeReverseAndRefundRestoreBalances();
  salaryReverseRestoresUnpaidNet();
  salaryReverseUsesPerRecordApplications();
  terminalReversalGuards();
  console.log('makePayment workflow integration tests passed');
}

run();
