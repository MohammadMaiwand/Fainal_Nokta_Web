import mongoose from 'mongoose';
import { createBaseSchema, auditHistorySchema } from '../utils/schema';
import { LOAN_PERSON_TYPES, LOAN_REPAYMENT_METHODS } from './Loan';

const loanRepaymentSchema = createBaseSchema(
  {
    repaymentNumber: { type: String, required: true, unique: true, trim: true, index: true },
    loanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan', required: true, index: true },
    personType: { type: String, enum: LOAN_PERSON_TYPES, required: true, index: true },
    personId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'AFN', trim: true },
    repaymentMethod: { type: String, enum: LOAN_REPAYMENT_METHODS, default: 'cash' },
    repaymentDate: { type: Date, default: Date.now, index: true },
    payrollId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryRecord', default: null, index: true },
    salaryPaymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    studentPaymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    receiptNumber: { type: String, default: '', trim: true, index: true },
    note: { type: String, default: '', trim: true },
    remainingBefore: { type: Number, default: 0 },
    remainingAfter: { type: Number, default: 0 },
    status: { type: String, enum: ['completed', 'reversed'], default: 'completed', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reversedAt: { type: Date, default: null },
    reversedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reversalReason: { type: String, default: '', trim: true },
    idempotencyKey: { type: String, trim: true, required: false },
    auditHistory: { type: [auditHistorySchema], default: [] }
  },
  { collection: 'loan_repayments' }
);

loanRepaymentSchema.index({ loanId: 1, repaymentDate: -1 });
loanRepaymentSchema.index({ personType: 1, personId: 1, repaymentDate: -1 });
loanRepaymentSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    name: 'idempotencyKey_1',
    partialFilterExpression: { idempotencyKey: { $type: 'string' } }
  }
);

export const LoanRepayment = mongoose.models.LoanRepayment ?? mongoose.model('LoanRepayment', loanRepaymentSchema);
