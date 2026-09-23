import mongoose from 'mongoose';
import { createBaseSchema } from '../utils/schema';

const analysisCacheSchema = createBaseSchema(
  {
    analysisType: {
      type: String,
      enum: [
        'exam_result',
        'student_progress',
        'recommendation',
        'dashboard_insight',
        'teaching',
        'enrollment',
        'message_escalation',
        'offline_sync'
      ],
      required: true,
      index: true
    },
    entityType: { type: String, required: true, trim: true, index: true },
    entityId: { type: String, required: true, trim: true, index: true },
    ruleVersion: { type: Number, default: 1, index: true },
    inputDataVersion: { type: String, default: '', trim: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    language: { type: String, enum: ['en', 'fa', 'ps', ''], default: '' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    userScope: { type: String, default: '', trim: true, index: true },
    generatedAt: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date, default: null, index: true },
    staleAt: { type: Date, default: null }
  },
  { collection: 'analysis_cache' }
);

analysisCacheSchema.index(
  { analysisType: 1, entityType: 1, entityId: 1, language: 1, userScope: 1 },
  { unique: true }
);
analysisCacheSchema.index({ expiresAt: 1 });

export const AnalysisCache = mongoose.models.AnalysisCache ?? mongoose.model('AnalysisCache', analysisCacheSchema);
