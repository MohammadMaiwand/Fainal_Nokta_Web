import { AIClassExamInsight } from '../../models/AIClassExamInsight';
import { AIResultInsight } from '../../models/AIResultInsight';
import { Exam } from '../../models/Exam';
import { Result } from '../../models/Result';
import { analyzeExamResultOffline, upsertExamAnalysis } from '../intelligence/examAnalysisService';
import { DEFAULT_INTELLIGENCE_SETTINGS } from '../intelligence/defaults';
import { getIntelligenceSettings } from '../intelligence/resultBandService';

type AnalyzePayload = {
  result: any;
  exam: any;
  student: any;
  previousResults: any[];
  attendanceRate?: number | null;
};

export type InsightAnalysis = {
  overallScore: number;
  grade: string;
  trendStatus: 'improving' | 'stable' | 'declining' | 'unknown';
  riskLevel: 'low' | 'medium' | 'high';
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  teacherNotesSuggestion: string;
  parentSummary: string;
  studentSummary: string;
  classComparison: string;
  generatedBy: 'rule_based' | 'ai_provider';
  confidenceScore: number;
};

export function analyzeResultWithRules(payload: AnalyzePayload): InsightAnalysis {
  const analysis = analyzeExamResultOffline({
    ...payload,
    settings: DEFAULT_INTELLIGENCE_SETTINGS as any,
    language: 'en'
  });
  return {
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
  };
}

export async function upsertAIResultInsight(params: { resultId: string; actorId?: string | null }) {
  const { insight } = await upsertExamAnalysis(params);
  return insight;
}

export async function generateExamInsights(examId: string) {
  const exam = await Exam.findById(examId).lean<any>();
  if (!exam) throw new Error('Exam not found');

  const results = await Result.find({ exam: exam._id, isDeleted: false }).select('_id student score').lean<any[]>();
  for (const result of results) {
    await upsertAIResultInsight({ resultId: String(result._id) });
  }

  const insights = await AIResultInsight.find({ examId: exam._id, isDeleted: { $ne: true } }).lean<any[]>();
  const scores = insights.map((item) => Number(item.overallScore || 0));
  const averageScore = scores.length ? Number((scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(2)) : 0;
  const passMark = Number(exam.passingMarks ?? 40);
  const passCount = scores.filter((score) => score >= passMark).length;
  const failCount = scores.length - passCount;
  const passRate = scores.length ? Number(((passCount / scores.length) * 100).toFixed(2)) : 0;
  const failRate = scores.length ? Number(((failCount / scores.length) * 100).toFixed(2)) : 0;
  const atRiskStudentCount = insights.filter((item) => item.riskLevel === 'high').length;
  const settings = await getIntelligenceSettings(exam.branchId ? String(exam.branchId) : null);

  const recommendations = [
    failRate > 40 ? 'Plan a focused revision cycle for weak topics.' : 'Maintain the current teaching pace with periodic checks.',
    atRiskStudentCount > 0 ? 'Schedule targeted intervention sessions for high-risk students.' : 'Continue regular formative assessments.'
  ];

  const unusualScoreDistribution = scores.length >= 5 && Math.max(...scores) - Math.min(...scores) > 60
    ? 'High variance in score distribution detected.'
    : '';

  const classInsight = await AIClassExamInsight.findOneAndUpdate(
    { examId: exam._id, classId: exam.class },
    {
      $set: {
        examId: exam._id,
        classId: exam.class,
        branchId: exam.branchId ?? null,
        averageScore,
        passRate,
        failRate,
        topStrengths: ['Exam participation completed'],
        commonWeaknesses: failRate > 30 ? ['Weak performance cluster detected'] : [],
        atRiskStudentCount,
        recommendations,
        unusualScoreDistribution,
        generatedBy: 'rule_based',
        ruleVersion: settings.ruleVersion
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean<any>();

  return classInsight;
}
