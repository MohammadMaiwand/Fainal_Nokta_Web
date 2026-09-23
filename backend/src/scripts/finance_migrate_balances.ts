/**
 * Finance data migration — DRY-RUN by default.
 *
 * Fixes:
 * - Student paidAmount / remainingBalance vs Payment ledger
 * - SalaryRecord tax/net vs Afghanistan withholding engine
 * - SalaryRecord paymentStatus vs paidAmount
 *
 * Usage:
 *   npx ts-node src/scripts/finance_migrate_balances.ts
 *   npx ts-node src/scripts/finance_migrate_balances.ts --apply
 *   npm run migrate:finance
 *   npm run migrate:finance -- --apply
 */
import mongoose from 'mongoose';
import { config } from '../config/env';
import { Payment } from '../models/Payment';
import { SalaryRecord } from '../models/SalaryRecord';
import { Student } from '../models/Student';
import {
  calculateAfghanistanWageWithholdingTax,
  deriveFeeLifecycleStatus,
  deriveSalaryPayoutStatus,
  roundMoney,
  subMoney
} from '../services/financialCalculationEngine';

type Change = {
  entityType: 'student' | 'salary_record';
  entityId: string;
  code: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
};

function parseArgs(argv: string[]) {
  return {
    apply: argv.includes('--apply')
  };
}

async function main() {
  const { apply } = parseArgs(process.argv.slice(2));
  await mongoose.connect(config.mongoUri);

  const changes: Change[] = [];
  let studentsUpdated = 0;
  let salaryUpdated = 0;

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
          status: { $nin: ['cancelled', 'refunded', 'reversed'] }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const computedPaid = roundMoney(Number(paidAgg[0]?.total ?? 0));
    const fee = roundMoney(Number(student.feeAmount || 0));
    const computedRemaining = Math.max(0, subMoney(fee, computedPaid));
    const storedPaid = roundMoney(Number(student.paidAmount || 0));
    const storedRemaining = roundMoney(Number(student.remainingBalance || 0));

    if (Math.abs(computedPaid - storedPaid) > 0.01 || Math.abs(computedRemaining - storedRemaining) > 0.01) {
      const after = {
        paidAmount: computedPaid,
        remainingBalance: computedRemaining,
        feeLifecycleStatus: deriveFeeLifecycleStatus(fee, computedPaid)
      };
      changes.push({
        entityType: 'student',
        entityId: String(student._id),
        code: 'SYNC_STUDENT_BALANCE',
        before: { paidAmount: storedPaid, remainingBalance: storedRemaining, feeAmount: fee },
        after
      });
      if (apply) {
        await Student.updateOne(
          { _id: student._id },
          { $set: { paidAmount: computedPaid, remainingBalance: computedRemaining } }
        );
        studentsUpdated += 1;
      }
    }
  }

  const salaryRecords = await SalaryRecord.find({ isDeleted: false }).lean<any[]>();
  for (const record of salaryRecords) {
    const tax = calculateAfghanistanWageWithholdingTax(Number(record.grossSalary || 0));
    const paymentStatus = deriveSalaryPayoutStatus(Number(tax.netSalary || 0), Number(record.paidAmount || 0));
    const needsTaxFix =
      Math.abs(tax.taxAmount - Number(record.taxAmount || 0)) > 0.01 ||
      Math.abs(tax.netSalary - Number(record.netSalary || 0)) > 0.01;
    const needsStatusFix = String(record.paymentStatus || 'unpaid') !== paymentStatus;

    if (needsTaxFix || needsStatusFix) {
      const after = {
        taxAmount: tax.taxAmount,
        netSalary: tax.netSalary,
        taxCategory: tax.taxCategory,
        taxFormula: tax.formula,
        taxExplanation: tax.explanation,
        paymentStatus
      };
      changes.push({
        entityType: 'salary_record',
        entityId: String(record._id),
        code: needsTaxFix ? 'SYNC_SALARY_TAX' : 'SYNC_SALARY_STATUS',
        before: {
          taxAmount: record.taxAmount,
          netSalary: record.netSalary,
          paymentStatus: record.paymentStatus
        },
        after
      });
      if (apply) {
        await SalaryRecord.updateOne(
          { _id: record._id },
          {
            $set: {
              taxAmount: tax.taxAmount,
              netSalary: tax.netSalary,
              taxCategory: tax.taxCategory,
              taxFormula: tax.formula,
              taxExplanation: tax.explanation,
              paymentStatus
            }
          }
        );
        salaryUpdated += 1;
      }
    }
  }

  const report = {
    mode: apply ? 'apply' : 'dry-run',
    generatedAt: new Date().toISOString(),
    totals: {
      studentsChecked: students.length,
      salaryRecordsChecked: salaryRecords.length,
      proposedChanges: changes.length,
      studentsUpdated,
      salaryRecordsUpdated: salaryUpdated
    },
    changes: changes.slice(0, 200),
    truncated: changes.length > 200
  };

  console.log(JSON.stringify(report, null, 2));
  if (!apply) {
    console.log('\nDry-run only. Re-run with --apply to write changes.');
  }

  await mongoose.disconnect();
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
