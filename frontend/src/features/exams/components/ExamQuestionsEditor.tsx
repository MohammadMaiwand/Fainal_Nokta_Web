import { useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  examsService,
  type ExamQuestion,
  type ExamQuestionPayload,
  type QuestionType
} from '../services/examsService';

type DraftOption = { key: string; text: string; isCorrect: boolean };

type QuestionDraft = {
  text: string;
  type: QuestionType;
  marks: number;
  options: DraftOption[];
  correctAnswer: string | null;
  expectedAnswer: string;
};

const QUESTION_TYPES: QuestionType[] = ['mcq', 'true_false', 'descriptive'];

function FieldHint({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</p>
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{hint}</p>
      </div>
      {children}
    </div>
  );
}

const emptyDraft = (t: (k: string) => string, type: QuestionType = 'mcq'): QuestionDraft => ({
  text: '',
  type,
  marks: 5,
  options:
    type === 'mcq'
      ? [
          { key: 'A', text: '', isCorrect: true },
          { key: 'B', text: '', isCorrect: false },
          { key: 'C', text: '', isCorrect: false },
          { key: 'D', text: '', isCorrect: false }
        ]
      : type === 'true_false'
        ? [
            { key: 'true', text: t('exams.true'), isCorrect: true },
            { key: 'false', text: t('exams.false'), isCorrect: false }
          ]
        : [],
  correctAnswer: type === 'true_false' ? 'true' : type === 'mcq' ? 'A' : null,
  expectedAnswer: ''
});

function toDraft(question: ExamQuestion, t: (k: string) => string): QuestionDraft {
  const type = (['mcq', 'true_false', 'descriptive'].includes(String(question.type))
    ? question.type
    : question.type === 'essay' || question.type === 'short_answer'
      ? 'descriptive'
      : 'mcq') as QuestionType;

  const options =
    type === 'mcq'
      ? (question.options || []).map((o, i) => ({
          key: String(o.key || ['A', 'B', 'C', 'D'][i] || i + 1),
          text: o.text || '',
          isCorrect: Boolean(o.isCorrect)
        }))
      : type === 'true_false'
        ? [
            { key: 'true', text: t('exams.true'), isCorrect: String(question.correctAnswer) === 'true' },
            { key: 'false', text: t('exams.false'), isCorrect: String(question.correctAnswer) === 'false' }
          ]
        : [];

  if (type === 'mcq' && options.length < 4) {
    while (options.length < 4) {
      const key = ['A', 'B', 'C', 'D'][options.length];
      options.push({ key, text: '', isCorrect: false });
    }
  }

  return {
    text: question.text || '',
    type,
    marks: Number(question.marks) || 1,
    options,
    correctAnswer:
      question.correctAnswer != null
        ? String(question.correctAnswer)
        : options.find((o) => o.isCorrect)?.key || (type === 'mcq' ? 'A' : type === 'true_false' ? 'true' : null),
    expectedAnswer: question.expectedAnswer || ''
  };
}

function toPayload(draft: QuestionDraft): ExamQuestionPayload {
  return {
    text: draft.text.trim(),
    type: draft.type,
    marks: Number(draft.marks) || 1,
    options: draft.type === 'descriptive' ? [] : draft.options,
    correctAnswer: draft.type === 'descriptive' ? null : draft.correctAnswer,
    expectedAnswer: draft.expectedAnswer
  };
}

function normalizeTypeKey(type: string) {
  if (type === 'essay' || type === 'short_answer') return 'descriptive';
  return type;
}

type ExamQuestionsEditorProps = {
  examId: string;
  questions: ExamQuestion[];
  disabled?: boolean;
};

export function ExamQuestionsEditor({ examId, questions, disabled = false }: ExamQuestionsEditorProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<QuestionDraft>(() => emptyDraft(t));

  const totalMarks = useMemo(
    () => questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0),
    [questions]
  );

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['exam-questions', examId] });
    void queryClient.invalidateQueries({ queryKey: ['exam-print', examId] });
    void queryClient.invalidateQueries({ queryKey: ['exam-detail', examId] });
  };

  const saveMutation = useMutation({
    mutationFn: async (mode: 'close' | 'next') => {
      if (!draft.text.trim()) throw new Error(t('exams.hint_question_required'));
      if (draft.type === 'mcq') {
        const filled = draft.options.filter((o) => o.text.trim());
        const correct = draft.options.find((o) => o.isCorrect);
        if (filled.length < 4 || !correct) throw new Error(t('exams.validation_mcq'));
      }
      const payload = toPayload(draft);
      if (editingId) {
        await examsService.updateQuestion(examId, editingId, payload);
        return mode;
      }
      await examsService.createQuestion(examId, {
        ...payload,
        questionOrder: questions.length + 1
      });
      return mode;
    },
    onSuccess: (mode) => {
      const keepOpen = mode === 'next' && !editingId;
      const keptType = draft.type;
      setError('');
      setSuccess(keepOpen ? t('exams.question_saved_next') : t('exams.question_saved'));
      refresh();
      if (keepOpen) {
        setEditingId(null);
        setDraft(emptyDraft(t, keptType));
      } else {
        setComposerOpen(false);
        setEditingId(null);
        setDraft(emptyDraft(t));
      }
    },
    onError: (err: any) => {
      setSuccess('');
      setError(err?.response?.data?.message || err?.message || t('exams.send_failed'));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (questionId: string) => examsService.deleteQuestion(examId, questionId),
    onSuccess: () => {
      setSuccess(t('exams.question_deleted'));
      refresh();
    },
    onError: (err: any) => setError(err?.response?.data?.message || t('exams.send_failed'))
  });

  const reorderMutation = useMutation({
    mutationFn: (order: string[]) => examsService.reorderQuestions(examId, order),
    onSuccess: () => refresh(),
    onError: (err: any) => setError(err?.response?.data?.message || t('exams.send_failed'))
  });

  const openCreate = (type: QuestionType = 'mcq') => {
    setEditingId(null);
    setDraft(emptyDraft(t, type));
    setError('');
    setSuccess('');
    setComposerOpen(true);
    requestAnimationFrame(() => {
      document.getElementById('exam-question-composer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const openEdit = (question: ExamQuestion) => {
    setEditingId(question._id);
    setDraft(toDraft(question, t));
    setError('');
    setSuccess('');
    setComposerOpen(true);
    requestAnimationFrame(() => {
      document.getElementById('exam-question-composer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const closeComposer = () => {
    setComposerOpen(false);
    setEditingId(null);
    setError('');
  };

  const move = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= questions.length) return;
    const order = questions.map((q) => q._id);
    const tmp = order[index];
    order[index] = order[next];
    order[next] = tmp;
    reorderMutation.mutate(order);
  };

  const setType = (type: QuestionType) => {
    setDraft((prev) => ({
      ...emptyDraft(t, type),
      text: prev.text,
      marks: prev.marks,
      expectedAnswer: type === 'descriptive' ? prev.expectedAnswer : ''
    }));
  };

  return (
    <Card className="exam-questions-section space-y-5 p-4 sm:p-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('exams.questions_manager_title')}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {t('exams.questions_manager_hint')}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {t('exams.question')}: {questions.length} · {t('exams.total_marks')}: {totalMarks}
            </p>
          </div>
          {!disabled && !composerOpen && (
            <Button onClick={() => openCreate('mcq')}>{t('exams.add_question')}</Button>
          )}
        </div>
      </div>

      {error && !composerOpen && <p className="text-sm text-rose-600">{error}</p>}
      {success && !composerOpen && <p className="text-sm text-emerald-600">{success}</p>}

      {composerOpen && (
        <div
          id="exam-question-composer"
          className="space-y-5 rounded-2xl border border-sky-200 bg-sky-50/60 p-4 dark:border-sky-500/30 dark:bg-sky-500/10 sm:p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {editingId ? t('exams.edit_question') : t('exams.add_question')}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {editingId ? t('exams.edit_question_hint') : t('exams.add_question_hint')}
              </p>
            </div>
            <Button variant="ghost" onClick={closeComposer}>
              {t('exams.close')}
            </Button>
          </div>

          <FieldHint label={t('exams.question_type')} hint={t('exams.hint_question_type')}>
            <div className="grid gap-3 sm:grid-cols-3">
              {QUESTION_TYPES.map((type) => {
                const active = draft.type === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setType(type)}
                    className={`rounded-2xl border p-3 text-start transition ${
                      active
                        ? 'border-sky-500 bg-white shadow-sm dark:border-sky-400 dark:bg-slate-900/70'
                        : 'border-slate-200 bg-white/70 hover:border-sky-300 dark:border-white/10 dark:bg-slate-900/40'
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{t(`exams.type_${type}`)}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      {t(`exams.hint_type_${type}`)}
                    </p>
                  </button>
                );
              })}
            </div>
          </FieldHint>

          <FieldHint label={t('exams.question')} hint={t('exams.hint_question_text')}>
            <textarea
              className="min-h-[5.5rem] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60"
              value={draft.text}
              onChange={(e) => setDraft((p) => ({ ...p, text: e.target.value }))}
              placeholder={t('exams.question_text_placeholder')}
            />
          </FieldHint>

          <FieldHint label={t('exams.marks')} hint={t('exams.hint_marks')}>
            <Input
              type="number"
              min={0}
              value={draft.marks}
              onChange={(e) => setDraft((p) => ({ ...p, marks: Number(e.target.value) }))}
              placeholder={t('exams.marks')}
            />
          </FieldHint>

          {draft.type === 'mcq' && (
            <FieldHint label={t('exams.options_section')} hint={t('exams.hint_mcq_options')}>
              <div className="space-y-3">
                {draft.options.map((opt, optIndex) => (
                  <div
                    key={opt.key}
                    className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900/50 sm:flex-row sm:items-center"
                  >
                    <label className="flex shrink-0 items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                      <input
                        type="radio"
                        name="exam-q-correct"
                        checked={opt.isCorrect}
                        onChange={() =>
                          setDraft((prev) => ({
                            ...prev,
                            correctAnswer: opt.key,
                            options: prev.options.map((o, i) => ({ ...o, isCorrect: i === optIndex }))
                          }))
                        }
                      />
                      <span dir="ltr">{opt.key}</span>
                      <span className="text-xs font-normal text-slate-500">{t('exams.correct_answer')}</span>
                    </label>
                    <Input
                      value={opt.text}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          options: prev.options.map((o, i) => (i === optIndex ? { ...o, text: e.target.value } : o))
                        }))
                      }
                      placeholder={t('exams.option_text_placeholder', { key: opt.key })}
                    />
                  </div>
                ))}
                <p className="text-xs text-slate-500">{t('exams.hint_correct_radio')}</p>
              </div>
            </FieldHint>
          )}

          {draft.type === 'true_false' && (
            <FieldHint label={t('exams.correct_answer')} hint={t('exams.hint_true_false')}>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60"
                value={String(draft.correctAnswer || 'true')}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    correctAnswer: e.target.value,
                    options: [
                      { key: 'true', text: t('exams.true'), isCorrect: e.target.value === 'true' },
                      { key: 'false', text: t('exams.false'), isCorrect: e.target.value === 'false' }
                    ]
                  }))
                }
              >
                <option value="true">{t('exams.true')}</option>
                <option value="false">{t('exams.false')}</option>
              </select>
            </FieldHint>
          )}

          {draft.type === 'descriptive' && (
            <FieldHint label={t('exams.expected_answer')} hint={t('exams.hint_descriptive')}>
              <textarea
                className="min-h-[4.5rem] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60"
                value={draft.expectedAnswer}
                onChange={(e) => setDraft((p) => ({ ...p, expectedAnswer: e.target.value }))}
                placeholder={t('exams.expected_answer_placeholder')}
              />
            </FieldHint>
          )}

          {error && <p className="text-sm text-rose-600">{error}</p>}
          {success && <p className="text-sm text-emerald-600">{success}</p>}

          <div className="flex flex-col gap-2 border-t border-sky-200/80 pt-4 dark:border-sky-500/20 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button variant="ghost" onClick={closeComposer}>
              {t('exams.close')}
            </Button>
            {!editingId && (
              <Button variant="secondary" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate('next')}>
                {t('exams.save_and_add_next')}
              </Button>
            )}
            <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate('close')}>
              {editingId ? t('exams.save_changes') : t('exams.save_question')}
            </Button>
          </div>
        </div>
      )}

      {!disabled && !composerOpen && (
        <div className="rounded-2xl border border-dashed border-slate-300 p-4 dark:border-white/15">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{t('exams.quick_add_title')}</p>
          <p className="mt-1 text-xs text-slate-500">{t('exams.quick_add_hint')}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {QUESTION_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => openCreate(type)}
                className="rounded-xl border border-slate-200 bg-white p-3 text-start transition hover:border-sky-400 dark:border-white/10 dark:bg-slate-900/40"
              >
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{t(`exams.type_${type}`)}</p>
                <p className="mt-1 text-xs text-slate-500">{t(`exams.hint_type_${type}`)}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {questions.length === 0 && !composerOpen && (
        <p className="text-sm text-slate-500">{t('exams.no_questions_hint')}</p>
      )}

      <div className="space-y-3">
        {questions.map((question, index) => (
          <div key={question._id} className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <p className="break-words text-sm font-semibold text-slate-900 dark:text-white">
                  {index + 1}. {question.text}
                </p>
                <p className="text-xs text-slate-500">
                  {t(`exams.type_${normalizeTypeKey(String(question.type))}`)} · {question.marks} {t('exams.marks')}
                </p>
                {question.type === 'mcq' && (
                  <div className="flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300">
                    {(question.options || []).map((opt) => (
                      <span
                        key={opt.key || opt.text}
                        className={`rounded-lg border px-2 py-1 ${
                          opt.isCorrect
                            ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10'
                            : 'border-slate-200 dark:border-white/10'
                        }`}
                      >
                        <span dir="ltr">{opt.key}.</span> {opt.text}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {!disabled && (
                <div className="flex flex-wrap gap-1">
                  <Button variant="ghost" size="sm" disabled={index === 0 || reorderMutation.isPending} onClick={() => move(index, -1)}>
                    {t('exams.move_up')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={index === questions.length - 1 || reorderMutation.isPending}
                    onClick={() => move(index, 1)}
                  >
                    {t('exams.move_down')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(question)}>
                    {t('common.edit')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (window.confirm(t('exams.delete_question_confirm'))) {
                        deleteMutation.mutate(question._id);
                      }
                    }}
                  >
                    {t('exams.remove_question')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
