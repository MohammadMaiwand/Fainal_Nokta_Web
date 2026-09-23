import { config } from '../../config/env';
import { Attendance } from '../../models/Attendance';
import { AIResultInsight } from '../../models/AIResultInsight';
import { LearningRecommendation } from '../../models/LearningRecommendation';
import { Question } from '../../models/Question';
import { Result } from '../../models/Result';
import { NotificationDispatchService } from '../../services/notificationDispatchService';
import { aiProviderService } from '../../services/aiProviderService';
import { AuditService } from '../../services/auditService';
import { logger } from '../../utils/logger';
import { getIntelligenceSettings, classifyResultBand } from './resultBandService';
import {
  confidenceFromEvidence,
  renderFeedbackMessage,
  renderTrendMessage
} from './insightTemplateService';
import { analyzeTopics, analyzeTrend, toPercentage } from './trendAnalysisService';
import { buildRecommendations, persistRecommendations } from './recommendationService';
import { setCachedAnalysis } from './analysisCacheService';
import type { InsightAnalysis } from '../ai-results/aiResultAnalysis.service';

const notificationDispatch = new NotificationDispatchService();
const auditService = new AuditService();

export type OfflineExamAnalysis = InsightAnalysis & {
  percentage: number;
  resultBand: string;
  resultBandLabelKey: string;
  previousPercentage: number | null;
  improvementDifference: number | null;
  strongAreas: string[];
  weakAreas: string[];
  topicPerformance: Array<{
    topic: string;
    percentage: number;
    classification: string;
  }>;
  feedbackMessage: string;
  trendMessage: string;
  recommendationSummary: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';
  ruleVersion: number;
  offlineReady: boolean;
  detailedTrendStatus: string;
};

function mapLegacyTrend(status: string): InsightAnalysis['trendStatus'] {
  if (status === 'STRONG_IMPROVEMENT' || status === 'MODERATE_IMPROVEMENT') return 'improving';
  if (status === 'STRONG_DECLINE' || status === 'SLIGHT_DECLINE') return 'declining';
  if (status === 'STABLE') return 'stable';
  return 'unknown';
}

function mapRisk(bandCode: string, trendStatus: string, attendanceRate: number | null): InsightAnalysis['riskLevel'] {
  if (bandCode === 'POOR' || bandCode === 'NEEDS_IMPROVEMENT') {
    if (attendanceRate !== null && attendanceRate < 75) return 'high';
    if (trendStatus.includes('DECLINE')) return 'high';
    return 'medium';
  }
  if (trendStatus.includes('DECLINE')) return 'medium';
  return 'low';
}

async function maybeEnhanceWithProvider(analysis: OfflineExamAnalysis, payload: any): Promise<OfflineExamAnalysis> {
  if (!config.aiProviderEnabled || !config.aiProviderApiKey || config.aiAllowSensitiveExternal) {
    return analysis;
  }
  try {
    const enhanced = await aiProviderService.enhanceInsight({
      analysis: {
        overallScore: analysis.overallScore,
        grade: analysis.grade,
        trendStatus: analysis.trendStatus,
        riskLevel: analysis.riskLevel,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        recommendations: analysis.recommendations,
        teacherNotesSuggestion: analysis.teacherNotesSuggestion,
        parentSummary: analysis.parentSummary,
        studentSummary: analysis.studentSummary,
        classComparison: analysis.classComparison,
        generatedBy: analysis.generatedBy,
        confidenceScore: analysis.confidenceScore
      },
      subjectName: payload.exam?.subject?.title ?? 'subject',
      studentName: payload.student?.name ?? payload.student?.fullName
    });
    return {
      ...analysis,
      ...enhanced,
      generatedBy: 'ai_provider',
      offlineReady: true
    };
  } catch (error) {
    logger.warn('Optional AI enhancement failed; using offline analysis', {
      error: error instanceof Error ? error.message : String(error)
    });
    return analysis;
  }
}

export function analyzeExamResultOffline(payload: {
  result: any;
  exam: any;
  student: any;
  previousResults: any[];
  attendanceRate?: number | null;
  topicItems?: Array<{ topic?: string | null; earned?: number; maximum?: number }>;
  settings: Awaited<ReturnType<typeof getIntelligenceSettings>>;
  language?: string;
}): OfflineExamAnalysis {
  const totalMarks = Number(payload.exam?.totalMarks ?? 100);
  const score = Number(payload.result?.score ?? 0);
  const percentage = toPercentage(score, totalMarks);
  const grade = String(payload.result?.grade ?? '');
  const band = classifyResultBand(percentage, payload.settings.resultBands as any);
  const subjectName = payload.exam?.subject?.title ?? 'subject';

  const previousPercentages = payload.previousResults.map((item) => {
    const prevTotal = Number(item.totalMarks ?? item.exam?.totalMarks ?? totalMarks);
    return toPercentage(Number(item.score ?? 0), prevTotal);
  });

  const trend = analyzeTrend({
    currentPercentage: percentage,
    previousPercentages,
    strongDelta: payload.settings.trendStrongDelta,
    moderateDelta: payload.settings.trendModerateDelta,
    minimumResults: payload.settings.minimumResultsForTrend
  });

  const topics = analyzeTopics({
    items: payload.topicItems || [],
    strongThreshold: payload.settings.strongTopicThreshold,
    acceptableThreshold: payload.settings.acceptableTopicThreshold,
    weakThreshold: payload.settings.weakTopicThreshold,
    criticalThreshold: payload.settings.criticalTopicThreshold
  });

  const strongAreas = topics.filter((item) => item.classification === 'strong').map((item) => item.topic);
  const weakAreas = topics
    .filter((item) => item.classification === 'weak' || item.classification === 'critical')
    .map((item) => item.topic);

  const feedbackMessage = renderFeedbackMessage({
    band: band.code,
    language: payload.language,
    subject: subjectName,
    percentage,
    strongTopics: strongAreas,
    weakTopics: weakAreas
  });
  const trendMessage = renderTrendMessage({
    trend: trend.trendStatus,
    language: payload.language,
    difference: trend.difference ?? undefined
  });

  const confidence = confidenceFromEvidence({
    historyCount: previousPercentages.length,
    hasTopicMapping: topics.length > 0,
    hasAttendance: payload.attendanceRate !== null && payload.attendanceRate !== undefined,
    minimumForTrend: payload.settings.minimumResultsForTrend
  });

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  if (band.code === 'EXCELLENT' || band.code === 'VERY_GOOD') {
    strengths.push(`Strong performance in ${subjectName}`);
    recommendations.push('Continue with advanced related materials.');
  } else if (band.code === 'GOOD' || band.code === 'SATISFACTORY') {
    strengths.push(`Developing mastery in ${subjectName}`);
    recommendations.push('Maintain weekly revision and targeted practice.');
  } else {
    weaknesses.push(`Additional support needed in ${subjectName}`);
    recommendations.push('Review foundational lessons and ask the teacher for help.');
  }

  for (const topic of strongAreas.slice(0, 3)) strengths.push(`Strong topic: ${topic}`);
  for (const topic of weakAreas.slice(0, 3)) weaknesses.push(`Needs revision: ${topic}`);

  if (trend.trendStatus.includes('IMPROVEMENT')) {
    strengths.push('Performance trend is improving');
  }
  if (trend.trendStatus.includes('DECLINE')) {
    weaknesses.push('Performance trend is declining');
    recommendations.push('Review previous mistakes and set a short recovery plan.');
  }
  if (payload.attendanceRate !== null && payload.attendanceRate !== undefined) {
    if (payload.attendanceRate < 75) {
      weaknesses.push('Low attendance may be affecting academic progress');
      recommendations.push('Improve attendance consistency.');
    } else {
      strengths.push('Attendance is supportive of progress');
    }
  }

  const riskLevel = mapRisk(band.code, trend.trendStatus, payload.attendanceRate ?? null);
  const teacherNotesSuggestion =
    riskLevel === 'high'
      ? 'Prioritize direct intervention, assign remedial tasks, and coordinate with guardians.'
      : riskLevel === 'medium'
        ? 'Monitor weekly progress and provide structured feedback.'
        : 'Encourage continued growth with stretch goals.';

  const parentSummary =
    riskLevel === 'high'
      ? 'Your student needs extra support this period. Regular study time and teacher follow-up are recommended.'
      : 'Your student is progressing. Consistent study habits and attendance will help maintain growth.';

  return {
    overallScore: score,
    grade,
    percentage,
    resultBand: band.code,
    resultBandLabelKey: band.labelKey,
    trendStatus: mapLegacyTrend(trend.trendStatus),
    detailedTrendStatus: trend.trendStatus,
    previousPercentage: trend.previousPercentage,
    improvementDifference: trend.difference,
    riskLevel,
    strengths: Array.from(new Set(strengths)).slice(0, 8),
    weaknesses: Array.from(new Set(weaknesses)).slice(0, 8),
    strongAreas,
    weakAreas,
    topicPerformance: topics.map((item) => ({
      topic: item.topic,
      percentage: item.percentage,
      classification: item.classification
    })),
    recommendations: Array.from(new Set(recommendations)).slice(0, 8),
    recommendationSummary: recommendations.slice(0, 3).join(' '),
    feedbackMessage,
    trendMessage,
    teacherNotesSuggestion,
    parentSummary,
    studentSummary: feedbackMessage,
    classComparison: '',
    generatedBy: 'rule_based',
    confidenceScore:
      confidence === 'HIGH' ? 0.9 : confidence === 'MEDIUM' ? 0.75 : confidence === 'LOW' ? 0.55 : 0.35,
    confidence,
    ruleVersion: payload.settings.ruleVersion,
    offlineReady: true
  };
}

export async function upsertExamAnalysis(params: {
  resultId: string;
  actorId?: string | null;
  language?: string;
}) {
  const result = await Result.findById(params.resultId)
    .populate({
      path: 'exam',
      select: 'subject class teacherId branchId totalMarks passingMarks title examType',
      populate: [
        { path: 'subject', select: 'title code' },
        { path: 'class', select: 'className name classCode' }
      ]
    })
    .populate('student', 'branchId name fullName preferredLanguage')
    .lean<any>();
  if (!result) throw new Error('Result not found');

  const exam = result.exam;
  const student = result.student;
  const studentId = result.student?._id ?? result.student;
  const examId = result.exam?._id ?? result.exam;
  const classId = result.classId ?? exam?.class?._id ?? exam?.class ?? null;
  const branchId = student?.branchId ?? exam?.branchId ?? null;
  const subjectId = result.subjectId ?? exam?.subject?._id ?? exam?.subject ?? null;
  const settings = await getIntelligenceSettings(branchId ? String(branchId) : null);
  const language = params.language || student?.preferredLanguage || 'en';

  const previousResults = await Result.find({
    student: studentId,
    ...(subjectId ? { subjectId } : {}),
    _id: { $ne: result._id },
    isDeleted: false
  })
    .sort({ createdAt: -1 })
    .limit(settings.trendComparisonLimit)
    .populate('exam', 'totalMarks subject examType')
    .lean<any[]>();

  const comparable = previousResults.filter((item) => {
    const prevSubject = item.subjectId ?? item.exam?.subject;
    if (subjectId && prevSubject && String(prevSubject) !== String(subjectId)) return false;
    if (exam?.examType && item.exam?.examType && item.exam.examType !== exam.examType) return false;
    return true;
  });

  const attendance = await Attendance.aggregate([
    { $match: { userId: studentId, isDeleted: { $ne: true } } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        present: {
          $sum: { $cond: [{ $in: ['$status', ['present', 'late', 'excused', 'online_auto_marked']] }, 1, 0] }
        }
      }
    }
  ]);
  const attendanceRate =
    attendance.length && attendance[0].total > 0
      ? Math.round((attendance[0].present / attendance[0].total) * 100)
      : null;

  // Optional topic mappings on questions (for future scoring). Do not fabricate topic weakness.
  await Question.find({ examId, isDeleted: { $ne: true } }).select('topic learningOutcome marks').lean<any[]>();

  const topicItemsWithScores: Array<{ topic?: string | null; earned?: number; maximum?: number }> = [];
  if (Array.isArray((result as any).topicScores)) {
    for (const item of (result as any).topicScores) {
      topicItemsWithScores.push({
        topic: item.topic,
        earned: Number(item.earned || 0),
        maximum: Number(item.maximum || 0)
      });
    }
  }

  let analysis = analyzeExamResultOffline({
    result,
    exam,
    student,
    previousResults: comparable.map((item) => ({
      score: item.score,
      totalMarks: item.exam?.totalMarks,
      exam: item.exam
    })),
    attendanceRate,
    topicItems: topicItemsWithScores,
    settings,
    language
  });

  analysis = await maybeEnhanceWithProvider(analysis, { result, exam, student });

  const classAvg = await Result.aggregate([
    { $match: { exam: examId, isDeleted: { $ne: true } } },
    { $group: { _id: null, avg: { $avg: '$score' } } }
  ]);
  const average = classAvg[0]?.avg ? Number(classAvg[0].avg) : 0;
  analysis.classComparison = average
    ? `Score ${analysis.overallScore} vs class average ${Math.round(average)}`
    : '';

  const band = classifyResultBand(analysis.percentage, settings.resultBands as any);
  const insight = await AIResultInsight.findOneAndUpdate(
    { studentId, examId },
    {
      $set: {
        studentId,
        examId,
        classId,
        branchId,
        subjectId,
        resultId: result._id,
        overallScore: analysis.overallScore,
        grade: analysis.grade,
        percentage: analysis.percentage,
        resultBand: analysis.resultBand,
        trendStatus: analysis.trendStatus,
        detailedTrendStatus: analysis.detailedTrendStatus,
        previousPercentage: analysis.previousPercentage,
        improvementDifference: analysis.improvementDifference,
        riskLevel: analysis.riskLevel,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        strongAreas: analysis.strongAreas,
        weakAreas: analysis.weakAreas,
        topicPerformance: analysis.topicPerformance,
        recommendations: analysis.recommendations,
        recommendationSummary: analysis.recommendationSummary,
        feedbackMessage: analysis.feedbackMessage,
        trendMessage: analysis.trendMessage,
        teacherNotesSuggestion: analysis.teacherNotesSuggestion,
        parentSummary: analysis.parentSummary,
        studentSummary: analysis.studentSummary,
        classComparison: analysis.classComparison,
        generatedBy: analysis.generatedBy,
        confidenceScore: analysis.confidenceScore,
        confidence: analysis.confidence,
        ruleVersion: analysis.ruleVersion,
        offlineReady: true
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean<any>();

  const candidates = await buildRecommendations({
    studentId: String(studentId),
    analysisId: insight?._id ? String(insight._id) : null,
    resultId: String(result._id),
    branchId: branchId ? String(branchId) : null,
    subjectId: subjectId ? String(subjectId) : null,
    subjectTitle: exam?.subject?.title,
    classId: classId ? String(classId) : null,
    percentage: analysis.percentage,
    behavior: band.recommendationBehavior,
    language,
    weakTopics: analysis.weakAreas,
    strongTopics: analysis.strongAreas,
    weights: settings.recommendationWeights as any,
    preferOffline: settings.preferOfflineContent,
    ruleVersion: settings.ruleVersion
  });

  await persistRecommendations({
    studentId: String(studentId),
    analysisId: insight?._id ? String(insight._id) : null,
    resultId: String(result._id),
    branchId: branchId ? String(branchId) : null,
    subjectId: subjectId ? String(subjectId) : null,
    ruleVersion: settings.ruleVersion,
    candidates
  });

  await setCachedAnalysis({
    analysisType: 'exam_result',
    entityType: 'result',
    entityId: String(result._id),
    ruleVersion: settings.ruleVersion,
    payload: { insight, recommendations: candidates, analysis },
    language,
    branchId: branchId ? String(branchId) : null,
    userScope: String(studentId),
    cacheDurationMinutes: settings.cacheDurationMinutes
  });

  if (analysis.riskLevel === 'high') {
    await notificationDispatch.send({
      title: 'Academic support recommended',
      message: analysis.feedbackMessage,
      recipientIds: [String(studentId)],
      recipientRoles: ['student']
    });
  } else if (analysis.resultBand === 'EXCELLENT' || analysis.resultBand === 'VERY_GOOD') {
    await notificationDispatch.send({
      title: 'Excellent exam result',
      message: analysis.feedbackMessage,
      recipientIds: [String(studentId)],
      recipientRoles: ['student']
    });
  }

  await auditService.recordAction({
    actorId: String(params.actorId || 'system'),
    branchId: branchId ? String(branchId) : null,
    action: 'EXAM_ANALYSIS_GENERATED',
    target: String(result._id),
    targetType: 'result',
    severity: 'info',
    metadata: {
      resultBand: analysis.resultBand,
      percentage: analysis.percentage,
      ruleVersion: analysis.ruleVersion,
      confidence: analysis.confidence
    }
  });

  const recommendations = await LearningRecommendation.find({
    studentId,
    analysisId: insight?._id,
    status: 'active',
    isDeleted: false
  })
    .sort({ score: -1 })
    .lean();

  return { insight, recommendations, analysis };
}
