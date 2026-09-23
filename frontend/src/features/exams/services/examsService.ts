import { api } from '@/services/apiClient';

export type ExamCategory = 'weekly' | 'monthly' | 'book' | 'midterm' | 'final' | 'quiz';
export type ExamDeliveryMethod = 'online' | 'in_person';
export type ExamStatus =
  | 'draft'
  | 'scheduled'
  | 'published'
  | 'active'
  | 'completed'
  | 'closed'
  | 'cancelled'
  | 'archived';
export type QuestionType = 'mcq' | 'true_false' | 'descriptive';
export type SubmissionStatus = 'draft' | 'in_progress' | 'submitted' | 'graded' | 'released' | 'reopened';
export type PrintMode = 'student' | 'answer_key' | 'with_space';

export interface ExamOptionEntity {
  _id: string;
  name?: string;
  className?: string;
  title?: string;
  code?: string;
  classId?: string;
  subjectId?: string;
}

export interface ExamMetaOptions {
  classes: ExamOptionEntity[];
  subjects: ExamOptionEntity[];
  teachers: ExamOptionEntity[];
  categories?: { value: string; label: string }[];
  deliveryMethods?: { value: string; label: string }[];
  statuses?: { value: string; label: string }[];
  googleFormsConfigured?: boolean;
}

export interface ExamQuestionOption {
  key?: string;
  text: string;
  isCorrect?: boolean;
  _id?: string;
}

export interface ExamQuestion {
  _id: string;
  examId?: string;
  questionOrder?: number;
  text: string;
  type: QuestionType | string;
  options?: ExamQuestionOption[];
  correctAnswer?: string | boolean | null;
  expectedAnswer?: string;
  answerLengthHint?: string;
  explanation?: string;
  marks: number;
  isRequired?: boolean;
  isActive?: boolean;
  difficulty?: string;
  topic?: string;
}

export interface ExamQuestionPayload {
  text: string;
  type: QuestionType;
  marks?: number;
  options?: ExamQuestionOption[] | string[];
  correctAnswer?: string | boolean | null;
  expectedAnswer?: string;
  answerLengthHint?: string;
  explanation?: string;
  isRequired?: boolean;
  difficulty?: string;
  topic?: string;
  questionOrder?: number;
}

export interface ExamRecord {
  _id: string;
  title: string;
  description?: string;
  instructions?: string;
  subject?: string | ExamOptionEntity;
  class?: string | ExamOptionEntity;
  teacherId?: string | ExamOptionEntity;
  subjectName?: string;
  className?: string;
  teacherName?: string;
  academicYear?: string;
  term?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  availableFrom?: string | null;
  submissionDeadline?: string | null;
  resultReleaseAt?: string | null;
  room?: string;
  totalMarks?: number;
  passingMarks?: number;
  category?: ExamCategory | string;
  deliveryMethod?: ExamDeliveryMethod | string;
  bookName?: string;
  chapterRange?: string;
  referenceCode?: string;
  examCode?: string;
  onlineExamUrl?: string;
  googleFormUrl?: string;
  googleFormEditUrl?: string;
  googleFormId?: string;
  googleSyncStatus?: string;
  status?: ExamStatus | string;
  isPublished?: boolean;
  publishedAt?: string | null;
  allowDraft?: boolean;
  allowResume?: boolean;
  allowEarlySubmit?: boolean;
  allowAnswerChange?: boolean;
  showResultImmediately?: boolean;
  showCorrectAnswers?: boolean;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  maximumAttempts?: number;
  lateSubmissionPolicy?: string;
  gracePeriodMinutes?: number;
  questionCount?: number;
  assignedStudentCount?: number;
  submissionCount?: number;
  accessibility?: {
    canStart?: boolean;
    canOpenGoogleForm?: boolean;
    isUpcoming?: boolean;
    isActive?: boolean;
    isCompleted?: boolean;
    isMissed?: boolean;
    bucket?: 'upcoming' | 'active' | 'completed' | 'missed' | string;
  };
  mySubmission?: ExamSubmission | null;
  questions?: ExamQuestion[];
}

export interface ExamPayload {
  title: string;
  subject: string;
  class: string;
  teacherId?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  totalMarks?: number;
  passingMarks?: number;
  category?: ExamCategory | string;
  deliveryMethod?: ExamDeliveryMethod | string;
  description?: string;
  instructions?: string;
  academicYear?: string;
  term?: string;
  bookName?: string;
  chapterRange?: string;
  referenceCode?: string;
  availableFrom?: string | null;
  submissionDeadline?: string | null;
  resultReleaseAt?: string | null;
  room?: string;
  allowDraft?: boolean;
  allowResume?: boolean;
  allowEarlySubmit?: boolean;
  allowAnswerChange?: boolean;
  showResultImmediately?: boolean;
  showCorrectAnswers?: boolean;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  maximumAttempts?: number;
  lateSubmissionPolicy?: string;
  gracePeriodMinutes?: number;
  googleFormUrl?: string;
  googleFormEditUrl?: string;
  onlineExamUrl?: string;
  status?: ExamStatus | string;
  examType?: string;
}

export interface ExamAnswerPayload {
  questionId: string;
  selectedOptionKey?: string;
  booleanAnswer?: boolean | null;
  descriptiveAnswer?: string;
  manualAwardedMarks?: number | null;
  teacherFeedback?: string;
}

export interface ExamSubmission {
  _id: string;
  examId?: string;
  studentUserId?: string | ExamOptionEntity;
  studentName?: string;
  attemptNumber?: number;
  status?: SubmissionStatus | string;
  startedAt?: string;
  lastSavedAt?: string;
  submittedAt?: string | null;
  openedGoogleFormAt?: string | null;
  answers?: Array<ExamAnswerPayload & {
    autoAwardedMarks?: number;
    isGraded?: boolean;
    gradedAt?: string | null;
  }>;
  autoGradedMarks?: number;
  manuallyGradedMarks?: number;
  totalObtainedMarks?: number;
  percentage?: number;
  passed?: boolean;
  gradingStatus?: string;
  gradedBy?: string | null;
  gradedAt?: string | null;
  resultReleasedAt?: string | null;
  submissionReference?: string;
}

export interface StudentExamView {
  exam: ExamRecord;
  questions: ExamQuestion[];
  submission?: ExamSubmission | null;
  canStart?: boolean;
  canSubmit?: boolean;
  canSaveDraft?: boolean;
  resultVisible?: boolean;
}

export interface ExamPrintData {
  mode: PrintMode;
  exam: ExamRecord;
  questions: ExamQuestion[];
  className?: string;
  subjectName?: string;
  teacherName?: string;
  generatedAt?: string;
}

export interface ExamListResult {
  items: ExamRecord[];
  page: number;
  limit: number;
  total: number;
}

function unwrapData<T = unknown>(payload: unknown): T {
  const root = payload as { data?: { data?: T } | T };
  if (root?.data && typeof root.data === 'object' && root.data !== null && 'data' in (root.data as object)) {
    return (root.data as { data: T }).data;
  }
  return (root?.data ?? payload) as T;
}

function normalizeList(payload: unknown): ExamListResult {
  const data = unwrapData<ExamRecord[] | { items?: ExamRecord[]; docs?: ExamRecord[]; results?: ExamRecord[]; total?: number }>(payload);
  const meta = (payload as { data?: { meta?: { page?: number; limit?: number; total?: number }; page?: number; limit?: number; total?: number } })?.data;
  const items = Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.docs)
        ? data.docs
        : Array.isArray(data?.results)
          ? data.results
          : [];
  return {
    items,
    page: Number(meta?.meta?.page ?? meta?.page ?? 1),
    limit: Number(meta?.meta?.limit ?? meta?.limit ?? (items.length || 20)),
    total: Number(meta?.meta?.total ?? meta?.total ?? (data as { total?: number })?.total ?? items.length)
  };
}

function withCacheBust(params: Record<string, string | number | undefined | null> = {}) {
  const cleaned: Record<string, string> = { _t: String(Date.now()) };
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    cleaned[key] = String(value);
  });
  return cleaned;
}

export const examsService = {
  list: (params: Record<string, string | number | undefined | null> = {}) =>
    api.get('/exams', { params: withCacheBust({ limit: 50, ...params }) }).then((res) => normalizeList(res)),

  get: (id: string) =>
    api.get(`/exams/${id}`).then((res) => unwrapData<ExamRecord>(res)),

  create: (payload: ExamPayload) =>
    api.post('/exams', payload).then((res) => unwrapData<ExamRecord>(res)),

  update: (id: string, payload: Partial<ExamPayload>) =>
    api.put(`/exams/${id}`, payload).then((res) => unwrapData<ExamRecord>(res)),

  publish: (id: string) =>
    api.post(`/exams/${id}/publish`).then((res) => unwrapData<ExamRecord>(res)),

  unpublish: (id: string) =>
    api.post(`/exams/${id}/unpublish`).then((res) => unwrapData<ExamRecord>(res)),

  cancel: (id: string) =>
    api.post(`/exams/${id}/cancel`).then((res) => unwrapData<ExamRecord>(res)),

  archive: (id: string) =>
    api.post(`/exams/${id}/archive`).then((res) => unwrapData<ExamRecord>(res)),

  duplicate: (id: string) =>
    api.post(`/exams/${id}/duplicate`).then((res) => unwrapData<ExamRecord>(res)),

  remove: (id: string) =>
    api.delete(`/exams/${id}`).then((res) => unwrapData(res)),

  metaOptions: (params: Record<string, string | undefined> = {}) =>
    api.get('/exams/meta/options', { params: withCacheBust(params) }).then((res) => unwrapData<ExamMetaOptions>(res)),

  listQuestions: (examId: string) =>
    api.get(`/exams/${examId}/questions`).then((res) => {
      const data = unwrapData<ExamQuestion[] | { items?: ExamQuestion[] }>(res);
      return Array.isArray(data) ? data : (data?.items ?? []);
    }),

  createQuestion: (examId: string, payload: ExamQuestionPayload) =>
    api.post(`/exams/${examId}/questions`, payload).then((res) => unwrapData<ExamQuestion>(res)),

  generateAiQuestions: (payload: {
    title?: string;
    subjectName?: string;
    className?: string;
    category?: string;
    bookName?: string;
    chapterRange?: string;
    description?: string;
    instructions?: string;
    topic: string;
    language?: 'en' | 'fa' | 'ps' | 'mixed';
    difficulty?: 'easy' | 'medium' | 'hard';
    totalMarks?: number;
    mcqCount?: number;
    trueFalseCount?: number;
    descriptiveCount?: number;
    examId?: string;
    autoSave?: boolean;
  }) =>
    api
      .post('/exams/ai/generate-questions', payload, { timeout: 90000 })
      .then((res) =>
        unwrapData<{
          questions: ExamQuestionPayload[];
          savedQuestions?: ExamQuestion[];
          generatedBy: 'ai_provider' | 'local_fallback';
          aiConfigured: boolean;
        }>(res)
      ),

  updateQuestion: (examId: string, questionId: string, payload: Partial<ExamQuestionPayload>) =>
    api.put(`/exams/${examId}/questions/${questionId}`, payload).then((res) => unwrapData<ExamQuestion>(res)),

  deleteQuestion: (examId: string, questionId: string) =>
    api.delete(`/exams/${examId}/questions/${questionId}`).then((res) => unwrapData(res)),

  reorderQuestions: (examId: string, order: string[]) =>
    api.post(`/exams/${examId}/questions/reorder`, { order }).then((res) => unwrapData(res)),

  attachGoogleForm: (examId: string, payload: { respondentUrl: string; editUrl?: string }) =>
    api.post(`/exams/${examId}/google-form/attach`, payload).then((res) => unwrapData<ExamRecord>(res)),

  createGoogleForm: (examId: string) =>
    api.post(`/exams/${examId}/google-form/create`).then((res) => unwrapData<ExamRecord>(res)),

  myExams: (params: Record<string, string | undefined> = {}) =>
    api.get('/exams/my', { params: withCacheBust(params) }).then((res) => {
      const data = unwrapData<ExamRecord[] | { items?: ExamRecord[] }>(res);
      return Array.isArray(data) ? data : (data?.items ?? []);
    }),

  studentView: (examId: string) =>
    api.get(`/exams/${examId}/student-view`).then((res) => unwrapData<StudentExamView>(res)),

  start: (examId: string) =>
    api.post(`/exams/${examId}/start`).then((res) => unwrapData<ExamSubmission | StudentExamView>(res)),

  openGoogleForm: (examId: string) =>
    api.post(`/exams/${examId}/open-google-form`).then((res) => unwrapData<ExamRecord | ExamSubmission>(res)),

  saveDraft: (examId: string, answers: ExamAnswerPayload[]) =>
    api.put(`/exams/${examId}/draft`, { answers }).then((res) => unwrapData<ExamSubmission>(res)),

  submit: (examId: string, answers?: ExamAnswerPayload[]) =>
    api.post(`/exams/${examId}/submit`, answers ? { answers } : {}).then((res) => unwrapData<ExamSubmission>(res)),

  listSubmissions: (examId: string) =>
    api.get(`/exams/${examId}/submissions`).then((res) => {
      const data = unwrapData<ExamSubmission[] | { items?: ExamSubmission[] }>(res);
      return Array.isArray(data) ? data : (data?.items ?? []);
    }),

  gradeSubmission: (
    submissionId: string,
    payload: { answers: Array<{ questionId: string; manualAwardedMarks?: number | null; teacherFeedback?: string }> }
  ) =>
    api.post(`/exams/submissions/${submissionId}/grade`, payload).then((res) => unwrapData<ExamSubmission>(res)),

  releaseSubmission: (submissionId: string) =>
    api.post(`/exams/submissions/${submissionId}/release`).then((res) => unwrapData<ExamSubmission>(res)),

  reopenSubmission: (submissionId: string) =>
    api.post(`/exams/submissions/${submissionId}/reopen`).then((res) => unwrapData<ExamSubmission>(res)),

  printData: (examId: string, mode: PrintMode = 'student') =>
    api.get(`/exams/${examId}/print-data`, { params: { mode } }).then((res) => unwrapData<ExamPrintData>(res))
};
