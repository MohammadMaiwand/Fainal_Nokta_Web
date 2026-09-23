export type ResultBandCode =
  | 'EXCELLENT'
  | 'VERY_GOOD'
  | 'GOOD'
  | 'SATISFACTORY'
  | 'NEEDS_IMPROVEMENT'
  | 'POOR';

export type TrendStatus =
  | 'STRONG_IMPROVEMENT'
  | 'MODERATE_IMPROVEMENT'
  | 'STABLE'
  | 'SLIGHT_DECLINE'
  | 'STRONG_DECLINE'
  | 'INSUFFICIENT_DATA';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';

export type InsightType =
  | 'SUCCESS'
  | 'INFORMATION'
  | 'RECOMMENDATION'
  | 'WARNING'
  | 'CRITICAL'
  | 'INSUFFICIENT_DATA';

export type EscalationPriority = 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type EscalationStatus = 'open' | 'acknowledged' | 'assigned' | 'resolved' | 'dismissed';

export const DEFAULT_RESULT_BANDS = [
  {
    code: 'EXCELLENT' as ResultBandCode,
    minPercentage: 90,
    maxPercentage: 100,
    labelKey: 'intelligence.band_excellent',
    messageTemplateKey: 'intelligence.feedback_excellent',
    recommendationBehavior: 'advanced',
    color: '#059669',
    priority: 1,
    active: true
  },
  {
    code: 'VERY_GOOD' as ResultBandCode,
    minPercentage: 80,
    maxPercentage: 89.999,
    labelKey: 'intelligence.band_very_good',
    messageTemplateKey: 'intelligence.feedback_very_good',
    recommendationBehavior: 'advanced',
    color: '#10b981',
    priority: 2,
    active: true
  },
  {
    code: 'GOOD' as ResultBandCode,
    minPercentage: 70,
    maxPercentage: 79.999,
    labelKey: 'intelligence.band_good',
    messageTemplateKey: 'intelligence.feedback_good',
    recommendationBehavior: 'enrichment',
    color: '#0ea5e9',
    priority: 3,
    active: true
  },
  {
    code: 'SATISFACTORY' as ResultBandCode,
    minPercentage: 60,
    maxPercentage: 69.999,
    labelKey: 'intelligence.band_satisfactory',
    messageTemplateKey: 'intelligence.feedback_satisfactory',
    recommendationBehavior: 'reinforce',
    color: '#f59e0b',
    priority: 4,
    active: true
  },
  {
    code: 'NEEDS_IMPROVEMENT' as ResultBandCode,
    minPercentage: 50,
    maxPercentage: 59.999,
    labelKey: 'intelligence.band_needs_improvement',
    messageTemplateKey: 'intelligence.feedback_needs_improvement',
    recommendationBehavior: 'remedial',
    color: '#f97316',
    priority: 5,
    active: true
  },
  {
    code: 'POOR' as ResultBandCode,
    minPercentage: 0,
    maxPercentage: 49.999,
    labelKey: 'intelligence.band_poor',
    messageTemplateKey: 'intelligence.feedback_poor',
    recommendationBehavior: 'remedial',
    color: '#ef4444',
    priority: 6,
    active: true
  }
];

export const DEFAULT_RECOMMENDATION_WEIGHTS = {
  subjectMatch: 40,
  topicMatch: 30,
  learningOutcomeMatch: 20,
  difficultySuitability: 15,
  languageMatch: 10,
  offlineAvailability: 15,
  teacherPriority: 20,
  completedPenalty: 25,
  prerequisiteMismatchPenalty: 40
};

export const DEFAULT_INTELLIGENCE_SETTINGS = {
  ruleVersion: 1,
  resultBands: DEFAULT_RESULT_BANDS,
  recommendationWeights: DEFAULT_RECOMMENDATION_WEIGHTS,
  weakTopicThreshold: 55,
  strongTopicThreshold: 80,
  criticalTopicThreshold: 40,
  acceptableTopicThreshold: 65,
  trendStrongDelta: 15,
  trendModerateDelta: 5,
  trendComparisonLimit: 5,
  minimumResultsForTrend: 2,
  minimumSampleForTeaching: 5,
  unansweredMessageThreshold: 3,
  messageWaitingHoursHigh: 24,
  messageWaitingHoursCritical: 72,
  dashboardInsightRefreshMinutes: 15,
  cacheDurationMinutes: 60,
  preferOfflineContent: true,
  onlineAiEnabled: false,
  localModelEnabled: false
};

export const RULE_VERSION = DEFAULT_INTELLIGENCE_SETTINGS.ruleVersion;
