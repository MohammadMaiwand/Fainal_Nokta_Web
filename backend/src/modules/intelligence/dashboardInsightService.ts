import mongoose from 'mongoose';
import { Attendance } from '../../models/Attendance';
import { DashboardInsight } from '../../models/DashboardInsight';
import { Enrollment } from '../../models/Enrollment';
import { Exam } from '../../models/Exam';
import { MessageEscalation } from '../../models/MessageEscalation';
import { Result } from '../../models/Result';
import { Student } from '../../models/Student';
import { User } from '../../models/User';
import { getIntelligenceSettings } from './resultBandService';
import { getCachedAnalysis, setCachedAnalysis } from './analysisCacheService';
import { toPercentage } from './trendAnalysisService';
import type { InsightType } from './defaults';

type InsightDraft = {
  category: string;
  type: InsightType;
  titleKey: string;
  descriptionKey: string;
  descriptionData: Record<string, unknown>;
  metricValue: number | null;
  comparisonValue: number | null;
  relatedRoute: string;
  suggestedActionKey: string;
  priority: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';
  dataSourceSummary: string;
  fingerprint: string;
};

function fingerprint(parts: Array<string | number | null | undefined>) {
  return parts.filter((part) => part !== undefined && part !== null).join(':');
}

function percentChange(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export async function generateDashboardInsights(params: {
  branchId?: string | null;
  periodStart: Date;
  periodEnd: Date;
  previousStart: Date;
  previousEnd: Date;
  filters?: {
    courseId?: string | null;
    classId?: string | null;
    subjectId?: string | null;
    teacherId?: string | null;
  };
  forceRefresh?: boolean;
}) {
  const settings = await getIntelligenceSettings(params.branchId ?? null);
  const cacheKey = fingerprint([
    'dashboard',
    params.branchId || 'global',
    params.periodStart.toISOString(),
    params.periodEnd.toISOString(),
    params.filters?.courseId || '',
    params.filters?.classId || '',
    params.filters?.subjectId || '',
    params.filters?.teacherId || ''
  ]);

  if (!params.forceRefresh) {
    const cached = await getCachedAnalysis({
      analysisType: 'dashboard_insight',
      entityType: 'dashboard',
      entityId: cacheKey
    });
    if (cached && !cached.stale && cached.payload?.insights) {
      return {
        insights: cached.payload.insights,
        generatedAt: cached.generatedAt,
        cached: true,
        ruleVersion: cached.ruleVersion
      };
    }
  }

  const branchFilter = params.branchId ? { branchId: new mongoose.Types.ObjectId(String(params.branchId)) } : {};
  const currentRange = { $gte: params.periodStart, $lte: params.periodEnd };
  const previousRange = { $gte: params.previousStart, $lte: params.previousEnd };

  const studentFilter: Record<string, any> = { isDeleted: false, ...branchFilter };
  const resultFilter: Record<string, any> = { isDeleted: false };
  const attendanceFilter: Record<string, any> = { isDeleted: false, ...branchFilter };
  const enrollmentFilter: Record<string, any> = { isDeleted: false, ...branchFilter };
  const examFilter: Record<string, any> = { isDeleted: false, ...branchFilter };

  if (params.filters?.classId) {
    studentFilter.classId = params.filters.classId;
    resultFilter.classId = params.filters.classId;
    attendanceFilter.classId = params.filters.classId;
    enrollmentFilter.classId = params.filters.classId;
    examFilter.class = params.filters.classId;
  }
  if (params.filters?.subjectId) {
    resultFilter.subjectId = params.filters.subjectId;
    examFilter.subject = params.filters.subjectId;
  }
  if (params.filters?.teacherId) {
    resultFilter.teacherId = params.filters.teacherId;
    examFilter.teacherId = params.filters.teacherId;
    attendanceFilter.teacherId = params.filters.teacherId;
  }

  const [
    currentEnrollments,
    previousEnrollments,
    currentAttendance,
    previousAttendance,
    currentResults,
    previousResults,
    openEscalations,
    teachers
  ] = await Promise.all([
    Enrollment.countDocuments({ ...enrollmentFilter, createdAt: currentRange }),
    Enrollment.countDocuments({ ...enrollmentFilter, createdAt: previousRange }),
    Attendance.find({ ...attendanceFilter, attendanceDate: currentRange }).select('status').limit(5000).lean<any[]>(),
    Attendance.find({ ...attendanceFilter, attendanceDate: previousRange }).select('status').limit(5000).lean<any[]>(),
    Result.find({ ...resultFilter, createdAt: currentRange }).select('student score exam subjectId').limit(2000).lean<any[]>(),
    Result.find({ ...resultFilter, createdAt: previousRange }).select('student score exam subjectId').limit(2000).lean<any[]>(),
    MessageEscalation.find({
      isDeleted: false,
      status: { $in: ['open', 'acknowledged', 'assigned'] },
      ...(params.branchId ? { branchId: params.branchId } : {})
    })
      .sort({ priority: -1, latestUnansweredAt: -1 })
      .limit(20)
      .lean<any[]>(),
    User.find({ role: 'teacher', isDeleted: false, ...(params.branchId ? { branchId: params.branchId } : {}) })
      .select('_id name')
      .limit(50)
      .lean<any[]>()
  ]);

  const drafts: InsightDraft[] = [];

  const enrollmentDelta = percentChange(currentEnrollments, previousEnrollments);
  if (currentEnrollments + previousEnrollments === 0) {
    drafts.push({
      category: 'enrollment',
      type: 'INSUFFICIENT_DATA',
      titleKey: 'intelligence.insight_enrollment_insufficient',
      descriptionKey: 'intelligence.insight_insufficient_data',
      descriptionData: {},
      metricValue: 0,
      comparisonValue: 0,
      relatedRoute: '/students',
      suggestedActionKey: '',
      priority: 20,
      confidence: 'INSUFFICIENT_DATA',
      dataSourceSummary: 'enrollments',
      fingerprint: fingerprint(['enrollment', 'insufficient', cacheKey])
    });
  } else {
    drafts.push({
      category: 'enrollment',
      type: enrollmentDelta >= 0 ? 'SUCCESS' : 'WARNING',
      titleKey: enrollmentDelta >= 0 ? 'intelligence.insight_enrollment_increase' : 'intelligence.insight_enrollment_decrease',
      descriptionKey: enrollmentDelta >= 0 ? 'intelligence.insight_enrollment_increase_desc' : 'intelligence.insight_enrollment_decrease_desc',
      descriptionData: {
        current: currentEnrollments,
        previous: previousEnrollments,
        change: Math.abs(enrollmentDelta)
      },
      metricValue: currentEnrollments,
      comparisonValue: previousEnrollments,
      relatedRoute: '/students',
      suggestedActionKey: 'intelligence.action_review_enrollments',
      priority: Math.abs(enrollmentDelta) >= 10 ? 80 : 50,
      confidence: currentEnrollments + previousEnrollments >= 5 ? 'HIGH' : 'MEDIUM',
      dataSourceSummary: 'enrollments.createdAt',
      fingerprint: fingerprint(['enrollment', enrollmentDelta >= 0 ? 'up' : 'down', cacheKey])
    });
  }

  const presentStatuses = new Set(['present', 'late', 'excused', 'online_auto_marked']);
  const currentAttendanceRate = currentAttendance.length
    ? Math.round((currentAttendance.filter((item) => presentStatuses.has(String(item.status))).length / currentAttendance.length) * 1000) / 10
    : null;
  const previousAttendanceRate = previousAttendance.length
    ? Math.round((previousAttendance.filter((item) => presentStatuses.has(String(item.status))).length / previousAttendance.length) * 1000) / 10
    : null;

  if (currentAttendanceRate === null) {
    drafts.push({
      category: 'attendance',
      type: 'INSUFFICIENT_DATA',
      titleKey: 'intelligence.insight_attendance_insufficient',
      descriptionKey: 'intelligence.insight_insufficient_data',
      descriptionData: {},
      metricValue: null,
      comparisonValue: null,
      relatedRoute: '/attendance',
      suggestedActionKey: '',
      priority: 20,
      confidence: 'INSUFFICIENT_DATA',
      dataSourceSummary: 'attendance',
      fingerprint: fingerprint(['attendance', 'insufficient', cacheKey])
    });
  } else {
    const attendanceDelta =
      previousAttendanceRate === null ? 0 : Number((currentAttendanceRate - previousAttendanceRate).toFixed(1));
    drafts.push({
      category: 'attendance',
      type: attendanceDelta < -3 ? 'WARNING' : 'INFORMATION',
      titleKey: attendanceDelta < -3 ? 'intelligence.insight_attendance_warning' : 'intelligence.insight_attendance_stable',
      descriptionKey: attendanceDelta < -3 ? 'intelligence.insight_attendance_warning_desc' : 'intelligence.insight_attendance_stable_desc',
      descriptionData: {
        current: currentAttendanceRate,
        previous: previousAttendanceRate,
        change: Math.abs(attendanceDelta)
      },
      metricValue: currentAttendanceRate,
      comparisonValue: previousAttendanceRate,
      relatedRoute: '/attendance',
      suggestedActionKey: 'intelligence.action_review_attendance',
      priority: attendanceDelta < -5 ? 85 : 45,
      confidence: currentAttendance.length >= 10 ? 'HIGH' : 'MEDIUM',
      dataSourceSummary: 'attendance.status',
      fingerprint: fingerprint(['attendance', attendanceDelta < -3 ? 'down' : 'stable', cacheKey])
    });
  }

  const currentAvg =
    currentResults.length > 0
      ? Math.round((currentResults.reduce((sum, item) => sum + Number(item.score || 0), 0) / currentResults.length) * 10) / 10
      : null;
  const previousAvg =
    previousResults.length > 0
      ? Math.round((previousResults.reduce((sum, item) => sum + Number(item.score || 0), 0) / previousResults.length) * 10) / 10
      : null;

  if (currentAvg === null) {
    drafts.push({
      category: 'exam_results',
      type: 'INSUFFICIENT_DATA',
      titleKey: 'intelligence.insight_results_insufficient',
      descriptionKey: 'intelligence.insight_insufficient_data',
      descriptionData: {},
      metricValue: null,
      comparisonValue: null,
      relatedRoute: '/results',
      suggestedActionKey: '',
      priority: 20,
      confidence: 'INSUFFICIENT_DATA',
      dataSourceSummary: 'results',
      fingerprint: fingerprint(['results', 'insufficient', cacheKey])
    });
  } else {
    const resultDelta = previousAvg === null ? 0 : Number((currentAvg - previousAvg).toFixed(1));
    drafts.push({
      category: 'exam_results',
      type: resultDelta >= 0 ? 'SUCCESS' : 'WARNING',
      titleKey: resultDelta >= 0 ? 'intelligence.insight_results_improved' : 'intelligence.insight_results_declined',
      descriptionKey: resultDelta >= 0 ? 'intelligence.insight_results_improved_desc' : 'intelligence.insight_results_declined_desc',
      descriptionData: { current: currentAvg, previous: previousAvg, change: Math.abs(resultDelta) },
      metricValue: currentAvg,
      comparisonValue: previousAvg,
      relatedRoute: '/results',
      suggestedActionKey: 'intelligence.action_review_results',
      priority: Math.abs(resultDelta) >= 5 ? 75 : 40,
      confidence: currentResults.length >= settings.minimumSampleForTeaching ? 'HIGH' : 'MEDIUM',
      dataSourceSummary: 'results.score',
      fingerprint: fingerprint(['results', resultDelta >= 0 ? 'up' : 'down', cacheKey])
    });
  }

  // Student progress signals — single aggregation instead of N+1 queries
  const studentIds = Array.from(new Set(currentResults.map((item) => String(item.student))));
  let improving = 0;
  let declining = 0;
  let repeatedFailure = 0;

  const limitedStudentObjectIds = studentIds
    .slice(0, 80)
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (limitedStudentObjectIds.length) {
    const recentByStudent = await Result.aggregate([
      { $match: { student: { $in: limitedStudentObjectIds }, isDeleted: { $ne: true } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$student',
          entries: { $push: { score: '$score', exam: '$exam' } }
        }
      },
      { $project: { entries: { $slice: ['$entries', 3] } } }
    ]);

    const examIds = Array.from(
      new Set(
        recentByStudent.flatMap((row: any) => (row.entries || []).map((entry: any) => String(entry.exam))).filter(Boolean)
      )
    )
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const exams = examIds.length
      ? await Exam.find({ _id: { $in: examIds } }).select('totalMarks passingMarks').lean<any[]>()
      : [];
    const examMap = new Map(exams.map((exam) => [String(exam._id), exam]));

    for (const row of recentByStudent) {
      const history = row.entries || [];
      if (history.length < 2) continue;
      const percentages = history.map((item: any) => {
        const exam = examMap.get(String(item.exam));
        return toPercentage(item.score, exam?.totalMarks ?? 100);
      });
      if (percentages[0] - percentages[1] >= 5) improving += 1;
      if (percentages[1] - percentages[0] >= 5) declining += 1;
      const failing = percentages.filter((value: number, index: number) => {
        const exam = examMap.get(String(history[index].exam));
        const pass = Number(exam?.passingMarks ?? 40);
        const passPct = toPercentage(pass, exam?.totalMarks ?? 100);
        return value < passPct;
      });
      if (failing.length >= 2) repeatedFailure += 1;
    }
  }

  if (studentIds.length) {
    drafts.push({
      category: 'student_progress',
      type: improving > 0 ? 'SUCCESS' : 'INFORMATION',
      titleKey: 'intelligence.insight_students_improving',
      descriptionKey: 'intelligence.insight_students_improving_desc',
      descriptionData: { count: improving },
      metricValue: improving,
      comparisonValue: declining,
      relatedRoute: '/results',
      suggestedActionKey: 'intelligence.action_review_students',
      priority: 55,
      confidence: studentIds.length >= 5 ? 'HIGH' : 'LOW',
      dataSourceSummary: 'results.trend',
      fingerprint: fingerprint(['students', 'improving', cacheKey])
    });
    if (declining > 0) {
      drafts.push({
        category: 'student_progress',
        type: 'WARNING',
        titleKey: 'intelligence.insight_students_declining',
        descriptionKey: 'intelligence.insight_students_declining_desc',
        descriptionData: { count: declining },
        metricValue: declining,
        comparisonValue: improving,
        relatedRoute: '/results',
        suggestedActionKey: 'intelligence.action_teacher_followup',
        priority: 80,
        confidence: studentIds.length >= 5 ? 'HIGH' : 'MEDIUM',
        dataSourceSummary: 'results.trend',
        fingerprint: fingerprint(['students', 'declining', cacheKey])
      });
    }
    if (repeatedFailure > 0) {
      drafts.push({
        category: 'student_progress',
        type: 'CRITICAL',
        titleKey: 'intelligence.insight_repeated_failure',
        descriptionKey: 'intelligence.insight_repeated_failure_desc',
        descriptionData: { count: repeatedFailure },
        metricValue: repeatedFailure,
        comparisonValue: null,
        relatedRoute: '/results',
        suggestedActionKey: 'intelligence.action_intervention',
        priority: 95,
        confidence: 'MEDIUM',
        dataSourceSummary: 'results.passingMarks',
        fingerprint: fingerprint(['students', 'repeated_failure', cacheKey])
      });
    }
  }

  // Teaching analysis with sample-size guard
  if (teachers.length && currentResults.length >= settings.minimumSampleForTeaching) {
    drafts.push({
      category: 'teaching',
      type: 'INFORMATION',
      titleKey: 'intelligence.insight_teaching_summary',
      descriptionKey: 'intelligence.insight_teaching_summary_desc',
      descriptionData: {
        teachers: teachers.length,
        averageScore: currentAvg,
        sample: currentResults.length
      },
      metricValue: currentAvg,
      comparisonValue: previousAvg,
      relatedRoute: '/teachers',
      suggestedActionKey: 'intelligence.action_review_teaching',
      priority: 40,
      confidence: 'MEDIUM',
      dataSourceSummary: 'results by teacher sample',
      fingerprint: fingerprint(['teaching', 'summary', cacheKey])
    });
  } else {
    drafts.push({
      category: 'teaching',
      type: 'INSUFFICIENT_DATA',
      titleKey: 'intelligence.insight_teaching_insufficient',
      descriptionKey: 'intelligence.insight_teaching_insufficient_desc',
      descriptionData: { minimum: settings.minimumSampleForTeaching, sample: currentResults.length },
      metricValue: currentResults.length,
      comparisonValue: settings.minimumSampleForTeaching,
      relatedRoute: '/teachers',
      suggestedActionKey: '',
      priority: 15,
      confidence: 'INSUFFICIENT_DATA',
      dataSourceSummary: 'results sample size',
      fingerprint: fingerprint(['teaching', 'insufficient', cacheKey])
    });
  }

  if (openEscalations.length) {
    drafts.push({
      category: 'messages',
      type: openEscalations.some((item) => item.priority === 'CRITICAL') ? 'CRITICAL' : 'WARNING',
      titleKey: 'intelligence.insight_unanswered_messages',
      descriptionKey: 'intelligence.insight_unanswered_messages_desc',
      descriptionData: { count: openEscalations.length },
      metricValue: openEscalations.length,
      comparisonValue: null,
      relatedRoute: '/messages',
      suggestedActionKey: 'intelligence.action_reply_messages',
      priority: 90,
      confidence: 'HIGH',
      dataSourceSummary: 'message_escalations',
      fingerprint: fingerprint(['messages', 'escalations', cacheKey])
    });
  } else {
    drafts.push({
      category: 'messages',
      type: 'SUCCESS',
      titleKey: 'intelligence.insight_messages_clear',
      descriptionKey: 'intelligence.insight_messages_clear_desc',
      descriptionData: {},
      metricValue: 0,
      comparisonValue: 0,
      relatedRoute: '/messages',
      suggestedActionKey: '',
      priority: 25,
      confidence: 'HIGH',
      dataSourceSummary: 'message_escalations',
      fingerprint: fingerprint(['messages', 'clear', cacheKey])
    });
  }

  const inactiveStudents = await Student.countDocuments({
    ...studentFilter,
    updatedAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
  });
  if (inactiveStudents > 0) {
    drafts.push({
      category: 'operations',
      type: 'INFORMATION',
      titleKey: 'intelligence.insight_inactive_students',
      descriptionKey: 'intelligence.insight_inactive_students_desc',
      descriptionData: { count: inactiveStudents },
      metricValue: inactiveStudents,
      comparisonValue: null,
      relatedRoute: '/students',
      suggestedActionKey: 'intelligence.action_review_students',
      priority: 35,
      confidence: 'MEDIUM',
      dataSourceSummary: 'students.updatedAt',
      fingerprint: fingerprint(['operations', 'inactive', cacheKey])
    });
  }

  const expiresAt = new Date(Date.now() + settings.dashboardInsightRefreshMinutes * 60 * 1000);
  const persisted = [];
  for (const draft of drafts) {
    const doc = await DashboardInsight.findOneAndUpdate(
      { fingerprint: draft.fingerprint, status: { $in: ['active', 'dismissed', 'resolved'] } },
      {
        $set: {
          ...draft,
          periodStart: params.periodStart,
          periodEnd: params.periodEnd,
          branchId: params.branchId ?? null,
          ruleVersion: settings.ruleVersion,
          generatedAt: new Date(),
          expiresAt,
          status: 'active',
          isDeleted: false
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean<any>();
    persisted.push(doc);
  }

  await setCachedAnalysis({
    analysisType: 'dashboard_insight',
    entityType: 'dashboard',
    entityId: cacheKey,
    ruleVersion: settings.ruleVersion,
    payload: { insights: persisted, escalations: openEscalations },
    branchId: params.branchId ?? null,
    cacheDurationMinutes: settings.dashboardInsightRefreshMinutes
  });

  return {
    insights: persisted,
    escalations: openEscalations,
    generatedAt: new Date(),
    cached: false,
    ruleVersion: settings.ruleVersion
  };
}
