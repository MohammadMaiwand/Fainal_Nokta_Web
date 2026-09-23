import mongoose from 'mongoose';
import { Expense } from '../models/Expense';
import { Payment } from '../models/Payment';
import { SalaryRecord } from '../models/SalaryRecord';
import { Student } from '../models/Student';
import { User } from '../models/User';
import { generateInvoiceNumber } from '../utils/paymentInvoice';
import { calculateAfghanistanSalaryTax } from './afghanistanSalaryTaxService';
import {
  applySalaryPayoutAcrossRecords,
  calculateAfghanistanWageWithholdingTax,
  calculateManagerPayroll,
  calculateStudentFeePayment,
  calculateTeacherPayroll,
  deriveSalaryPayoutStatus,
  mapFeeStatusToPaymentRecordStatus,
  normalizePaymentRecordStatus,
  roundMoney,
  subMoney,
  type PaymentRecordStatus
} from './financialCalculationEngine';
import { calculateSalaryRecord } from './payrollCalculation.service';
import { teacherCompensationService } from './teacherCompensationService';
import { applyPayrollLoanDeductions, getActivePayrollLoanDeductions } from './loanService';

function isTransactionUnsupportedError(error: unknown) {
  const message = String((error as any)?.message || error || '');
  return /transaction numbers are only allowed|replica set member|mongos/i.test(message);
}

/** Prefer multi-doc transactions; fall back for standalone MongoDB (local/dev). */
async function withMongoTransaction<T>(fn: (session: mongoose.ClientSession | null) => Promise<T>): Promise<T> {
  let session: mongoose.ClientSession | null = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch {
        // ignore abort failures on unsupported topologies
      }
    }
    if (session && isTransactionUnsupportedError(error)) {
      return fn(null);
    }
    throw error;
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

export type MakePaymentRequest = {
  paymentFor: 'student_fee' | 'teacher_salary' | 'manager_salary' | 'expense';
  studentId?: string;
  payeeUserId?: string;
  payeeRole?: 'teacher' | 'manager';
  amount: number;
  grossSalary?: number;
  salaryMonth?: number;
  salaryYear?: number;
  discount?: number;
  method?: 'cash' | 'bank_transfer' | 'mobile_money' | 'card';
  paymentDate?: Date | string;
  referenceNumber?: string;
  notes?: string;
  expenseTitle?: string;
  expenseCategory?: string;
  branchId?: string | null;
  idempotencyKey?: string;
  actorUserId?: string | null;
  actorRole?: string | null;
  actorBranchId?: string | null;
};

export type MakePaymentResult = {
  payment: any;
  receipt: Record<string, unknown>;
  salarySlip?: Record<string, unknown> | null;
  idempotentReplay: boolean;
};

function buildPaymentReference() {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`;
  const entropy = `${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
  return `PAY-${stamp}-${entropy}`;
}

async function resolvePaymentReference(rawReference?: string | null, session?: mongoose.ClientSession) {
  const trimmedReference = String(rawReference ?? '').trim();
  if (trimmedReference) {
    const duplicate = await Payment.findOne({ referenceNumber: trimmedReference, isDeleted: false })
      .session(session ?? null)
      .select('_id')
      .lean();
    if (duplicate) {
      throw Object.assign(new Error('Duplicate payment reference. Use a unique reference number.'), { statusCode: 409 });
    }
    return trimmedReference;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const generated = buildPaymentReference();
    const exists = await Payment.findOne({ referenceNumber: generated, isDeleted: false })
      .session(session ?? null)
      .select('_id')
      .lean();
    if (!exists) return generated;
  }

  throw Object.assign(new Error('Unable to generate a unique payment reference. Please try again.'), { statusCode: 409 });
}

function buildReceipt(payment: any, extras: Record<string, unknown> = {}) {
  return {
    type: payment.paymentFor === 'student_fee' ? 'fee_receipt' : payment.paymentFor === 'expense' ? 'expense_receipt' : 'salary_slip',
    invoiceNumber: payment.invoiceNumber,
    referenceNumber: payment.referenceNumber,
    paymentFor: payment.paymentFor,
    status: normalizePaymentRecordStatus(payment.status),
    amount: Number(payment.amount || 0),
    grossAmount: Number(payment.grossAmount || 0),
    taxAmount: Number(payment.taxAmount || 0),
    netAmount: Number(payment.netAmount || 0),
    currency: payment.currency || 'AFN',
    paymentDate: payment.paymentDate,
    method: payment.method,
    notes: payment.notes || '',
    expenseTitle: payment.expenseTitle || '',
    expenseCategory: payment.expenseCategory || '',
    ...extras
  };
}

export async function previewSalaryPayment(input: {
  payeeUserId: string;
  payeeRole: 'teacher' | 'manager';
  salaryMonth: number;
  salaryYear: number;
  requestedGross?: number;
  actorRole?: string | null;
}) {
  // Always recalculate on preview so newly assigned students / fee payments
  // and auto-healed SalarySetting rows are reflected (avoid stale zero records).
  const record = await calculateSalaryRecord({
    userId: input.payeeUserId,
    hijriYear: input.salaryYear,
    hijriMonth: input.salaryMonth,
    allowAllSystemScope: input.actorRole === 'super_admin',
    forceRecalculate: true
  });

  const authoritativeGross = roundMoney(Number(input.requestedGross ?? record.grossSalary ?? 0));
  const payroll =
    input.payeeRole === 'teacher'
      ? calculateTeacherPayroll({
          salaryMode: Number(record.fixedAmount || 0) > 0 && Number(record.commissionAmount || 0) > 0
            ? 'fixed_plus_percentage'
            : Number(record.commissionAmount || 0) > 0
              ? 'percentage'
              : 'fixed_salary',
          fixedAmount: Number(record.fixedAmount || 0),
          commissionBase: Number(record.totalStudentPaymentsUsed || 0),
          commissionPercentage: Number(record.percentageUsed || 0)
        })
      : calculateManagerPayroll({
          salaryMode: Number(record.fixedAmount || 0) > 0 && Number(record.commissionAmount || 0) > 0
            ? 'fixed_plus_percentage'
            : Number(record.commissionAmount || 0) > 0
              ? 'percentage'
              : 'fixed_salary',
          fixedAmount: Number(record.fixedAmount || 0),
          commissionBase: Number(record.totalStudentPaymentsUsed || 0),
          commissionPercentage: Number(record.percentageUsed || 0)
        });

  const tax = calculateAfghanistanWageWithholdingTax(authoritativeGross);
  const unpaid = Math.max(0, subMoney(Number(record.netSalary || 0), Number(record.paidAmount || 0)));

  return {
    salaryRecord: record,
    preview: {
      ...payroll,
      ...tax,
      // Frontend wizard expects these payroll-record field names
      percentageUsed: Number(record.percentageUsed ?? payroll.commissionPercentage ?? 0),
      totalStudentPaymentsUsed: Number(record.totalStudentPaymentsUsed ?? payroll.commissionBase ?? 0),
      salaryType:
        Number(record.fixedAmount || 0) > 0 && Number(record.commissionAmount || 0) > 0
          ? 'fixed_plus_percentage'
          : Number(record.percentageUsed || 0) > 0 || Number(record.commissionAmount || 0) > 0
            ? 'percentage'
            : 'fixed',
      taxExplanation: record.taxExplanation || tax.explanation || '',
      unpaidNetBalance: unpaid,
      paymentStatus: deriveSalaryPayoutStatus(Number(record.netSalary || 0), Number(record.paidAmount || 0)),
      settingMissing: false
    }
  };
}

export async function makePayment(input: MakePaymentRequest): Promise<MakePaymentResult> {
  const paymentFor = input.paymentFor;
  const isStudentPayment = paymentFor === 'student_fee';
  const isSalaryPayment = paymentFor === 'teacher_salary' || paymentFor === 'manager_salary';
  const isExpensePayment = paymentFor === 'expense';
  const idempotencyKey = String(input.idempotencyKey || '').trim();

  if (idempotencyKey) {
    const existing = await Payment.findOne({ idempotencyKey, isDeleted: false })
      .populate('studentId', 'firstName lastName studentId feeAmount paidAmount remainingBalance')
      .populate('payeeUserId', 'name email role')
      .lean<any>();
    if (existing) {
      return {
        payment: existing,
        receipt: buildReceipt(existing, { idempotentReplay: true }),
        salarySlip: isSalaryPayment ? buildReceipt(existing, { document: 'salary_slip' }) : null,
        idempotentReplay: true
      };
    }
  }

  if (isStudentPayment && !input.studentId) {
    throw Object.assign(new Error('Student is required for student fee payment'), { statusCode: 400 });
  }
  if (isSalaryPayment && !input.payeeUserId) {
    throw Object.assign(new Error('Employee is required for salary payment'), { statusCode: 400 });
  }
  if (isSalaryPayment && (!input.salaryMonth || !input.salaryYear)) {
    throw Object.assign(new Error('Salary month and year are required for salary payment'), { statusCode: 400 });
  }
  if (isExpensePayment && !String(input.expenseTitle || '').trim()) {
    throw Object.assign(new Error('Expense title is required for expense payment'), { statusCode: 400 });
  }
  if (isExpensePayment && !String(input.expenseCategory || '').trim()) {
    throw Object.assign(new Error('Expense category is required for expense payment'), { statusCode: 400 });
  }

  const student = isStudentPayment
    ? await Student.findOne({ _id: input.studentId, isDeleted: false, status: 'active' }).lean<any>()
    : null;
  if (isStudentPayment && !student) {
    throw Object.assign(new Error('Student not found'), { statusCode: 404 });
  }

  const payee = isSalaryPayment
    ? await User.findOne({
        _id: input.payeeUserId,
        isDeleted: false,
        active: { $ne: false },
        status: { $nin: ['inactive', 'blocked', 'expired'] }
      }).lean<any>()
    : null;
  if (isSalaryPayment && !payee) {
    throw Object.assign(new Error('Employee not found'), { statusCode: 404 });
  }

  if (isSalaryPayment) {
    const allowedRoles = input.payeeRole === 'teacher' ? ['teacher'] : ['admin', 'branch_manager', 'owner'];
    if (!allowedRoles.includes(String(payee?.role))) {
      throw Object.assign(new Error('Selected employee does not match the selected salary role'), { statusCode: 400 });
    }
  }

  const resolvedBranchId = input.branchId ?? student?.branchId ?? payee?.branchId ?? input.actorBranchId ?? null;
  if (input.actorRole === 'branch_manager' && input.actorBranchId) {
    if (resolvedBranchId && String(resolvedBranchId) !== String(input.actorBranchId)) {
      throw Object.assign(new Error('Branch access denied'), { statusCode: 403 });
    }
  }

  const resolvedPaymentDate = input.paymentDate ? new Date(input.paymentDate) : new Date();
  if (Number.isNaN(resolvedPaymentDate.getTime())) {
    throw Object.assign(new Error('Payment date is invalid'), { statusCode: 400 });
  }

  let reservedLoanDeduction = 0;
  if (isSalaryPayment && payee) {
    const loanPlans = await getActivePayrollLoanDeductions(String(payee._id));
    reservedLoanDeduction = roundMoney(
      loanPlans.reduce((sum, item) => sum + Number(item.installmentAmount || 0), 0)
    );
  }

  const paymentResult = await withMongoTransaction(async (session) => {
    const referenceNumber = await resolvePaymentReference(input.referenceNumber, session ?? undefined);
    const invoiceNumber = await generateInvoiceNumber();

    let paymentStatus: PaymentRecordStatus = 'paid';
    let grossAmount = 0;
    let taxAmount = 0;
    let netAmount = 0;
    let taxCategory = '';
    let taxExplanation = '';
    let taxFormula = '';
    let remainingSalaryBalance = 0;
    const consumedSalaryRecordIds: string[] = [];
    let salaryApplications: Array<{ recordId: string; applied: number }> = [];
    let feeBreakdown: ReturnType<typeof calculateStudentFeePayment> | null = null;
    let salarySlip: Record<string, unknown> | null = null;

    if (isStudentPayment && student) {
      const paidQuery = Payment.aggregate([
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
      const paidTotalsBefore = session ? await paidQuery.session(session) : await paidQuery;

      feeBreakdown = calculateStudentFeePayment({
        feeAmount: Number(student.feeAmount || 0),
        previouslyPaid: Number(paidTotalsBefore[0]?.total ?? 0),
        requestedAmount: Number(input.amount || 0),
        discount: Number(input.discount || 0)
      });

      grossAmount = feeBreakdown.appliedAmount;
      taxAmount = 0;
      netAmount = feeBreakdown.appliedAmount;
      paymentStatus = mapFeeStatusToPaymentRecordStatus(feeBreakdown.statusAfter);
    }

    if (isExpensePayment) {
      grossAmount = roundMoney(Number(input.amount || 0));
      netAmount = grossAmount;
      paymentStatus = 'paid';
    }

    if (isSalaryPayment && payee) {
      // Backend authoritative recalculation for the period.
      await calculateSalaryRecord({
        userId: String(payee._id),
        hijriYear: Number(input.salaryYear),
        hijriMonth: Number(input.salaryMonth),
        actorId: input.actorUserId ?? null,
        allowAllSystemScope: input.actorRole === 'super_admin',
        forceRecalculate: true
      });

      let salaryQuery = SalaryRecord.find({
        userId: payee._id,
        isDeleted: false,
        hijriMonth: Number(input.salaryMonth),
        hijriYear: Number(input.salaryYear)
      }).sort({ calculatedAt: 1 });
      if (session) salaryQuery = salaryQuery.session(session);
      const salaryRecords = await salaryQuery.lean<any[]>();

      if (!salaryRecords.length) {
        throw Object.assign(new Error('Salary record not found for selected period'), { statusCode: 404 });
      }

      const record = salaryRecords[0];
      const authoritativeGross = roundMoney(Number(record.grossSalary || input.grossSalary || input.amount || 0));
      const tax = await calculateAfghanistanSalaryTax(authoritativeGross);
      grossAmount = tax.grossSalary;
      taxAmount = tax.taxAmount;
      const periodNetSalary = tax.netSalary;
      taxCategory = tax.taxCategory;
      taxExplanation = tax.explanation;
      taxFormula = tax.formula;

      const unpaidAcrossRecords = roundMoney(
        salaryRecords.reduce((sum, item) => {
          const remaining = Math.max(0, subMoney(Number(item.netSalary || 0), Number(item.paidAmount || 0)));
          return sum + remaining;
        }, 0)
      );

      if (unpaidAcrossRecords <= 0) {
        throw Object.assign(new Error('No unpaid net salary found for this period'), { statusCode: 400 });
      }

      const loanReserve = Math.min(reservedLoanDeduction, unpaidAcrossRecords);
      const payableAfterLoan = roundMoney(Math.max(0, subMoney(unpaidAcrossRecords, loanReserve)));

      const requestedPayout =
        Number(input.amount || 0) > 0 ? roundMoney(Number(input.amount)) : payableAfterLoan;
      const payoutNetAmount = Math.min(requestedPayout, payableAfterLoan);

      if (requestedPayout > payableAfterLoan + 0.01) {
        throw Object.assign(
          new Error(
            loanReserve > 0
              ? 'Salary payment exceeds unpaid net salary after reserved loan payroll deductions'
              : 'Salary payment exceeds unpaid net salary for this period'
          ),
          { statusCode: 400 }
        );
      }

      const payout = applySalaryPayoutAcrossRecords({
        records: salaryRecords.map((item) => ({
          recordId: String(item._id),
          netSalary: Number(item.netSalary || 0),
          paidAmount: Number(item.paidAmount || 0)
        })),
        payoutNetAmount
      });

      if (payout.remainingUnapplied > 0.001) {
        throw Object.assign(new Error('Salary payment exceeds unpaid net salary for this period'), { statusCode: 400 });
      }

      if (!payout.applications.length && payoutNetAmount > 0) {
        throw Object.assign(new Error('No unpaid net salary found for this period'), { statusCode: 400 });
      }

      if (payoutNetAmount <= 0 && loanReserve <= 0) {
        throw Object.assign(new Error('No unpaid net salary found for this period'), { statusCode: 400 });
      }

      if (payout.applications.length) {
        for (const application of payout.applications) {
          await SalaryRecord.updateOne(
            { _id: application.recordId },
            {
              $set: {
                paidAmount: application.paidAfter,
                paymentStatus: application.statusAfter === 'paid' ? 'paid' : application.statusAfter === 'partially_paid' ? 'partially_paid' : 'unpaid',
                paidAt: application.statusAfter === 'paid' ? new Date() : null,
                taxStatus: application.statusAfter === 'paid' ? 'paid' : 'pending'
              }
            },
            session ? { session } : undefined
          );
          consumedSalaryRecordIds.push(application.recordId);
        }
      }

      netAmount = roundMoney(payout.applications.reduce((sum, item) => sum + Number(item.applied || 0), 0));
      remainingSalaryBalance = roundMoney(Math.max(0, subMoney(subMoney(unpaidAcrossRecords, netAmount), loanReserve)));
      paymentStatus = remainingSalaryBalance <= 0.01 ? 'paid' : 'partially_paid';
      salaryApplications = payout.applications.map((item) => ({
        recordId: item.recordId,
        applied: roundMoney(Number(item.applied || 0))
      }));

      salarySlip = {
        document: 'salary_slip',
        employeeName: payee.name,
        employeeRole: input.payeeRole,
        hijriMonth: input.salaryMonth,
        hijriYear: input.salaryYear,
        periodNetSalary,
        appliedNetAmount: netAmount,
        reservedLoanDeduction: loanReserve,
        grossAmount,
        taxAmount,
        netAmount: periodNetSalary,
        taxCategory,
        taxFormula,
        taxExplanation,
        remainingSalaryBalance
      };
    }

    const createOptions = session ? { session } : undefined;
    const [createdPayment] = await Payment.create(
      [
        {
          paymentFor,
          status: paymentStatus === 'partially_paid' ? 'partially_paid' : 'paid',
          studentId: student?._id ?? null,
          teacherId: student?.teacherId ?? null,
          classId: student?.classId ?? null,
          subjectId: student?.subjectId ?? null,
          payeeUserId: payee?._id ?? null,
          ...(isSalaryPayment && input.payeeRole ? { payeeRole: input.payeeRole } : {}),
          salaryRecordIds: consumedSalaryRecordIds,
          salaryApplications,
          amount: netAmount,
          grossAmount,
          taxAmount,
          netAmount,
          remainingSalaryBalance,
          invoiceNumber,
          referenceNumber,
          ...(idempotencyKey ? { idempotencyKey } : {}),
          branchId: resolvedBranchId,
          collectedBy: input.actorUserId ?? null,
          paymentDate: resolvedPaymentDate,
          method: input.method ?? 'cash',
          notes: input.notes ?? '',
          expenseTitle: isExpensePayment ? String(input.expenseTitle || '').trim() : '',
          expenseCategory: isExpensePayment ? String(input.expenseCategory || '').trim() : '',
          immutableRecord: true
        }
      ],
      createOptions as any
    );

    if (student && feeBreakdown) {
      await Student.updateOne(
        { _id: student._id },
        {
          $set: {
            paidAmount: feeBreakdown.totalPaidAfter,
            remainingBalance: feeBreakdown.remainingAfter
          }
        },
        session ? { session } : undefined
      );

      await Expense.create(
        [
          {
            branchId: createdPayment.branchId ?? null,
            title: `Student fee payment - ${student.firstName} ${student.lastName}`,
            amount: Number(netAmount),
            category: 'income',
            date: createdPayment.paymentDate,
            createdBy: input.actorUserId ?? null,
            notes: input.notes ?? '',
            sourcePaymentId: createdPayment._id
          }
        ],
        createOptions as any
      );

      const teacherQuery = student.teacherId
        ? User.findOne({ _id: student.teacherId, role: 'teacher', isDeleted: false })
        : null;
      const teacher = teacherQuery ? await (session ? teacherQuery.session(session) : teacherQuery).lean<any>() : null;

      if (teacher) {
        await teacherCompensationService.recordPaymentCommission({
          payment: createdPayment,
          student,
          teacher,
          createdBy: input.actorUserId ?? null,
          session: session ?? undefined
        });
      }
    }

    if (isExpensePayment) {
      await Expense.create(
        [
          {
            branchId: createdPayment.branchId ?? null,
            title: String(input.expenseTitle || '').trim(),
            amount: Number(netAmount),
            category: String(input.expenseCategory || '').trim(),
            date: createdPayment.paymentDate,
            createdBy: input.actorUserId ?? null,
            notes: input.notes ?? '',
            sourcePaymentId: createdPayment._id
          }
        ],
        createOptions as any
      );
    }

    const populatedPayment = await Payment.findById(createdPayment._id)
      .populate('studentId', 'firstName lastName studentId feeAmount paidAmount remainingBalance')
      .populate('payeeUserId', 'name email role')
      .lean<any>();

    return {
      payment: populatedPayment,
      receipt: buildReceipt(populatedPayment, {
        feeBreakdown,
        remainingBalance: feeBreakdown?.remainingAfter
      }),
      salarySlip,
      idempotentReplay: false,
      reservedLoanDeduction: isSalaryPayment ? Math.min(reservedLoanDeduction, Number((salarySlip as any)?.reservedLoanDeduction || reservedLoanDeduction)) : 0
    };
  });

  if (isSalaryPayment && payee && Number(paymentResult.reservedLoanDeduction || 0) > 0) {
    try {
      const loanResult = await applyPayrollLoanDeductions({
        personId: String(payee._id),
        availableNetSalary: Number(paymentResult.reservedLoanDeduction || 0),
        salaryPaymentId: String(paymentResult.payment?._id || ''),
        actorUserId: input.actorUserId ?? null
      });
      if (paymentResult.salarySlip) {
        paymentResult.salarySlip = {
          ...paymentResult.salarySlip,
          loanDeductions: loanResult.applications,
          remainingSalaryAfterLoanDeductions: loanResult.remainingSalaryAfterDeductions
        };
      }

      // Apply loan settlement against salary unpaid balance so records stay consistent.
      const appliedLoan = roundMoney(
        loanResult.applications.reduce((sum, item) => sum + Number(item.amount || 0), 0)
      );
      if (appliedLoan > 0) {
        const salaryRecords = await SalaryRecord.find({
          userId: payee._id,
          isDeleted: false,
          hijriMonth: Number(input.salaryMonth),
          hijriYear: Number(input.salaryYear)
        }).sort({ calculatedAt: 1 });
        let remainingLoanApply = appliedLoan;
        for (const record of salaryRecords) {
          if (remainingLoanApply <= 0) break;
          const unpaid = Math.max(0, subMoney(Number(record.netSalary || 0), Number(record.paidAmount || 0)));
          if (unpaid <= 0) continue;
          const apply = Math.min(unpaid, remainingLoanApply);
          const nextPaid = roundMoney(Number(record.paidAmount || 0) + apply);
          record.paidAmount = nextPaid;
          record.paymentStatus = deriveSalaryPayoutStatus(Number(record.netSalary || 0), nextPaid) as any;
          record.paidAt = record.paymentStatus === 'paid' ? new Date() : record.paidAt;
          record.taxStatus = record.paymentStatus === 'paid' ? 'paid' : 'pending';
          await record.save();
          remainingLoanApply = subMoney(remainingLoanApply, apply);
        }
      }
    } catch {
      // Loan deduction failure must not roll back a completed salary payment; surface via slip notes.
      if (paymentResult.salarySlip) {
        paymentResult.salarySlip = {
          ...paymentResult.salarySlip,
          loanDeductionWarning: 'Payroll loan deduction could not be applied automatically'
        };
      }
    }
  }

  const { reservedLoanDeduction: _reserved, ...result } = paymentResult as any;
  return result;
}

export async function reverseOrRefundPayment(input: {
  paymentId: string;
  action: 'reverse' | 'refund';
  actorUserId?: string | null;
  reason?: string;
}) {
  const payment = await Payment.findOne({ _id: input.paymentId, isDeleted: false });
  if (!payment) {
    throw Object.assign(new Error('Payment not found'), { statusCode: 404 });
  }

  const current = normalizePaymentRecordStatus(payment.status);
  if (current === 'reversed' || current === 'refunded' || current === 'cancelled') {
    throw Object.assign(new Error('Payment is already reversed or refunded'), { statusCode: 409 });
  }

  return withMongoTransaction(async (session) => {
    const nextStatus = input.action === 'refund' ? 'refunded' : 'reversed';
    payment.status = nextStatus as any;
    payment.notes = [payment.notes, `${nextStatus}: ${input.reason || ''}`.trim()].filter(Boolean).join(' | ');
    payment.auditHistory = [
      ...(payment.auditHistory || []),
      {
        originalValue: current,
        changedValue: nextStatus,
        changedBy: input.actorUserId ?? null,
        changedAt: new Date(),
        reason: input.reason || nextStatus
      }
    ];
    await payment.save(session ? { session } : undefined);

    if (payment.paymentFor === 'student_fee' && payment.studentId) {
      const paidQuery = Payment.aggregate([
        {
          $match: {
            studentId: payment.studentId,
            isDeleted: false,
            paymentFor: 'student_fee',
            status: { $nin: ['cancelled', 'refunded', 'reversed'] }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const paidTotals = session ? await paidQuery.session(session) : await paidQuery;
      const studentQuery = Student.findById(payment.studentId);
      const student = session ? await studentQuery.session(session) : await studentQuery;
      if (student) {
        const nextPaid = Number(paidTotals[0]?.total ?? 0);
        student.paidAmount = nextPaid;
        student.remainingBalance = Math.max(0, Number(student.feeAmount || 0) - nextPaid);
        await student.save(session ? { session } : undefined);
      }

      await Expense.updateMany(
        { sourcePaymentId: payment._id, isDeleted: false },
        {
          $set: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: input.actorUserId ?? null,
            notes: [`reversed:${input.action}`, String((payment as any).notes || '')].filter(Boolean).join(' | ')
          }
        },
        session ? { session } : undefined
      );

      await teacherCompensationService.reversePaymentCommission({
        paymentId: String(payment._id),
        actorUserId: input.actorUserId ?? null,
        session: session ?? undefined
      });
    }

    if (payment.paymentFor === 'expense') {
      await Expense.updateMany(
        { sourcePaymentId: payment._id, isDeleted: false },
        {
          $set: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: input.actorUserId ?? null,
            notes: [`reversed:${input.action}`, String((payment as any).notes || '')].filter(Boolean).join(' | ')
          }
        },
        session ? { session } : undefined
      );
    }

    if ((payment.paymentFor === 'teacher_salary' || payment.paymentFor === 'manager_salary') && payment.salaryRecordIds?.length) {
      const applications = Array.isArray((payment as any).salaryApplications) && (payment as any).salaryApplications.length
        ? (payment as any).salaryApplications.map((item: any) => ({
            recordId: String(item.recordId),
            applied: roundMoney(Number(item.applied || 0))
          }))
        : payment.salaryRecordIds.map((recordId: any) => ({
            recordId: String(recordId),
            applied: roundMoney(
              Number(payment.netAmount || payment.amount || 0) / Math.max(1, payment.salaryRecordIds.length)
            )
          }));

      for (const application of applications) {
        const recordQuery = SalaryRecord.findById(application.recordId);
        const record = session ? await recordQuery.session(session) : await recordQuery;
        if (!record) continue;
        const nextPaid = Math.max(0, subMoney(Number(record.paidAmount || 0), Number(application.applied || 0)));
        record.paidAmount = nextPaid;
        record.paymentStatus = deriveSalaryPayoutStatus(Number(record.netSalary || 0), nextPaid) as any;
        record.paidAt = record.paymentStatus === 'paid' ? record.paidAt : null;
        await record.save(session ? { session } : undefined);
      }
    }

    return payment.toObject();
  });
}
