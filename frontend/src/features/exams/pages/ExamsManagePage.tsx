import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/authStore';
import { normalizeRole } from '@/features/resources/config/modules';
import { examsService, type ExamCategory, type ExamDeliveryMethod, type ExamQuestionOption, type ExamQuestionPayload, type ExamRecord, type QuestionType } from '../services/examsService';

type WizardQuestion = Omit<ExamQuestionPayload, 'options'> & { localId: string; options?: ExamQuestionOption[] };

const emptyWizard = () => ({
  title: '',
  category: 'weekly' as ExamCategory,
  deliveryMethod: 'online' as ExamDeliveryMethod,
  createWithAi: false,
  aiTopic: '',
  aiMcqCount: 5,
  aiTrueFalseCount: 3,
  aiDescriptiveCount: 2,
  aiDifficulty: 'medium' as 'easy' | 'medium' | 'hard',
  aiLanguage: 'fa' as 'en' | 'fa' | 'ps' | 'mixed',
  description: '',
  instructions: '',
  academicYear: '',
  bookName: '',
  chapterRange: '',
  classId: '',
  subjectId: '',
  teacherId: '',
  date: new Date().toISOString().slice(0, 10),
  startTime: '09:00',
  endTime: '10:00',
  durationMinutes: 60,
  totalMarks: 100,
  passingMarks: 40,
  room: '',
  googleFormUrl: '',
  allowDraft: true,
  allowResume: true,
  maximumAttempts: 1,
  showResultImmediately: false,
  showCorrectAnswers: false,
  questions: [] as WizardQuestion[],
  aiGeneratedBy: '' as '' | 'ai_provider' | 'local_fallback'
});

const STAFF_CREATE_ROLES = new Set(['super_admin', 'admin', 'branch_manager', 'teacher']);

export function ExamsManagePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const role = normalizeRole(user?.role);
  const canCreate = STAFF_CREATE_ROLES.has(String(role));
  const isTeacher = role === 'teacher';

  const [filters, setFilters] = useState({ search: '', category: '', deliveryMethod: '', status: '' });
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyWizard);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiMessage, setAiMessage] = useState('');

  const listQuery = useQuery({
    queryKey: ['exams-manage', filters],
    queryFn: () =>
      examsService.list({
        search: filters.search || undefined,
        category: filters.category || undefined,
        deliveryMethod: filters.deliveryMethod || undefined,
        status: filters.status || undefined,
        limit: 100
      })
  });

  const metaQuery = useQuery({
    queryKey: ['exams-meta', form.classId],
    queryFn: () => examsService.metaOptions({ classId: form.classId || undefined }),
    enabled: wizardOpen
  });

  const subjects = useMemo(() => {
    const all = metaQuery.data?.subjects ?? [];
    if (!form.classId) return all;
    return all.filter((s) => !s.classId || String(s.classId) === form.classId);
  }, [metaQuery.data?.subjects, form.classId]);

  const items = listQuery.data?.items ?? [];

  const steps = [
    t('exams.step_basic'),
    t('exams.step_delivery'),
    t('exams.step_assignment'),
    t('exams.step_schedule'),
    t('exams.step_questions'),
    t('exams.step_settings'),
    t('exams.step_review')
  ];

  const addQuestion = (type: QuestionType) => {
    const base: WizardQuestion = {
      localId: `${Date.now()}-${Math.random()}`,
      type,
      text: '',
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
    };
    setForm((prev) => ({ ...prev, questions: [...prev.questions, base] }));
  };

  const resolveClassName = () => {
    const found = (metaQuery.data?.classes ?? []).find((c) => c._id === form.classId);
    return found?.className || found?.name || '';
  };

  const resolveSubjectName = () => {
    const found = subjects.find((s) => s._id === form.subjectId);
    return found?.title || found?.name || '';
  };

  const buildAiGeneratePayload = () => {
    const topic = form.aiTopic.trim() || form.title.trim() || resolveSubjectName();
    return {
      topic,
      title: form.title.trim(),
      subjectName: resolveSubjectName(),
      // className is sent only so backend can strip it from generated text
      className: resolveClassName(),
      category: form.category,
      bookName: form.bookName,
      chapterRange: form.chapterRange,
      description: form.description,
      instructions: form.instructions,
      language: form.aiLanguage,
      difficulty: form.aiDifficulty,
      totalMarks: Number(form.totalMarks) || 100,
      mcqCount: Number(form.aiMcqCount) || 0,
      trueFalseCount: Number(form.aiTrueFalseCount) || 0,
      descriptiveCount: Number(form.aiDescriptiveCount) || 0
    };
  };

  const mapAiQuestions = (questions: ExamQuestionPayload[], prefix = 'ai'): WizardQuestion[] =>
    (questions || []).map((q, index) => ({
      localId: `${prefix}-${Date.now()}-${index}`,
      type: (q.type === 'true_false' || q.type === 'descriptive' ? q.type : 'mcq') as QuestionType,
      text: q.text,
      marks: Number(q.marks) || 5,
      options: Array.isArray(q.options)
        ? q.options.map((opt, optIndex) =>
            typeof opt === 'string'
              ? { key: String.fromCharCode(65 + optIndex), text: opt, isCorrect: false }
              : opt
          )
        : [],
      correctAnswer: q.correctAnswer ?? null,
      expectedAnswer: q.expectedAnswer || '',
      explanation: q.explanation,
      difficulty: q.difficulty,
      topic: q.topic
    }));

  const generateAiQuestions = async (): Promise<WizardQuestion[]> => {
    setAiGenerating(true);
    setError('');
    setAiMessage('');
    try {
      const payload = buildAiGeneratePayload();
      if (!payload.topic) throw new Error(t('exams.ai_need_topic'));
      const totalCounts = payload.mcqCount + payload.trueFalseCount + payload.descriptiveCount;
      if (totalCounts < 1) throw new Error(t('exams.ai_need_counts'));

      const result = await examsService.generateAiQuestions(payload);
      const mapped = mapAiQuestions(result.questions);
      setForm((prev) => ({
        ...prev,
        createWithAi: true,
        deliveryMethod: 'in_person',
        questions: mapped,
        aiGeneratedBy: result.generatedBy
      }));
      setAiMessage(
        result.generatedBy === 'ai_provider' ? t('exams.ai_generated_ok') : t('exams.ai_generated_fallback')
      );
      return mapped;
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || t('exams.send_failed'));
      throw err;
    } finally {
      setAiGenerating(false);
    }
  };

  const saveExam = async (publish: boolean) => {
    try {
      setSaving(true);
      setError('');
      if (!form.title.trim()) throw new Error(t('exams.validation_title'));
      if (Number(form.passingMarks) > Number(form.totalMarks)) throw new Error(t('exams.validation_marks'));
      if (form.category === 'book' && !form.bookName.trim()) throw new Error(t('exams.validation_book'));
      if (!form.classId || !form.subjectId) throw new Error(t('exams.select_class'));

      let questions = form.questions;
      const deliveryMethod: ExamDeliveryMethod = form.createWithAi ? 'in_person' : form.deliveryMethod;

      if (form.createWithAi && questions.length === 0) {
        questions = await generateAiQuestions();
      }

      const teacherId = isTeacher ? String((user as any)?._id || (user as any)?.id || '') : form.teacherId;
      const exam = await examsService.create({
        title: form.title.trim(),
        category: form.category,
        deliveryMethod,
        description: form.description,
        instructions: form.instructions,
        academicYear: form.academicYear,
        bookName: form.bookName,
        chapterRange: form.chapterRange,
        class: form.classId,
        subject: form.subjectId,
        teacherId: teacherId || undefined,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        durationMinutes: Number(form.durationMinutes) || 0,
        totalMarks: Number(form.totalMarks) || 100,
        passingMarks: Number(form.passingMarks) || 40,
        room: form.room,
        googleFormUrl: form.googleFormUrl,
        allowDraft: form.allowDraft,
        allowResume: form.allowResume,
        maximumAttempts: Number(form.maximumAttempts) || 1,
        showResultImmediately: form.showResultImmediately,
        showCorrectAnswers: form.showCorrectAnswers,
        status: publish ? 'published' : 'draft'
      });

      if (deliveryMethod === 'in_person') {
        for (const [index, q] of questions.entries()) {
          await examsService.createQuestion(exam._id, { ...q, questionOrder: index + 1 });
        }
      } else if (form.googleFormUrl.trim()) {
        await examsService.attachGoogleForm(exam._id, { respondentUrl: form.googleFormUrl.trim() });
      }
      if (publish) await examsService.publish(exam._id);

      setWizardOpen(false);
      setForm(emptyWizard());
      setStep(0);
      setAiMessage('');
      await listQuery.refetch();
      navigate(`/exams/${exam._id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || t('exams.send_failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs tracking-[0.3em] text-slate-500">{t('exams.workspace_title')}</p>
        </div>
        {canCreate && (
          <Button
            onClick={() => {
              setForm({
                ...emptyWizard(),
                teacherId: isTeacher ? String((user as any)?._id || (user as any)?.id || '') : ''
              });
              setStep(0);
              setError('');
              setAiMessage('');
              setWizardOpen(true);
            }}
          >
            {t('exams.create_exam')}
          </Button>
        )}
      </div>

      <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          value={filters.search}
          onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
          placeholder={t('exams.search_placeholder')}
        />
        <select
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60"
          value={filters.category}
          onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value }))}
        >
          <option value="">{t('exams.filter_all')}</option>
          <option value="weekly">{t('exams.category_weekly')}</option>
          <option value="monthly">{t('exams.category_monthly')}</option>
          <option value="book">{t('exams.category_book')}</option>
        </select>
        <select
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60"
          value={filters.deliveryMethod}
          onChange={(e) => setFilters((p) => ({ ...p, deliveryMethod: e.target.value }))}
        >
          <option value="">{t('exams.filter_all')}</option>
          <option value="online">{t('exams.delivery_online')}</option>
          <option value="in_person">{t('exams.delivery_in_person')}</option>
        </select>
        <select
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60"
          value={filters.status}
          onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
        >
          <option value="">{t('exams.filter_all')}</option>
          {['draft', 'scheduled', 'published', 'active', 'completed', 'closed', 'cancelled', 'archived'].map((s) => (
            <option key={s} value={s}>
              {t(`exams.status_${s}`)}
            </option>
          ))}
        </select>
      </Card>

      <Card className="max-h-none overflow-visible p-0">
        <div className="divide-y divide-slate-200 dark:divide-white/10">
          {listQuery.isLoading && <p className="p-4 text-sm text-slate-500">{t('exams.loading')}</p>}
          {!listQuery.isLoading && items.length === 0 && <p className="p-4 text-sm text-slate-500">{t('exams.no_exams')}</p>}
          {items.map((exam: ExamRecord) => (
            <button
              key={exam._id}
              type="button"
              className="flex w-full flex-col gap-2 px-4 py-4 text-start transition hover:bg-slate-50 dark:hover:bg-white/5 sm:flex-row sm:items-center sm:justify-between"
              onClick={() => navigate(`/exams/${exam._id}`)}
            >
              <div className="min-w-0 flex-1">
                <p className="break-words font-semibold text-slate-900 dark:text-white">{exam.title}</p>
                <p className="mt-1 break-words text-xs text-slate-500">
                  {t(`exams.category_${exam.category || 'weekly'}`)} ·{' '}
                  {t(`exams.delivery_${exam.deliveryMethod === 'in_person' ? 'in_person' : 'online'}`)} · {exam.className} ·{' '}
                  {exam.subjectName}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-white/10 dark:text-slate-200">
                {t(`exams.status_${exam.status || 'draft'}`)}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {wizardOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-3 sm:p-4">
          <Card className="my-4 max-h-[92vh] w-full max-w-3xl overflow-y-auto p-4 sm:p-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('exams.create_exam')}</h3>
            <p className="mt-1 text-xs text-slate-500">
              {steps[step]} ({step + 1}/{steps.length})
            </p>

            <div className="mt-4 space-y-3">
              {step === 0 && (
                <>
                  <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder={t('exams.title')} />
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60"
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as ExamCategory }))}
                  >
                    <option value="weekly">{t('exams.category_weekly')}</option>
                    <option value="monthly">{t('exams.category_monthly')}</option>
                    <option value="book">{t('exams.category_book')}</option>
                  </select>
                  {form.category === 'book' && (
                    <Input value={form.bookName} onChange={(e) => setForm((p) => ({ ...p, bookName: e.target.value }))} placeholder={t('exams.book_name')} />
                  )}
                  <Input value={form.academicYear} onChange={(e) => setForm((p) => ({ ...p, academicYear: e.target.value }))} placeholder={t('exams.academic_year')} />
                  <textarea
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder={t('exams.description')}
                  />
                  <textarea
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60"
                    rows={3}
                    value={form.instructions}
                    onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value }))}
                    placeholder={t('exams.instructions')}
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input type="number" value={form.totalMarks} onChange={(e) => setForm((p) => ({ ...p, totalMarks: Number(e.target.value) }))} placeholder={t('exams.total_marks')} />
                    <Input type="number" value={form.passingMarks} onChange={(e) => setForm((p) => ({ ...p, passingMarks: Number(e.target.value) }))} placeholder={t('exams.passing_marks')} />
                  </div>
                </>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={!form.createWithAi && form.deliveryMethod === 'online' ? 'primary' : 'ghost'}
                      onClick={() => setForm((p) => ({ ...p, deliveryMethod: 'online', createWithAi: false, questions: [] }))}
                    >
                      {t('exams.delivery_online')}
                    </Button>
                    <Button
                      variant={!form.createWithAi && form.deliveryMethod === 'in_person' ? 'primary' : 'ghost'}
                      onClick={() => setForm((p) => ({ ...p, deliveryMethod: 'in_person', createWithAi: false }))}
                    >
                      {t('exams.delivery_in_person')}
                    </Button>
                    <Button
                      variant={form.createWithAi ? 'primary' : 'ghost'}
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          createWithAi: true,
                          deliveryMethod: 'in_person',
                          aiTopic: p.aiTopic || p.title || ''
                        }))
                      }
                    >
                      {t('exams.delivery_ai')}
                    </Button>
                  </div>

                  {form.createWithAi && (
                    <div className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50/70 p-4 dark:border-sky-500/30 dark:bg-sky-500/10">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{t('exams.ai_create_title')}</p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{t('exams.ai_create_hint')}</p>
                      </div>
                      <label className="block space-y-1 text-xs text-slate-600 dark:text-slate-300">
                        <span>{t('exams.ai_topic')}</span>
                        <textarea
                          className="min-h-[4.5rem] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60"
                          value={form.aiTopic}
                          onChange={(e) => setForm((p) => ({ ...p, aiTopic: e.target.value }))}
                          placeholder={t('exams.ai_topic_placeholder')}
                        />
                      </label>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <label className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                          <span>{t('exams.ai_mcq_count')}</span>
                          <Input
                            type="number"
                            min={0}
                            value={form.aiMcqCount}
                            onChange={(e) => setForm((p) => ({ ...p, aiMcqCount: Number(e.target.value) }))}
                          />
                        </label>
                        <label className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                          <span>{t('exams.ai_true_false_count')}</span>
                          <Input
                            type="number"
                            min={0}
                            value={form.aiTrueFalseCount}
                            onChange={(e) => setForm((p) => ({ ...p, aiTrueFalseCount: Number(e.target.value) }))}
                          />
                        </label>
                        <label className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                          <span>{t('exams.ai_descriptive_count')}</span>
                          <Input
                            type="number"
                            min={0}
                            value={form.aiDescriptiveCount}
                            onChange={(e) => setForm((p) => ({ ...p, aiDescriptiveCount: Number(e.target.value) }))}
                          />
                        </label>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                          <span>{t('exams.ai_difficulty')}</span>
                          <select
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60"
                            value={form.aiDifficulty}
                            onChange={(e) => setForm((p) => ({ ...p, aiDifficulty: e.target.value as 'easy' | 'medium' | 'hard' }))}
                          >
                            <option value="easy">{t('exams.ai_difficulty_easy')}</option>
                            <option value="medium">{t('exams.ai_difficulty_medium')}</option>
                            <option value="hard">{t('exams.ai_difficulty_hard')}</option>
                          </select>
                        </label>
                        <label className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                          <span>{t('exams.ai_language')}</span>
                          <select
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60"
                            value={form.aiLanguage}
                            onChange={(e) => setForm((p) => ({ ...p, aiLanguage: e.target.value as 'en' | 'fa' | 'ps' | 'mixed' }))}
                          >
                            <option value="fa">{t('exams.ai_language_fa')}</option>
                            <option value="ps">{t('exams.ai_language_ps')}</option>
                            <option value="en">{t('exams.ai_language_en')}</option>
                            <option value="mixed">{t('exams.ai_language_mixed')}</option>
                          </select>
                        </label>
                      </div>
                      <p className="text-xs text-slate-500">{t('exams.ai_auto_save_note')}</p>
                      <p className="text-xs text-slate-500">{t('exams.ai_free_setup_hint')}</p>
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                <>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60"
                    value={form.classId}
                    onChange={(e) => setForm((p) => ({ ...p, classId: e.target.value, subjectId: '', teacherId: isTeacher ? p.teacherId : '' }))}
                  >
                    <option value="">{t('exams.select_class')}</option>
                    {(metaQuery.data?.classes ?? []).map((c) => (
                      <option key={c._id} value={c._id}>{c.className || c.name}</option>
                    ))}
                  </select>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60"
                    value={form.subjectId}
                    onChange={(e) => setForm((p) => ({ ...p, subjectId: e.target.value }))}
                  >
                    <option value="">{t('exams.select_subject')}</option>
                    {subjects.map((s) => (
                      <option key={s._id} value={s._id}>{s.title || s.name}</option>
                    ))}
                  </select>
                  {!isTeacher && (
                    <select
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60"
                      value={form.teacherId}
                      onChange={(e) => setForm((p) => ({ ...p, teacherId: e.target.value }))}
                    >
                      <option value="">{t('exams.select_teacher')}</option>
                      {(metaQuery.data?.teachers ?? []).map((teacher) => (
                        <option key={teacher._id} value={teacher._id}>{teacher.name}</option>
                      ))}
                    </select>
                  )}
                </>
              )}

              {step === 3 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
                  <Input value={form.room} onChange={(e) => setForm((p) => ({ ...p, room: e.target.value }))} placeholder={t('exams.room')} />
                  <Input value={form.startTime} onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))} placeholder={t('exams.start_time')} />
                  <Input value={form.endTime} onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))} placeholder={t('exams.end_time')} />
                  <Input type="number" value={form.durationMinutes} onChange={(e) => setForm((p) => ({ ...p, durationMinutes: Number(e.target.value) }))} placeholder={t('exams.duration')} />
                </div>
              )}

              {step === 4 && form.deliveryMethod === 'online' && !form.createWithAi && (
                <>
                  <Input value={form.googleFormUrl} onChange={(e) => setForm((p) => ({ ...p, googleFormUrl: e.target.value }))} placeholder={t('exams.google_form_url')} />
                  <p className="text-xs text-slate-500">{t('exams.google_not_configured')}</p>
                </>
              )}

              {step === 4 && form.createWithAi && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 dark:text-slate-300">{t('exams.ai_create_hint')}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={aiGenerating} onClick={() => void generateAiQuestions()}>
                      {aiGenerating ? t('exams.ai_generating') : t('exams.ai_generate')}
                    </Button>
                  </div>
                  {aiMessage && <p className="text-sm text-emerald-600">{aiMessage}</p>}
                  {form.questions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">{t('exams.ai_preview_title')} ({form.questions.length})</p>
                      {form.questions.map((q, index) => (
                        <div key={q.localId} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-white/10">
                          <p className="font-medium text-slate-900 dark:text-white">
                            {index + 1}. [{t(`exams.type_${q.type}`)}] {q.text}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {q.marks} {t('exams.marks')}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-slate-500">{t('exams.ai_auto_save_note')}</p>
                </div>
              )}

              {step === 4 && form.deliveryMethod === 'in_person' && !form.createWithAi && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" onClick={() => addQuestion('mcq')}>{t('exams.type_mcq')}</Button>
                    <Button variant="ghost" onClick={() => addQuestion('true_false')}>{t('exams.type_true_false')}</Button>
                    <Button variant="ghost" onClick={() => addQuestion('descriptive')}>{t('exams.type_descriptive')}</Button>
                  </div>
                  {form.questions.length === 0 && <p className="text-sm text-slate-500">{t('exams.no_questions')}</p>}
                  {form.questions.map((q, index) => (
                    <div key={q.localId} className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-white/10">
                      <p className="text-xs font-semibold">{t('exams.question')} {index + 1}</p>
                      <Input
                        value={q.text}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            questions: prev.questions.map((item) => (item.localId === q.localId ? { ...item, text: e.target.value } : item))
                          }))
                        }
                        placeholder={t('exams.question')}
                      />
                      <Input
                        type="number"
                        value={q.marks}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            questions: prev.questions.map((item) =>
                              item.localId === q.localId ? { ...item, marks: Number(e.target.value) } : item
                            )
                          }))
                        }
                        placeholder={t('exams.marks')}
                      />
                      {q.type === 'mcq' &&
                        (q.options || []).map((opt, optIndex) => (
                          <div key={opt.key || optIndex} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${q.localId}`}
                              checked={Boolean(opt.isCorrect)}
                              onChange={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  questions: prev.questions.map((item) =>
                                    item.localId === q.localId
                                      ? {
                                          ...item,
                                          correctAnswer: opt.key,
                                          options: (item.options || []).map((o, i) => ({ ...o, isCorrect: i === optIndex }))
                                        }
                                      : item
                                  )
                                }))
                              }
                            />
                            <Input
                              value={opt.text}
                              onChange={(e) =>
                                setForm((prev) => ({
                                  ...prev,
                                  questions: prev.questions.map((item) =>
                                    item.localId === q.localId
                                      ? {
                                          ...item,
                                          options: (item.options || []).map((o, i) => (i === optIndex ? { ...o, text: e.target.value } : o))
                                        }
                                      : item
                                  )
                                }))
                              }
                              placeholder={String(opt.key)}
                            />
                          </div>
                        ))}
                      {q.type === 'true_false' && (
                        <select
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60"
                          value={String(q.correctAnswer ?? 'true')}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              questions: prev.questions.map((item) =>
                                item.localId === q.localId
                                  ? {
                                      ...item,
                                      correctAnswer: e.target.value,
                                      options: [
                                        { key: 'true', text: t('exams.true'), isCorrect: e.target.value === 'true' },
                                        { key: 'false', text: t('exams.false'), isCorrect: e.target.value === 'false' }
                                      ]
                                    }
                                  : item
                              )
                            }))
                          }
                        >
                          <option value="true">{t('exams.true')}</option>
                          <option value="false">{t('exams.false')}</option>
                        </select>
                      )}
                      {q.type === 'descriptive' && (
                        <Input
                          value={q.expectedAnswer || ''}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              questions: prev.questions.map((item) =>
                                item.localId === q.localId ? { ...item, expectedAnswer: e.target.value } : item
                              )
                            }))
                          }
                          placeholder={t('exams.expected_answer')}
                        />
                      )}
                      <Button variant="ghost" onClick={() => setForm((prev) => ({ ...prev, questions: prev.questions.filter((item) => item.localId !== q.localId) }))}>
                        {t('exams.remove_question')}
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {step === 5 && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.allowDraft} onChange={(e) => setForm((p) => ({ ...p, allowDraft: e.target.checked }))} />
                    {t('exams.allow_draft')}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.allowResume} onChange={(e) => setForm((p) => ({ ...p, allowResume: e.target.checked }))} />
                    {t('exams.allow_resume')}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.showResultImmediately} onChange={(e) => setForm((p) => ({ ...p, showResultImmediately: e.target.checked }))} />
                    {t('exams.show_result_immediately')}
                  </label>
                  <Input type="number" value={form.maximumAttempts} onChange={(e) => setForm((p) => ({ ...p, maximumAttempts: Number(e.target.value) }))} placeholder={t('exams.max_attempts')} />
                </div>
              )}

              {step === 6 && (
                <div className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
                  <p>{t('exams.title')}: {form.title}</p>
                  <p>{t('exams.category')}: {t(`exams.category_${form.category}`)}</p>
                  <p>{t('exams.delivery_method')}: {form.createWithAi ? t('exams.delivery_ai') : t(`exams.delivery_${form.deliveryMethod === 'in_person' ? 'in_person' : 'online'}`)}</p>
                  <p>{t('exams.total_marks')}: {form.totalMarks}</p>
                  <p>{t('exams.question')}: {form.questions.length}</p>
                  {form.createWithAi && <p className="text-xs text-slate-500">{t('exams.ai_auto_save_note')}</p>}
                </div>
              )}
            </div>

            {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

            <div className="mt-4 flex flex-wrap justify-between gap-2">
              <Button variant="ghost" onClick={() => setWizardOpen(false)}>{t('exams.close')}</Button>
              <div className="flex flex-wrap gap-2">
                {step > 0 && <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>{t('exams.back')}</Button>}
                {step < steps.length - 1 && <Button onClick={() => setStep((s) => s + 1)}>{t('exams.next')}</Button>}
                {step === steps.length - 1 && (
                  <>
                    <Button variant="ghost" disabled={saving} onClick={() => void saveExam(false)}>{t('exams.save_draft')}</Button>
                    <Button disabled={saving} onClick={() => void saveExam(true)}>{t('exams.publish')}</Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
