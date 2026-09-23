import assert from 'node:assert/strict';
import {
  applySalaryPayoutAcrossRecords,
  calculateAfghanistanWageWithholdingTax,
  calculateManagerPayroll,
  calculateStudentFeePayment,
  calculateTeacherPayroll,
  deriveFeeLifecycleStatus,
  deriveSalaryPayoutStatus,
  percentOf,
  roundMoney,
  subMoney
} from './financialCalculationEngine';

function almostEqual(actual: number, expected: number, label: string) {
  assert.equal(roundMoney(actual), roundMoney(expected), label);
}

function runTaxBoundaries() {
  // Formula: 0 – 5,000 → Tax = 0
  almostEqual(calculateAfghanistanWageWithholdingTax(0).taxAmount, 0, 'tax@0');
  almostEqual(calculateAfghanistanWageWithholdingTax(4999.99).taxAmount, 0, 'tax@4999.99');
  almostEqual(calculateAfghanistanWageWithholdingTax(5000).taxAmount, 0, 'tax@5000 boundary exempt');

  // Formula: 5,000 – 12,500 → Tax = 2% × (Gross − 5,000)
  almostEqual(calculateAfghanistanWageWithholdingTax(5000.01).taxAmount, percentOf(0.01, 2), 'tax@5000.01');
  almostEqual(calculateAfghanistanWageWithholdingTax(10000).taxAmount, 100, 'tax@10000 = 2%*(5000)');
  almostEqual(calculateAfghanistanWageWithholdingTax(12500).taxAmount, 150, 'tax@12500 boundary = 150');

  // Formula: 12,500 – 100,000 → Tax = 150 + 10% × (Gross − 12,500)
  almostEqual(calculateAfghanistanWageWithholdingTax(12500.01).taxAmount, roundMoney(150 + percentOf(0.01, 10)), 'tax@12500.01');
  almostEqual(calculateAfghanistanWageWithholdingTax(20000).taxAmount, 900, 'tax@20000 = 150+750');
  almostEqual(calculateAfghanistanWageWithholdingTax(100000).taxAmount, 8900, 'tax@100000 boundary = 8900');

  // Formula: >100,000 → Tax = 8,900 + 20% × (Gross − 100,000)
  almostEqual(calculateAfghanistanWageWithholdingTax(100000.01).taxAmount, roundMoney(8900 + percentOf(0.01, 20)), 'tax@100000.01');
  almostEqual(calculateAfghanistanWageWithholdingTax(120000).taxAmount, 12900, 'tax@120000 = 8900+4000');

  const netCheck = calculateAfghanistanWageWithholdingTax(20000);
  almostEqual(netCheck.netSalary, 19100, 'net = gross - tax');
  assert.equal(netCheck.bracketId, 'rate_10');
  assert.ok(netCheck.formula.includes('150 + 10%'));
}

function runStudentFeeFormulas() {
  const pending = calculateStudentFeePayment({
    feeAmount: 12000,
    previouslyPaid: 0,
    requestedAmount: 4000
  });
  almostEqual(pending.remainingBefore, 12000, 'remaining before');
  almostEqual(pending.appliedAmount, 4000, 'applied');
  almostEqual(pending.remainingAfter, 8000, 'remaining after partial');
  assert.equal(pending.statusAfter, 'partially_paid');

  const withDiscount = calculateStudentFeePayment({
    feeAmount: 10000,
    previouslyPaid: 7000,
    requestedAmount: 4000,
    discount: 1000
  });
  almostEqual(withDiscount.appliedAmount, 3000, 'discount reduces applied');
  almostEqual(withDiscount.remainingAfter, 0, 'fully paid after discount');
  assert.equal(withDiscount.statusAfter, 'paid');

  assert.throws(
    () =>
      calculateStudentFeePayment({
        feeAmount: 5000,
        previouslyPaid: 4000,
        requestedAmount: 2000
      }),
    /exceeds remaining balance/i
  );

  assert.equal(deriveFeeLifecycleStatus(1000, 0), 'pending');
  assert.equal(deriveFeeLifecycleStatus(1000, 400), 'partially_paid');
  assert.equal(deriveFeeLifecycleStatus(1000, 1000), 'paid');
}

function runTeacherPayrollFormulas() {
  const fixed = calculateTeacherPayroll({
    salaryMode: 'fixed_salary',
    fixedAmount: 15000,
    commissionBase: 50000,
    commissionPercentage: 10
  });
  almostEqual(fixed.grossSalary, 15000, 'fixed ignores commission base');
  almostEqual(fixed.taxAmount, 400, 'tax on 15000 = 150 + 10%*2500 = 400');
  almostEqual(fixed.netSalary, 14600, 'net fixed');

  const percentage = calculateTeacherPayroll({
    salaryMode: 'percentage',
    fixedAmount: 15000,
    commissionBase: 50000,
    commissionPercentage: 10
  });
  almostEqual(percentage.commissionAmount, 5000, '10% of 50000');
  almostEqual(percentage.grossSalary, 5000, 'percentage-only gross');
  almostEqual(percentage.taxAmount, 0, '5000 exempt');

  const hybrid = calculateTeacherPayroll({
    salaryMode: 'fixed_plus_percentage',
    fixedAmount: 5000,
    commissionBase: 40000,
    commissionPercentage: 5
  });
  almostEqual(hybrid.grossSalary, 7000, '5000 + 2000');
  almostEqual(hybrid.taxAmount, 40, '2% of 2000');
  almostEqual(hybrid.netSalary, 6960, 'hybrid net');
}

function runManagerPayrollFormulas() {
  const manager = calculateManagerPayroll({
    salaryMode: 'fixed_plus_percentage',
    fixedAmount: 20000,
    commissionBase: 200000,
    commissionPercentage: 2
  });
  // Gross = 20000 + 4000 = 24000 → tax = 150 + 10%*(24000-12500) = 150 + 1150 = 1300
  almostEqual(manager.grossSalary, 24000, 'manager gross');
  almostEqual(manager.taxAmount, 1300, 'manager tax');
  almostEqual(manager.netSalary, 22700, 'manager net');
}

function runSalaryPayoutApplication() {
  const result = applySalaryPayoutAcrossRecords({
    records: [
      { recordId: 'a', netSalary: 5000, paidAmount: 2000 },
      { recordId: 'b', netSalary: 4000, paidAmount: 0 }
    ],
    payoutNetAmount: 6000
  });

  assert.equal(result.applications.length, 2);
  almostEqual(result.applications[0].applied, 3000, 'first record fills remaining 3000');
  almostEqual(result.applications[1].applied, 3000, 'second record takes 3000');
  almostEqual(result.remainingUnapplied, 0, 'fully applied');
  assert.equal(result.applications[0].statusAfter, 'paid');
  assert.equal(result.applications[1].statusAfter, 'partially_paid');
  assert.equal(deriveSalaryPayoutStatus(4000, 3000), 'partially_paid');

  assert.throws(() => {
    const over = applySalaryPayoutAcrossRecords({
      records: [{ recordId: 'x', netSalary: 1000, paidAmount: 0 }],
      payoutNetAmount: 1500
    });
    if (over.remainingUnapplied > 0.001) {
      throw new Error('Salary payment exceeds unpaid net salary for this period');
    }
  }, /exceeds unpaid net/i);
}

function runMoneyPrecision() {
  almostEqual(roundMoney(1.234), 1.23, 'round down');
  almostEqual(roundMoney(10.125), 10.13, 'round money to 2dp');
  almostEqual(subMoney(10.1, 0.2), 9.9, 'subMoney avoids float drift');
  almostEqual(percentOf(10000, 2), 200, 'percentOf');
}

function run() {
  runMoneyPrecision();
  runTaxBoundaries();
  runStudentFeeFormulas();
  runTeacherPayrollFormulas();
  runManagerPayrollFormulas();
  runSalaryPayoutApplication();
  console.log('financialCalculationEngine tests passed');
  console.log('Formulas covered:');
  console.log('  Tax 0–5000: Tax = 0');
  console.log('  Tax 5000–12500: Tax = 2% × (Gross − 5000)');
  console.log('  Tax 12500–100000: Tax = 150 + 10% × (Gross − 12500)');
  console.log('  Tax >100000: Tax = 8900 + 20% × (Gross − 100000)');
  console.log('  Student: remaining = fee − paid; statuses pending|partially_paid|paid');
  console.log('  Teacher/Manager gross: fixed | % base | fixed + % base; net = gross − tax');
}

run();
