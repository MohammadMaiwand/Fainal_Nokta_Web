/**
 * Loan data consistency scan — reports issues; does not auto-delete.
 * Run: npx tsx src/scripts/loanConsistencyCheck.ts
 */
import mongoose from 'mongoose';
import { Loan } from '../models/Loan';
import { LoanRepayment } from '../models/LoanRepayment';
import { roundMoney, subMoney } from '../services/financialCalculationEngine';

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nokta';
  await mongoose.connect(uri);

  const issues: string[] = [];
  const loans = await Loan.find({ isDeleted: false }).lean<any[]>();

  for (const loan of loans) {
    const original = roundMoney(loan.originalAmount || 0);
    const repaid = roundMoney(loan.repaidAmount || 0);
    const remaining = roundMoney(loan.remainingAmount || 0);
    const expectedRemaining = roundMoney(Math.max(0, subMoney(original, repaid)));

    if (original <= 0) issues.push(`${loan.loanNumber}: originalAmount <= 0`);
    if (repaid < 0) issues.push(`${loan.loanNumber}: negative repaidAmount`);
    if (remaining < 0) issues.push(`${loan.loanNumber}: negative remainingAmount`);
    if (repaid > original + 0.01) issues.push(`${loan.loanNumber}: repaid > original`);
    if (Math.abs(remaining - expectedRemaining) > 0.01) {
      issues.push(`${loan.loanNumber}: remaining mismatch (stored=${remaining}, expected=${expectedRemaining})`);
    }
    if (loan.status === 'paid' && remaining > 0.01) {
      issues.push(`${loan.loanNumber}: paid status with remaining balance`);
    }
    if (['active', 'approved'].includes(String(loan.status)) && remaining <= 0.01 && repaid > 0) {
      issues.push(`${loan.loanNumber}: active/approved with zero remaining`);
    }
    if (!loan.branchId) issues.push(`${loan.loanNumber}: missing branchId`);
    if (!loan.personId) issues.push(`${loan.loanNumber}: missing personId`);
  }

  const repayments = await LoanRepayment.find({ isDeleted: false }).lean<any[]>();
  for (const repayment of repayments) {
    if (!repayment.loanId) issues.push(`repayment ${repayment.repaymentNumber}: missing loanId`);
    const loan = loans.find((item) => String(item._id) === String(repayment.loanId));
    if (!loan) issues.push(`repayment ${repayment.repaymentNumber}: loan not found`);
    else if (String(loan.personId) !== String(repayment.personId)) {
      issues.push(`repayment ${repayment.repaymentNumber}: person mismatch`);
    }
  }

  const numbers = loans.map((item) => item.loanNumber);
  const dupNumbers = numbers.filter((value, index) => numbers.indexOf(value) !== index);
  for (const number of [...new Set(dupNumbers)]) {
    issues.push(`duplicate loanNumber: ${number}`);
  }

  console.log(JSON.stringify({ scannedLoans: loans.length, scannedRepayments: repayments.length, issueCount: issues.length, issues }, null, 2));
  await mongoose.disconnect();
  process.exit(issues.length ? 1 : 0);
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
