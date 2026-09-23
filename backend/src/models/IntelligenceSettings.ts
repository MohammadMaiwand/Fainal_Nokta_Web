import mongoose from 'mongoose';
import { createBaseSchema } from '../utils/schema';
import { DEFAULT_INTELLIGENCE_SETTINGS } from '../modules/intelligence/defaults';

const resultBandSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true },
    minPercentage: { type: Number, required: true },
    maxPercentage: { type: Number, required: true },
    labelKey: { type: String, required: true, trim: true },
    messageTemplateKey: { type: String, required: true, trim: true },
    recommendationBehavior: {
      type: String,
      enum: ['advanced', 'enrichment', 'reinforce', 'remedial'],
      default: 'reinforce'
    },
    color: { type: String, default: '#64748b', trim: true },
    priority: { type: Number, default: 0 },
    active: { type: Boolean, default: true }
  },
  { _id: false }
);

const intelligenceSettingsSchema = createBaseSchema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    ruleVersion: { type: Number, default: DEFAULT_INTELLIGENCE_SETTINGS.ruleVersion, index: true },
    resultBands: { type: [resultBandSchema], default: () => DEFAULT_INTELLIGENCE_SETTINGS.resultBands },
    recommendationWeights: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ ...DEFAULT_INTELLIGENCE_SETTINGS.recommendationWeights })
    },
    weakTopicThreshold: { type: Number, default: DEFAULT_INTELLIGENCE_SETTINGS.weakTopicThreshold },
    strongTopicThreshold: { type: Number, default: DEFAULT_INTELLIGENCE_SETTINGS.strongTopicThreshold },
    criticalTopicThreshold: { type: Number, default: DEFAULT_INTELLIGENCE_SETTINGS.criticalTopicThreshold },
    acceptableTopicThreshold: { type: Number, default: DEFAULT_INTELLIGENCE_SETTINGS.acceptableTopicThreshold },
    trendStrongDelta: { type: Number, default: DEFAULT_INTELLIGENCE_SETTINGS.trendStrongDelta },
    trendModerateDelta: { type: Number, default: DEFAULT_INTELLIGENCE_SETTINGS.trendModerateDelta },
    trendComparisonLimit: { type: Number, default: DEFAULT_INTELLIGENCE_SETTINGS.trendComparisonLimit },
    minimumResultsForTrend: { type: Number, default: DEFAULT_INTELLIGENCE_SETTINGS.minimumResultsForTrend },
    minimumSampleForTeaching: { type: Number, default: DEFAULT_INTELLIGENCE_SETTINGS.minimumSampleForTeaching },
    unansweredMessageThreshold: { type: Number, default: DEFAULT_INTELLIGENCE_SETTINGS.unansweredMessageThreshold },
    messageWaitingHoursHigh: { type: Number, default: DEFAULT_INTELLIGENCE_SETTINGS.messageWaitingHoursHigh },
    messageWaitingHoursCritical: { type: Number, default: DEFAULT_INTELLIGENCE_SETTINGS.messageWaitingHoursCritical },
    dashboardInsightRefreshMinutes: { type: Number, default: DEFAULT_INTELLIGENCE_SETTINGS.dashboardInsightRefreshMinutes },
    cacheDurationMinutes: { type: Number, default: DEFAULT_INTELLIGENCE_SETTINGS.cacheDurationMinutes },
    preferOfflineContent: { type: Boolean, default: DEFAULT_INTELLIGENCE_SETTINGS.preferOfflineContent },
    onlineAiEnabled: { type: Boolean, default: DEFAULT_INTELLIGENCE_SETTINGS.onlineAiEnabled },
    localModelEnabled: { type: Boolean, default: DEFAULT_INTELLIGENCE_SETTINGS.localModelEnabled },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { collection: 'intelligence_settings' }
);

intelligenceSettingsSchema.index({ branchId: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

export const IntelligenceSettings =
  mongoose.models.IntelligenceSettings ?? mongoose.model('IntelligenceSettings', intelligenceSettingsSchema);
