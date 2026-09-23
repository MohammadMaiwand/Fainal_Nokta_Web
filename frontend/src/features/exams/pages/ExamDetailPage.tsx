import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PrintButton, PrintableSection } from '@/shared/print';
import { useAuthStore } from '@/store/authStore';
import { normalizeRole } from '@/features/resources/config/modules';
import { ExamPrintSheet } from '../components/ExamPrintSheet';
import { ExamQuestionsEditor } from '../components/ExamQuestionsEditor';
import {
  examsService,
  type ExamCategory,
  type ExamQuestion,
  type ExamSubmission,
  type PrintMode
} from '../services/examsService';

const WRITE_ROLES = new Set(['super_admin', 'admin', 'branch_manager', 'teacher']);

type EditFormState = {
  title: string;
  category: ExamCategory | string;
  description: string;
  instructions: string;
  academicYear: string;
  bookName: string;
  chapterRange: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  room: string;
  googleFormUrl: string;
  allowDraft: boolean;
  allowResume: boolean;
  maximumAttempts: number;
  showResultImmediately: boolean;
};

function buildEditForm(exam: any): EditFormState {
  return {
    title: exam.title || '',
    category: exam.category || 'weekly',
    description: exam.description || '',
    instructions: exam.instructions || '',
    academicYear: exam.academicYear || '',
    bookName: exam.bookName || '',
    chapterRange: exam.chapterRange || '',
    date: exam.date ? String(exam.date).slice(0, 10) : '',
    startTime: exam.startTime || '',
    endTime: exam.endTime || '',
    durationMinutes: Number(exam.durationMinutes) || 0,
    totalMarks: Number(exam.totalMarks) || 100,
    passingMarks: Number(exam.passingMarks) || 40,
    room: exam.room || '',
    googleFormUrl: exam.googleFormUrl || exam.onlineExamUrl || '',
    allowDraft: exam.allowDraft !== false,
    allowResume: exam.allowResume !== false,
    maximumAttempts: Number(exam.maximumAttempts) || 1,
    showResultImmediately: Boolean(exam.showResultImmediately)
  };
}

export function ExamDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const role = normalizeRole(user?.role);
  const canManage = WRITE_ROLES.has(String(role));
  const { examId = '' } = useParams<{ examId: string }>();
  const [printMode, setPrintMode] = useState<PrintMode>('student');
  const [actionError, setActionError] = useState('');
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeDraft, setGradeDraft] = useState<Record<string, { marks: string; feedback: string }>>({});
  const [editingExam, setEditingExam] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);

  const examQuery = useQuery({
    queryKey: ['exam-detail', examId],
    queryFn: () => examsService.get(examId),
    enabled: Boolean(examId)
  });

  const questionsQuery = useQuery({
    queryKey: ['exam-questions', examId],
    queryFn: () => examsService.listQuestions(examId),
    enabled: Boolean(examId)
  });

  const submissionsQuery = useQuery({
    queryKey: ['exam-submissions', examId],
    queryFn: () => examsService.listSubmissions(examId),
    enabled: Boolean(examId)
  });

  const printQuery = useQuery({
    queryKey: ['exam-print', examId, printMode],
    queryFn: () => examsService.printData(examId, printMode),
    enabled: Boolean(examId)
  });

  const exam = examQuery.data;
  const questions = questionsQuery.data ?? [];
  const submissions = submissionsQuery.data ?? [];
  const printData = printQuery.data;
  const locked = ['archived', 'cancelled'].includes(String(exam?.status || ''));
  const canEditContent = canManage && !locked;

  const printExam = useMemo(() => {
    if (!exam) return null;
    const meta = (printData as any)?.meta || (printData as any)?.exam || {};
    return {
      ...exam,
      className: meta.className || exam.className,
      subjectName: meta.subjectName || exam.subjectName,
      teacherName: meta.teacherName || exam.teacherName,
      title: meta.title || exam.title,
      category: meta.category || exam.category,
      bookName: meta.bookName || exam.bookName,
      chapterRange: meta.chapterRange || exam.chapterRange,
      room: meta.room || exam.room,
      durationMinutes: meta.durationMinutes ?? exam.durationMinutes,
      totalMarks: meta.totalMarks ?? exam.totalMarks,
      passingMarks: meta.passingMarks ?? exam.passingMarks,
      instructions: meta.instructions || exam.instructions,
      date: meta.date || exam.date
    };
  }, [exam, printData]);

  const printQuestions = useMemo((): ExamQuestion[] => {
    const fromPrint = (printData as any)?.questions;
    if (Array.isArray(fromPrint) && fromPrint.length > 0) {
      return fromPrint.map((q: any, index: number) => ({
        _id: String(q.questionId || q._id || index),
        text: q.text,
        type: q.type,
        marks: q.marks,
        options: q.options,
        correctAnswer: q.correctAnswer,
        expectedAnswer: q.expectedAnswer,
        questionOrder: q.number || index + 1
      }));
    }
    return questions;
  }, [printData, questions]);

  const printedBy = String(user?.name || user?.email || '');

  useEffect(() => {
    if (exam && editingExam) {
      setEditForm(buildEditForm(exam));
    }
  }, [exam, editingExam]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['exam-detail', examId] });
    void queryClient.invalidateQueries({ queryKey: ['exam-questions', examId] });
    void queryClient.invalidateQueries({ queryKey: ['exam-submissions', examId] });
    void queryClient.invalidateQueries({ queryKey: ['exam-print', examId] });
    void queryClient.invalidateQueries({ queryKey: ['exams-manage'] });
  };

  const runAction = useMutation({
    mutationFn: async (action: 'publish' | 'unpublish' | 'cancel' | 'archive' | 'duplicate') => {
      if (action === 'publish') return examsService.publish(examId);
      if (action === 'unpublish') return examsService.unpublish(examId);
      if (action === 'cancel') return examsService.cancel(examId);
      if (action === 'archive') return examsService.archive(examId);
      return examsService.duplicate(examId);
    },
    onSuccess: (result, action) => {
      setActionError('');
      invalidate();
      if (action === 'duplicate' && result?._id) {
        navigate(`/exams/${result._id}`);
      }
    },
    onError: (err: any) => {
      setActionError(err?.response?.data?.message || err?.message || t('exams.send_failed'));
    }
  });

  const saveExamMutation = useMutation({
    mutationFn: async () => {
      if (!editForm) return null;
      if (!editForm.title.trim()) throw new Error(t('exams.validation_title'));
      if (Number(editForm.passingMarks) > Number(editForm.totalMarks)) {
        throw new Error(t('exams.validation_marks'));
      }
      if (editForm.category === 'book' && !editForm.bookName.trim()) {
        throw new Error(t('exams.validation_book'));
      }

      const updated = await examsService.update(examId, {
        title: editForm.title.trim(),
        category: editForm.category as ExamCategory,
        description: editForm.description,
        instructions: editForm.instructions,
        academicYear: editForm.academicYear,
        bookName: editForm.bookName,
        chapterRange: editForm.chapterRange,
        date: editForm.date,
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        durationMinutes: Number(editForm.durationMinutes) || 0,
        totalMarks: Number(editForm.totalMarks) || 100,
        passingMarks: Number(editForm.passingMarks) || 40,
        room: editForm.room,
        allowDraft: editForm.allowDraft,
        allowResume: editForm.allowResume,
        maximumAttempts: Number(editForm.maximumAttempts) || 1,
        showResultImmediately: editForm.showResultImmediately,
        googleFormUrl: editForm.googleFormUrl,
        onlineExamUrl: editForm.googleFormUrl
      });

      if (exam?.deliveryMethod === 'online' && editForm.googleFormUrl.trim()) {
        await examsService.attachGoogleForm(examId, { respondentUrl: editForm.googleFormUrl.trim() });
      }

      return updated;
    },
    onSuccess: () => {
      setActionError('');
      setEditingExam(false);
      invalidate();
    },
    onError: (err: any) => {
      setActionError(err?.response?.data?.message || err?.message || t('exams.send_failed'));
    }
  });

  const deleteExamMutation = useMutation({
    mutationFn: () => examsService.remove(examId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['exams-manage'] });
      navigate('/exams');
    },
    onError: (err: any) => {
      setActionError(err?.response?.data?.message || err?.message || t('exams.send_failed'));
    }
  });

  const gradeMutation = useMutation({
    mutationFn: async () => {
      if (!gradingId) return null;
      const answers = Object.entries(gradeDraft).map(([questionId, value]) => ({
        questionId,
        manualAwardedMarks: value.marks === '' ? null : Number(value.marks),
        teacherFeedback: value.feedback
      }));
      return examsService.gradeSubmission(gradingId, { answers });
    },
    onSuccess: () => {
      setGradingId(null);
      setGradeDraft({});
      void submissionsQuery.refetch();
    },
    onError: (err: any) => setActionError(err?.response?.data?.message || t('exams.send_failed'))
  });

  const releaseMutation = useMutation({
    mutationFn: (submissionId: string) => examsService.releaseSubmission(submissionId),
    onSuccess: () => void submissionsQuery.refetch(),
    onError: (err: any) => setActionError(err?.response?.data?.message || t('exams.send_failed'))
  });

  const openGrade = (submission: ExamSubmission) => {
    const draft: Record<string, { marks: string; feedback: string }> = {};
    for (const q of questions) {
      const existing = (submission.answers || []).find((a) => String(a.questionId) === String(q._id));
      draft[q._id] = {
        marks: existing?.manualAwardedMarks != null ? String(existing.manualAwardedMarks) : '',
        feedback: existing?.teacherFeedback || ''
      };
    }
    setGradeDraft(draft);
    setGradingId(submission._id);
  };

  const statusLabel = useMemo(() => t(`exams.status_${exam?.status || 'draft'}`), [exam?.status, t]);

  if (examQuery.isLoading) {
    return <p className="p-4 text-sm text-slate-500">{t('exams.loading')}</p>;
  }

  if (!exam) {
    return (
      <div className="space-y-4 p-4">
        <Button variant="ghost" onClick={() => navigate('/exams')}>
          {t('exams.back_to_list')}
        </Button>
        <p className="text-sm text-slate-500">{t('exams.no_exams')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 px-1 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => navigate('/exams')}>
          ← {t('exams.back_to_list')}
        </Button>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-white/10 dark:text-slate-200">
          {statusLabel}
        </span>
      </div>

      <Card className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-2xl font-semibold text-slate-900 dark:text-white">{exam.title}</h1>
            <p className="mt-1 break-words text-sm text-slate-500">
              {t(`exams.category_${exam.category || 'weekly'}`)} ·{' '}
              {t(`exams.delivery_${exam.deliveryMethod === 'in_person' ? 'in_person' : 'online'}`)} · {exam.className} ·{' '}
              {exam.subjectName}
            </p>
          </div>
          {canEditContent && (
            <Button
              variant="ghost"
              onClick={() => {
                setEditForm(buildEditForm(exam));
                setEditingExam((v) => !v);
              }}
            >
              {editingExam ? t('exams.close') : t('exams.edit_exam')}
            </Button>
          )}
        </div>

        {!editingExam && (
          <>
            {(exam.description || exam.instructions) && (
              <p className="whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-300">
                {exam.instructions || exam.description}
              </p>
            )}
            <div className="grid gap-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
              <p>
                {t('exams.total_marks')}: {exam.totalMarks}
              </p>
              <p>
                {t('exams.passing_marks')}: {exam.passingMarks}
              </p>
              <p>
                {t('exams.date')}: {exam.date ? String(exam.date).slice(0, 10) : '—'}
              </p>
              <p>
                {t('exams.duration')}: {exam.durationMinutes || '—'}
              </p>
              {exam.teacherName && (
                <p>
                  {t('exams.teacher')}: {exam.teacherName}
                </p>
              )}
            </div>
          </>
        )}

        {editingExam && editForm && (
          <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-white/10">
            <Input
              value={editForm.title}
              onChange={(e) => setEditForm((p) => (p ? { ...p, title: e.target.value } : p))}
              placeholder={t('exams.title')}
            />
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60"
              value={editForm.category}
              onChange={(e) => setEditForm((p) => (p ? { ...p, category: e.target.value } : p))}
            >
              <option value="weekly">{t('exams.category_weekly')}</option>
              <option value="monthly">{t('exams.category_monthly')}</option>
              <option value="book">{t('exams.category_book')}</option>
            </select>
            {editForm.category === 'book' && (
              <>
                <Input
                  value={editForm.bookName}
                  onChange={(e) => setEditForm((p) => (p ? { ...p, bookName: e.target.value } : p))}
                  placeholder={t('exams.book_name')}
                />
                <Input
                  value={editForm.chapterRange}
                  onChange={(e) => setEditForm((p) => (p ? { ...p, chapterRange: e.target.value } : p))}
                  placeholder={t('exams.chapter_range')}
                />
              </>
            )}
            <textarea
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60"
              rows={2}
              value={editForm.description}
              onChange={(e) => setEditForm((p) => (p ? { ...p, description: e.target.value } : p))}
              placeholder={t('exams.description')}
            />
            <textarea
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60"
              rows={3}
              value={editForm.instructions}
              onChange={(e) => setEditForm((p) => (p ? { ...p, instructions: e.target.value } : p))}
              placeholder={t('exams.instructions')}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm((p) => (p ? { ...p, date: e.target.value } : p))}
              />
              <Input
                value={editForm.room}
                onChange={(e) => setEditForm((p) => (p ? { ...p, room: e.target.value } : p))}
                placeholder={t('exams.room')}
              />
              <Input
                value={editForm.startTime}
                onChange={(e) => setEditForm((p) => (p ? { ...p, startTime: e.target.value } : p))}
                placeholder={t('exams.start_time')}
              />
              <Input
                value={editForm.endTime}
                onChange={(e) => setEditForm((p) => (p ? { ...p, endTime: e.target.value } : p))}
                placeholder={t('exams.end_time')}
              />
              <Input
                type="number"
                value={editForm.durationMinutes}
                onChange={(e) => setEditForm((p) => (p ? { ...p, durationMinutes: Number(e.target.value) } : p))}
                placeholder={t('exams.duration')}
              />
              <Input
                value={editForm.academicYear}
                onChange={(e) => setEditForm((p) => (p ? { ...p, academicYear: e.target.value } : p))}
                placeholder={t('exams.academic_year')}
              />
              <Input
                type="number"
                value={editForm.totalMarks}
                onChange={(e) => setEditForm((p) => (p ? { ...p, totalMarks: Number(e.target.value) } : p))}
                placeholder={t('exams.total_marks')}
              />
              <Input
                type="number"
                value={editForm.passingMarks}
                onChange={(e) => setEditForm((p) => (p ? { ...p, passingMarks: Number(e.target.value) } : p))}
                placeholder={t('exams.passing_marks')}
              />
            </div>

            {exam.deliveryMethod === 'online' && (
              <Input
                value={editForm.googleFormUrl}
                onChange={(e) => setEditForm((p) => (p ? { ...p, googleFormUrl: e.target.value } : p))}
                placeholder={t('exams.google_form_url')}
              />
            )}

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editForm.allowDraft}
                  onChange={(e) => setEditForm((p) => (p ? { ...p, allowDraft: e.target.checked } : p))}
                />
                {t('exams.allow_draft')}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editForm.allowResume}
                  onChange={(e) => setEditForm((p) => (p ? { ...p, allowResume: e.target.checked } : p))}
                />
                {t('exams.allow_resume')}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editForm.showResultImmediately}
                  onChange={(e) => setEditForm((p) => (p ? { ...p, showResultImmediately: e.target.checked } : p))}
                />
                {t('exams.show_result_immediately')}
              </label>
              <Input
                type="number"
                value={editForm.maximumAttempts}
                onChange={(e) => setEditForm((p) => (p ? { ...p, maximumAttempts: Number(e.target.value) } : p))}
                placeholder={t('exams.max_attempts')}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button disabled={saveExamMutation.isPending} onClick={() => saveExamMutation.mutate()}>
                {t('exams.save_changes')}
              </Button>
              <Button variant="ghost" onClick={() => setEditingExam(false)}>
                {t('exams.close')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {canManage && (
        <Card className="flex flex-wrap gap-2 p-4">
          {['draft', 'scheduled', 'cancelled'].includes(String(exam.status)) && (
            <Button disabled={runAction.isPending} onClick={() => runAction.mutate('publish')}>
              {t('exams.publish')}
            </Button>
          )}
          {['published', 'active', 'scheduled'].includes(String(exam.status)) && (
            <Button variant="ghost" disabled={runAction.isPending} onClick={() => runAction.mutate('unpublish')}>
              {t('exams.unpublish')}
            </Button>
          )}
          <Button variant="ghost" disabled={runAction.isPending} onClick={() => runAction.mutate('duplicate')}>
            {t('exams.duplicate')}
          </Button>
          {!['cancelled', 'archived'].includes(String(exam.status)) && (
            <Button variant="ghost" disabled={runAction.isPending} onClick={() => runAction.mutate('cancel')}>
              {t('exams.cancel')}
            </Button>
          )}
          {exam.status !== 'archived' && (
            <Button variant="ghost" disabled={runAction.isPending} onClick={() => runAction.mutate('archive')}>
              {t('exams.archive')}
            </Button>
          )}
          <Button
            variant="danger"
            disabled={deleteExamMutation.isPending}
            onClick={() => {
              if (window.confirm(t('exams.delete_exam_confirm'))) {
                deleteExamMutation.mutate();
              }
            }}
          >
            {t('exams.delete')}
          </Button>
        </Card>
      )}

      {actionError && <p className="text-sm text-rose-600">{actionError}</p>}

      {exam.deliveryMethod === 'online' && (
        <Card className="space-y-2 p-4">
          <p className="text-sm font-semibold">{t('exams.delivery_online')}</p>
          {exam.googleFormUrl || exam.onlineExamUrl ? (
            <a
              className="break-all text-sm text-sky-600 underline"
              href={exam.googleFormUrl || exam.onlineExamUrl}
              target="_blank"
              rel="noreferrer"
            >
              {t('exams.open_form')}
            </a>
          ) : (
            <p className="text-sm text-slate-500">{t('exams.google_not_configured')}</p>
          )}
        </Card>
      )}

      {exam.deliveryMethod === 'in_person' && (
        <ExamQuestionsEditor examId={examId} questions={questions} disabled={!canEditContent} />
      )}

      {exam.deliveryMethod === 'in_person' && (
        <Card className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-slate-900 dark:text-white">{t('exams.print_preview')}</h2>
            <div className="flex flex-wrap gap-2">
              {(['student', 'answer_key', 'with_space'] as PrintMode[]).map((mode) => (
                <Button key={mode} variant={printMode === mode ? 'primary' : 'ghost'} onClick={() => setPrintMode(mode)}>
                  {mode === 'student' ? t('exams.student_paper') : mode === 'answer_key' ? t('exams.answer_key') : t('exams.with_space')}
                </Button>
              ))}
              <PrintButton targetId="exam-print-root" label={t('exams.print')} />
            </div>
          </div>

          <PrintableSection id="exam-print-root" className="exam-questions-section overflow-visible rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white">
            {printExam && (
              <ExamPrintSheet
                exam={printExam}
                questions={printQuestions}
                mode={printMode}
                printedBy={printedBy}
              />
            )}
          </PrintableSection>
        </Card>
      )}

      <Card className="space-y-3 p-4">
        <h2 className="font-semibold text-slate-900 dark:text-white">{t('exams.submissions')}</h2>
        {submissionsQuery.isLoading && <p className="text-sm text-slate-500">{t('exams.loading')}</p>}
        {!submissionsQuery.isLoading && submissions.length === 0 && (
          <p className="text-sm text-slate-500">{t('exams.no_exams')}</p>
        )}
        <div className="divide-y divide-slate-200 dark:divide-white/10">
          {submissions.map((submission) => (
            <div key={submission._id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900 dark:text-white">
                  {submission.studentName || String(submission.studentUserId)}
                </p>
                <p className="text-xs text-slate-500">
                  {t(`exams.submission_${String(submission.status || 'draft')}`)}
                  {submission.totalObtainedMarks != null
                    ? ` · ${submission.totalObtainedMarks}/${exam.totalMarks}`
                    : ''}
                </p>
              </div>
              {canManage && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" onClick={() => openGrade(submission)}>
                    {t('exams.grade')}
                  </Button>
                  {submission.status === 'graded' && (
                    <Button variant="ghost" disabled={releaseMutation.isPending} onClick={() => releaseMutation.mutate(submission._id)}>
                      {t('exams.release_result')}
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {gradingId && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-3">
          <Card className="my-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto p-4 sm:p-5">
            <h3 className="text-lg font-semibold">{t('exams.grade')}</h3>
            <div className="mt-3 space-y-3">
              {questions.map((q, index) => (
                <div key={q._id} className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-white/10">
                  <p className="text-sm font-medium">
                    {index + 1}. {q.text} ({q.marks})
                  </p>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60"
                    type="number"
                    value={gradeDraft[q._id]?.marks || ''}
                    onChange={(e) =>
                      setGradeDraft((prev) => ({
                        ...prev,
                        [q._id]: { marks: e.target.value, feedback: prev[q._id]?.feedback || '' }
                      }))
                    }
                    placeholder={t('exams.marks')}
                  />
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60"
                    value={gradeDraft[q._id]?.feedback || ''}
                    onChange={(e) =>
                      setGradeDraft((prev) => ({
                        ...prev,
                        [q._id]: { marks: prev[q._id]?.marks || '', feedback: e.target.value }
                      }))
                    }
                    placeholder={t('exams.teacher_feedback')}
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setGradingId(null)}>
                {t('exams.close')}
              </Button>
              <Button disabled={gradeMutation.isPending} onClick={() => gradeMutation.mutate()}>
                {t('exams.grade')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
