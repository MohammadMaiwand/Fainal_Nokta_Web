/**
 * Central Offline Intelligence Engine facade.
 * Controllers should call this module rather than duplicating analysis logic.
 */
export { analyzeExamResultOffline, upsertExamAnalysis } from './examAnalysisService';
export { buildRecommendations, persistRecommendations } from './recommendationService';
export { generateDashboardInsights } from './dashboardInsightService';
export {
  evaluateConversationEscalation,
  evaluateMessageEscalationsForBranch,
  resolveEscalationOnReply,
  acknowledgeEscalation,
  assignEscalation,
  resolveEscalation,
  calculateEscalationPriority
} from './messageEscalationService';
export { getIntelligenceSettings, upsertIntelligenceSettings, classifyResultBand } from './resultBandService';
export { getCachedAnalysis, setCachedAnalysis, invalidateAnalysisCache } from './analysisCacheService';
export {
  renderFeedbackMessage,
  renderTrendMessage,
  renderUnansweredAlert,
  renderOfflineStatus,
  renderInsufficientData
} from './insightTemplateService';
export { analyzeTrend, analyzeTopics, toPercentage } from './trendAnalysisService';
export { DEFAULT_INTELLIGENCE_SETTINGS, DEFAULT_RESULT_BANDS, RULE_VERSION } from './defaults';
