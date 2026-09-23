import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { examsService } from '../services/examsService';
import { detectTextDirection } from '../utils/textDirection';
import { ExamPaperHeader } from '../components/ExamPaperHeader';

type AnswerDraft = Record<string, { selectedOptionKey?: string; booleanAnswer?: boolean | null; descriptiveAnswer?: string }>;

export function StudentExamTakePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { examId = '' } = useParams<{ examId: string }>();
  const [answers, setAnswers] = useState<AnswerDraft>({});
  const [message, setMessage] = useState('');

  const viewQuery = useQuery({
    queryKey: ['exam-student-view', examId],
    queryFn: () => examsService.studentView(examId),
    enabled: Boolean(examId)
  });

  const view = viewQuery.data;
  const exam = view?.exam;
  const questions = view?.questions ?? [];
  const submission = view?.submission;

  useEffect(() => {
    if (!submission?.answers?.length) return;
    const next: AnswerDraft = {};
    for (const answer of submission.answers) {
      next[String(answer.questionId)] = {
        selectedOptionKey: answer.selectedOptionKey,
        booleanAnswer: answer.booleanAnswer,
        descriptiveAnswer: answer.descriptiveAnswer
      };
    }
    setAnswers(next);
  }, [submission?._id]);

  const saveDraftMutation = useMutation({
    mutationFn: () =>
      examsService.saveDraft(
        examId,
        Object.entries(answers).map(([questionId, value]) => ({ questionId, ...value }))
      ),
    onSuccess: () => setMessage(t('exams.draft_saved'))
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      examsService.submit(
        examId,
        Object.entries(answers).map(([questionId, value]) => ({ questionId, ...value }))
      ),
    onSuccess: () => {
      setMessage(t('exams.submitted_ok'));
      void queryClient.invalidateQueries({ queryKey: ['exams-my'] });
      void queryClient.invalidateQueries({ queryKey: ['exam-student-view', examId] });
    },
    onError: (err: any) => setMessage(err?.response?.data?.message || t('exams.send_failed'))
  });

  const locked = ['submitted', 'graded', 'released'].includes(String(submission?.status || ''));
  const studentName = String(user?.name || '');
  const studentId = String((user as any)?.studentNumber || (user as any)?.username || user?.email || '');
  const firstMcqIndex = questions.findIndex((item: any) => item.type === 'mcq');
  const firstTrueFalseIndex = questions.findIndex((item: any) => item.type === 'true_false');

  if (viewQuery.isLoading) {
    return <p className="p-4 text-sm text-slate-500">{t('exams.loading')}</p>;
  }

  if (!exam) {
    return (
      <div className="space-y-4 p-4">
        <Button variant="ghost" onClick={() => navigate('/exams')}>
          ← {t('exams.back_to_list')}
        </Button>
        <p className="text-sm text-slate-500">{t('exams.not_available')}</p>
      </div>
    );
  }

  return (
    <div className="exam-take-sheet mx-auto w-full max-w-4xl space-y-5 px-1 pb-8">
      <Button variant="ghost" onClick={() => navigate('/exams')}>
        ← {t('exams.back_to_list')}
      </Button>

      <Card className="overflow-hidden bg-white p-4 text-slate-900 sm:p-5 dark:bg-white">
        <ExamPaperHeader
          exam={exam}
          mode="take"
          printedBy={studentName}
          studentName={studentName}
          studentId={studentId}
          showBlanks={false}
        />
      </Card>

      {exam.deliveryMethod === 'online' && (
        <Card className="space-y-3 p-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">{t('exams.online_take_hint')}</p>
          <Button
            onClick={async () => {
              try {
                await examsService.openGoogleForm(exam._id);
                const url = exam.googleFormUrl || exam.onlineExamUrl;
                if (url) window.open(url, '_blank', 'noopener,noreferrer');
                else setMessage(t('exams.invalid_google_form'));
              } catch (err: any) {
                setMessage(err?.response?.data?.message || t('exams.send_failed'));
              }
            }}
          >
            {t('exams.start_exam')}
          </Button>
        </Card>
      )}

      {exam.deliveryMethod === 'in_person' && (
        <Card className="space-y-5 bg-white p-4 text-slate-900 sm:p-5 dark:bg-white">
          {questions.map((q: any, index: number) => {
            const dir = detectTextDirection(
              [q.text, ...(q.options || []).map((o: any) => o.text)].filter(Boolean).join(' ')
            );
            return (
              <div key={q._id} className="space-y-2">
                {index === firstMcqIndex ? (
                  <p className="exam-print-select-note exam-print-group-hint">{t('exams.select_one_mcq')}</p>
                ) : null}
                {index === firstTrueFalseIndex ? (
                  <p className="exam-print-select-note exam-print-group-hint">{t('exams.select_one_true_false')}</p>
                ) : null}

                <div
                  className="exam-print-question rounded-xl border border-slate-200 p-4"
                  dir={dir}
                  style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}
                >
                  <p className="exam-print-question-text break-words">
                    <span className="exam-print-qnum" dir="ltr">
                      {index + 1}.
                    </span>{' '}
                    {q.text}{' '}
                    <span className="exam-print-marks" dir="ltr">
                      ({q.marks} {t('exams.marks')})
                    </span>
                  </p>

                  {q.type === 'mcq' && (
                    <div className="exam-print-options-inline mt-2" dir={dir}>
                      {(q.options || []).map((opt: any) => (
                        <label
                          key={opt.key}
                          className="exam-print-option-inline cursor-pointer"
                          dir={detectTextDirection(opt.text)}
                        >
                          <input
                            type="radio"
                            className="h-4 w-4 shrink-0"
                            name={`q-${q._id}`}
                            checked={answers[q._id]?.selectedOptionKey === opt.key}
                            onChange={() =>
                              setAnswers((prev) => ({ ...prev, [q._id]: { selectedOptionKey: opt.key } }))
                            }
                            disabled={locked}
                          />
                          <span className="exam-print-option-key" dir="ltr">
                            {opt.key}.
                          </span>
                          <span className="exam-print-option-text break-words">{opt.text}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {q.type === 'true_false' && (
                    <div className="exam-print-options-inline mt-2" dir={dir}>
                      {['true', 'false'].map((value) => (
                        <label key={value} className="exam-print-option-inline cursor-pointer">
                          <input
                            type="radio"
                            className="h-4 w-4 shrink-0"
                            name={`q-${q._id}`}
                            checked={
                              answers[q._id]?.selectedOptionKey === value
                              || (value === 'true' && answers[q._id]?.booleanAnswer === true)
                              || (value === 'false' && answers[q._id]?.booleanAnswer === false)
                            }
                            onChange={() =>
                              setAnswers((prev) => ({
                                ...prev,
                                [q._id]: { selectedOptionKey: value, booleanAnswer: value === 'true' }
                              }))
                            }
                            disabled={locked}
                          />
                          <span>{t(`exams.${value}`)}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {(q.type === 'descriptive' || q.type === 'essay' || q.type === 'short_answer') && (
                    <>
                      <p className="exam-print-select-note">{t('exams.write_answer_hint')}</p>
                      <textarea
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-[12pt] leading-relaxed"
                        rows={5}
                        value={answers[q._id]?.descriptiveAnswer || ''}
                        onChange={(e) =>
                          setAnswers((prev) => ({ ...prev, [q._id]: { descriptiveAnswer: e.target.value } }))
                        }
                        disabled={locked}
                        placeholder={t('exams.write_answer_placeholder')}
                        dir={detectTextDirection(answers[q._id]?.descriptiveAnswer || q.text)}
                      />
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {!locked && (
            <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
              <Button variant="ghost" disabled={saveDraftMutation.isPending} onClick={() => saveDraftMutation.mutate()}>
                {t('exams.save_draft')}
              </Button>
              <Button
                disabled={submitMutation.isPending}
                onClick={() => {
                  if (window.confirm(t('exams.submit_confirm'))) submitMutation.mutate();
                }}
              >
                {t('exams.submit_exam')}
              </Button>
            </div>
          )}
        </Card>
      )}

      {submission && ['graded', 'released'].includes(String(submission.status)) && submission.resultReleasedAt && (
        <Card className="border-emerald-300 bg-emerald-50 p-4 text-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <p className="font-semibold">{t('exams.result')}</p>
          <p>
            {t('exams.obtained_marks')}: {submission.totalObtainedMarks} / {exam.totalMarks}
          </p>
          <p>{submission.passed ? t('exams.passed') : t('exams.failed')}</p>
        </Card>
      )}

      {message && <p className="text-sm text-sky-700 dark:text-sky-300">{message}</p>}
    </div>
  );
}
