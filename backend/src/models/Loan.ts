import mongoose from 'mongoose';
import { createBaseSchema, auditHistorySchema } from '../utils/schema';

export const LOAN_PERSON_TYPES = ['student', 'teacher', 'manager', 'employee'] as const;
export const LOAN_TYPES = ['CASH_LOAN', 'SALARY_ADVANCE', 'STUDENT_FEE_DEBT', 'EMERGENCY_LOAN', 'OTHER'] as const;
export const LOAN_STATUSES = [
  'draft',
  'pending_approval',
  'approved',
  'active',
  'partially_repaid',
  'paid',
  'overdue',
  'cancelled',
  'reversed'
] as const;
export const LOAN_REPAYMENT_METHODS = [
  'cash',
  'bank_transfer',
  'mobile_money',
  'card',
  'payroll_deduction',
  'student_payment_adjustment',
  'other'
] as const;

const loanSchema = createBaseSchema(
  {
    loanNumber: { type: String, required: true, unique: true, trim: true, index: true },
    personType: { type: String, enum: LOAN_PERSON_TYPES, required: true, index: true },
    personId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    personName: { type: String, default: '', trim: true },
    fatherName: { type: String, default: '', trim: true },
    personPhone: { type: String, default: '', trim: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    loanType: { type: String, enum: LOAN_TYPES, required: true, index: true },
    purpose: { type: String, default: '', trim: true },
    originalAmount: { type: Number, required: true },
    repaidAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number, required: true },
    currency: { type: String, default: 'AFN', trim: true },
    loanDate: { type: Date, default: Date.now, index: true },
    dueDate: { type: Date, default: null, index: true },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: LOAN_STATUSES, default: 'active', index: true },
    repaymentMethodDefault: { type: String, enum: LOAN_REPAYMENT_METHODS, default: 'cash' },
    payrollDeductionEnabled: { type: Boolean, default: false },
    payrollDeductionAmount: { type: Number, default: 0 },
    installmentEnabled: { type: Boolean, default: false },
    installmentAmount: { type: Number, default: 0 },
    notes: { type: String, default: '', trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    cancellationReason: { type: String, default: '', trim: true },
    // Student links
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null, index: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
    originalFeeSnapshot: { type: Number, default: 0 },
    paidFeeSnapshot: { type: Number, default: 0 },
    remainingFeeSnapshot: { type: Number, default: 0 },
    classNameSnapshot: { type: String, default: '' },
    subjectNameSnapshot: { type: String, default: '' },
    // Employee salary snapshot
    employeeRole: { type: String, default: '', trim: true },
    salaryTypeSnapshot: { type: String, default: '' },
    baseSalarySnapshot: { type: Number, default: 0 },
    grossSalarySnapshot: { type: Number, default: 0 },
    netSalarySnapshot: { type: Number, default: 0 },
    taxSnapshot: { type: Number, default: 0 },
    idempotencyKey: { type: String, trim: true, required: false },
    version: { type: Number, default: 1 },
    auditHistory: { type: [auditHistorySchema], default: [] }
  },
  { collection: 'loans' }
);

loanSchema.index({ personType: 1, personId: 1, status: 1 });
loanSchema.index({ branchId: 1, loanDate: -1 });
loanSchema.index({ status: 1, remainingAmount: 1 });
loanSchema.index({ dueDate: 1, status: 1 });
loanSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    name: 'idempotencyKey_1',
    partialFilterExpression: { idempotencyKey: { $type: 'string' } }
  }
);

export const Loan = mongoose.models.Loan ?? mongoose.model('Loan', loanSchema);
