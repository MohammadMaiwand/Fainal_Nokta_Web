import mongoose from 'mongoose';
import { createBaseSchema } from '../utils/schema';

const examAuditLogSchema = createBaseSchema(
  {
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, required: true, trim: true, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { collection: 'exam_audit_logs' }
);

examAuditLogSchema.index({ examId: 1, createdAt: -1 });

export const ExamAuditLog = mongoose.models.ExamAuditLog ?? mongoose.model('ExamAuditLog', examAuditLogSchema);
