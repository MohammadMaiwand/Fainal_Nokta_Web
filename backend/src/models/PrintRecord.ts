import mongoose from 'mongoose';
import { createBaseSchema } from '../utils/schema';

const printRecordSchema = createBaseSchema(
  {
    serialNumber: { type: String, required: true, unique: true, trim: true, index: true },
    documentType: { type: String, enum: ['academy_financial_report', 'attendance_sheet', 'timetable_sheet'], required: true, index: true },
    title: { type: String, required: true, trim: true },
    outputType: { type: String, enum: ['print', 'pdf', 'excel'], required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { collection: 'print_records' }
);

printRecordSchema.index({ documentType: 1, createdAt: -1 });
printRecordSchema.index({ branchId: 1, createdAt: -1 });

export const PrintRecord = mongoose.models.PrintRecord ?? mongoose.model('PrintRecord', printRecordSchema);
