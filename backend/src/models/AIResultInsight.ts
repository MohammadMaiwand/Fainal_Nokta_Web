import mongoose from 'mongoose';
import { createBaseSchema } from '../utils/schema';

const topicPerformanceSchema = new mongoose.Schema(
  {
    topic: { type: String, trim: true, default: '' },
    percentage: { type: Number, default: 0 },
    classification: { type: String, enum: ['strong', 'acceptable', 'weak', 'critical', ''], default: '' }
  },
  { _id: false }
);

const aiResultInsightSchema = createBaseSchema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null, index: true },
    resultId: { type: mongoose.Schema.Types.ObjectId, ref: 'Result', default: null, index: true },
    overallScore: { type: Number, required: true },
    percentage: { type: Number, default: null, index: true },
    grade: { type: String, required: true, trim: true },
    resultBand: {
      type: String,
      enum: ['EXCELLENT', 'VERY_GOOD', 'GOOD', 'SATISFACTORY', 'NEEDS_IMPROVEMENT', 'POOR', ''],
      default: '',
      index: true
    },
    trendStatus: { type: String, enum: ['improving', 'stable', 'declining', 'unknown'], default: 'unknown', index: true },
    detailedTrendStatus: {
      type: String,
      enum: [
        'STRONG_IMPROVEMENT',
        'MODERATE_IMPROVEMENT',
        'STABLE',
        'SLIGHT_DECLINE',
        'STRONG_DECLINE',
        'INSUFFICIENT_DATA',
        ''
      ],
      default: ''
    },
    previousPercentage: { type: Number, default: null },
    improvementDifference: { type: Number, default: null },
    riskLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'medium', index: true },
    strengths: [{ type: String, trim: true }],
    weaknesses: [{ type: String, trim: true }],
    strongAreas: [{ type: String, trim: true }],
    weakAreas: [{ type: String, trim: true }],
    topicPerformance: { type: [topicPerformanceSchema], default: [] },
    recommendations: [{ type: String, trim: true }],
    recommendationSummary: { type: String, default: '', trim: true },
    feedbackMessage: { type: String, default: '', trim: true },
    trendMessage: { type: String, default: '', trim: true },
    teacherNotesSuggestion: { type: String, default: '', trim: true },
    parentSummary: { type: String, default: '', trim: true },
    studentSummary: { type: String, default: '', trim: true },
    classComparison: { type: String, default: '', trim: true },
    generatedBy: { type: String, enum: ['rule_based', 'ai_provider'], default: 'rule_based' },
    confidenceScore: { type: Number, min: 0, max: 1, default: 0.75 },
    confidence: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW', 'INSUFFICIENT_DATA'],
      default: 'MEDIUM'
    },
    ruleVersion: { type: Number, default: 1, index: true },
    offlineReady: { type: Boolean, default: true }
  },
  { collection: 'ai_result_insights' }
);

aiResultInsightSchema.index({ studentId: 1, examId: 1 }, { unique: true });
aiResultInsightSchema.index({ classId: 1, examId: 1, riskLevel: 1 });
aiResultInsightSchema.index({ resultId: 1 });
aiResultInsightSchema.index({ studentId: 1, subjectId: 1, createdAt: -1 });

export const AIResultInsight = mongoose.models.AIResultInsight ?? mongoose.model('AIResultInsight', aiResultInsightSchema);
