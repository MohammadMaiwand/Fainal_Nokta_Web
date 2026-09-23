import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';

type AiMeSummary = {
  insight?: {
    studentSummary?: string;
    parentSummary?: string;
    recommendations?: string[];
    riskLevel?: string;
    trendStatus?: string;
    overallScore?: number;
    grade?: string;
  } | null;
  totalInsights?: number;
  highRiskCount?: number;
};

function riskClass(risk?: string) {
  if (risk === 'high') return 'text-rose-300';
  if (risk === 'medium') return 'text-amber-300';
  return 'text-emerald-300';
}

export function AiInsightSummaryCard({
  summary,
  variant
}: {
  summary: AiMeSummary | null | undefined;
  variant: 'student' | 'parent';
}) {
  const { t } = useTranslation();
  const insight = summary?.insight;
  const title = variant === 'student'
    ? t('common.learning_insights', { defaultValue: 'Your learning insights' })
    : t('common.student_progress_insight', { defaultValue: 'Student progress insight' });

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
        {insight && (
          <span className={`text-xs font-semibold uppercase tracking-wide ${riskClass(insight.riskLevel)}`}>
            {t('common.risk_level', { defaultValue: 'Risk' })}: {insight.riskLevel}
          </span>
        )}
      </div>

      {insight ? (
        <div className="mt-3 space-y-3 text-sm text-slate-300">
          <p>{variant === 'student' ? insight.studentSummary : insight.parentSummary}</p>
          <p className="text-slate-400">{(insight.recommendations ?? []).slice(0, 2).join(' ')}</p>
          <div className="flex flex-wrap gap-4 text-xs text-slate-400">
            <span>{t('common.score', { defaultValue: 'Score' })}: {insight.overallScore} ({insight.grade})</span>
            <span>{t('common.trend_status', { defaultValue: 'Trend' })}: {insight.trendStatus}</span>
            {(summary?.highRiskCount ?? 0) > 0 && (
              <span className="text-rose-300">
                {t('common.high_risk_count', { defaultValue: 'High risk items', count: summary?.highRiskCount })}
              </span>
            )}
          </div>
          <Link to="/results" className="inline-flex text-sm font-semibold text-primary hover:underline">
            {t('common.view_results', { defaultValue: 'View results' })}
          </Link>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-400">{t('common.no_insight_yet', { defaultValue: 'No insight yet.' })}</p>
      )}
    </Card>
  );
}
