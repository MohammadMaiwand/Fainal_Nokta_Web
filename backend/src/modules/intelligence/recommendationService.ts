import { Book } from '../../models/Book';
import { Course } from '../../models/Course';
import { Curriculum } from '../../models/Curriculum';
import { LearningRecommendation } from '../../models/LearningRecommendation';
import { LearningResource } from '../../models/LearningResource';
import { Subject } from '../../models/Subject';
import type { DEFAULT_RECOMMENDATION_WEIGHTS } from './defaults';

type Weights = typeof DEFAULT_RECOMMENDATION_WEIGHTS;

export type RecommendationCandidate = {
  resourceType: string;
  resourceId: string | null;
  resourceTitle: string;
  resourceUrl: string;
  score: number;
  reason: string;
  reasonKey: string;
  reasonData: Record<string, unknown>;
  difficulty: string;
  language: string;
  offlineAvailable: boolean;
  behavior: string;
};

function localizedTitle(value: any, language = 'en') {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[language] || value.en || value.fa || value.ps || '';
}

function scoreCandidate(params: {
  weights: Weights;
  subjectMatch: boolean;
  topicMatch: boolean;
  learningOutcomeMatch: boolean;
  difficultySuitability: number;
  languageMatch: boolean;
  offlineAvailable: boolean;
  teacherPriority: boolean;
  alreadyCompleted: boolean;
  prerequisiteMismatch: boolean;
}) {
  let score = 0;
  if (params.subjectMatch) score += params.weights.subjectMatch;
  if (params.topicMatch) score += params.weights.topicMatch;
  if (params.learningOutcomeMatch) score += params.weights.learningOutcomeMatch;
  score += Math.max(0, Math.min(1, params.difficultySuitability)) * params.weights.difficultySuitability;
  if (params.languageMatch) score += params.weights.languageMatch;
  if (params.offlineAvailable) score += params.weights.offlineAvailability;
  if (params.teacherPriority) score += params.weights.teacherPriority;
  if (params.alreadyCompleted) score -= params.weights.completedPenalty;
  if (params.prerequisiteMismatch) score -= params.weights.prerequisiteMismatchPenalty;
  return Math.round(score * 10) / 10;
}

function difficultyForBehavior(behavior: string) {
  if (behavior === 'advanced' || behavior === 'enrichment') return 'advanced';
  if (behavior === 'remedial') return 'foundational';
  return 'medium';
}

export async function buildRecommendations(params: {
  studentId: string;
  analysisId?: string | null;
  resultId?: string | null;
  branchId?: string | null;
  subjectId?: string | null;
  subjectTitle?: string;
  classId?: string | null;
  percentage: number;
  behavior: string;
  language?: string;
  weakTopics?: string[];
  strongTopics?: string[];
  weights: Weights;
  preferOffline?: boolean;
  ruleVersion: number;
}): Promise<RecommendationCandidate[]> {
  const language = params.language || 'en';
  const subjectFilter: Record<string, unknown> = { isDeleted: false };
  if (params.subjectId) subjectFilter._id = params.subjectId;

  const [courses, books, resources, curricula, relatedSubjects] = await Promise.all([
    Course.find({
      isDeleted: false,
      status: { $in: ['active', 'draft'] },
      ...(params.branchId ? { $or: [{ branchId: params.branchId }, { branchId: null }] } : {}),
      ...(params.subjectId ? { subjects: params.subjectId } : {})
    })
      .select('title slug fee language status subjects level academicCategory linkedClassId enrollmentStatus')
      .limit(20)
      .lean<any[]>(),
    Book.find({
      available: true,
      isDeleted: false,
      ...(params.branchId ? { $or: [{ branchId: params.branchId }, { branchId: null }] } : {}),
      ...(params.subjectTitle
        ? { $or: [{ title: { $regex: params.subjectTitle, $options: 'i' } }, { category: { $regex: params.subjectTitle, $options: 'i' } }] }
        : {})
    })
      .select('title author category description')
      .limit(10)
      .lean<any[]>(),
    LearningResource.find({
      published: true,
      isDeleted: { $ne: true },
      ...(params.subjectId ? { subjectId: params.subjectId } : {}),
      ...(params.classId ? { $or: [{ classId: params.classId }, { classId: null }] } : {}),
      ...(params.branchId ? { $or: [{ branchId: params.branchId }, { branchId: null }] } : {})
    })
      .select('title type url description offlineAvailable localFilePath language difficulty')
      .limit(20)
      .lean<any[]>(),
    Curriculum.find({
      isDeleted: false,
      active: true,
      ...(params.subjectId ? { subjectId: params.subjectId } : {}),
      ...(params.classId ? { classId: params.classId } : {}),
      ...(params.branchId ? { $or: [{ branchId: params.branchId }, { branchId: null }] } : {})
    })
      .select('title level learningOutcomes resources objectives')
      .limit(10)
      .lean<any[]>(),
    params.subjectId
      ? Subject.find({ isDeleted: false, _id: { $ne: params.subjectId }, ...(params.classId ? { classId: params.classId } : {}) })
          .select('title code')
          .limit(5)
          .lean<any[]>()
      : Promise.resolve([])
  ]);

  const candidates: RecommendationCandidate[] = [];
  const desiredDifficulty = difficultyForBehavior(params.behavior);
  const topicHint = (params.weakTopics?.[0] || params.strongTopics?.[0] || '').toLowerCase();

  for (const course of courses) {
    const title = localizedTitle(course.title, language);
    const level = String(course.level || '').toLowerCase();
    const advancedLevel = /advanced|enrich|higher|next/.test(level) || /advanced|enrich/.test(String(course.academicCategory || '').toLowerCase());
    const foundationalLevel = /found|begin|intro|basic|remed/.test(level);
    const prerequisiteMismatch =
      (params.behavior === 'remedial' && advancedLevel) ||
      ((params.behavior === 'advanced' || params.behavior === 'enrichment') && foundationalLevel && params.percentage >= 85);
    const difficultySuitability =
      (params.behavior === 'advanced' && advancedLevel) ||
      (params.behavior === 'remedial' && foundationalLevel) ||
      (!advancedLevel && !foundationalLevel)
        ? 1
        : 0.35;
    const offlineAvailable = false;
    const score = scoreCandidate({
      weights: params.weights,
      subjectMatch: true,
      topicMatch: Boolean(topicHint && title.toLowerCase().includes(topicHint)),
      learningOutcomeMatch: false,
      difficultySuitability,
      languageMatch: !course.language || course.language === 'multilingual' || course.language === language,
      offlineAvailable,
      teacherPriority: false,
      alreadyCompleted: false,
      prerequisiteMismatch
    });
    if (score <= 0) continue;
    candidates.push({
      resourceType: 'course',
      resourceId: String(course._id),
      resourceTitle: title,
      resourceUrl: course.slug ? `/courses/${course.slug}` : '/courses',
      score: params.preferOffline && offlineAvailable ? score + 2 : score,
      reason:
        params.behavior === 'remedial'
          ? `Recommended because additional practice is needed in ${params.subjectTitle || 'this subject'}.`
          : `Recommended because the student scored ${params.percentage}% in the related subject.`,
      reasonKey: params.behavior === 'remedial' ? 'intelligence.reason_remedial_course' : 'intelligence.reason_advanced_course',
      reasonData: { percentage: params.percentage, subject: params.subjectTitle || '' },
      difficulty: desiredDifficulty,
      language: course.language || language,
      offlineAvailable,
      behavior: params.behavior
    });
  }

  for (const book of books) {
    const score = scoreCandidate({
      weights: params.weights,
      subjectMatch: true,
      topicMatch: Boolean(topicHint && String(book.title).toLowerCase().includes(topicHint)),
      learningOutcomeMatch: false,
      difficultySuitability: params.behavior === 'remedial' ? 0.9 : 0.7,
      languageMatch: true,
      offlineAvailable: true,
      teacherPriority: false,
      alreadyCompleted: false,
      prerequisiteMismatch: false
    });
    candidates.push({
      resourceType: 'book',
      resourceId: String(book._id),
      resourceTitle: book.title,
      resourceUrl: '/books',
      score,
      reason: `Recommended book related to ${params.subjectTitle || 'the subject'}.`,
      reasonKey: 'intelligence.reason_book',
      reasonData: { subject: params.subjectTitle || '', title: book.title },
      difficulty: desiredDifficulty,
      language,
      offlineAvailable: true,
      behavior: params.behavior
    });
  }

  for (const resource of resources) {
    const offlineAvailable = Boolean(resource.offlineAvailable || resource.localFilePath);
    const score = scoreCandidate({
      weights: params.weights,
      subjectMatch: true,
      topicMatch: Boolean(topicHint && String(resource.title).toLowerCase().includes(topicHint)),
      learningOutcomeMatch: false,
      difficultySuitability: 0.8,
      languageMatch: !resource.language || resource.language === language || resource.language === 'multilingual',
      offlineAvailable,
      teacherPriority: false,
      alreadyCompleted: false,
      prerequisiteMismatch: false
    });
    candidates.push({
      resourceType: resource.type === 'book' ? 'book' : resource.type === 'video' ? 'video' : resource.type === 'assignment' ? 'assignment' : 'learning_resource',
      resourceId: String(resource._id),
      resourceTitle: resource.title,
      resourceUrl: resource.url || '',
      score: params.preferOffline && offlineAvailable ? score + 3 : score,
      reason: params.weakTopics?.length
        ? `Recommended because ${params.weakTopics[0]} needs additional practice.`
        : `Recommended learning resource for ${params.subjectTitle || 'this subject'}.`,
      reasonKey: 'intelligence.reason_resource',
      reasonData: { topic: params.weakTopics?.[0] || '', subject: params.subjectTitle || '' },
      difficulty: resource.difficulty || desiredDifficulty,
      language: resource.language || language,
      offlineAvailable,
      behavior: params.behavior
    });
  }

  for (const curriculum of curricula) {
    const score = scoreCandidate({
      weights: params.weights,
      subjectMatch: true,
      topicMatch: Boolean(topicHint && String(curriculum.title).toLowerCase().includes(topicHint)),
      learningOutcomeMatch: Boolean(curriculum.learningOutcomes),
      difficultySuitability: 0.85,
      languageMatch: true,
      offlineAvailable: true,
      teacherPriority: true,
      alreadyCompleted: false,
      prerequisiteMismatch: false
    });
    candidates.push({
      resourceType: 'lesson',
      resourceId: String(curriculum._id),
      resourceTitle: curriculum.title,
      resourceUrl: '/curriculum',
      score,
      reason: params.behavior === 'remedial'
        ? `Recommended foundational lesson from curriculum: ${curriculum.title}.`
        : `Recommended next curriculum lesson: ${curriculum.title}.`,
      reasonKey: 'intelligence.reason_lesson',
      reasonData: { title: curriculum.title },
      difficulty: /found|basic|intro/i.test(String(curriculum.level || '')) ? 'foundational' : desiredDifficulty,
      language,
      offlineAvailable: true,
      behavior: params.behavior
    });
  }

  if (params.behavior === 'advanced' || params.behavior === 'enrichment') {
    for (const subject of relatedSubjects) {
      const score = scoreCandidate({
        weights: params.weights,
        subjectMatch: false,
        topicMatch: false,
        learningOutcomeMatch: false,
        difficultySuitability: 0.6,
        languageMatch: true,
        offlineAvailable: true,
        teacherPriority: false,
        alreadyCompleted: false,
        prerequisiteMismatch: false
      });
      candidates.push({
        resourceType: 'subject',
        resourceId: String(subject._id),
        resourceTitle: subject.title,
        resourceUrl: '/subjects',
        score,
        reason: `Related subject enrichment after scoring ${params.percentage}% in ${params.subjectTitle || 'the subject'}.`,
        reasonKey: 'intelligence.reason_related_subject',
        reasonData: { percentage: params.percentage, subject: subject.title },
        difficulty: 'advanced',
        language,
        offlineAvailable: true,
        behavior: params.behavior
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, 12);
}

export async function persistRecommendations(params: {
  studentId: string;
  analysisId?: string | null;
  resultId?: string | null;
  branchId?: string | null;
  subjectId?: string | null;
  ruleVersion: number;
  candidates: RecommendationCandidate[];
}) {
  await LearningRecommendation.updateMany(
    {
      studentId: params.studentId,
      analysisId: params.analysisId ?? null,
      source: 'automatic',
      status: 'active',
      isDeleted: false
    },
    { $set: { status: 'hidden' } }
  );

  const docs = params.candidates.map((item) => ({
    studentId: params.studentId,
    analysisId: params.analysisId ?? null,
    resultId: params.resultId ?? null,
    branchId: params.branchId ?? null,
    subjectId: params.subjectId ?? null,
    ...item,
    status: 'active',
    source: 'automatic',
    ruleVersion: params.ruleVersion
  }));

  if (!docs.length) return [];
  return LearningRecommendation.insertMany(docs);
}
