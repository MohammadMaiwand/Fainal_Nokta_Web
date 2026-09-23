import crypto from 'crypto';
import mongoose from 'mongoose';
import { Exam } from '../models/Exam';
import { Question } from '../models/Question';
import { ExamSubmission } from '../models/ExamSubmission';
import { ExamAuditLog } from '../models/ExamAuditLog';
import { Result } from '../models/Result';
import { Student } from '../models/Student';
import { User } from '../models/User';
import { ClassModel } from '../models/Class';
import { Subject } from '../models/Subject';
import { subjectBelongsToClass } from './timetableValidationService';
import { NotificationDispatchService } from './notificationDispatchService';

const GOOGLE_FORM_HOSTS = new Set([
  'docs.google.com',
  'forms.gle',
  'forms.google.com'
]);

export const EXAM_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['scheduled', 'published', 'cancelled'],
  scheduled: ['published', 'active', 'cancelled', 'draft'],
  published: ['active', 'cancelled', 'closed', 'archived', 'draft'],
  active: ['completed', 'closed', 'cancelled'],
  completed: ['archived', 'closed'],
  closed: ['archived', 'published'],
  cancelled: ['draft', 'archived'],
  archived: []
};

export function buildExamCode(title: string) {
  const slug = title
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 18) || 'EXAM';
  return `${slug}-${Date.now().toString().slice(-6)}`;
}

export function idsEqual(left: unknown, right: unknown) {
  return String(left ?? '') === String(right ?? '');
}

export function isAllowedGoogleFormUrl(raw: string) {
  const value = String(raw || '').trim();
  if (!value) return true;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    const host = url.hostname.toLowerCase();
    if (host === 'forms.gle') return true;
    if (host === 'docs.google.com' && url.pathname.includes('/forms/')) return true;
    if (host === 'forms.google.com') return true;
    return GOOGLE_FORM_HOSTS.has(host);
  } catch {
    return false;
  }
}

export function extractGoogleFormId(raw: string) {
  const value = String(raw || '').trim();
  const match = value.match(/\/forms\/d\/e\/([^/]+)/) || value.match(/\/forms\/d\/([^/]+)/);
  return match?.[1] || '';
}

export function serializeExam(exam: any, opts: { includeStaffLinks?: boolean } = {}) {
  const includeStaffLinks = opts.includeStaffLinks !== false;
  return {
    ...exam,
    subjectName: exam?.subject?.title ?? exam?.subjectName ?? '',
    className: exam?.class?.className ?? exam?.class?.name ?? exam?.className ?? '',
    teacherName: exam?.teacherId?.name ?? exam?.teacherName ?? '',
    googleFormEditUrl: includeStaffLinks ? exam?.googleFormEditUrl || '' : undefined,
    googleFormId: includeStaffLinks ? exam?.googleFormId || '' : undefined,
    googleResponseSheetId: includeStaffLinks ? exam?.googleResponseSheetId || '' : undefined
  };
}

export function sanitizeQuestionForStudent(question: any) {
  const options = Array.isArray(question.options)
    ? question.options.map((opt: any) => ({
        key: opt.key,
        text: opt.text,
        _id: opt._id
      }))
    : (question.options || []).map((text: string, index: number) => ({
        key: ['A', 'B', 'C', 'D'][index] || String(index),
        text
      }));

  return {
    _id: question._id,
    examId: question.examId,
    questionOrder: question.questionOrder,
    text: question.text,
    type: question.type === 'essay' || question.type === 'short_answer' ? 'descriptive' : question.type,
    options,
    marks: question.marks,
    isRequired: question.isRequired,
    answerLengthHint: question.answerLengthHint || ''
  };
}

export async function ensureExamRelations(subjectId: string, classId: string, teacherId: string) {
  const [subject, klass, teacher] = await Promise.all([
    Subject.findOne({ _id: subjectId, isDeleted: false }).lean<any>(),
    ClassModel.findOne({ _id: classId, isDeleted: false }).lean<any>(),
    User.findOne({ _id: teacherId, role: 'teacher', isDeleted: false }).lean<any>()
  ]);

  if (!subject) return 'Subject not found';
  if (!klass) return 'Class not found';
  if (!teacher) return 'Teacher not found';
  if (!subjectBelongsToClass(subject, klass)) return 'Selected subject does not belong to the selected class';
  return null;
}

export async function syncExamTeacherAssignment(subjectId: string, classId: string, teacherId: string) {
  await Promise.all([
    Subject.updateOne({ _id: subjectId }, { $set: { teacher: teacherId } }),
    ClassModel.updateOne({ _id: classId }, { $addToSet: { assignedTeachers: teacherId } }),
    User.updateOne({ _id: teacherId }, { $addToSet: { assignedClasses: classId, assignedSubjects: subjectId } })
  ]);
}

export async function resolveScopedStudentAssignment(userId: string) {
  const currentUser = await User.findById(userId).select('studentId classId subjectId').lean<any>();
  const linkedStudent = currentUser?.studentId
    ? await Student.findOne({ studentId: currentUser.studentId, isDeleted: false })
        .select('_id classId subjectId teacherId')
        .lean<any>()
    : null;

  return {
    studentDocId: linkedStudent?._id ?? null,
    classId: linkedStudent?.classId ?? currentUser?.classId ?? null,
    subjectId: linkedStudent?.subjectId ?? currentUser?.subjectId ?? null,
    teacherId: linkedStudent?.teacherId ?? null
  };
}

export async function countAssignedStudents(classId: string, subjectId?: string) {
  const filter: any = { isDeleted: false, classId };
  if (subjectId) filter.subjectId = subjectId;
  return Student.countDocuments(filter);
}

export async function refreshExamAggregates(examId: string) {
  const objectId = new mongoose.Types.ObjectId(examId);
  const [questionCount, marksAgg, submissionCount] = await Promise.all([
    Question.countDocuments({ examId, isDeleted: false, isActive: { $ne: false } }),
    Question.aggregate([
      { $match: { examId: objectId, isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$marks' } } }
    ]),
    ExamSubmission.countDocuments({
      examId,
      isDeleted: false,
      status: { $in: ['submitted', 'graded', 'released'] }
    })
  ]);

  const exam = await Exam.findById(examId).select('class subject').lean<any>();
  const assignedStudentCount = exam
    ? await countAssignedStudents(String(exam.class), String(exam.subject))
    : 0;

  await Exam.findByIdAndUpdate(examId, {
    $set: {
      questionCount,
      submissionCount,
      assignedStudentCount
    }
  });

  return {
    questionCount,
    questionMarksTotal: Number(marksAgg[0]?.total || 0),
    submissionCount,
    assignedStudentCount
  };
}

export async function auditExam(examId: string, actorId: string | null | undefined, action: string, metadata: Record<string, unknown> = {}) {
  await ExamAuditLog.create({
    examId,
    actorId: actorId || null,
    action,
    metadata
  });
}

export function canTransitionStatus(from: string, to: string) {
  if (from === to) return true;
  return (EXAM_STATUS_TRANSITIONS[from] || []).includes(to);
}

export function normalizeCategory(input: any) {
  const value = String(input || '').trim();
  if (['weekly', 'monthly', 'book'].includes(value)) return value;
  if (['midterm', 'final', 'quiz'].includes(value)) return value;
  return 'weekly';
}

export function normalizeDeliveryMethod(input: any) {
  return String(input) === 'in_person' ? 'in_person' : 'online';
}

export function normalizeQuestionType(input: any) {
  const value = String(input || '').trim();
  if (value === 'true_false' || value === 'mcq') return value;
  if (value === 'descriptive' || value === 'essay' || value === 'short_answer') return 'descriptive';
  return 'mcq';
}

export function validateQuestionPayload(body: any) {
  const type = normalizeQuestionType(body.type);
  const text = String(body.text || '').trim();
  const marks = Number(body.marks ?? 1);
  if (!text) return 'Question text is required';
  if (!(marks >= 0)) return 'Marks must be zero or greater';

  if (type === 'mcq') {
    const options = Array.isArray(body.options) ? body.options : [];
    if (options.length !== 4) return 'Multiple-choice questions require exactly four options';
    const texts = options.map((o: any) => String(o?.text ?? o ?? '').trim());
    if (texts.some((t: string) => !t)) return 'All four multiple-choice options are required';
    const correctCount = options.filter((o: any) => o?.isCorrect || String(o?.key) === String(body.correctAnswer)).length
      || (body.correctAnswer ? 1 : 0);
    if (!body.correctAnswer && !options.some((o: any) => o?.isCorrect)) {
      return 'Exactly one correct option is required';
    }
    if (correctCount > 1) return 'Exactly one correct option is required';
  }

  if (type === 'true_false') {
    const answer = body.correctAnswer ?? body.booleanCorrect;
    if (answer !== true && answer !== false && answer !== 'true' && answer !== 'false') {
      return 'True/false questions require a correct answer';
    }
  }

  return null;
}

export function buildQuestionOptions(type: string, body: any) {
  if (type === 'mcq') {
    const raw = Array.isArray(body.options) ? body.options : [];
    const keys = ['A', 'B', 'C', 'D'];
    return keys.map((key, index) => {
      const item = raw[index];
      const text = typeof item === 'string' ? item : String(item?.text ?? '');
      const isCorrect =
        Boolean(item?.isCorrect)
        || String(body.correctAnswer).toUpperCase() === key
        || String(body.correctAnswer) === String(item?._id || '');
      return { key, text: text.trim(), isCorrect };
    });
  }

  if (type === 'true_false') {
    const answer = body.correctAnswer ?? body.booleanCorrect;
    const isTrue = answer === true || answer === 'true';
    return [
      { key: 'true', text: 'True', isCorrect: isTrue },
      { key: 'false', text: 'False', isCorrect: !isTrue }
    ];
  }

  return [];
}

export function autoGradeAnswer(question: any, answer: any) {
  const type = normalizeQuestionType(question.type);
  if (type === 'descriptive') {
    return { autoAwardedMarks: 0, isAutoGraded: false };
  }

  if (type === 'true_false') {
    const correct = question.options?.find((o: any) => o.isCorrect)?.key
      ?? (question.correctAnswer === true || question.correctAnswer === 'true' ? 'true' : 'false');
    const given =
      answer.selectedOptionKey
      || (answer.booleanAnswer === true ? 'true' : answer.booleanAnswer === false ? 'false' : '');
    const ok = String(correct) === String(given);
    return { autoAwardedMarks: ok ? Number(question.marks || 0) : 0, isAutoGraded: true };
  }

  if (type === 'mcq') {
    const correct = question.options?.find((o: any) => o.isCorrect)?.key
      ?? String(question.correctAnswer || '').toUpperCase();
    const given = String(answer.selectedOptionKey || '').toUpperCase();
    const ok = correct && given && correct === given;
    return { autoAwardedMarks: ok ? Number(question.marks || 0) : 0, isAutoGraded: true };
  }

  return { autoAwardedMarks: 0, isAutoGraded: false };
}

export function computeSubmissionTotals(exam: any, answers: any[]) {
  const auto = answers.reduce((sum, a) => sum + Number(a.autoAwardedMarks || 0), 0);
  const manual = answers.reduce((sum, a) => sum + Number(a.manualAwardedMarks ?? 0), 0);
  const total = auto + manual;
  const max = Number(exam.totalMarks || 0) || 1;
  const percentage = Number(((total / max) * 100).toFixed(2));
  const passed = total >= Number(exam.passingMarks || 0);
  return { autoGradedMarks: auto, manuallyGradedMarks: manual, totalObtainedMarks: total, percentage, passed };
}

export function examIsCurrentlyAccessible(exam: any, now = new Date()) {
  const status = String(exam.status || '');
  if (!['published', 'active', 'scheduled'].includes(status) && !exam.isPublished) return false;
  if (['cancelled', 'archived', 'closed', 'draft'].includes(status)) return false;

  const availableFrom = exam.availableFrom ? new Date(exam.availableFrom) : null;
  const deadline = exam.submissionDeadline
    ? new Date(exam.submissionDeadline)
    : exam.date
      ? new Date(exam.date)
      : null;

  if (availableFrom && now < availableFrom) return false;
  if (deadline) {
    const graceMs = Number(exam.gracePeriodMinutes || 0) * 60_000;
    if (now.getTime() > deadline.getTime() + graceMs && exam.lateSubmissionPolicy === 'deny') {
      return false;
    }
  }
  return true;
}

export async function notifyExamEvent(exam: any, event: string, extraRecipientIds: string[] = []) {
  try {
    const students = await Student.find({
      isDeleted: false,
      classId: exam.class?._id ?? exam.class,
      subjectId: exam.subject?._id ?? exam.subject
    }).select('studentId').lean<any[]>();

    const codes = students.map((s) => s.studentId).filter(Boolean);
    const studentUsers = codes.length
      ? await User.find({ role: 'student', studentId: { $in: codes }, isDeleted: false }).select('_id').lean<any[]>()
      : [];

    const recipientIds = [
      ...studentUsers.map((u) => String(u._id)),
      String(exam.teacherId?._id ?? exam.teacherId ?? ''),
      ...extraRecipientIds
    ].filter(Boolean);

    if (!recipientIds.length) return;

    const titles: Record<string, string> = {
      published: 'Examination published',
      scheduled: 'Examination scheduled',
      cancelled: 'Examination cancelled',
      result_released: 'Examination result released',
      deadline: 'Examination deadline approaching'
    };

    await new NotificationDispatchService().send({
      title: titles[event] || 'Examination update',
      message: `${exam.title} — ${event}`,
      recipientIds,
      channel: 'in_app',
      branchId: exam.branchId ?? null
    });
  } catch {
    // Non-blocking
  }
}

export async function upsertResultFromSubmission(exam: any, submission: any, gradedBy: string | null) {
  const studentUserId = submission.studentUserId;
  const existing = await Result.findOne({
    exam: exam._id,
    student: studentUserId,
    isDeleted: false
  });

  const totalMarks = Number(exam.totalMarks || 100) || 100;
  const score = Number(submission.totalObtainedMarks || 0);
  const ratio = score / totalMarks;
  const letter =
    ratio >= 0.9 ? 'A' : ratio >= 0.8 ? 'B' : ratio >= 0.7 ? 'C' : ratio >= 0.6 ? 'D' : 'F';

  const payload = {
    student: studentUserId,
    exam: exam._id,
    classId: exam.class,
    subjectId: exam.subject,
    teacherId: exam.teacherId,
    score,
    grade: letter,
    remarks: `Exam submission ${submission.submissionReference || submission._id}`,
    gradedBy: gradedBy || submission.gradedBy || null,
    publishedAt: submission.resultReleasedAt || null
  };

  if (existing) {
    await Result.findByIdAndUpdate(existing._id, { $set: payload });
    return existing._id;
  }

  const created = await Result.create(payload);
  return created._id;
}

export function makeSubmissionReference() {
  return `SUB-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

export async function createGoogleFormViaScript(payload: {
  title: string;
  description?: string;
  className?: string;
  subjectName?: string;
}) {
  const scriptUrl = String(process.env.GOOGLE_FORMS_SCRIPT_URL || '').trim();
  const secret = String(process.env.GOOGLE_FORMS_SCRIPT_SECRET || '').trim();
  if (!scriptUrl) {
    return { ok: false as const, error: 'Google Forms automation is not configured' };
  }

  const response = await fetch(scriptUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'X-Nokta-Secret': secret } : {})
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    return { ok: false as const, error: text || `Google Forms script failed (${response.status})` };
  }

  const data = await response.json().catch(() => ({}));
  if (!data?.respondentUrl && !data?.url) {
    return { ok: false as const, error: 'Google Forms script returned an incomplete response' };
  }

  return {
    ok: true as const,
    googleFormId: String(data.formId || data.googleFormId || ''),
    respondentUrl: String(data.respondentUrl || data.url || ''),
    editUrl: String(data.editUrl || ''),
    responseSheetId: String(data.responseSheetId || '')
  };
}
