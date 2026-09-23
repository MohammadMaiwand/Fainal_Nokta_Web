import mongoose from 'mongoose';
import { createBaseSchema, auditHistorySchema } from '../utils/schema';

const paymentSchema = createBaseSchema(
  {
    paymentFor: {
      type: String,
      enum: ['student_fee', 'teacher_salary', 'manager_salary', 'expense'],
      default: 'student_fee',
      index: true
    },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null, index: true },
    payeeUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    payeeRole: { type: String, enum: ['teacher', 'manager'], required: false, index: true },
    salaryRecordIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SalaryRecord' }],
    salaryApplications: [
      {
        recordId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryRecord' },
        applied: { type: Number, default: 0 }
      }
    ],
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', default: null, index: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null, index: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null, index: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    amount: { type: Number, required: true },
    grossAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    remainingSalaryBalance: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'partially_paid', 'paid', 'completed', 'cancelled', 'refunded', 'reversed'],
      default: 'paid',
      index: true
    },
    currency: { type: String, default: 'AFN', trim: true },
    paymentDate: { type: Date, default: Date.now, index: true },
    method: { type: String, enum: ['cash', 'bank_transfer', 'mobile_money', 'card'], default: 'cash' },
    invoiceNumber: { type: String, required: true, trim: true, unique: true, index: true },
    referenceNumber: { type: String, default: '', trim: true },
    // No default null — sparse unique indexes still collide on explicit null values.
    idempotencyKey: { type: String, trim: true, required: false },
    notes: { type: String, default: '', trim: true },
    expenseTitle: { type: String, default: '', trim: true },
    expenseCategory: { type: String, default: '', trim: true, index: true },
    immutableRecord: { type: Boolean, default: true },
    auditHistory: { type: [auditHistorySchema], default: [] }
  },
  { collection: 'payments' }
);

paymentSchema.index({ studentId: 1, paymentDate: -1 });
paymentSchema.index({ branchId: 1, paymentDate: -1 });
paymentSchema.index({ status: 1, paymentDate: -1 });
paymentSchema.index({ referenceNumber: 1 }, { sparse: true });
paymentSchema.index({ invoiceNumber: 1 }, { unique: true });
paymentSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    name: 'idempotencyKey_1',
    partialFilterExpression: { idempotencyKey: { $type: 'string' } }
  }
);

export const Payment = mongoose.models.Payment ?? mongoose.model('Payment', paymentSchema);
