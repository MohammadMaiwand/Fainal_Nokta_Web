import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { examsService, type ExamRecord } from '../services/examsService';

export function StudentExamsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const myQuery = useQuery({
    queryKey: ['exams-my'],
    queryFn: () => examsService.myExams()
  });

  const exams = myQuery.data ?? [];

  const grouped = useMemo(() => {
    const upcoming: ExamRecord[] = [];
    const active: ExamRecord[] = [];
    const completed: ExamRecord[] = [];
    const missed: ExamRecord[] = [];
    for (const exam of exams) {
      const status = String(exam.status || '');
      const accessible = Boolean((exam as any).accessible);
      const submissionStatus = String((exam as any).mySubmissionStatus || '');
      if (['submitted', 'graded', 'released'].includes(submissionStatus) || ['completed', 'closed', 'archived'].includes(status)) {
        completed.push(exam);
      } else if (accessible || status === 'active' || status === 'published') {
        active.push(exam);
      } else if (status === 'cancelled' || status === 'closed') {
        missed.push(exam);
      } else {
        upcoming.push(exam);
      }
    }
    return { upcoming, active, completed, missed };
  }, [exams]);

  const renderGroup = (title: string, list: ExamRecord[]) => (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold tracking-wide text-slate-500">{title}</h2>
      {list.length === 0 && <p className="text-xs text-slate-400">{t('exams.no_exams')}</p>}
      {list.map((exam) => (
        <button
          key={exam._id}
          type="button"
          onClick={() => navigate(`/exams/${exam._id}`)}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-start transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
        >
          <p className="break-words font-semibold text-slate-900 dark:text-white">{exam.title}</p>
          <p className="mt-1 break-words text-xs text-slate-500">
            {t(`exams.category_${exam.category || 'weekly'}`)} ·{' '}
            {t(`exams.delivery_${exam.deliveryMethod === 'in_person' ? 'in_person' : 'online'}`)} · {exam.subjectName} ·{' '}
            {exam.className}
          </p>
        </button>
      ))}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-1">
      <p className="text-xs tracking-[0.3em] text-slate-500">{t('exams.my_exams')}</p>

      <Card className="max-h-none space-y-5 overflow-visible p-4">
        {myQuery.isLoading && <p className="text-sm text-slate-500">{t('exams.loading')}</p>}
        {renderGroup(t('exams.active'), grouped.active)}
        {renderGroup(t('exams.upcoming'), grouped.upcoming)}
        {renderGroup(t('exams.completed'), grouped.completed)}
        {renderGroup(t('exams.missed'), grouped.missed)}
      </Card>
    </div>
  );
}
