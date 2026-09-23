import { Router } from 'express';
import Joi from 'joi';
import { Exam } from '../../models/Exam';
import { Question } from '../../models/Question';
import { ExamSubmission } from '../../models/ExamSubmission';
import { Subject } from '../../models/Subject';
import { ClassModel } from '../../models/Class';
import { User } from '../../models/User';
import { Student } from '../../models/Student';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { createResponse, createError } from '../../helpers/response';
import { paginationSchema } from '../../validators/pagination';
import { listRecordFilter } from '../../utils/recordVisibility';
import {
  buildExamCode,
  idsEqual,
  isAllowedGoogleFormUrl,
  extractGoogleFormId,
  serializeExam,
  sanitizeQuestionForStudent,
  ensureExamRelations,
  syncExamTeacherAssignment,
  resolveScopedStudentAssignment,
  refreshExamAggregates,
  auditExam,
  canTransitionStatus,
  normalizeCategory,
  normalizeDeliveryMethod,
  normalizeQuestionType,
  validateQuestionPayload,
  buildQuestionOptions,
  autoGradeAnswer,
  computeSubmissionTotals,
  examIsCurrentlyAccessible,
  notifyExamEvent,
  upsertResultFromSubmission,
  makeSubmissionReference,
  createGoogleFormViaScript
} from '../../services/examService';
import { aiProviderService } from '../../services/aiProviderService';
import { isAiConfigured } from '../../config/integrations';

const router = Router();

const objectId = Joi.string().hex().length(24);
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const STATUS_VALUES = [
  'draft',
  'scheduled',
  'published',
  'active',
  'completed',
  'closed',
  'cancelled',
  'archived'
] as const;

const CATEGORY_VALUES = ['weekly', 'monthly', 'book', 'midterm', 'final', 'quiz'] as const;
const EXAM_TYPE_VALUES = ['midterm', 'final', 'quiz', 'weekly', 'monthly', 'book'] as const;

const examBodyFields = {
  title: Joi.string().trim().min(1),
  description: Joi.string().allow('', null).optional(),
  instructions: Joi.string().allow('', null).optional(),
  subject: objectId,
  class: objectId,
  teacherId: objectId.optional(),
  date: Joi.date(),
  startTime: Joi.string().pattern(timePattern).allow('', null).optional(),
  endTime: Joi.string().pattern(timePattern).allow('', null).optional(),
  durationMinutes: Joi.number().min(0).optional(),
  totalMarks: Joi.number().min(0).optional(),
  passingMarks: Joi.number().min(0).optional(),
  examType: Joi.string().valid(...EXAM_TYPE_VALUES).optional(),
  category: Joi.string().valid(...CATEGORY_VALUES).optional(),
  deliveryMethod: Joi.string().valid('online', 'in_person').optional(),
  academicYear: Joi.string().allow('', null).optional(),
  term: Joi.string().allow('', null).optional(),
  bookName: Joi.string().allow('', null).optional(),
  chapterRange: Joi.string().allow('', null).optional(),
  referenceCode: Joi.string().allow('', null).optional(),
  availableFrom: Joi.date().allow(null).optional(),
  submissionDeadline: Joi.date().allow(null).optional(),
  resultReleaseAt: Joi.date().allow(null).optional(),
  room: Joi.string().allow('', null).optional(),
  allowDraft: Joi.boolean().optional(),
  allowResume: Joi.boolean().optional(),
  showResultImmediately: Joi.boolean().optional(),
  showCorrectAnswers: Joi.boolean().optional(),
  randomizeQuestions: Joi.boolean().optional(),
  randomizeOptions: Joi.boolean().optional(),
  maximumAttempts: Joi.number().integer().min(1).max(10).optional(),
  lateSubmissionPolicy: Joi.string().valid('deny', 'allow', 'allow_with_penalty').optional(),
  gracePeriodMinutes: Joi.number().integer().min(0).optional(),
  googleFormUrl: Joi.string().allow('', null).optional(),
  googleFormEditUrl: Joi.string().allow('', null).optional(),
  onlineExamUrl: Joi.string().allow('', null).optional(),
  status: Joi.string().valid(...STATUS_VALUES).optional()
};

const examSchema = Joi.object({
  body: Joi.object({
    ...examBodyFields,
    title: examBodyFields.title.required(),
    subject: examBodyFields.subject.required(),
    class: examBodyFields.class.required(),
    date: examBodyFields.date.required(),
    totalMarks: examBodyFields.totalMarks.default(100)
  })
});

const examUpdateSchema = Joi.object({
  body: Joi.object(examBodyFields).min(1)
});

const examListSchema = Joi.object({
  query: paginationSchema.keys({
    category: Joi.string().valid(...CATEGORY_VALUES).allow('', null).optional(),
    deliveryMethod: Joi.string().valid('online', 'in_person').allow('', null).optional(),
    classId: objectId.allow('', null).optional(),
    subjectId: objectId.allow('', null).optional(),
    teacherId: objectId.allow('', null).optional()
  })
});

const idParamsSchema = Joi.object({
  params: Joi.object({ id: objectId.required() })
});

const questionParamsSchema = Joi.object({
  params: Joi.object({
    id: objectId.required(),
    questionId: objectId.required()
  })
});

const submissionParamsSchema = Joi.object({
  params: Joi.object({ submissionId: objectId.required() })
});

const questionBodySchema = Joi.object({
  body: Joi.object({
    text: Joi.string().trim().required(),
    type: Joi.string().valid('mcq', 'true_false', 'descriptive', 'short_answer', 'essay').optional(),
    marks: Joi.number().min(0).optional(),
    options: Joi.array().items(
      Joi.alternatives().try(
        Joi.string(),
        Joi.object({
          key: Joi.string().optional(),
          text: Joi.string().allow('').optional(),
          isCorrect: Joi.boolean().optional()
        })
      )
    ).optional(),
    correctAnswer: Joi.any().optional(),
    booleanCorrect: Joi.boolean().optional(),
    expectedAnswer: Joi.string().allow('', null).optional(),
    answerLengthHint: Joi.string().allow('', null).optional(),
    explanation: Joi.string().allow('', null).optional(),
    isRequired: Joi.boolean().optional(),
    difficulty: Joi.string().valid('easy', 'medium', 'hard').optional(),
    topic: Joi.string().allow('', null).optional(),
    chapter: Joi.string().allow('', null).optional(),
    learningOutcome: Joi.string().allow('', null).optional(),
    skill: Joi.string().allow('', null).optional(),
    questionOrder: Joi.number().integer().min(1).optional()
  })
});

const aiGenerateQuestionsSchema = Joi.object({
  body: Joi.object({
    title: Joi.string().allow('', null).optional(),
    subjectName: Joi.string().allow('', null).optional(),
    className: Joi.string().allow('', null).optional(),
    category: Joi.string().allow('', null).optional(),
    bookName: Joi.string().allow('', null).optional(),
    chapterRange: Joi.string().allow('', null).optional(),
    description: Joi.string().allow('', null).optional(),
    instructions: Joi.string().allow('', null).optional(),
    topic: Joi.string().trim().min(1).required(),
    language: Joi.string().valid('en', 'fa', 'ps', 'mixed').optional(),
    difficulty: Joi.string().valid('easy', 'medium', 'hard').optional(),
    totalMarks: Joi.number().min(1).optional(),
    mcqCount: Joi.number().integer().min(0).max(30).default(0),
    trueFalseCount: Joi.number().integer().min(0).max(20).default(0),
    descriptiveCount: Joi.number().integer().min(0).max(15).default(0),
    examId: objectId.optional(),
    autoSave: Joi.boolean().optional()
  })
});

const questionUpdateSchema = Joi.object({
  body: Joi.object({
    text: Joi.string().trim().optional(),
    type: Joi.string().valid('mcq', 'true_false', 'descriptive', 'short_answer', 'essay').optional(),
    marks: Joi.number().min(0).optional(),
    options: Joi.array().items(
      Joi.alternatives().try(
        Joi.string(),
        Joi.object({
          key: Joi.string().optional(),
          text: Joi.string().allow('').optional(),
          isCorrect: Joi.boolean().optional()
        })
      )
    ).optional(),
    correctAnswer: Joi.any().optional(),
    booleanCorrect: Joi.boolean().optional(),
    expectedAnswer: Joi.string().allow('', null).optional(),
    answerLengthHint: Joi.string().allow('', null).optional(),
    explanation: Joi.string().allow('', null).optional(),
    isRequired: Joi.boolean().optional(),
    difficulty: Joi.string().valid('easy', 'medium', 'hard').optional(),
    topic: Joi.string().allow('', null).optional(),
    chapter: Joi.string().allow('', null).optional(),
    learningOutcome: Joi.string().allow('', null).optional(),
    skill: Joi.string().allow('', null).optional(),
    questionOrder: Joi.number().integer().min(1).optional(),
    isActive: Joi.boolean().optional()
  }).min(1)
});

const reorderSchema = Joi.object({
  body: Joi.object({
    order: Joi.array().items(objectId).min(1).required()
  })
});

const attachGoogleFormSchema = Joi.object({
  body: Joi.object({
    respondentUrl: Joi.string().trim().required(),
    editUrl: Joi.string().trim().allow('', null).optional()
  })
});

const draftSchema = Joi.object({
  body: Joi.object({
    answers: Joi.array().items(Joi.object({
      questionId: objectId.required(),
      selectedOptionKey: Joi.string().allow('', null).optional(),
      booleanAnswer: Joi.boolean().allow(null).optional(),
      descriptiveAnswer: Joi.string().allow('', null).optional()
    })).default([])
  })
});

const submitSchema = Joi.object({
  body: Joi.object({
    answers: Joi.array().items(Joi.object({
      questionId: objectId.required(),
      selectedOptionKey: Joi.string().allow('', null).optional(),
      booleanAnswer: Joi.boolean().allow(null).optional(),
      descriptiveAnswer: Joi.string().allow('', null).optional()
    })).optional()
  })
});

const gradeSchema = Joi.object({
  body: Joi.object({
    answers: Joi.array().items(Joi.object({
      questionId: objectId.required(),
      manualAwardedMarks: Joi.number().min(0).required(),
      teacherFeedback: Joi.string().allow('', null).optional()
    })).min(1).required()
  })
});

const printQuerySchema = Joi.object({
  params: Joi.object({ id: objectId.required() }),
  query: Joi.object({
    mode: Joi.string().valid('student', 'answer_key', 'with_space').default('student')
  })
});

const readRoles = ['super_admin', 'admin', 'branch_manager', 'teacher', 'student', 'parent', 'owner', 'family_student'];
const writeRoles = ['super_admin', 'admin', 'branch_manager', 'teacher'];
const deleteRoles = ['super_admin', 'admin'];
const staffRoles = ['super_admin', 'admin', 'branch_manager', 'teacher'];
const studentRoles = ['student'];

function getRole(req: Express.Request) {
  return String(req.user?.canonicalRole ?? req.user?.role ?? '');
}

function isStaffRole(role: string) {
  return staffRoles.includes(role);
}

function populateExam(query: any) {
  return query
    .populate('subject', 'title code branchId')
    .populate('class', 'className name classCode branchId')
    .populate('teacherId', 'name email branchId');
}

async function loadExam(id: string) {
  return Exam.findOne({ _id: id, isDeleted: false }).lean() as Promise<any>;
}

async function loadExamPopulated(id: string) {
  return populateExam(Exam.findOne({ _id: id, isDeleted: false })).lean() as Promise<any>;
}

function resolveCategory(body: any) {
  if (body.category) return normalizeCategory(body.category);
  if (body.examType && ['weekly', 'monthly', 'book', 'midterm', 'final', 'quiz'].includes(String(body.examType))) {
    return normalizeCategory(body.examType);
  }
  return 'weekly';
}

function resolveExamType(body: any, category: string) {
  if (body.examType && ['midterm', 'final', 'quiz', 'weekly', 'monthly', 'book'].includes(String(body.examType))) {
    return body.examType;
  }
  if (['midterm', 'final', 'quiz'].includes(category)) return category;
  return category === 'book' ? 'quiz' : category;
}

function validateBusinessRules(body: any, { partial = false }: { partial?: boolean } = {}) {
  const totalMarks = body.totalMarks !== undefined ? Number(body.totalMarks) : undefined;
  const passingMarks = body.passingMarks !== undefined ? Number(body.passingMarks) : undefined;
  if (totalMarks !== undefined && passingMarks !== undefined && passingMarks > totalMarks) {
    return 'Passing marks cannot exceed total marks';
  }

  const category = body.category !== undefined || body.examType !== undefined
    ? resolveCategory(body)
    : undefined;
  if (category === 'book' && !String(body.bookName || '').trim()) {
    return 'Book name is required for book-category exams';
  }

  const deliveryMethod = body.deliveryMethod !== undefined
    ? normalizeDeliveryMethod(body.deliveryMethod)
    : (partial ? undefined : 'online');

  if (deliveryMethod === 'online') {
    const googleFormUrl = String(body.googleFormUrl || '').trim();
    const onlineExamUrl = String(body.onlineExamUrl || '').trim();
    const status = String(body.status || 'draft');
    const allowDraft = body.allowDraft !== false;
    const hasUrl = Boolean(googleFormUrl || onlineExamUrl);
    if (!hasUrl && !(status === 'draft' || allowDraft)) {
      return 'Online exams require a Google Form URL (or create as draft)';
    }
    if (googleFormUrl && !isAllowedGoogleFormUrl(googleFormUrl)) {
      return 'Invalid Google Form URL';
    }
    if (body.googleFormEditUrl && String(body.googleFormEditUrl).trim() && !isAllowedGoogleFormUrl(String(body.googleFormEditUrl))) {
      return 'Invalid Google Form edit URL';
    }
  }

  return null;
}

async function assertCanManageExam(req: Express.Request, exam: any) {
  const role = getRole(req);
  if (role === 'super_admin' || role === 'admin') return null;
  if (role === 'teacher' && !idsEqual(exam.teacherId?._id ?? exam.teacherId, req.user?.userId)) {
    return 'Access denied';
  }
  if (role === 'branch_manager' && req.user?.branchId) {
    const examBranch = exam.branchId?._id ?? exam.branchId
      ?? exam.class?.branchId?._id ?? exam.class?.branchId
      ?? exam.subject?.branchId?._id ?? exam.subject?.branchId;
    if (examBranch && !idsEqual(examBranch, req.user.branchId)) {
      return 'Access denied';
    }
  }
  return null;
}

async function assertCanViewExam(req: Express.Request, exam: any) {
  const role = getRole(req);
  if (['super_admin', 'admin', 'owner'].includes(role)) return null;

  if (role === 'teacher') {
    return idsEqual(exam.teacherId?._id ?? exam.teacherId, req.user?.userId) ? null : 'Access denied';
  }

  if (role === 'branch_manager' && req.user?.branchId) {
    const examBranch = exam.branchId?._id ?? exam.branchId
      ?? exam.class?.branchId?._id ?? exam.class?.branchId
      ?? exam.subject?.branchId?._id ?? exam.subject?.branchId;
    if (examBranch && !idsEqual(examBranch, req.user.branchId)) return 'Access denied';
    return null;
  }

  if (role === 'student') {
    const { classId, subjectId } = await resolveScopedStudentAssignment(String(req.user?.userId ?? ''));
    if (!idsEqual(exam.class?._id ?? exam.class, classId) || !idsEqual(exam.subject?._id ?? exam.subject, subjectId)) {
      return 'Access denied';
    }
    if (!exam.isPublished && !['published', 'active', 'scheduled', 'completed', 'closed'].includes(String(exam.status))) {
      return 'Access denied';
    }
    return null;
  }

  if (role === 'parent' || role === 'family_student') {
    const currentUser = await User.findById(req.user?.userId).select('familyId parentProfileId').lean<any>();
    const students = await Student.find({
      isDeleted: false,
      ...(currentUser?.familyId ? { familyId: currentUser.familyId } : {}),
      ...(!currentUser?.familyId && currentUser?.parentProfileId
        ? { parentProfileId: currentUser.parentProfileId }
        : {})
    }).select('classId subjectId').lean<any[]>();
    const allow = students.some(
      (student) =>
        idsEqual(student.classId, exam.class?._id ?? exam.class)
        && idsEqual(student.subjectId, exam.subject?._id ?? exam.subject)
    );
    return allow ? null : 'Access denied';
  }

  return 'Access denied';
}

async function applyRoleListScope(req: Express.Request, filter: any) {
  const role = getRole(req);

  if (role === 'teacher') {
    filter.teacherId = req.user?.userId;
  }

  if (role === 'branch_manager' && req.user?.branchId) {
    filter.branchId = req.user.branchId;
  }

  if (role === 'student') {
    const { classId, subjectId } = await resolveScopedStudentAssignment(String(req.user?.userId ?? ''));
    if (!classId || !subjectId) {
      filter._id = { $in: [] };
    } else {
      filter.class = classId;
      filter.subject = subjectId;
      filter.$or = [
        { status: { $in: ['published', 'active', 'scheduled', 'completed', 'closed'] } },
        { isPublished: true }
      ];
    }
  }

  if (role === 'parent' || role === 'family_student') {
    const currentUser = await User.findById(req.user?.userId).select('familyId parentProfileId').lean<any>();
    const students = await Student.find({
      isDeleted: false,
      ...(currentUser?.familyId ? { familyId: currentUser.familyId } : {}),
      ...(!currentUser?.familyId && currentUser?.parentProfileId
        ? { parentProfileId: currentUser.parentProfileId }
        : {})
    }).select('classId subjectId').lean<any[]>();
    const classIds = students.map((student) => student.classId).filter(Boolean);
    const subjectIds = students.map((student) => student.subjectId).filter(Boolean);
    filter.class = classIds.length ? { $in: classIds } : { $in: [] };
    filter.subject = subjectIds.length ? { $in: subjectIds } : { $in: [] };
  }
}

function buildAnswerRecords(questions: any[], incoming: any[] = []) {
  const byQuestion = new Map(incoming.map((a) => [String(a.questionId), a]));
  return questions.map((question) => {
    const answer = byQuestion.get(String(question._id)) || {};
    const graded = autoGradeAnswer(question, answer);
    return {
      questionId: question._id,
      selectedOptionKey: String(answer.selectedOptionKey || '').trim(),
      booleanAnswer: typeof answer.booleanAnswer === 'boolean' ? answer.booleanAnswer : null,
      descriptiveAnswer: String(answer.descriptiveAnswer || '').trim(),
      autoAwardedMarks: graded.autoAwardedMarks,
      manualAwardedMarks: answer.manualAwardedMarks ?? null,
      teacherFeedback: String(answer.teacherFeedback || ''),
      isGraded: graded.isAutoGraded,
      gradedBy: null,
      gradedAt: graded.isAutoGraded ? new Date() : null
    };
  });
}

async function findOrCreateStudentSubmission(exam: any, userId: string) {
  const scoped = await resolveScopedStudentAssignment(userId);
  let submission = await ExamSubmission.findOne({
    examId: exam._id,
    studentUserId: userId,
    isDeleted: false,
    status: { $in: ['draft', 'in_progress', 'reopened'] }
  }).sort({ attemptNumber: -1 });

  if (submission) return submission;

  const last = await ExamSubmission.findOne({
    examId: exam._id,
    studentUserId: userId,
    isDeleted: false
  }).sort({ attemptNumber: -1 }).lean<any>();

  const nextAttempt = Number(last?.attemptNumber || 0) + 1;
  const maxAttempts = Number(exam.maximumAttempts || 1);
  if (last && ['submitted', 'graded', 'released'].includes(String(last.status)) && nextAttempt > maxAttempts) {
    return { error: 'Maximum attempts reached', submission: last } as const;
  }

  submission = await ExamSubmission.create({
    examId: exam._id,
    studentUserId: userId,
    studentDocId: scoped.studentDocId,
    attemptNumber: nextAttempt,
    status: 'in_progress',
    startedAt: new Date(),
    lastSavedAt: new Date(),
    answers: [],
    submissionReference: makeSubmissionReference()
  });

  return submission;
}

router.use(authenticate);

/* -------------------------------------------------------------------------- */
/* Early static paths (must be before /:id)                                   */
/* -------------------------------------------------------------------------- */

router.get('/my', authorize(studentRoles), async (req, res, next) => {
  try {
    const { classId, subjectId, studentDocId } = await resolveScopedStudentAssignment(String(req.user?.userId ?? ''));
    if (!classId || !subjectId) {
      return res.json(createResponse([], 'No enrolled class/subject'));
    }

    const exams = await populateExam(
      Exam.find({
        isDeleted: false,
        class: classId,
        subject: subjectId,
        $or: [
          { status: { $in: ['published', 'active', 'scheduled', 'completed', 'closed'] } },
          { isPublished: true }
        ]
      })
    )
      .sort({ date: -1 })
      .lean() as any[];

    const examIds = exams.map((e: any) => e._id);
    const submissions = await ExamSubmission.find({
      examId: { $in: examIds },
      studentUserId: req.user?.userId,
      isDeleted: false
    })
      .sort({ attemptNumber: -1 })
      .lean() as any[];

    const latestByExam = new Map<string, any>();
    for (const sub of submissions) {
      const key = String(sub.examId);
      if (!latestByExam.has(key)) latestByExam.set(key, sub);
    }

    const payload = exams.map((exam: any) => {
      const submission = latestByExam.get(String(exam._id)) || null;
      const accessible = examIsCurrentlyAccessible(exam);
      const submitted = submission && ['submitted', 'graded', 'released'].includes(String(submission.status));
      return {
        ...serializeExam(exam, { includeStaffLinks: false }),
        accessible,
        canStart: accessible && !submitted,
        canSubmit: accessible && (!submitted || submission?.status === 'reopened'),
        canOpenGoogleForm: accessible && Boolean(exam.googleFormUrl || exam.onlineExamUrl),
        submission,
        studentDocId
      };
    });

    res.json(createResponse(payload));
  } catch (error) {
    next(error);
  }
});

router.post(
  '/ai/generate-questions',
  authorize(writeRoles),
  validate(aiGenerateQuestionsSchema),
  async (req, res, next) => {
    try {
      const body = req.body || {};
      const total =
        Number(body.mcqCount || 0) + Number(body.trueFalseCount || 0) + Number(body.descriptiveCount || 0);
      if (total < 1) {
        return res.status(400).json(createError('At least one question count is required'));
      }

      const result = await aiProviderService.generateExamQuestions({
        title: body.title,
        subjectName: body.subjectName,
        className: body.className,
        category: body.category,
        bookName: body.bookName,
        chapterRange: body.chapterRange,
        description: body.description,
        instructions: body.instructions,
        topic: body.topic,
        language: body.language,
        difficulty: body.difficulty,
        totalMarks: body.totalMarks,
        mcqCount: body.mcqCount,
        trueFalseCount: body.trueFalseCount,
        descriptiveCount: body.descriptiveCount
      });

      let saved: any[] = [];
      if (body.autoSave && body.examId) {
        const exam = await loadExam(body.examId);
        if (!exam) return res.status(404).json(createError('Exam not found'));
        const denied = await assertCanManageExam(req, exam);
        if (denied) return res.status(403).json(createError(denied));

        const existingCount = await Question.countDocuments({ examId: exam._id, isDeleted: false });
        for (const [index, q] of result.questions.entries()) {
          const type = normalizeQuestionType(q.type);
          const options = buildQuestionOptions(type, q);
          const created = await Question.create({
            examId: exam._id,
            subjectId: exam.subject,
            questionOrder: existingCount + index + 1,
            text: q.text,
            type,
            options,
            correctAnswer: q.correctAnswer ?? (type === 'true_false'
              ? null
              : options.find((o: any) => o.isCorrect)?.key ?? null),
            expectedAnswer: String(q.expectedAnswer || ''),
            explanation: String(q.explanation || ''),
            marks: Number(q.marks ?? 1),
            isRequired: true,
            difficulty: q.difficulty || 'medium',
            topic: String(q.topic || ''),
            createdBy: req.user?.userId ?? null
          });
          saved.push(created);
        }
        await refreshExamAggregates(String(exam._id));
        await auditExam(String(exam._id), req.user?.userId, 'ai_questions_generated', {
          count: saved.length,
          generatedBy: result.generatedBy
        });
      }

      res.status(201).json(createResponse({
        questions: result.questions,
        savedQuestions: saved,
        generatedBy: result.generatedBy,
        provider: (result as any).provider || null,
        aiConfigured: isAiConfigured() || Boolean(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY)
      }, 'Questions generated'));
    } catch (error: any) {
      if (String(error?.message || '').includes('At least one question')) {
        return res.status(400).json(createError(error.message));
      }
      next(error);
    }
  }
);

router.get('/meta/options', authorize(writeRoles), async (req, res, next) => {
  try {
    const role = getRole(req);
    const classFilter: any = { isDeleted: false };
    const subjectFilter: any = { isDeleted: false };
    const teacherFilter: any = { role: 'teacher', isDeleted: false };

    if ((role === 'branch_manager' || role === 'admin') && req.user?.branchId) {
      classFilter.branchId = req.user.branchId;
      subjectFilter.branchId = req.user.branchId;
      teacherFilter.branchId = req.user.branchId;
    }

    if (role === 'teacher') {
      const teacher = await User.findById(req.user?.userId)
        .select('assignedClasses assignedSubjects branchId')
        .lean<any>();
      const classIds = (teacher?.assignedClasses || []).map(String).filter(Boolean);
      const subjectIds = (teacher?.assignedSubjects || []).map(String).filter(Boolean);
      classFilter._id = classIds.length ? { $in: classIds } : { $in: [] };
      subjectFilter._id = subjectIds.length ? { $in: subjectIds } : { $in: [] };
      teacherFilter._id = req.user?.userId;
    }

    const [classes, subjects, teachers] = await Promise.all([
      ClassModel.find(classFilter).select('className name classCode branchId assignedSubjects assignedTeachers').sort({ className: 1 }).lean(),
      Subject.find(subjectFilter).select('title code classId classIds teacher branchId').sort({ title: 1 }).lean(),
      User.find(teacherFilter).select('name email branchId assignedClasses assignedSubjects').sort({ name: 1 }).lean()
    ]);

    res.json(createResponse({
      classes,
      subjects,
      teachers,
      categories: CATEGORY_VALUES,
      deliveryMethods: ['online', 'in_person'],
      statuses: STATUS_VALUES,
      googleFormsConfigured: Boolean(String(process.env.GOOGLE_FORMS_SCRIPT_URL || '').trim())
    }));
  } catch (error) {
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* Submission grading (top-level paths)                                       */
/* -------------------------------------------------------------------------- */

router.post(
  '/submissions/:submissionId/grade',
  authorize(writeRoles),
  validate(gradeSchema),
  async (req, res, next) => {
    try {
      const submission = await ExamSubmission.findOne({
        _id: req.params.submissionId,
        isDeleted: false
      });
      if (!submission) return res.status(404).json(createError('Submission not found'));

      const exam = await loadExam(String(submission.examId));
      if (!exam) return res.status(404).json(createError('Exam not found'));

      const denied = await assertCanManageExam(req, exam);
      if (denied) return res.status(403).json(createError(denied));

      const questions = await Question.find({
        examId: exam._id,
        isDeleted: false,
        isActive: { $ne: false }
      }).lean<any[]>();
      const questionMap = new Map(questions.map((q) => [String(q._id), q]));

      const answers = [...(submission.answers || [])];
      for (const item of req.body.answers) {
        const q = questionMap.get(String(item.questionId));
        if (!q) continue;
        const idx = answers.findIndex((a: any) => idsEqual(a.questionId, item.questionId));
        const base = idx >= 0
          ? answers[idx]
          : {
              questionId: item.questionId,
              selectedOptionKey: '',
              booleanAnswer: null,
              descriptiveAnswer: '',
              autoAwardedMarks: 0
            };
        const updated = {
          ...((base as any).toObject?.() ?? base),
          manualAwardedMarks: Number(item.manualAwardedMarks),
          teacherFeedback: String(item.teacherFeedback || ''),
          isGraded: true,
          gradedBy: req.user?.userId,
          gradedAt: new Date()
        };
        if (idx >= 0) answers[idx] = updated as any;
        else answers.push(updated as any);
      }

      const totals = computeSubmissionTotals(exam, answers);
      submission.answers = answers as any;
      submission.autoGradedMarks = totals.autoGradedMarks;
      submission.manuallyGradedMarks = totals.manuallyGradedMarks;
      submission.totalObtainedMarks = totals.totalObtainedMarks;
      submission.percentage = totals.percentage;
      submission.passed = totals.passed;
      submission.gradingStatus = 'complete';
      submission.status = 'graded';
      submission.gradedBy = req.user?.userId as any;
      submission.gradedAt = new Date();
      await submission.save();

      const resultId = await upsertResultFromSubmission(exam, submission, String(req.user?.userId ?? ''));
      submission.resultId = resultId as any;
      await submission.save();

      await auditExam(String(exam._id), req.user?.userId, 'submission_graded', {
        submissionId: String(submission._id)
      });

      res.json(createResponse(submission, 'Submission graded'));
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/submissions/:submissionId/release',
  authorize(writeRoles),
  validate(submissionParamsSchema),
  async (req, res, next) => {
    try {
      const submission = await ExamSubmission.findOne({
        _id: req.params.submissionId,
        isDeleted: false
      });
      if (!submission) return res.status(404).json(createError('Submission not found'));

      const exam = await loadExam(String(submission.examId));
      if (!exam) return res.status(404).json(createError('Exam not found'));

      const denied = await assertCanManageExam(req, exam);
      if (denied) return res.status(403).json(createError(denied));

      if (!['submitted', 'graded', 'released'].includes(String(submission.status))) {
        return res.status(400).json(createError('Submission is not ready to release'));
      }

      submission.status = 'released';
      submission.resultReleasedAt = new Date();
      if (!submission.gradedAt) {
        submission.gradedAt = new Date();
        submission.gradedBy = req.user?.userId as any;
      }
      await submission.save();

      const resultId = await upsertResultFromSubmission(exam, submission, String(req.user?.userId ?? ''));
      submission.resultId = resultId as any;
      await submission.save();

      await notifyExamEvent(exam, 'result_released', [String(submission.studentUserId)]);
      await auditExam(String(exam._id), req.user?.userId, 'result_released', {
        submissionId: String(submission._id)
      });

      res.json(createResponse(submission, 'Result released'));
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/submissions/:submissionId/reopen',
  authorize(writeRoles),
  validate(submissionParamsSchema),
  async (req, res, next) => {
    try {
      const submission = await ExamSubmission.findOne({
        _id: req.params.submissionId,
        isDeleted: false
      });
      if (!submission) return res.status(404).json(createError('Submission not found'));

      const exam = await loadExam(String(submission.examId));
      if (!exam) return res.status(404).json(createError('Exam not found'));

      const denied = await assertCanManageExam(req, exam);
      if (denied) return res.status(403).json(createError(denied));

      submission.status = 'reopened';
      submission.submittedAt = null;
      submission.resultReleasedAt = null;
      submission.lastSavedAt = new Date();
      await submission.save();

      await auditExam(String(exam._id), req.user?.userId, 'submission_reopened', {
        submissionId: String(submission._id)
      });

      res.json(createResponse(submission, 'Submission reopened'));
    } catch (error) {
      next(error);
    }
  }
);

/* -------------------------------------------------------------------------- */
/* Exam CRUD                                                                  */
/* -------------------------------------------------------------------------- */

router.post('/', authorize(writeRoles), validate(examSchema), async (req, res, next) => {
  try {
    const role = getRole(req);
    const teacherId = role === 'teacher'
      ? req.user?.userId
      : (req.body.teacherId ?? null);
    if (!teacherId) {
      return res.status(400).json(createError('Teacher is required'));
    }

    const businessError = validateBusinessRules(req.body);
    if (businessError) {
      return res.status(400).json(createError(businessError));
    }

    const relationError = await ensureExamRelations(req.body.subject, req.body.class, teacherId);
    if (relationError) {
      return res.status(400).json(createError(relationError));
    }
    await syncExamTeacherAssignment(req.body.subject, req.body.class, teacherId);

    const subjectDoc = await Subject.findById(req.body.subject).select('branchId').lean<any>();
    const classDoc = await ClassModel.findById(req.body.class).select('branchId').lean<any>();
    let branchId = subjectDoc?.branchId ?? classDoc?.branchId ?? null;
    if (role === 'branch_manager' && req.user?.branchId) {
      branchId = req.user.branchId;
    }

    const category = resolveCategory(req.body);
    const deliveryMethod = normalizeDeliveryMethod(req.body.deliveryMethod ?? 'online');
    const status = String(req.body.status || 'draft');
    const isPublished = status === 'published' || status === 'active';
    const googleFormUrl = String(req.body.googleFormUrl || '').trim();
    const googleFormEditUrl = String(req.body.googleFormEditUrl || '').trim();

    const exam = await Exam.create({
      ...req.body,
      teacherId,
      branchId,
      category,
      deliveryMethod,
      examType: resolveExamType(req.body, category),
      bookName: category === 'book' ? String(req.body.bookName || '').trim() : String(req.body.bookName || ''),
      googleFormUrl,
      googleFormEditUrl,
      googleFormId: extractGoogleFormId(googleFormUrl),
      onlineExamUrl: String(req.body.onlineExamUrl || googleFormUrl || '').trim(),
      examCode: buildExamCode(req.body.title),
      status,
      isPublished,
      publishedAt: isPublished ? new Date() : null,
      createdBy: req.user?.userId ?? null,
      updatedBy: req.user?.userId ?? null,
      passingMarks: req.body.passingMarks ?? Math.min(40, Number(req.body.totalMarks ?? 100))
    });

    await refreshExamAggregates(String(exam._id));
    await auditExam(String(exam._id), req.user?.userId, 'exam_created', {
      category,
      deliveryMethod,
      status
    });

    if (isPublished) {
      await notifyExamEvent(exam, 'published');
    }

    const populated = await loadExamPopulated(String(exam._id));
    res.status(201).json(createResponse(serializeExam(populated), 'Exam created'));
  } catch (error) {
    next(error);
  }
});

router.get('/', authorize(readRoles), validate(examListSchema), async (req, res, next) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const search = String(req.query.search || '').trim();
    const filter: any = { ...listRecordFilter(req.user) };

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { examCode: { $regex: search, $options: 'i' } },
        { bookName: { $regex: search, $options: 'i' } },
        { referenceCode: { $regex: search, $options: 'i' } }
      ];
    }

    if (req.query.category) filter.category = String(req.query.category);
    if (req.query.deliveryMethod) filter.deliveryMethod = String(req.query.deliveryMethod);
    if (req.query.status) filter.status = req.query.status;
    if (req.query.classId) filter.class = String(req.query.classId);
    if (req.query.subjectId) filter.subject = String(req.query.subjectId);
    if (req.query.teacherId) filter.teacherId = String(req.query.teacherId);

    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = new Date(String(req.query.from));
      if (req.query.to) filter.date.$lte = new Date(String(req.query.to));
    }

    await applyRoleListScope(req, filter);

    const [exams, total] = await Promise.all([
      populateExam(Exam.find(filter))
        .sort({ date: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Exam.countDocuments(filter)
    ]);

    const includeStaffLinks = isStaffRole(getRole(req));
    res.json(createResponse(
      exams.map((exam: any) => serializeExam(exam, { includeStaffLinks })),
      '',
      { page, limit, total }
    ));
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authorize(writeRoles), validate(examUpdateSchema), async (req, res, next) => {
  try {
    const currentExam = await loadExam(req.params.id);
    if (!currentExam) {
      return res.status(404).json(createError('Exam not found'));
    }

    const denied = await assertCanManageExam(req, currentExam);
    if (denied) return res.status(403).json(createError(denied));

    const role = getRole(req);
    const nextSubject = req.body.subject ?? String(currentExam.subject);
    const nextClass = req.body.class ?? String(currentExam.class);
    const nextTeacherId = role === 'teacher'
      ? String(req.user?.userId)
      : (req.body.teacherId ?? String(currentExam.teacherId));

    const mergedForRules = {
      ...currentExam,
      ...req.body,
      category: req.body.category ?? req.body.examType ?? currentExam.category,
      deliveryMethod: req.body.deliveryMethod ?? currentExam.deliveryMethod,
      totalMarks: req.body.totalMarks ?? currentExam.totalMarks,
      passingMarks: req.body.passingMarks ?? currentExam.passingMarks,
      bookName: req.body.bookName ?? currentExam.bookName,
      googleFormUrl: req.body.googleFormUrl ?? currentExam.googleFormUrl,
      onlineExamUrl: req.body.onlineExamUrl ?? currentExam.onlineExamUrl,
      status: req.body.status ?? currentExam.status,
      allowDraft: req.body.allowDraft ?? currentExam.allowDraft
    };

    const businessError = validateBusinessRules(mergedForRules, { partial: true });
    if (businessError) {
      return res.status(400).json(createError(businessError));
    }

    if (req.body.status && !canTransitionStatus(String(currentExam.status), String(req.body.status))) {
      return res.status(400).json(createError(`Cannot transition from ${currentExam.status} to ${req.body.status}`));
    }

    const relationError = await ensureExamRelations(nextSubject, nextClass, nextTeacherId);
    if (relationError) {
      return res.status(400).json(createError(relationError));
    }
    await syncExamTeacherAssignment(nextSubject, nextClass, nextTeacherId);

    const subjectDoc = await Subject.findById(nextSubject).select('branchId').lean<any>();
    const nextStatus = req.body.status ?? currentExam.status;
    const becomingPublished = nextStatus === 'published' || nextStatus === 'active';
    const category = req.body.category || req.body.examType
      ? resolveCategory(req.body)
      : currentExam.category;

    const updatePayload: any = {
      ...req.body,
      teacherId: nextTeacherId,
      branchId: subjectDoc?.branchId ?? currentExam.branchId ?? null,
      updatedBy: req.user?.userId ?? null
    };

    if (req.body.category || req.body.examType) {
      updatePayload.category = category;
      updatePayload.examType = resolveExamType(req.body, category);
    }
    if (req.body.deliveryMethod) {
      updatePayload.deliveryMethod = normalizeDeliveryMethod(req.body.deliveryMethod);
    }
    if (req.body.googleFormUrl !== undefined) {
      updatePayload.googleFormUrl = String(req.body.googleFormUrl || '').trim();
      updatePayload.googleFormId = extractGoogleFormId(updatePayload.googleFormUrl);
    }

    if (becomingPublished) {
      updatePayload.isPublished = true;
      updatePayload.publishedAt = currentExam.publishedAt ?? new Date();
    } else if (req.body.status === 'draft' || req.body.status === 'cancelled' || req.body.status === 'archived') {
      updatePayload.isPublished = false;
      if (req.body.status === 'draft') updatePayload.publishedAt = null;
    }

    const exam = await populateExam(
      Exam.findByIdAndUpdate(req.params.id, { $set: updatePayload }, { new: true, runValidators: true })
    ).lean();

    await auditExam(String(req.params.id), req.user?.userId, 'exam_updated', {
      fields: Object.keys(req.body),
      status: nextStatus
    });

    if (becomingPublished && currentExam.status !== nextStatus) {
      await notifyExamEvent(exam, 'published');
    }

    res.json(createResponse(serializeExam(exam), 'Exam updated'));
  } catch (error) {
    next(error);
  }
});

async function transitionExamStatus(
  req: any,
  res: any,
  next: any,
  toStatus: string,
  message: string,
  extras: Record<string, unknown> = {}
) {
  try {
    const exam = await loadExam(String(req.params.id));
    if (!exam) return res.status(404).json(createError('Exam not found'));

    const denied = await assertCanManageExam(req, exam);
    if (denied) return res.status(403).json(createError(denied));

    if (!canTransitionStatus(String(exam.status), toStatus)) {
      return res.status(400).json(createError(`Cannot transition from ${exam.status} to ${toStatus}`));
    }

    const update: any = {
      status: toStatus,
      updatedBy: req.user?.userId ?? null,
      ...extras
    };

    if (toStatus === 'published' || toStatus === 'active') {
      update.isPublished = true;
      update.publishedAt = exam.publishedAt ?? new Date();
    }
    if (toStatus === 'draft') {
      update.isPublished = false;
      update.publishedAt = null;
    }
    if (toStatus === 'cancelled' || toStatus === 'archived') {
      update.isPublished = false;
    }

    const updated = await populateExam(
      Exam.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true })
    ).lean();

    await auditExam(String(req.params.id), req.user?.userId, `exam_${toStatus}`, { from: exam.status });

    if (toStatus === 'published') {
      await notifyExamEvent(updated, 'published');
    } else if (toStatus === 'cancelled') {
      await notifyExamEvent(updated, 'cancelled');
    }

    res.json(createResponse(serializeExam(updated), message));
  } catch (error) {
    next(error);
  }
}

router.post('/:id/publish', authorize(writeRoles), validate(idParamsSchema), (req, res, next) =>
  transitionExamStatus(req, res, next, 'published', 'Exam published')
);

router.post('/:id/unpublish', authorize(writeRoles), validate(idParamsSchema), (req, res, next) =>
  transitionExamStatus(req, res, next, 'draft', 'Exam unpublished', {
    isPublished: false,
    publishedAt: null
  })
);

router.post('/:id/cancel', authorize(writeRoles), validate(idParamsSchema), (req, res, next) =>
  transitionExamStatus(req, res, next, 'cancelled', 'Exam cancelled')
);

router.post('/:id/archive', authorize(writeRoles), validate(idParamsSchema), (req, res, next) =>
  transitionExamStatus(req, res, next, 'archived', 'Exam archived')
);

router.post('/:id/duplicate', authorize(writeRoles), validate(idParamsSchema), async (req, res, next) => {
  try {
    const source = await loadExam(req.params.id);
    if (!source) return res.status(404).json(createError('Exam not found'));

    const denied = await assertCanManageExam(req, source);
    if (denied) return res.status(403).json(createError(denied));

    const role = getRole(req);
    const teacherId = role === 'teacher' ? req.user?.userId : source.teacherId;

    const clonePayload = {
      ...source,
      _id: undefined,
      title: `${source.title} (Copy)`,
      examCode: buildExamCode(`${source.title}-copy`),
      status: 'draft',
      isPublished: false,
      publishedAt: null,
      teacherId,
      createdBy: req.user?.userId ?? null,
      updatedBy: req.user?.userId ?? null,
      questionCount: 0,
      submissionCount: 0,
      createdAt: undefined,
      updatedAt: undefined
    };
    delete (clonePayload as any)._id;
    delete (clonePayload as any).createdAt;
    delete (clonePayload as any).updatedAt;

    const created = await Exam.create(clonePayload);

    const questions = await Question.find({
      examId: source._id,
      isDeleted: false
    }).sort({ questionOrder: 1 }).lean<any[]>();

    if (questions.length) {
      await Question.insertMany(
        questions.map((q, index) => ({
          ...q,
          _id: undefined,
          examId: created._id,
          questionOrder: q.questionOrder || index + 1,
          createdBy: req.user?.userId ?? null,
          createdAt: undefined,
          updatedAt: undefined
        }))
      );
    }

    await refreshExamAggregates(String(created._id));
    await auditExam(String(created._id), req.user?.userId, 'exam_duplicated', {
      sourceExamId: String(source._id)
    });

    const populated = await loadExamPopulated(String(created._id));
    res.status(201).json(createResponse(serializeExam(populated), 'Exam duplicated'));
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authorize(readRoles), validate(idParamsSchema), async (req, res, next) => {
  try {
    const exam = await loadExamPopulated(req.params.id);
    if (!exam) return res.status(404).json(createError('Exam not found'));

    const denied = await assertCanViewExam(req, exam);
    if (denied) return res.status(403).json(createError(denied));

    const role = getRole(req);
    const includeStaffLinks = isStaffRole(role);
    res.json(createResponse(serializeExam(exam, { includeStaffLinks })));
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authorize(deleteRoles), validate(idParamsSchema), async (req, res, next) => {
  try {
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: req.user?.userId ?? null,
          status: 'archived',
          isPublished: false
        }
      },
      { new: true }
    ).lean();

    if (!exam) {
      return res.status(404).json(createError('Exam not found'));
    }

    await auditExam(String(req.params.id), req.user?.userId, 'exam_deleted');
    res.json(createResponse({}, 'Exam deleted successfully'));
  } catch (error) {
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* Questions                                                                  */
/* -------------------------------------------------------------------------- */

router.get('/:id/questions', authorize(readRoles), validate(idParamsSchema), async (req, res, next) => {
  try {
    const exam = await loadExam(req.params.id);
    if (!exam) return res.status(404).json(createError('Exam not found'));

    const denied = await assertCanViewExam(req, exam);
    if (denied) return res.status(403).json(createError(denied));

    const questions = await Question.find({
      examId: exam._id,
      isDeleted: false,
      isActive: { $ne: false }
    })
      .sort({ questionOrder: 1 })
      .lean<any[]>();

    const role = getRole(req);
    const payload = role === 'student' || role === 'parent' || role === 'family_student'
      ? questions.map(sanitizeQuestionForStudent)
      : questions;

    res.json(createResponse(payload));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/questions', authorize(writeRoles), validate(questionBodySchema), async (req, res, next) => {
  try {
    const exam = await loadExam(req.params.id);
    if (!exam) return res.status(404).json(createError('Exam not found'));

    const denied = await assertCanManageExam(req, exam);
    if (denied) return res.status(403).json(createError(denied));

    const validationError = validateQuestionPayload(req.body);
    if (validationError) return res.status(400).json(createError(validationError));

    const type = normalizeQuestionType(req.body.type);
    const count = await Question.countDocuments({ examId: exam._id, isDeleted: false });
    const options = buildQuestionOptions(type, req.body);

    const question = await Question.create({
      examId: exam._id,
      subjectId: exam.subject,
      questionOrder: req.body.questionOrder || count + 1,
      text: String(req.body.text).trim(),
      type,
      options,
      correctAnswer: req.body.correctAnswer ?? (type === 'true_false'
        ? (req.body.booleanCorrect ?? null)
        : options.find((o: any) => o.isCorrect)?.key ?? null),
      expectedAnswer: String(req.body.expectedAnswer || ''),
      answerLengthHint: String(req.body.answerLengthHint || ''),
      explanation: String(req.body.explanation || ''),
      marks: Number(req.body.marks ?? 1),
      isRequired: req.body.isRequired !== false,
      difficulty: req.body.difficulty || 'medium',
      topic: String(req.body.topic || ''),
      chapter: String(req.body.chapter || ''),
      learningOutcome: String(req.body.learningOutcome || ''),
      skill: String(req.body.skill || ''),
      createdBy: req.user?.userId ?? null
    });

    await refreshExamAggregates(String(exam._id));
    await auditExam(String(exam._id), req.user?.userId, 'question_created', {
      questionId: String(question._id)
    });

    res.status(201).json(createResponse(question, 'Question created'));
  } catch (error) {
    next(error);
  }
});

router.put(
  '/:id/questions/:questionId',
  authorize(writeRoles),
  validate(questionUpdateSchema),
  async (req, res, next) => {
    try {
      const exam = await loadExam(req.params.id);
      if (!exam) return res.status(404).json(createError('Exam not found'));

      const denied = await assertCanManageExam(req, exam);
      if (denied) return res.status(403).json(createError(denied));

      const existing = await Question.findOne({
        _id: req.params.questionId,
        examId: exam._id,
        isDeleted: false
      });
      if (!existing) return res.status(404).json(createError('Question not found'));

      const merged = {
        ...existing.toObject(),
        ...req.body,
        type: req.body.type ?? existing.type,
        options: req.body.options ?? existing.options,
        correctAnswer: req.body.correctAnswer ?? existing.correctAnswer,
        booleanCorrect: req.body.booleanCorrect
      };
      const validationError = validateQuestionPayload(merged);
      if (validationError) return res.status(400).json(createError(validationError));

      const type = normalizeQuestionType(merged.type);
      const update: any = {
        ...req.body,
        type,
        text: req.body.text !== undefined ? String(req.body.text).trim() : existing.text
      };

      if (req.body.options !== undefined || req.body.correctAnswer !== undefined || req.body.booleanCorrect !== undefined || req.body.type) {
        update.options = buildQuestionOptions(type, merged);
        update.correctAnswer = merged.correctAnswer ?? update.options.find((o: any) => o.isCorrect)?.key ?? null;
      }

      const question = await Question.findByIdAndUpdate(
        req.params.questionId,
        { $set: update },
        { new: true, runValidators: true }
      ).lean();

      await refreshExamAggregates(String(exam._id));
      await auditExam(String(exam._id), req.user?.userId, 'question_updated', {
        questionId: String(req.params.questionId)
      });

      res.json(createResponse(question, 'Question updated'));
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:id/questions/:questionId',
  authorize(writeRoles),
  validate(questionParamsSchema),
  async (req, res, next) => {
    try {
      const exam = await loadExam(req.params.id);
      if (!exam) return res.status(404).json(createError('Exam not found'));

      const denied = await assertCanManageExam(req, exam);
      if (denied) return res.status(403).json(createError(denied));

      const question = await Question.findOneAndUpdate(
        { _id: req.params.questionId, examId: exam._id, isDeleted: false },
        {
          $set: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: req.user?.userId ?? null,
            isActive: false
          }
        },
        { new: true }
      ).lean();

      if (!question) return res.status(404).json(createError('Question not found'));

      await refreshExamAggregates(String(exam._id));
      await auditExam(String(exam._id), req.user?.userId, 'question_deleted', {
        questionId: String(req.params.questionId)
      });

      res.json(createResponse({}, 'Question deleted'));
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/questions/reorder',
  authorize(writeRoles),
  validate(reorderSchema),
  async (req, res, next) => {
    try {
      const exam = await loadExam(req.params.id);
      if (!exam) return res.status(404).json(createError('Exam not found'));

      const denied = await assertCanManageExam(req, exam);
      if (denied) return res.status(403).json(createError(denied));

      const order: string[] = req.body.order;
      await Promise.all(
        order.map((questionId, index) =>
          Question.updateOne(
            { _id: questionId, examId: exam._id, isDeleted: false },
            { $set: { questionOrder: index + 1 } }
          )
        )
      );

      await auditExam(String(exam._id), req.user?.userId, 'questions_reordered', {
        count: order.length
      });

      const questions = await Question.find({
        examId: exam._id,
        isDeleted: false
      })
        .sort({ questionOrder: 1 })
        .lean();

      res.json(createResponse(questions, 'Questions reordered'));
    } catch (error) {
      next(error);
    }
  }
);

/* -------------------------------------------------------------------------- */
/* Google Form                                                                */
/* -------------------------------------------------------------------------- */

router.post(
  '/:id/google-form/attach',
  authorize(writeRoles),
  validate(attachGoogleFormSchema),
  async (req, res, next) => {
    try {
      const exam = await loadExam(req.params.id);
      if (!exam) return res.status(404).json(createError('Exam not found'));

      const denied = await assertCanManageExam(req, exam);
      if (denied) return res.status(403).json(createError(denied));

      const respondentUrl = String(req.body.respondentUrl || '').trim();
      const editUrl = String(req.body.editUrl || '').trim();
      if (!isAllowedGoogleFormUrl(respondentUrl)) {
        return res.status(400).json(createError('Invalid Google Form URL'));
      }
      if (editUrl && !isAllowedGoogleFormUrl(editUrl)) {
        return res.status(400).json(createError('Invalid Google Form edit URL'));
      }

      const updated = await populateExam(
        Exam.findByIdAndUpdate(
          req.params.id,
          {
            $set: {
              googleFormUrl: respondentUrl,
              googleFormEditUrl: editUrl || exam.googleFormEditUrl || '',
              googleFormId: extractGoogleFormId(respondentUrl),
              onlineExamUrl: respondentUrl,
              googleSyncStatus: 'manual',
              googleLastSyncedAt: new Date(),
              deliveryMethod: 'online',
              updatedBy: req.user?.userId ?? null
            }
          },
          { new: true }
        )
      ).lean();

      await auditExam(String(exam._id), req.user?.userId, 'google_form_attached');
      res.json(createResponse(serializeExam(updated), 'Google Form attached'));
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/google-form/create',
  authorize(writeRoles),
  validate(idParamsSchema),
  async (req, res, next) => {
    try {
      const exam = await loadExamPopulated(req.params.id);
      if (!exam) return res.status(404).json(createError('Exam not found'));

      const denied = await assertCanManageExam(req, exam);
      if (denied) return res.status(403).json(createError(denied));

      const result = await createGoogleFormViaScript({
        title: exam.title,
        description: exam.description || exam.instructions || '',
        className: exam.class?.className ?? exam.class?.name ?? '',
        subjectName: exam.subject?.title ?? ''
      });

      if (!result.ok) {
        await Exam.findByIdAndUpdate(exam._id, {
          $set: {
            googleSyncStatus: 'error',
            googleLastError: result.error
          }
        });
        return res.status(502).json(createError(result.error));
      }

      if (!isAllowedGoogleFormUrl(result.respondentUrl)) {
        return res.status(502).json(createError('Google Forms script returned an invalid URL'));
      }

      const updated = await populateExam(
        Exam.findByIdAndUpdate(
          exam._id,
          {
            $set: {
              googleFormUrl: result.respondentUrl,
              googleFormEditUrl: result.editUrl || '',
              googleFormId: result.googleFormId || extractGoogleFormId(result.respondentUrl),
              googleResponseSheetId: result.responseSheetId || '',
              onlineExamUrl: result.respondentUrl,
              googleSyncStatus: 'synced',
              googleLastSyncedAt: new Date(),
              googleLastError: '',
              deliveryMethod: 'online',
              updatedBy: req.user?.userId ?? null
            }
          },
          { new: true }
        )
      ).lean();

      await auditExam(String(exam._id), req.user?.userId, 'google_form_created');
      res.json(createResponse(serializeExam(updated), 'Google Form created'));
    } catch (error) {
      next(error);
    }
  }
);

/* -------------------------------------------------------------------------- */
/* Submissions & student take flow                                            */
/* -------------------------------------------------------------------------- */

router.get('/:id/submissions', authorize(writeRoles), validate(idParamsSchema), async (req, res, next) => {
  try {
    const exam = await loadExam(req.params.id);
    if (!exam) return res.status(404).json(createError('Exam not found'));

    const denied = await assertCanManageExam(req, exam);
    if (denied) return res.status(403).json(createError(denied));

    const submissions = await ExamSubmission.find({
      examId: exam._id,
      isDeleted: false
    })
      .populate('studentUserId', 'name email studentId')
      .sort({ submittedAt: -1, updatedAt: -1 })
      .lean();

    res.json(createResponse(submissions));
  } catch (error) {
    next(error);
  }
});

router.get('/:id/student-view', authorize(studentRoles), validate(idParamsSchema), async (req, res, next) => {
  try {
    const exam = await loadExamPopulated(req.params.id);
    if (!exam) return res.status(404).json(createError('Exam not found'));

    const denied = await assertCanViewExam(req, exam);
    if (denied) return res.status(403).json(createError(denied));

    const questions = await Question.find({
      examId: exam._id,
      isDeleted: false,
      isActive: { $ne: false }
    })
      .sort({ questionOrder: 1 })
      .lean<any[]>();

    const submission = await ExamSubmission.findOne({
      examId: exam._id,
      studentUserId: req.user?.userId,
      isDeleted: false
    })
      .sort({ attemptNumber: -1 })
      .lean() as any;

    const showAnswers = Boolean(
      exam.showCorrectAnswers
      && submission
      && ['released', 'graded'].includes(String(submission?.status))
      && (submission?.resultReleasedAt || exam.showResultImmediately)
    );

    res.json(createResponse({
      exam: serializeExam(exam, { includeStaffLinks: false }),
      accessible: examIsCurrentlyAccessible(exam),
      questions: showAnswers ? questions : questions.map(sanitizeQuestionForStudent),
      submission
    }));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/start', authorize(studentRoles), validate(idParamsSchema), async (req, res, next) => {
  try {
    const exam = await loadExam(req.params.id);
    if (!exam) return res.status(404).json(createError('Exam not found'));

    const denied = await assertCanViewExam(req, exam);
    if (denied) return res.status(403).json(createError(denied));

    if (!examIsCurrentlyAccessible(exam)) {
      return res.status(403).json(createError('Exam is not currently accessible'));
    }

    const result = await findOrCreateStudentSubmission(exam, String(req.user?.userId));
    if ((result as any).error) {
      return res.status(409).json(createError((result as any).error));
    }

    const submission = result as any;
    if (submission.status === 'draft') {
      submission.status = 'in_progress';
      submission.startedAt = submission.startedAt || new Date();
      await submission.save();
    }

    await auditExam(String(exam._id), req.user?.userId, 'exam_started', {
      submissionId: String(submission._id)
    });

    res.json(createResponse(submission, 'Exam started'));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/open-google-form', authorize(studentRoles), validate(idParamsSchema), async (req, res, next) => {
  try {
    const exam = await loadExam(req.params.id);
    if (!exam) return res.status(404).json(createError('Exam not found'));

    const denied = await assertCanViewExam(req, exam);
    if (denied) return res.status(403).json(createError(denied));

    if (!exam.googleFormUrl && !exam.onlineExamUrl) {
      return res.status(400).json(createError('No Google Form URL attached'));
    }

    const result = await findOrCreateStudentSubmission(exam, String(req.user?.userId));
    if ((result as any).error) {
      return res.status(409).json(createError((result as any).error));
    }

    const submission = result as any;
    submission.openedGoogleFormAt = new Date();
    submission.lastSavedAt = new Date();
    if (['draft'].includes(String(submission.status))) {
      submission.status = 'in_progress';
    }
    await submission.save();

    await auditExam(String(exam._id), req.user?.userId, 'google_form_opened', {
      submissionId: String(submission._id)
    });

    res.json(createResponse({
      submission,
      url: exam.googleFormUrl || exam.onlineExamUrl
    }, 'Google Form open recorded'));
  } catch (error) {
    next(error);
  }
});

router.put('/:id/draft', authorize(studentRoles), validate(draftSchema), async (req, res, next) => {
  try {
    const exam = await loadExam(req.params.id);
    if (!exam) return res.status(404).json(createError('Exam not found'));

    const denied = await assertCanViewExam(req, exam);
    if (denied) return res.status(403).json(createError(denied));

    if (exam.allowDraft === false) {
      return res.status(400).json(createError('Draft answers are not allowed for this exam'));
    }

    if (!examIsCurrentlyAccessible(exam)) {
      return res.status(403).json(createError('Exam is not currently accessible'));
    }

    const result = await findOrCreateStudentSubmission(exam, String(req.user?.userId));
    if ((result as any).error) {
      return res.status(409).json(createError((result as any).error));
    }

    const submission = result as any;
    if (['submitted', 'graded', 'released'].includes(String(submission.status))) {
      return res.status(409).json(createError('Submission already finalized'));
    }

    const questions = await Question.find({
      examId: exam._id,
      isDeleted: false,
      isActive: { $ne: false }
    }).lean<any[]>();

    submission.answers = buildAnswerRecords(questions, req.body.answers || []);
    submission.status = 'draft';
    submission.lastSavedAt = new Date();
    await submission.save();

    res.json(createResponse(submission, 'Draft saved'));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/submit', authorize(studentRoles), validate(submitSchema), async (req, res, next) => {
  try {
    const exam = await loadExam(req.params.id);
    if (!exam) return res.status(404).json(createError('Exam not found'));

    const denied = await assertCanViewExam(req, exam);
    if (denied) return res.status(403).json(createError(denied));

    if (!examIsCurrentlyAccessible(exam) && exam.lateSubmissionPolicy === 'deny') {
      return res.status(403).json(createError('Exam is not currently accessible'));
    }

    let submission = await ExamSubmission.findOne({
      examId: exam._id,
      studentUserId: req.user?.userId,
      isDeleted: false,
      status: { $in: ['draft', 'in_progress', 'reopened'] }
    }).sort({ attemptNumber: -1 });

    if (!submission) {
      const existingFinal = await ExamSubmission.findOne({
        examId: exam._id,
        studentUserId: req.user?.userId,
        isDeleted: false,
        status: { $in: ['submitted', 'graded', 'released'] }
      }).sort({ attemptNumber: -1 });

      if (existingFinal) {
        return res.status(409).json(createError('Exam already submitted'));
      }

      const created = await findOrCreateStudentSubmission(exam, String(req.user?.userId));
      if ((created as any).error) {
        return res.status(409).json(createError((created as any).error));
      }
      submission = created as any;
    }

    if (['submitted', 'graded', 'released'].includes(String(submission.status))) {
      return res.status(409).json(createError('Exam already submitted'));
    }

    const questions = await Question.find({
      examId: exam._id,
      isDeleted: false,
      isActive: { $ne: false }
    }).lean<any[]>();

    const incoming = Array.isArray(req.body.answers) && req.body.answers.length
      ? req.body.answers
      : (submission.answers || []).map((a: any) => ({
          questionId: a.questionId,
          selectedOptionKey: a.selectedOptionKey,
          booleanAnswer: a.booleanAnswer,
          descriptiveAnswer: a.descriptiveAnswer
        }));

    const answers = buildAnswerRecords(questions, incoming);
    const totals = computeSubmissionTotals(exam, answers);
    const needsManual = answers.some((a) => {
      const q = questions.find((item) => idsEqual(item._id, a.questionId));
      return normalizeQuestionType(q?.type) === 'descriptive';
    });

    submission.answers = answers as any;
    submission.autoGradedMarks = totals.autoGradedMarks;
    submission.manuallyGradedMarks = totals.manuallyGradedMarks;
    submission.totalObtainedMarks = totals.totalObtainedMarks;
    submission.percentage = totals.percentage;
    submission.passed = totals.passed;
    submission.status = 'submitted';
    submission.submittedAt = new Date();
    submission.lastSavedAt = new Date();
    submission.gradingStatus = needsManual ? 'partial' : 'complete';
    if (!submission.submissionReference) {
      submission.submissionReference = makeSubmissionReference();
    }

    if (!needsManual) {
      submission.status = exam.showResultImmediately ? 'released' : 'graded';
      submission.gradedAt = new Date();
      if (exam.showResultImmediately) {
        submission.resultReleasedAt = new Date();
      }
    }

    await submission.save();

    if (['graded', 'released'].includes(String(submission.status))) {
      const resultId = await upsertResultFromSubmission(exam, submission, null);
      submission.resultId = resultId as any;
      await submission.save();
    }

    if (submission.status === 'released') {
      await notifyExamEvent(exam, 'result_released', [String(req.user?.userId)]);
    }

    await refreshExamAggregates(String(exam._id));
    await auditExam(String(exam._id), req.user?.userId, 'exam_submitted', {
      submissionId: String(submission._id)
    });

    res.json(createResponse(submission, 'Exam submitted'));
  } catch (error) {
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* Print data                                                                 */
/* -------------------------------------------------------------------------- */

router.get('/:id/print-data', authorize(readRoles), validate(printQuerySchema), async (req, res, next) => {
  try {
    const exam = await loadExamPopulated(req.params.id);
    if (!exam) return res.status(404).json(createError('Exam not found'));

    const denied = await assertCanViewExam(req, exam);
    if (denied) return res.status(403).json(createError(denied));

    const mode = String(req.query.mode || 'student');
    const role = getRole(req);

    if (mode === 'answer_key' && !isStaffRole(role)) {
      return res.status(403).json(createError('Students cannot access the answer key'));
    }

    const questions = await Question.find({
      examId: exam._id,
      isDeleted: false,
      isActive: { $ne: false }
    })
      .sort({ questionOrder: 1 })
      .lean<any[]>();

    const includeAnswers = mode === 'answer_key';
    const withSpace = mode === 'with_space';

    const printQuestions = questions.map((q, index) => {
      const type = normalizeQuestionType(q.type);
      const base: any = {
        number: index + 1,
        questionId: q._id,
        text: q.text,
        type,
        marks: q.marks,
        options: Array.isArray(q.options)
          ? q.options.map((o: any) => ({
              key: o.key,
              text: o.text,
              ...(includeAnswers ? { isCorrect: Boolean(o.isCorrect) } : {})
            }))
          : [],
        answerSpaceLines: withSpace
          ? (type === 'descriptive' ? 8 : type === 'true_false' ? 1 : 0)
          : 0
      };

      if (includeAnswers) {
        base.correctAnswer = q.correctAnswer;
        base.expectedAnswer = q.expectedAnswer || '';
        base.explanation = q.explanation || '';
      }

      return base;
    });

    res.json(createResponse({
      mode,
      exam: serializeExam(exam, { includeStaffLinks: isStaffRole(role) }),
      meta: {
        title: exam.title,
        className: exam.class?.className ?? exam.class?.name ?? '',
        subjectName: exam.subject?.title ?? '',
        teacherName: exam.teacherId?.name ?? '',
        date: exam.date,
        durationMinutes: exam.durationMinutes,
        totalMarks: exam.totalMarks,
        passingMarks: exam.passingMarks,
        instructions: exam.instructions || '',
        room: exam.room || '',
        category: exam.category,
        deliveryMethod: exam.deliveryMethod,
        bookName: exam.bookName || '',
        chapterRange: exam.chapterRange || ''
      },
      questions: printQuestions
    }));
  } catch (error) {
    next(error);
  }
});

export const examRouter = router;
