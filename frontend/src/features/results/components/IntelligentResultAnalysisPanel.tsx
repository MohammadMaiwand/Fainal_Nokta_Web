import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api } from '@/services/apiClient';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { isAppOffline } from '@/utils/network';

type Recommendation = {
  _id: string;
  resourceType: string;
  resourceTitle: string;
  resourceUrl?: string;
  reason?: string;
  offlineAvailable?: boolean;
};

type InsightPayload = {
  insight: {
    overallScore?: number;
    percentage?: number;
    grade?: string;
    resultBand?: string;
    trendStatus?: string;
    detailedTrendStatus?: string;
    strengths?: string[];
    weaknesses?: string[];
    strongAreas?: string[];
    weakAreas?: string[];
    feedbackMessage?: string;
    trendMessage?: string;
    studentSummary?: string;
    parentSummary?: string;
    teacherNotesSuggestion?: string;
    classComparison?: string;
    confidence?: string;
  } | null;
  recommendations?: Recommendation[];
  generatedAt?: string | null;
};

function bandClass(band?: string) {
  if (band === 'EXCELLENT' || band === 'VERY_GOOD') return 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30';
  if (band === 'GOOD' || band === 'SATISFACTORY') return 'bg-sky-500/20 text-sky-200 border-sky-400/30';
  if (band === 'NEEDS_IMPROVEMENT') return 'bg-amber-500/20 text-amber-200 border-amber-400/30';
  if (band === 'POOR') return 'bg-rose-500/20 text-rose-200 border-rose-400/30';
  return 'bg-white/5 text-slate-200 border-white/10';
}

function useOnlineStatus() {
  const [online, setOnline] = useState(!isAppOffline());
  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);
  return online;
}

export function IntelligentResultAnalysisPanel({
  resultId,
  canManage,
  viewer = 'student'
}: {
  resultId: string;
  canManage?: boolean;
  viewer?: 'student' | 'parent' | 'teacher';
}) {
  const { t, i18n } = useTranslation();
  const online = useOnlineStatus();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['intelligence-result-analysis', resultId, i18n.language],
    queryFn: async () => {
      const response = await api.get(`/intelligence/exam-results/${resultId}/analysis`);
      return (response.data?.data ?? null) as InsightPayload | null;
    },
    enabled: Boolean(resultId)
  });

  const recalculate = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/intelligence/exam-results/${resultId}/recalculate-analysis`, {
        lang: i18n.language
      });
      return response.data?.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['intelligence-result-analysis', resultId] });
    }
  });

  const assignMutation = useMutation({
    mutationFn: (id: string) => api.post(`/intelligence/recommendations/${id}/assign`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['intelligence-result-analysis', resultId] })
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => api.post(`/intelligence/recommendations/${id}/dismiss`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['intelligence-result-analysis', resultId] })
  });

  const insight = data?.insight;
  const recommendations = data?.recommendations ?? [];

  return (
    <Card className="mt-6 border border-primary/20 bg-primary/5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-primary">
            {t('intelligence.result_analysis', { defaultValue: 'Intelligent Result Analysis' })}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {t('intelligence.assistant_notice', {
              defaultValue: 'Assistant analysis — official grading remains authoritative.'
            })}
          </p>
        </div>
        {canManage && online && (
          <Button variant="outline" size="sm" disabled={recalculate.isPending} onClick={() => recalculate.mutate()}>
            {recalculate.isPending ? t('common.loading') : t('common.regenerate', { defaultValue: 'Recalculate' })}
          </Button>
        )}
      </div>

      {!online && (
        <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {t('intelligence.offline_cached', {
            defaultValue: 'Offline information — showing the last available analysis.',
            timestamp: data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : '—'
          })}
        </p>
      )}

      {isLoading && <p className="mt-4 text-sm text-slate-400">{t('common.loading')}</p>}
      {isError && online && (
        <p className="mt-4 text-sm text-rose-300">
          {t('intelligence.analysis_error', { defaultValue: 'Unable to load analysis.' })}
        </p>
      )}
      {!isLoading && !insight && (
        <p className="mt-4 text-sm text-slate-400">
          {t('intelligence.no_analysis_yet', {
            defaultValue: 'No analysis yet. It will appear after the result is published.'
          })}
        </p>
      )}

      {insight && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${bandClass(insight.resultBand)}`}>
              {t(`intelligence.band_${String(insight.resultBand || 'unknown').toLowerCase()}`, {
                defaultValue: insight.resultBand || 'Status'
              })}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
              {t('common.score', { defaultValue: 'Score' })}: {insight.percentage ?? insight.overallScore}% ({insight.grade})
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
              {t('intelligence.trend', { defaultValue: 'Trend' })}: {insight.detailedTrendStatus || insight.trendStatus}
            </span>
            {insight.confidence && (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                {t('intelligence.confidence', { defaultValue: 'Confidence' })}: {insight.confidence}
              </span>
            )}
          </div>

          <p className="text-sm leading-relaxed text-slate-200">
            {viewer === 'parent'
              ? insight.parentSummary || insight.feedbackMessage
              : insight.feedbackMessage || insight.studentSummary}
          </p>
          {insight.trendMessage ? <p className="text-sm text-slate-400">{insight.trendMessage}</p> : null}
          {insight.classComparison ? <p className="text-sm text-slate-400">{insight.classComparison}</p> : null}

          <div className="grid gap-4 md:grid-cols-2">
            <AreaList
              title={t('intelligence.strong_areas', { defaultValue: 'Strong areas' })}
              items={insight.strongAreas?.length ? insight.strongAreas : insight.strengths}
              empty={t('intelligence.no_topic_evidence', { defaultValue: 'No topic-level evidence available.' })}
            />
            <AreaList
              title={t('intelligence.areas_to_improve', { defaultValue: 'Areas to improve' })}
              items={insight.weakAreas?.length ? insight.weakAreas : insight.weaknesses}
              empty={t('intelligence.no_topic_evidence', { defaultValue: 'No topic-level evidence available.' })}
            />
          </div>

          {viewer === 'teacher' && insight.teacherNotesSuggestion ? (
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-100">
                {t('intelligence.teacher_interventions', { defaultValue: 'Recommended interventions' })}
              </p>
              <p className="text-sm text-slate-300">{insight.teacherNotesSuggestion}</p>
            </div>
          ) : null}

          <div>
            <p className="mb-3 text-sm font-semibold text-slate-100">
              {t('intelligence.recommended_learning', { defaultValue: 'Recommended learning' })}
            </p>
            {!recommendations.length ? (
              <p className="text-sm text-slate-400">
                {t('intelligence.no_resources', { defaultValue: 'No relevant learning resources were found.' })}
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {recommendations.map((item) => (
                  <div key={item._id} className="rounded-2xl border border-border bg-background/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">{item.resourceType}</p>
                        <p className="mt-1 font-medium text-slate-100">{item.resourceTitle}</p>
                        <p className="mt-2 text-xs text-slate-400">{item.reason}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] ${
                          item.offlineAvailable ? 'bg-emerald-500/20 text-emerald-200' : 'bg-slate-500/20 text-slate-300'
                        }`}
                      >
                        {item.offlineAvailable
                          ? t('intelligence.available_offline', { defaultValue: 'Available offline' })
                          : t('intelligence.requires_internet', { defaultValue: 'Requires internet' })}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.resourceUrl ? (
                        <Link to={item.resourceUrl} className="text-xs font-semibold text-primary hover:underline">
                          {t('common.open', { defaultValue: 'Open' })}
                        </Link>
                      ) : null}
                      {canManage && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => assignMutation.mutate(item._id)}>
                            {t('intelligence.assign', { defaultValue: 'Assign' })}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => dismissMutation.mutate(item._id)}>
                            {t('intelligence.hide', { defaultValue: 'Hide' })}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function AreaList({ title, items, empty }: { title: string; items?: string[]; empty: string }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-100">{title}</p>
      {!items?.length ? (
        <p className="text-sm text-slate-400">{empty}</p>
      ) : (
        <ul className="list-disc space-y-1 ps-5 text-sm text-slate-300">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
