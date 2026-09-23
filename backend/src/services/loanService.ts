import mongoose from 'mongoose';
import { Loan } from '../models/Loan';
import { LoanRepayment } from '../models/LoanRepayment';
import { Student } from '../models/Student';
import { User } from '../models/User';
import { ClassModel } from '../models/Class';
import { Subject } from '../models/Subject';
import { Expense } from '../models/Expense';
import { addMoney, roundMoney, subMoney } from './financialCalculationEngine';
import {
  applyLoanRepaymentAmounts,
  deriveLoanStatus,
  resolvePayrollLoanInstallment
} from './loanCalculation';
import { enrichStudentWithDisplay } from '../utils/studentDisplay';

type PersonType = 'student' | 'teacher' | 'manager' | 'employee';

function httpError(message: string, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}

function buildLoanNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LN-${stamp}-${rand}`;
}

function buildRepaymentNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LR-${stamp}-${rand}`;
}

function buildReceiptNumber() {
  return `LRC-${Date.now().toString(36).toUpperCase()}`;
}

async function withOptionalTransaction<T>(fn: (session: mongoose.ClientSession | null) => Promise<T>): Promise<T> {
  let session: mongoose.ClientSession | null = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (error: any) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch {
        /* ignore */
      }
    }
    if (String(error?.message || '').includes('Transaction numbers are only allowed')) {
      return fn(null);
    }
    throw error;
  } finally {
    if (session) await session.endSession();
  }
}

export async function getPersonLoanContext(personType: PersonType, personId: string) {
  if (personType === 'student') {
    const student = await Student.findOne({ _id: personId, isDeleted: false }).lean<any>();
    if (!student) throw httpError('Student not found', 404);
    const enriched = await enrichStudentWithDisplay(student);
    const activeLoans = await Loan.find({
      personType: 'student',
      personId: student._id,
      isDeleted: false,
      status: { $in: ['active', 'partially_repaid', 'overdue', 'approved'] },
      remainingAmount: { $gt: 0 }
    })
      .select('loanNumber originalAmount repaidAmount remainingAmount status loanType loanDate')
      .lean();

    const classDoc = student.classId
      ? await ClassModel.findById(student.classId).select('className name').lean<any>()
      : null;
    const subjectDoc = student.subjectId
      ? await Subject.findById(student.subjectId).select('title name').lean<any>()
      : null;

    return {
      personType,
      personId: String(student._id),
      name: enriched?.studentDisplay?.fullName || [student.firstName, student.lastName].filter(Boolean).join(' '),
      fatherName: student.fatherName || '',
      phone: student.familyPhone || student.phone || '',
      branchId: student.branchId ? String(student.branchId) : '',
      student: {
        studentId: student.studentId || student.rollNo || '',
        classId: student.classId ? String(student.classId) : '',
        subjectId: student.subjectId ? String(student.subjectId) : '',
        className: classDoc?.className || classDoc?.name || enriched?.studentDisplay?.className || '',
        subjectName: subjectDoc?.title || subjectDoc?.name || enriched?.studentDisplay?.subjectName || '',
        originalFee: roundMoney(student.feeAmount || 0),
        paidFee: roundMoney(student.paidAmount || 0),
        remainingFee: roundMoney(student.remainingBalance || 0)
      },
      activeLoans,
      outstandingLoanTotal: roundMoney(activeLoans.reduce((sum, item) => addMoney(sum, Number(item.remainingAmount || 0)), 0))
    };
  }

  const roleFilter =
    personType === 'teacher'
      ? 'teacher'
      : personType === 'manager'
        ? { $in: ['admin', 'branch_manager', 'owner'] }
        : { $nin: ['student', 'parent', 'family_student', 'teacher'] };

  const user = await User.findOne({ _id: personId, isDeleted: false, role: roleFilter }).lean<any>();
  if (!user) throw httpError('Employee not found', 404);

  const activeLoans = await Loan.find({
    personType,
    personId: user._id,
    isDeleted: false,
    status: { $in: ['active', 'partially_repaid', 'overdue', 'approved'] },
    remainingAmount: { $gt: 0 }
  })
    .select('loanNumber originalAmount repaidAmount remainingAmount status loanType loanDate payrollDeductionEnabled installmentAmount')
    .lean();

  return {
    personType,
    personId: String(user._id),
    name: user.name || '',
    fatherName: user.fatherName || '',
    phone: user.phone || '',
    branchId: user.branchId ? String(user.branchId) : '',
    employee: {
      role: user.role,
      salaryType: user.salaryType || 'fixed',
      baseSalary: roundMoney(user.fixedSalary || 0),
      percentageRate: Number(user.customPercentage || user.percentageRate || 0),
      grossSalary: roundMoney(user.fixedSalary || 0),
      netSalary: roundMoney(user.fixedSalary || 0)
    },
    activeLoans,
    outstandingLoanTotal: roundMoney(activeLoans.reduce((sum, item) => addMoney(sum, Number(item.remainingAmount || 0)), 0))
  };
}

export async function createLoan(input: {
  personType: PersonType;
  personId: string;
  loanType: string;
  purpose?: string;
  originalAmount: number;
  loanDate?: string | Date;
  dueDate?: string | Date | null;
  notes?: string;
  branchId?: string;
  payrollDeductionEnabled?: boolean;
  payrollDeductionAmount?: number;
  installmentEnabled?: boolean;
  installmentAmount?: number;
  repaymentMethodDefault?: string;
  classId?: string;
  subjectId?: string;
  courseId?: string;
  actorUserId?: string | null;
  idempotencyKey?: string;
  autoApprove?: boolean;
}) {
  const amount = roundMoney(input.originalAmount);
  if (!(amount > 0)) throw httpError('Loan amount must be greater than zero');

  if (input.idempotencyKey) {
    const existing = await Loan.findOne({ idempotencyKey: input.idempotencyKey, isDeleted: false }).lean();
    if (existing) return { loan: existing, idempotentReplay: true };
  }

  const context = await getPersonLoanContext(input.personType, input.personId);

  if (input.loanType === 'STUDENT_FEE_DEBT') {
    if (input.personType !== 'student') throw httpError('Student fee debt requires a student');
    const remainingFee = Number((context as any).student?.remainingFee || 0);
    if (amount > remainingFee) {
      throw httpError('Student fee debt cannot exceed remaining fee');
    }
  }

  const installmentAmount = roundMoney(input.installmentAmount || input.payrollDeductionAmount || 0);
  const status = input.autoApprove === false ? 'pending_approval' : 'active';

  const loanPayload: Record<string, unknown> = {
    loanNumber: buildLoanNumber(),
    personType: input.personType,
    personId: input.personId,
    personName: context.name,
    fatherName: context.fatherName,
    personPhone: context.phone,
    branchId: input.branchId || context.branchId || null,
    loanType: input.loanType,
    purpose: input.purpose || '',
    originalAmount: amount,
    repaidAmount: 0,
    remainingAmount: amount,
    currency: 'AFN',
    loanDate: input.loanDate ? new Date(input.loanDate) : new Date(),
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    status,
    approvedAt: status === 'active' ? new Date() : null,
    approvedBy: status === 'active' ? input.actorUserId || null : null,
    repaymentMethodDefault: input.repaymentMethodDefault || 'cash',
    payrollDeductionEnabled: Boolean(input.payrollDeductionEnabled),
    payrollDeductionAmount: installmentAmount,
    installmentEnabled: Boolean(input.installmentEnabled || input.payrollDeductionEnabled),
    installmentAmount,
    notes: input.notes || '',
    createdBy: input.actorUserId || null,
    ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
    auditHistory: [
      {
        originalValue: null,
        changedValue: { status, originalAmount: amount },
        changedBy: input.actorUserId || null,
        changedAt: new Date(),
        reason: 'loan_created'
      }
    ]
  };

  if (input.personType === 'student') {
    const student = (context as any).student;
    loanPayload.studentId = input.personId;
    loanPayload.classId = input.classId || student.classId || null;
    loanPayload.subjectId = input.subjectId || student.subjectId || null;
    loanPayload.courseId = input.courseId || null;
    loanPayload.originalFeeSnapshot = student.originalFee;
    loanPayload.paidFeeSnapshot = student.paidFee;
    loanPayload.remainingFeeSnapshot = student.remainingFee;
    loanPayload.classNameSnapshot = student.className;
    loanPayload.subjectNameSnapshot = student.subjectName;
  } else {
    const employee = (context as any).employee;
    loanPayload.employeeRole = employee.role;
    loanPayload.salaryTypeSnapshot = employee.salaryType;
    loanPayload.baseSalarySnapshot = employee.baseSalary;
    loanPayload.grossSalarySnapshot = employee.grossSalary;
    loanPayload.netSalarySnapshot = employee.netSalary;
  }

  return withOptionalTransaction(async (session) => {
    const [loan] = await Loan.create([loanPayload], session ? { session } : undefined);

    if (['CASH_LOAN', 'SALARY_ADVANCE', 'EMERGENCY_LOAN', 'OTHER'].includes(input.loanType) && status === 'active') {
      await Expense.create(
        [
          {
            title: `Loan disbursement ${loan.loanNumber}`,
            amount,
            category: 'loan_disbursement',
            date: loan.loanDate,
            branchId: loan.branchId,
            notes: `Loan ${loan.loanNumber} to ${loan.personName}`,
            createdBy: input.actorUserId || null,
            sourcePaymentId: null
          }
        ],
        session ? { session } : undefined
      );
    }

    return { loan: loan.toObject(), idempotentReplay: false };
  });
}

export async function recordLoanRepayment(input: {
  loanId: string;
  amount: number;
  repaymentMethod?: string;
  repaymentDate?: string | Date;
  note?: string;
  actorUserId?: string | null;
  payrollId?: string | null;
  salaryPaymentId?: string | null;
  studentPaymentId?: string | null;
  idempotencyKey?: string;
}) {
  if (input.idempotencyKey) {
    const existing = await LoanRepayment.findOne({ idempotencyKey: input.idempotencyKey, isDeleted: false }).lean<any>();
    if (existing) {
      const loan = await Loan.findById(existing.loanId).lean();
      return { repayment: existing, loan, receipt: { receiptNumber: existing.receiptNumber }, idempotentReplay: true };
    }
  }

  return withOptionalTransaction(async (session) => {
    const loanQuery = Loan.findOne({ _id: input.loanId, isDeleted: false });
    if (session) loanQuery.session(session);
    const loan = await loanQuery;
    if (!loan) throw httpError('Loan not found', 404);
    if (['cancelled', 'reversed', 'paid', 'draft'].includes(String(loan.status))) {
      throw httpError('Loan is not repayable in its current status');
    }

    const calc = applyLoanRepaymentAmounts({
      originalAmount: Number(loan.originalAmount || 0),
      repaidAmount: Number(loan.repaidAmount || 0),
      repaymentAmount: Number(input.amount || 0)
    });

    const receiptNumber = buildReceiptNumber();
    const [repayment] = await LoanRepayment.create(
      [
        {
          repaymentNumber: buildRepaymentNumber(),
          loanId: loan._id,
          personType: loan.personType,
          personId: loan.personId,
          amount: calc.repayment,
          currency: loan.currency || 'AFN',
          repaymentMethod: input.repaymentMethod || 'cash',
          repaymentDate: input.repaymentDate ? new Date(input.repaymentDate) : new Date(),
          payrollId: input.payrollId || null,
          salaryPaymentId: input.salaryPaymentId || null,
          studentPaymentId: input.studentPaymentId || null,
          receiptNumber,
          note: input.note || '',
          remainingBefore: calc.remainingBefore,
          remainingAfter: calc.remainingAfter,
          status: 'completed',
          createdBy: input.actorUserId || null,
          ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {})
        }
      ],
      session ? { session } : undefined
    );

    const previous = {
      repaidAmount: loan.repaidAmount,
      remainingAmount: loan.remainingAmount,
      status: loan.status
    };

    loan.repaidAmount = calc.repaidAfter;
    loan.remainingAmount = calc.remainingAfter;
    loan.status = deriveLoanStatus({
      originalAmount: calc.original,
      repaidAmount: calc.repaidAfter,
      dueDate: loan.dueDate
    });
    loan.version = Number(loan.version || 1) + 1;
    loan.auditHistory = [
      ...(Array.isArray(loan.auditHistory) ? loan.auditHistory : []),
      {
        originalValue: previous,
        changedValue: {
          repaidAmount: loan.repaidAmount,
          remainingAmount: loan.remainingAmount,
          status: loan.status,
          repaymentId: repayment._id
        },
        changedBy: input.actorUserId || null,
        changedAt: new Date(),
        reason: 'loan_repayment'
      }
    ];
    await loan.save(session ? { session } : undefined);

    // Cash/manual repayments create inflow records. Payroll deductions settle against salary and must not create a second income entry.
    if (String(input.repaymentMethod || 'cash') !== 'payroll_deduction') {
      await Expense.create(
        [
          {
            title: `Loan repayment ${loan.loanNumber}`,
            amount: calc.repayment,
            category: 'loan_repayment',
            date: repayment.repaymentDate,
            branchId: loan.branchId,
            notes: `Repayment ${repayment.repaymentNumber} for loan ${loan.loanNumber}`,
            createdBy: input.actorUserId || null
          }
        ],
        session ? { session } : undefined
      );
    }

    return {
      repayment: repayment.toObject(),
      loan: loan.toObject(),
      receipt: {
        type: 'loan_repayment_receipt',
        receiptNumber,
        loanNumber: loan.loanNumber,
        personName: loan.personName,
        fatherName: loan.fatherName,
        personType: loan.personType,
        originalAmount: loan.originalAmount,
        previousRepaid: calc.previouslyRepaid,
        currentRepayment: calc.repayment,
        remainingAmount: calc.remainingAfter,
        repaymentDate: repayment.repaymentDate,
        repaymentMethod: repayment.repaymentMethod
      },
      idempotentReplay: false
    };
  });
}

export async function getActivePayrollLoanDeductions(personId: string) {
  const loans = await Loan.find({
    personId,
    isDeleted: false,
    payrollDeductionEnabled: true,
    remainingAmount: { $gt: 0 },
    status: { $in: ['active', 'partially_repaid', 'overdue', 'approved'] }
  }).lean<any[]>();

  return loans.map((loan) => {
    const plan = resolvePayrollLoanInstallment({
      remainingAmount: Number(loan.remainingAmount || 0),
      installmentAmount: Number(loan.installmentAmount || loan.payrollDeductionAmount || 0),
      availableNetSalary: Number.MAX_SAFE_INTEGER
    });
    return {
      loanId: String(loan._id),
      loanNumber: loan.loanNumber,
      remainingAmount: roundMoney(loan.remainingAmount || 0),
      installmentAmount: plan.appliedInstallment
    };
  });
}

export async function applyPayrollLoanDeductions(input: {
  personId: string;
  availableNetSalary: number;
  payrollId?: string | null;
  salaryPaymentId?: string | null;
  actorUserId?: string | null;
}) {
  const loans = await Loan.find({
    personId: input.personId,
    isDeleted: false,
    payrollDeductionEnabled: true,
    remainingAmount: { $gt: 0 },
    status: { $in: ['active', 'partially_repaid', 'overdue', 'approved'] }
  });

  let remainingSalary = roundMoney(input.availableNetSalary);
  const applications: Array<Record<string, unknown>> = [];

  for (const loan of loans) {
    if (remainingSalary <= 0) break;
    const plan = resolvePayrollLoanInstallment({
      remainingAmount: Number(loan.remainingAmount || 0),
      installmentAmount: Number(loan.installmentAmount || loan.payrollDeductionAmount || 0),
      availableNetSalary: remainingSalary
    });
    if (!(plan.appliedInstallment > 0)) continue;

    const result = await recordLoanRepayment({
      loanId: String(loan._id),
      amount: plan.appliedInstallment,
      repaymentMethod: 'payroll_deduction',
      note: 'Payroll loan deduction',
      actorUserId: input.actorUserId,
      payrollId: input.payrollId,
      salaryPaymentId: input.salaryPaymentId,
      idempotencyKey: input.salaryPaymentId
        ? `payroll-loan-${input.salaryPaymentId}-${String(loan._id)}`
        : undefined
    });

    remainingSalary = subMoney(remainingSalary, plan.appliedInstallment);
    applications.push({
      loanId: String(loan._id),
      amount: plan.appliedInstallment,
      warning: plan.warning,
      repaymentId: result.repayment._id
    });
  }

  return { applications, remainingSalaryAfterDeductions: remainingSalary };
}

export async function getLoansSummary(filter: Record<string, unknown> = {}) {
  const base: Record<string, unknown> = { isDeleted: false, ...filter };
  const activeStatuses = ['active', 'partially_repaid', 'overdue', 'approved'];

  const [totals, debtors, overdue] = await Promise.all([
    Loan.aggregate([
      { $match: { ...base, status: { $nin: ['cancelled', 'reversed', 'draft'] } } },
      {
        $group: {
          _id: null,
          totalLoans: { $sum: 1 },
          totalOriginal: { $sum: '$originalAmount' },
          totalRepaid: { $sum: '$repaidAmount' },
          totalOutstanding: { $sum: '$remainingAmount' }
        }
      }
    ]),
    Loan.aggregate([
      { $match: { ...base, status: { $in: activeStatuses }, remainingAmount: { $gt: 0 } } },
      { $group: { _id: { personType: '$personType', personId: '$personId' } } },
      { $count: 'count' }
    ]),
    Loan.aggregate([
      { $match: { ...base, status: 'overdue' } },
      { $group: { _id: null, total: { $sum: '$remainingAmount' }, count: { $sum: 1 } } }
    ])
  ]);

  const byPersonType = await Loan.aggregate([
    { $match: { ...base, remainingAmount: { $gt: 0 }, status: { $in: activeStatuses } } },
    {
      $group: {
        _id: '$personType',
        outstanding: { $sum: '$remainingAmount' },
        count: { $sum: 1 }
      }
    }
  ]);

  return {
    totalLoans: totals[0]?.totalLoans || 0,
    totalOriginalAmount: roundMoney(totals[0]?.totalOriginal || 0),
    totalRepaidAmount: roundMoney(totals[0]?.totalRepaid || 0),
    totalOutstandingAmount: roundMoney(totals[0]?.totalOutstanding || 0),
    totalDebtors: debtors[0]?.count || 0,
    overdueCount: overdue[0]?.count || 0,
    overdueAmount: roundMoney(overdue[0]?.total || 0),
    byPersonType: byPersonType.map((item) => ({
      personType: item._id,
      outstanding: roundMoney(item.outstanding || 0),
      count: item.count || 0
    }))
  };
}

export async function approveLoan(loanId: string, actorUserId?: string | null) {
  const loan = await Loan.findOne({ _id: loanId, isDeleted: false });
  if (!loan) throw httpError('Loan not found', 404);
  if (!['draft', 'pending_approval', 'approved'].includes(String(loan.status))) {
    throw httpError('Loan cannot be approved in its current status');
  }
  const previous = loan.status;
  loan.status = 'active';
  loan.approvedAt = new Date();
  loan.approvedBy = actorUserId || null;
  loan.auditHistory = [
    ...(Array.isArray(loan.auditHistory) ? loan.auditHistory : []),
    {
      originalValue: { status: previous },
      changedValue: { status: 'active' },
      changedBy: actorUserId || null,
      changedAt: new Date(),
      reason: 'loan_approved'
    }
  ];
  await loan.save();
  return loan.toObject();
}

export async function cancelLoan(loanId: string, reason: string, actorUserId?: string | null) {
  const loan = await Loan.findOne({ _id: loanId, isDeleted: false });
  if (!loan) throw httpError('Loan not found', 404);
  if (Number(loan.repaidAmount || 0) > 0) {
    throw httpError('Cannot cancel a loan that already has repayments. Use reversal workflow.');
  }
  const previous = loan.status;
  loan.status = 'cancelled';
  loan.cancelledAt = new Date();
  loan.cancelledBy = actorUserId || null;
  loan.cancellationReason = reason || 'cancelled';
  loan.auditHistory = [
    ...(Array.isArray(loan.auditHistory) ? loan.auditHistory : []),
    {
      originalValue: { status: previous },
      changedValue: { status: 'cancelled', reason },
      changedBy: actorUserId || null,
      changedAt: new Date(),
      reason: 'loan_cancelled'
    }
  ];
  await loan.save();
  return loan.toObject();
}
