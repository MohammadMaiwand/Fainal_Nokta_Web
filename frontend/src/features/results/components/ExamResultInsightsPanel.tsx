import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/apiClient';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type StudentInsight = {
  overallScore?: number;
  grade?: string;
  trendStatus?: string;
  riskLevel?: string;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
  teacherNotesSuggestion?: string;
  parentSummary?: string;
  studentSummary?: string;
  classComparison?: string;
  generatedBy?: string;
};

type ClassInsight = {
  averageScore?: number;
  passRate?: number;
  failRate?: number;
  atRiskStudentCount?: number;
  unusualScoreDistribution?: string;
  recommendations?: string[];
};

function riskBadgeClass(risk?: string) {
  if (risk === 'high') return 'bg-rose-500/20 text-rose-200 border border-rose-400/30';
  if (risk === 'medium') return 'bg-amber-500/20 text-amber-200 border border-amber-400/30';
  return 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30';
}

export function ExamResultInsightsPanel({
  resultId,
  examId,
  canRegenerate,
  onClose
}: {
  resultId?: string;
  examId?: string;
  canRegenerate?: boolean;
  onClose?: () => void;
}) {
  const { t } = useTranslation();

  const { data: insight, isLoading, refetch } = useQuery({
    queryKey: ['ai-result-insight', resultId, examId],
    queryFn: async () => {
      if (resultId) {
        const response = await api.get(`/ai-results/result/${resultId}`);
        return (response.data?.data ?? null) as StudentInsight | null;
      }
      if (examId) {
        const response = await api.get(`/ai-results/exam/${examId}`);
        return (response.data?.data?.classInsight ?? null) as ClassInsight | null;
      }
      return null;
    },
    enabled: Boolean(resultId || examId)
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      if (resultId) {
        return api.post(`/ai-results/generate/${resultId}`).then((res) => res.data.data);
      }
      if (examId) {
        return api.post(`/ai-results/generate-exam/${examId}`).then((res) => res.data.data);
      }
      throw new Error('Missing target id');
    },
    onSuccess: () => {
      void refetch();
    }
  });

  if (!resultId && !examId) return null;

  const isClassInsight = Boolean(examId && !resultId);
  const title = isClassInsight
    ? t('common.class_analytics', { defaultValue: 'Class analytics' })
    : t('common.ai_insights', { defaultValue: 'AI insights' });

  const studentInsight = insight as StudentInsight | null;
  const classInsight = insight as ClassInsight | null;

  return (
    <Card className="border border-indigo-400/30 bg-indigo-500/5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-indigo-300">{title}</p>
          {studentInsight?.generatedBy && (
            <p className="mt-1 text-xs text-slate-400">
              {t('common.category', { defaultValue: 'Source' })}: {studentInsight.generatedBy}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {canRegenerate && (
            <Button
              variant="outline"
              size="sm"
              disabled={regenerateMutation.isPending}
              onClick={() => regenerateMutation.mutate()}
            >
              {regenerateMutation.isPending ? t('common.loading') : t('common.regenerate', { defaultValue: 'Regenerate' })}
            </Button>
          )}
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              {t('common.close')}
            </Button>
          )}
        </div>
      </div>

      {isLoading && <p className="mt-4 text-sm text-slate-400">{t('common.loading')}</p>}
      {!isLoading && !insight && (
        <p className="mt-4 text-sm text-slate-400">{t('common.no_insight_yet', { defaultValue: 'No insight yet. Generate to create one.' })}</p>
      )}

      {!isClassInsight && studentInsight && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${riskBadgeClass(studentInsight.riskLevel)}`}>
              {t('common.risk_level', { defaultValue: 'Risk' })}: {studentInsight.riskLevel}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
              {t('common.trend_status', { defaultValue: 'Trend' })}: {studentInsight.trendStatus}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
              {t('common.score', { defaultValue: 'Score' })}: {studentInsight.overallScore} ({studentInsight.grade})
            </span>
          </div>
          {studentInsight.classComparison ? <p className="text-sm text-slate-300">{studentInsight.classComparison}</p> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <InsightList title={t('common.strengths', { defaultValue: 'Strengths' })} items={studentInsight.strengths} />
            <InsightList title={t('common.weaknesses', { defaultValue: 'Weaknesses' })} items={studentInsight.weaknesses} />
            <InsightList title={t('common.recommendations', { defaultValue: 'Recommendations' })} items={studentInsight.recommendations} />
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-100">{t('common.student_summary', { defaultValue: 'Student' })}</p>
              <p className="text-sm text-slate-300">{studentInsight.studentSummary}</p>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-100">{t('common.parent_summary', { defaultValue: 'Parent' })}</p>
              <p className="text-sm text-slate-300">{studentInsight.parentSummary}</p>
            </div>
          </div>
          {studentInsight.teacherNotesSuggestion ? (
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-100">{t('common.recommended_actions', { defaultValue: 'Teacher actions' })}</p>
              <p className="text-sm text-slate-300">{studentInsight.teacherNotesSuggestion}</p>
            </div>
          ) : null}
        </div>
      )}

      {isClassInsight && classInsight && (
        <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
          <p><strong>{t('common.average_score', { defaultValue: 'Average score' })}:</strong> {classInsight.averageScore}</p>
          <p><strong>{t('common.pass_rate', { defaultValue: 'Pass rate' })}:</strong> {classInsight.passRate}%</p>
          <p><strong>{t('common.fail_rate', { defaultValue: 'Fail rate' })}:</strong> {classInsight.failRate}%</p>
          <p><strong>{t('common.warning', { defaultValue: 'At-risk students' })}:</strong> {classInsight.atRiskStudentCount}</p>
          {classInsight.unusualScoreDistribution ? <p className="text-slate-400 md:col-span-2">{classInsight.unusualScoreDistribution}</p> : null}
          <div className="md:col-span-2">
            <p className="mb-2 font-semibold text-slate-100">{t('common.recommendations', { defaultValue: 'Recommendations' })}</p>
            <ul className="list-disc space-y-1 ps-5">
              {(classInsight.recommendations ?? []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}

function InsightList({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) {
    return (
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-100">{title}</p>
        <p className="text-sm text-slate-400">—</p>
      </div>
    );
  }
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-100">{title}</p>
      <ul className="list-disc space-y-1 ps-5 text-sm text-slate-300">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
