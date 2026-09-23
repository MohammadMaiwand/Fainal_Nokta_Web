/**
 * Finance reconciliation — REPORT ONLY.
 * Does not mutate production data.
 *
 * Usage:
 *   npm run reconcile:finance
 */
import mongoose from 'mongoose';
import { config } from '../config/env';
import { Payment } from '../models/Payment';
import { Salary } from '../models/Salary';
import { SalaryRecord } from '../models/SalaryRecord';
import { Student } from '../models/Student';
import {
  NON_REVENUE_PAYMENT_STATUSES,
  calculateAfghanistanWageWithholdingTax,
  deriveFeeLifecycleStatus,
  deriveSalaryPayoutStatus,
  roundMoney,
  subMoney
} from '../services/financialCalculationEngine';

type Finding = {
  severity: 'info' | 'warning' | 'critical';
  code: string;
  entityType: string;
  entityId: string;
  message: string;
};

async function main() {
  await mongoose.connect(config.mongoUri);
  const findings: Finding[] = [];

  const students = await Student.find({ isDeleted: false })
    .select('_id firstName lastName feeAmount paidAmount remainingBalance')
    .lean<any[]>();
  for (const student of students) {
    const paidAgg = await Payment.aggregate([
      {
        $match: {
          studentId: student._id,
          isDeleted: false,
          paymentFor: 'student_fee',
          status: { $nin: [...NON_REVENUE_PAYMENT_STATUSES] }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const computedPaid = roundMoney(Number(paidAgg[0]?.total ?? 0));
    const storedPaid = roundMoney(Number(student.paidAmount || 0));
    const fee = roundMoney(Number(student.feeAmount || 0));
    const computedRemaining = Math.max(0, subMoney(fee, computedPaid));
    const storedRemaining = roundMoney(Number(student.remainingBalance || 0));
    const status = deriveFeeLifecycleStatus(fee, computedPaid);

    if (Math.abs(computedPaid - storedPaid) > 0.01 || Math.abs(computedRemaining - storedRemaining) > 0.01) {
      findings.push({
        severity: 'warning',
        code: 'STUDENT_BALANCE_MISMATCH',
        entityType: 'student',
        entityId: String(student._id),
        message: `stored paid/remaining=${storedPaid}/${storedRemaining}; computed=${computedPaid}/${computedRemaining} (${status})`
      });
    }
  }

  const salaryRecords = await SalaryRecord.find({ isDeleted: false }).lean<any[]>();
  for (const record of salaryRecords) {
    const tax = calculateAfghanistanWageWithholdingTax(Number(record.grossSalary || 0));
    if (Math.abs(tax.taxAmount - Number(record.taxAmount || 0)) > 0.01 || Math.abs(tax.netSalary - Number(record.netSalary || 0)) > 0.01) {
      findings.push({
        severity: 'critical',
        code: 'SALARY_TAX_MISMATCH',
        entityType: 'salary_record',
        entityId: String(record._id),
        message: `stored tax/net=${record.taxAmount}/${record.netSalary}; engine=${tax.taxAmount}/${tax.netSalary}`
      });
    }

    const status = deriveSalaryPayoutStatus(Number(record.netSalary || 0), Number(record.paidAmount || 0));
    if (String(record.paymentStatus || 'unpaid') !== status) {
      if (status === 'partially_paid' || record.paymentStatus === 'paid' || status === 'paid') {
        findings.push({
          severity: 'info',
          code: 'SALARY_STATUS_DRIFT',
          entityType: 'salary_record',
          entityId: String(record._id),
          message: `stored status=${record.paymentStatus}; derived=${status}`
        });
      }
    }

    const ledgerAgg = await Payment.aggregate([
      {
        $match: {
          isDeleted: false,
          salaryRecordIds: record._id,
          paymentFor: { $in: ['teacher_salary', 'manager_salary'] },
          status: { $nin: [...NON_REVENUE_PAYMENT_STATUSES] }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const ledgerPaid = roundMoney(Number(ledgerAgg[0]?.total ?? 0));
    const storedPaid = roundMoney(Number(record.paidAmount || 0));
    if (Math.abs(ledgerPaid - storedPaid) > 0.01) {
      findings.push({
        severity: 'warning',
        code: 'SALARY_LEDGER_MISMATCH',
        entityType: 'salary_record',
        entityId: String(record._id),
        message: `SalaryRecord.paidAmount=${storedPaid}; Payment ledger sum=${ledgerPaid}`
      });
    }
  }

  const legacySalaries = await Salary.find({ isDeleted: false }).select('_id employeeId monthKey paidAmount status').lean<any[]>();
  // Count only — do not flood findings; unified path is SalaryRecord + Payment.

  const [
    paymentsTotal,
    activePayments,
    reversedCount,
    refundedCount,
    cancelledCount,
    studentFeeActive,
    salaryActive
  ] = await Promise.all([
    Payment.countDocuments({ isDeleted: false }),
    Payment.countDocuments({ isDeleted: false, status: { $nin: [...NON_REVENUE_PAYMENT_STATUSES] } }),
    Payment.countDocuments({ isDeleted: false, status: 'reversed' }),
    Payment.countDocuments({ isDeleted: false, status: 'refunded' }),
    Payment.countDocuments({ isDeleted: false, status: 'cancelled' }),
    Payment.countDocuments({
      isDeleted: false,
      paymentFor: 'student_fee',
      status: { $nin: [...NON_REVENUE_PAYMENT_STATUSES] }
    }),
    Payment.countDocuments({
      isDeleted: false,
      paymentFor: { $in: ['teacher_salary', 'manager_salary'] },
      status: { $nin: [...NON_REVENUE_PAYMENT_STATUSES] }
    })
  ]);

  const report = {
    mode: 'report-only',
    mutatesData: false,
    generatedAt: new Date().toISOString(),
    totals: {
      studentsChecked: students.length,
      salaryRecordsChecked: salaryRecords.length,
      legacySalaryRecordsCounted: legacySalaries.length,
      paymentsCounted: paymentsTotal,
      activePayments,
      reversedPayments: reversedCount,
      refundedPayments: refundedCount,
      cancelledPayments: cancelledCount,
      activeStudentFeePayments: studentFeeActive,
      activeSalaryPayments: salaryActive,
      findings: findings.length,
      critical: findings.filter((item) => item.severity === 'critical').length,
      warning: findings.filter((item) => item.severity === 'warning').length,
      info: findings.filter((item) => item.severity === 'info').length
    },
    findings: findings.slice(0, 500),
    truncated: findings.length > 500,
    migrationNote: 'No historical data was modified. Use migrate:finance (dry-run) then migrate:finance -- --apply only after explicit approval.'
  };

  console.log(JSON.stringify(report, null, 2));
  await mongoose.disconnect();

  if (report.totals.critical > 0) {
    process.exitCode = 2;
  }
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
