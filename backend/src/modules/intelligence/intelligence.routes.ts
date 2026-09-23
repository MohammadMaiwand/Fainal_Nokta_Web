import { Router } from 'express';
import Joi from 'joi';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { createError, createResponse } from '../../helpers/response';
import { generalLimiter, authLimiter } from '../../middlewares/rateLimiter';
import { AIResultInsight } from '../../models/AIResultInsight';
import { DashboardInsight } from '../../models/DashboardInsight';
import { LearningRecommendation } from '../../models/LearningRecommendation';
import { MessageEscalation } from '../../models/MessageEscalation';
import { Result } from '../../models/Result';
import { AuditService } from '../../services/auditService';
import { canAccessStudentInsight, isPrivilegedRole } from '../ai-results/ai-results.access';
import { User } from '../../models/User';
import { Student } from '../../models/Student';
import { upsertExamAnalysis } from './examAnalysisService';
import { getCachedAnalysis } from './analysisCacheService';
import { generateDashboardInsights } from './dashboardInsightService';
import {
  acknowledgeEscalation,
  assignEscalation,
  evaluateConversationEscalation,
  resolveEscalation
} from './messageEscalationService';
import { getIntelligenceSettings, upsertIntelligenceSettings } from './resultBandService';
import { getDashboardDateRange, parseDashboardPeriod } from '../dashboard/dashboardPeriod';

const router = Router();
const auditService = new AuditService();

const idParams = Joi.object({ params: Joi.object({ id: Joi.string().hex().length(24).required() }) });
const resultParams = Joi.object({ params: Joi.object({ resultId: Joi.string().hex().length(24).required() }) });
const studentParams = Joi.object({ params: Joi.object({ studentId: Joi.string().hex().length(24).required() }) });

async function assertStudentAccess(req: any, studentId: string) {
  const role = String(req.user?.canonicalRole ?? req.user?.role ?? '');
  if (isPrivilegedRole(role)) return true;

  const studentUser = await User.findById(studentId).select('assignedTeacherId branchId studentId').lean<any>();
  let familyLinked = false;

  if (role === 'parent' || role === 'family_student') {
    const familyUser = await User.findById(req.user.userId).select('familyId parentProfileId').lean<any>();
    const studentRecord = await Student.findOne({ studentId: studentUser?.studentId, isDeleted: false })
      .select('familyId parentProfileId')
      .lean<any>();
    const linkedByFamily =
      familyUser?.familyId && studentRecord?.familyId && String(studentRecord.familyId) === String(familyUser.familyId);
    const linkedByParent =
      !familyUser?.familyId &&
      familyUser?.parentProfileId &&
      studentRecord?.parentProfileId &&
      String(studentRecord.parentProfileId) === String(familyUser.parentProfileId);
    familyLinked = Boolean(linkedByFamily || linkedByParent);
  }

  return canAccessStudentInsight({
    role,
    requestUserId: String(req.user?.userId ?? ''),
    studentId: String(studentId),
    requestBranchId: req.user?.branchId ?? null,
    studentBranchId: studentUser?.branchId ?? null,
    assignedTeacherId: studentUser?.assignedTeacherId ?? null,
    familyLinked
  });
}

router.use(authenticate, generalLimiter);

router.get('/exam-results/:resultId/analysis', authorize(['super_admin', 'admin', 'owner', 'branch_manager', 'teacher', 'student', 'parent', 'family_student']), validate(resultParams), async (req, res, next) => {
  try {
    const result = await Result.findById(req.params.resultId).select('student exam').lean<any>();
    if (!result) return res.status(404).json(createError('Result not found'));
    const allowed = await assertStudentAccess(req, String(result.student));
    if (!allowed) return res.status(403).json(createError('Access denied'));

    let insight: any = await AIResultInsight.findOne({ resultId: result._id, isDeleted: false }).lean();
    if (!insight) {
      insight = await AIResultInsight.findOne({ studentId: result.student, examId: result.exam, isDeleted: false }).lean();
    }
    const recommendations = await LearningRecommendation.find({
      resultId: result._id,
      status: { $in: ['active', 'assigned'] },
      isDeleted: false
    })
      .sort({ score: -1 })
      .lean();

    const cached = await getCachedAnalysis({
      analysisType: 'exam_result',
      entityType: 'result',
      entityId: String(result._id)
    });

    return res.json(
      createResponse({
        insight,
        recommendations,
        cached: Boolean(cached),
        stale: Boolean(cached?.stale),
        generatedAt: (insight as any)?.updatedAt ?? cached?.generatedAt ?? null,
        offlineReady: true
      })
    );
  } catch (error) {
    next(error);
  }
});

router.post('/exam-results/:resultId/recalculate-analysis', authLimiter, authorize(['super_admin', 'admin', 'branch_manager', 'teacher']), validate(resultParams), async (req, res, next) => {
  try {
    const language = String(req.body?.lang || req.query.lang || 'en');
    const payload = await upsertExamAnalysis({
      resultId: req.params.resultId,
      actorId: req.user?.userId ?? null,
      language
    });
    await auditService.recordAction({
      actorId: String(req.user?.userId ?? 'system'),
      branchId: payload.insight?.branchId ? String(payload.insight.branchId) : null,
      action: 'EXAM_ANALYSIS_RECALCULATED',
      target: req.params.resultId,
      targetType: 'result',
      severity: 'info'
    });
    res.json(createResponse(payload, 'Analysis recalculated'));
  } catch (error) {
    next(error);
  }
});

router.get('/students/:studentId/recommendations', authorize(['super_admin', 'admin', 'owner', 'branch_manager', 'teacher', 'student', 'parent', 'family_student']), validate(studentParams), async (req, res, next) => {
  try {
    const allowed = await assertStudentAccess(req, req.params.studentId);
    if (!allowed) return res.status(403).json(createError('Access denied'));
    const recommendations = await LearningRecommendation.find({
      studentId: req.params.studentId,
      status: { $in: ['active', 'assigned'] },
      isDeleted: false
    })
      .sort({ score: -1 })
      .lean();
    res.json(createResponse(recommendations));
  } catch (error) {
    next(error);
  }
});

router.post('/recommendations/:id/assign', authLimiter, authorize(['super_admin', 'admin', 'branch_manager', 'teacher']), validate(idParams), async (req, res, next) => {
  try {
    const recommendation = await LearningRecommendation.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      {
        $set: {
          status: 'assigned',
          assignedBy: req.user?.userId,
          assignedAt: new Date(),
          teacherNote: String(req.body?.note || '')
        }
      },
      { new: true }
    ).lean();
    if (!recommendation) return res.status(404).json(createError('Recommendation not found'));
    await auditService.recordAction({
      actorId: String(req.user?.userId ?? 'system'),
      action: 'RECOMMENDATION_ASSIGNED',
      target: req.params.id,
      targetType: 'learning_recommendation',
      severity: 'info'
    });
    res.json(createResponse(recommendation, 'Recommendation assigned'));
  } catch (error) {
    next(error);
  }
});

router.post('/recommendations/:id/dismiss', authLimiter, authorize(['super_admin', 'admin', 'branch_manager', 'teacher']), validate(idParams), async (req, res, next) => {
  try {
    const recommendation = await LearningRecommendation.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      {
        $set: {
          status: 'dismissed',
          dismissedBy: req.user?.userId,
          dismissedAt: new Date(),
          teacherNote: String(req.body?.note || '')
        }
      },
      { new: true }
    ).lean();
    if (!recommendation) return res.status(404).json(createError('Recommendation not found'));
    await auditService.recordAction({
      actorId: String(req.user?.userId ?? 'system'),
      action: 'RECOMMENDATION_DISMISSED',
      target: req.params.id,
      targetType: 'learning_recommendation',
      severity: 'info'
    });
    res.json(createResponse(recommendation, 'Recommendation dismissed'));
  } catch (error) {
    next(error);
  }
});

router.post('/recommendations', authLimiter, authorize(['super_admin', 'admin', 'branch_manager', 'teacher']), async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.studentId || !body.resourceTitle) {
      return res.status(400).json(createError('studentId and resourceTitle are required'));
    }
    const recommendation = await LearningRecommendation.create({
      studentId: body.studentId,
      analysisId: body.analysisId || null,
      resultId: body.resultId || null,
      branchId: req.user?.branchId || body.branchId || null,
      subjectId: body.subjectId || null,
      resourceType: body.resourceType || 'learning_resource',
      resourceId: body.resourceId || null,
      resourceTitle: body.resourceTitle,
      resourceUrl: body.resourceUrl || '',
      score: Number(body.score || 100),
      reason: body.reason || 'Teacher manual recommendation',
      reasonKey: 'intelligence.reason_teacher',
      difficulty: body.difficulty || '',
      language: body.language || '',
      offlineAvailable: Boolean(body.offlineAvailable),
      behavior: body.behavior || '',
      status: 'assigned',
      assignedBy: req.user?.userId,
      assignedAt: new Date(),
      teacherNote: body.note || '',
      source: 'teacher'
    });
    await auditService.recordAction({
      actorId: String(req.user?.userId ?? 'system'),
      action: 'TEACHER_RECOMMENDATION_ADDED',
      target: String(recommendation._id),
      targetType: 'learning_recommendation',
      severity: 'info'
    });
    res.status(201).json(createResponse(recommendation, 'Recommendation created'));
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard/intelligent-insights', authorize(['super_admin', 'admin', 'owner', 'branch_manager', 'teacher', 'accountant']), async (req, res, next) => {
  try {
    const period = parseDashboardPeriod(req.query?.period);
    const now = new Date();
    const { start, end } = getDashboardDateRange(period, now);
    const duration = end.getTime() - start.getTime();
    const previousEnd = new Date(start.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - duration);
    const role = String(req.user?.canonicalRole ?? req.user?.role ?? '');
    const branchId =
      role === 'branch_manager'
        ? req.user?.branchId
        : (req.query.branchId as string) || req.user?.branchId || null;

    const payload = await Promise.race([
      generateDashboardInsights({
        branchId: branchId ? String(branchId) : null,
        periodStart: start,
        periodEnd: end,
        previousStart,
        previousEnd,
        filters: {
          courseId: (req.query.courseId as string) || null,
          classId: (req.query.classId as string) || null,
          subjectId: (req.query.subjectId as string) || null,
          teacherId: role === 'teacher' ? String(req.user?.userId) : (req.query.teacherId as string) || null
        },
        forceRefresh: String(req.query.refresh || '') === '1'
      }),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Intelligence dashboard timed out')), 18000);
      })
    ]);

    res.json(createResponse(payload));
  } catch (error: any) {
    if (String(error?.message || '').includes('timed out')) {
      return res.json(
        createResponse({
          insights: [],
          escalations: [],
          generatedAt: new Date(),
          cached: false,
          timedOut: true
        }, 'Intelligence insights temporarily unavailable')
      );
    }
    next(error);
  }
});

router.post('/dashboard/insights/:id/dismiss', authLimiter, authorize(['super_admin', 'admin', 'owner', 'branch_manager']), validate(idParams), async (req, res, next) => {
  try {
    const insight = await DashboardInsight.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { $set: { status: 'dismissed', dismissedAt: new Date(), dismissedBy: req.user?.userId } },
      { new: true }
    ).lean();
    if (!insight) return res.status(404).json(createError('Insight not found'));
    await auditService.recordAction({
      actorId: String(req.user?.userId ?? 'system'),
      action: 'DASHBOARD_INSIGHT_DISMISSED',
      target: req.params.id,
      targetType: 'dashboard_insight',
      severity: 'info'
    });
    res.json(createResponse(insight));
  } catch (error) {
    next(error);
  }
});

router.post('/dashboard/insights/:id/resolve', authLimiter, authorize(['super_admin', 'admin', 'owner', 'branch_manager']), validate(idParams), async (req, res, next) => {
  try {
    const insight = await DashboardInsight.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { $set: { status: 'resolved', resolvedAt: new Date(), resolvedBy: req.user?.userId } },
      { new: true }
    ).lean();
    if (!insight) return res.status(404).json(createError('Insight not found'));
    await auditService.recordAction({
      actorId: String(req.user?.userId ?? 'system'),
      action: 'DASHBOARD_INSIGHT_RESOLVED',
      target: req.params.id,
      targetType: 'dashboard_insight',
      severity: 'info'
    });
    res.json(createResponse(insight));
  } catch (error) {
    next(error);
  }
});

router.get('/messages/escalations', authorize(['super_admin', 'admin', 'owner', 'branch_manager', 'teacher']), async (req, res, next) => {
  try {
    const role = String(req.user?.canonicalRole ?? req.user?.role ?? '');
    const filter: Record<string, unknown> = {
      isDeleted: false,
      status: { $in: String(req.query.status || 'open,acknowledged,assigned').split(',') }
    };
    if (role === 'branch_manager') filter.branchId = req.user?.branchId ?? null;
    if (role === 'teacher') filter.responsibleUserId = req.user?.userId;
    const items = await MessageEscalation.find(filter).sort({ priority: -1, latestUnansweredAt: -1 }).limit(100).lean();
    res.json(createResponse(items));
  } catch (error) {
    next(error);
  }
});

router.get('/messages/escalations/summary', authorize(['super_admin', 'admin', 'owner', 'branch_manager', 'teacher']), async (req, res, next) => {
  try {
    const role = String(req.user?.canonicalRole ?? req.user?.role ?? '');
    const filter: Record<string, unknown> = {
      isDeleted: false,
      status: { $in: ['open', 'acknowledged', 'assigned'] }
    };
    if (role === 'branch_manager') filter.branchId = req.user?.branchId ?? null;
    if (role === 'teacher') filter.responsibleUserId = req.user?.userId;
    const [total, critical, high] = await Promise.all([
      MessageEscalation.countDocuments(filter),
      MessageEscalation.countDocuments({ ...filter, priority: 'CRITICAL' }),
      MessageEscalation.countDocuments({ ...filter, priority: 'HIGH' })
    ]);
    res.json(createResponse({ total, critical, high, medium: Math.max(0, total - critical - high) }));
  } catch (error) {
    next(error);
  }
});

router.post('/messages/escalations/:id/acknowledge', authLimiter, authorize(['super_admin', 'admin', 'owner', 'branch_manager', 'teacher']), validate(idParams), async (req, res, next) => {
  try {
    const item = await acknowledgeEscalation(req.params.id, String(req.user?.userId));
    if (!item) return res.status(404).json(createError('Escalation not found'));
    await auditService.recordAction({
      actorId: String(req.user?.userId ?? 'system'),
      action: 'MESSAGE_ESCALATION_ACKNOWLEDGED',
      target: req.params.id,
      targetType: 'message_escalation',
      severity: 'info'
    });
    res.json(createResponse(item));
  } catch (error) {
    next(error);
  }
});

router.post('/messages/escalations/:id/assign', authLimiter, authorize(['super_admin', 'admin', 'owner', 'branch_manager']), validate(idParams), async (req, res, next) => {
  try {
    const responsibleUserId = String(req.body?.responsibleUserId || '');
    if (!responsibleUserId) return res.status(400).json(createError('responsibleUserId is required'));
    const item = await assignEscalation(req.params.id, String(req.user?.userId), responsibleUserId);
    if (!item) return res.status(404).json(createError('Escalation not found'));
    await auditService.recordAction({
      actorId: String(req.user?.userId ?? 'system'),
      action: 'MESSAGE_ESCALATION_ASSIGNED',
      target: req.params.id,
      targetType: 'message_escalation',
      severity: 'info',
      metadata: { responsibleUserId }
    });
    res.json(createResponse(item));
  } catch (error) {
    next(error);
  }
});

router.post('/messages/escalations/:id/resolve', authLimiter, authorize(['super_admin', 'admin', 'owner', 'branch_manager', 'teacher']), validate(idParams), async (req, res, next) => {
  try {
    const item = await resolveEscalation(req.params.id, String(req.user?.userId), String(req.body?.note || ''));
    if (!item) return res.status(404).json(createError('Escalation not found'));
    await auditService.recordAction({
      actorId: String(req.user?.userId ?? 'system'),
      action: 'MESSAGE_ESCALATION_RESOLVED',
      target: req.params.id,
      targetType: 'message_escalation',
      severity: 'info'
    });
    res.json(createResponse(item));
  } catch (error) {
    next(error);
  }
});

router.post('/messages/escalations/evaluate/:id', authLimiter, authorize(['super_admin', 'admin', 'owner', 'branch_manager']), validate(idParams), async (req, res, next) => {
  try {
    const item = await evaluateConversationEscalation(req.params.id, String(req.body?.lang || 'en'));
    res.json(createResponse(item));
  } catch (error) {
    next(error);
  }
});

router.get('/settings', authorize(['super_admin', 'admin', 'owner']), async (req, res, next) => {
  try {
    const branchId = (req.query.branchId as string) || null;
    const settings = await getIntelligenceSettings(branchId);
    res.json(createResponse(settings));
  } catch (error) {
    next(error);
  }
});

router.put('/settings', authLimiter, authorize(['super_admin', 'admin']), async (req, res, next) => {
  try {
    const branchId = req.body?.branchId ?? null;
    const settings = await upsertIntelligenceSettings({
      branchId,
      patch: req.body || {},
      actorId: req.user?.userId ?? null
    });
    await auditService.recordAction({
      actorId: String(req.user?.userId ?? 'system'),
      branchId: branchId ? String(branchId) : null,
      action: 'INTELLIGENCE_SETTINGS_CHANGED',
      target: String((settings as any)?._id || 'settings'),
      targetType: 'intelligence_settings',
      severity: 'warning',
      metadata: { ruleVersion: (settings as any)?.ruleVersion }
    });
    res.json(createResponse(settings, 'Intelligence settings updated'));
  } catch (error) {
    next(error);
  }
});

router.get('/offline/intelligence-sync', authorize(['super_admin', 'admin', 'owner', 'branch_manager', 'teacher', 'student', 'parent', 'family_student']), async (req, res, next) => {
  try {
    const role = String(req.user?.canonicalRole ?? req.user?.role ?? '');
    const userId = String(req.user?.userId ?? '');
    let studentIds: string[] = [];
    if (role === 'student') studentIds = [userId];
    else if (role === 'parent' || role === 'family_student') {
      const familyUser = await User.findById(userId).select('familyId parentProfileId').lean<any>();
      const students = await Student.find({
        isDeleted: false,
        ...(familyUser?.familyId ? { familyId: familyUser.familyId } : {}),
        ...(!familyUser?.familyId && familyUser?.parentProfileId ? { parentProfileId: familyUser.parentProfileId } : {})
      })
        .select('studentId')
        .lean<any[]>();
      const users = students.length
        ? await User.find({
            role: 'student',
            isDeleted: false,
            studentId: { $in: students.map((item) => item.studentId).filter(Boolean) }
          })
            .select('_id')
            .lean<any[]>()
        : [];
      studentIds = users.map((item) => String(item._id));
    }

    const insights = studentIds.length
      ? await AIResultInsight.find({ studentId: { $in: studentIds }, isDeleted: false })
          .sort({ updatedAt: -1 })
          .limit(20)
          .lean()
      : [];
    const recommendations = studentIds.length
      ? await LearningRecommendation.find({
          studentId: { $in: studentIds },
          status: { $in: ['active', 'assigned'] },
          isDeleted: false
        })
          .sort({ score: -1 })
          .limit(40)
          .lean()
      : [];

    const canViewDashboard = ['super_admin', 'admin', 'owner', 'branch_manager', 'teacher'].includes(role);
    const dashboard = canViewDashboard
      ? await DashboardInsight.find({
          isDeleted: false,
          status: 'active',
          ...(role === 'branch_manager' ? { branchId: req.user?.branchId ?? null } : {})
        })
          .sort({ priority: -1, generatedAt: -1 })
          .limit(30)
          .lean()
      : [];

    const escalations = canViewDashboard
      ? await MessageEscalation.find({
          isDeleted: false,
          status: { $in: ['open', 'acknowledged', 'assigned'] },
          ...(role === 'teacher' ? { responsibleUserId: userId } : {}),
          ...(role === 'branch_manager' ? { branchId: req.user?.branchId ?? null } : {})
        })
          .sort({ priority: -1 })
          .limit(20)
          .lean()
      : [];

    res.json(
      createResponse({
        syncedAt: new Date().toISOString(),
        insights,
        recommendations,
        dashboardInsights: dashboard,
        escalations,
        offlineReady: true
      })
    );
  } catch (error) {
    next(error);
  }
});

export const intelligenceRouter = router;
