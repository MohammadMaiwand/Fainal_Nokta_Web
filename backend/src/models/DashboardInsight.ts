import mongoose from 'mongoose';
import { createBaseSchema } from '../utils/schema';

const dashboardInsightSchema = createBaseSchema(
  {
    category: {
      type: String,
      enum: [
        'teaching',
        'student_progress',
        'enrollment',
        'attendance',
        'exam_results',
        'course_engagement',
        'messages',
        'operations',
        'branch',
        'content_usage',
        'system'
      ],
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['SUCCESS', 'INFORMATION', 'RECOMMENDATION', 'WARNING', 'CRITICAL', 'INSUFFICIENT_DATA'],
      required: true,
      index: true
    },
    titleKey: { type: String, required: true, trim: true },
    descriptionKey: { type: String, default: '', trim: true },
    descriptionData: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    metricValue: { type: Number, default: null },
    comparisonValue: { type: Number, default: null },
    periodStart: { type: Date, default: null, index: true },
    periodEnd: { type: Date, default: null, index: true },
    periodLabel: { type: String, default: '', trim: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    relatedRoute: { type: String, default: '', trim: true },
    suggestedActionKey: { type: String, default: '', trim: true },
    priority: { type: Number, default: 50, index: true },
    confidence: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW', 'INSUFFICIENT_DATA'],
      default: 'MEDIUM'
    },
    dataSourceSummary: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['active', 'dismissed', 'resolved'],
      default: 'active',
      index: true
    },
    dismissedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    dismissedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
    fingerprint: { type: String, required: true, trim: true, index: true },
    ruleVersion: { type: Number, default: 1 },
    generatedAt: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date, default: null, index: true }
  },
  { collection: 'dashboard_insights' }
);

dashboardInsightSchema.index({ branchId: 1, category: 1, periodStart: 1, periodEnd: 1 });
dashboardInsightSchema.index({ fingerprint: 1, status: 1 });
dashboardInsightSchema.index({ status: 1, priority: -1, generatedAt: -1 });

export const DashboardInsight =
  mongoose.models.DashboardInsight ?? mongoose.model('DashboardInsight', dashboardInsightSchema);
