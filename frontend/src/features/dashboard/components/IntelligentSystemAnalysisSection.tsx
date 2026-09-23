import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, Info, Lightbulb, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/services/apiClient';
import { isAppOffline } from '@/utils/network';
import type { DashboardPeriod } from '@/features/dashboard/services/dashboardService';

type Insight = {
  _id: string;
  category: string;
  type: string;
  titleKey: string;
  descriptionKey: string;
  descriptionData?: Record<string, unknown>;
  metricValue?: number | null;
  comparisonValue?: number | null;
  relatedRoute?: string;
  priority?: number;
  confidence?: string;
  generatedAt?: string;
};

type Escalation = {
  _id: string;
  unansweredCount: number;
  priority: string;
  senderName?: string;
  messagePreview?: string;
  waitingDurationMinutes?: number;
  alertData?: { text?: string; count?: number };
};

function typeIcon(type: string) {
  if (type === 'CRITICAL' || type === 'WARNING') return AlertTriangle;
  if (type === 'SUCCESS') return CheckCircle2;
  if (type === 'RECOMMENDATION') return Lightbulb;
  if (type === 'INSUFFICIENT_DATA') return ShieldAlert;
  return Info;
}

function typeClass(type: string) {
  if (type === 'CRITICAL') return 'border-rose-400/40 bg-rose-500/10';
  if (type === 'WARNING') return 'border-amber-400/40 bg-amber-500/10';
  if (type === 'SUCCESS') return 'border-emerald-400/40 bg-emerald-500/10';
  if (type === 'INSUFFICIENT_DATA') return 'border-slate-400/30 bg-slate-500/10';
  return 'border-sky-400/30 bg-sky-500/10';
}

export function IntelligentSystemAnalysisSection({
  period,
  enabled = true
}: {
  period: DashboardPeriod;
  enabled?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
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

  const { data, isLoading, isError } = useQuery({
    queryKey: ['intelligence-dashboard', period, i18n.language],
    queryFn: async () => {
      const response = await api.get('/intelligence/dashboard/intelligent-insights', {
        params: { period },
        timeout: 20000
      });
      return response.data?.data as {
        insights: Insight[];
        escalations?: Escalation[];
        generatedAt?: string;
        cached?: boolean;
      };
    },
    enabled,
    staleTime: 120_000,
    retry: 1,
    refetchOnWindowFocus: false
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => api.post(`/intelligence/dashboard/insights/${id}/dismiss`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['intelligence-dashboard'] })
  });

  const resolveEscalation = useMutation({
    mutationFn: (id: string) => api.post(`/intelligence/messages/escalations/${id}/resolve`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['intelligence-dashboard'] })
  });

  if (!enabled) return null;

  const insights = data?.insights ?? [];
  const escalations = data?.escalations ?? [];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">
            {t('intelligence.system_analysis', { defaultValue: 'Intelligent System Analysis' })}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {t('intelligence.system_analysis_help', {
              defaultValue: 'Live operational insights from enrollment, attendance, results, teaching, and messaging.'
            })}
          </p>
        </div>
        {!online && (
          <p className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-100">
            {t('intelligence.offline_cached', {
              defaultValue: 'Offline information — last updated {{timestamp}}.',
              timestamp: data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : '—'
            })}
          </p>
        )}
      </div>

      {isLoading && <p className="text-sm text-slate-400">{t('common.loading')}</p>}

      {isError && !isLoading && (
        <Card className="p-5 text-sm text-slate-400">
          {t('intelligence.analysis_error', { defaultValue: 'Unable to load analysis.' })}
        </Card>
      )}

      {!isLoading && !isError && !insights.length && (
        <Card className="p-5 text-sm text-slate-400">
          {t('intelligence.insight_insufficient_data', {
            defaultValue: 'There is not enough information to generate a reliable analysis.'
          })}
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {insights.map((insight) => {
          const Icon = typeIcon(insight.type);
          return (
            <Card key={insight._id} className={`border p-5 ${typeClass(insight.type)}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-5 w-5 text-slate-200" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">{insight.category}</p>
                    <h3 className="mt-1 font-semibold text-slate-100">
                      {t(insight.titleKey, {
                        defaultValue: insight.titleKey,
                        ...(insight.descriptionData || {})
                      })}
                    </h3>
                    <p className="mt-2 text-sm text-slate-300">
                      {t(insight.descriptionKey, {
                        defaultValue: insight.descriptionKey,
                        ...(insight.descriptionData || {})
                      })}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
                      {insight.metricValue !== null && insight.metricValue !== undefined && (
                        <span>
                          {t('intelligence.metric', { defaultValue: 'Metric' })}: {insight.metricValue}
                        </span>
                      )}
                      {insight.confidence && (
                        <span>
                          {t('intelligence.confidence', { defaultValue: 'Confidence' })}: {insight.confidence}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {insight.relatedRoute ? (
                    <Link to={insight.relatedRoute} className="text-xs font-semibold text-primary hover:underline">
                      {t('common.view', { defaultValue: 'View' })}
                    </Link>
                  ) : null}
                  {online && (
                    <Button size="sm" variant="ghost" onClick={() => dismissMutation.mutate(insight._id)}>
                      {t('common.dismiss', { defaultValue: 'Dismiss' })}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {escalations.length > 0 && (
        <Card className="border border-rose-400/30 bg-rose-500/5 p-5">
          <h3 className="font-semibold text-slate-100">
            {t('intelligence.unanswered_alerts', { defaultValue: 'Unanswered message alerts' })}
          </h3>
          <div className="mt-4 space-y-3">
            {escalations.slice(0, 5).map((item) => (
              <div key={item._id} className="rounded-2xl border border-border bg-background/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-100">
                      {item.alertData?.text ||
                        t('intelligence.unanswered_message_alert', {
                          defaultValue: 'This user has sent {{count}} messages and has not received a reply.',
                          count: item.unansweredCount
                        })}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.senderName || t('common.user', { defaultValue: 'User' })} · {item.priority} ·{' '}
                      {item.waitingDurationMinutes || 0} min
                    </p>
                    {item.messagePreview ? (
                      <p className="mt-2 line-clamp-2 text-xs text-slate-500">{item.messagePreview}</p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Link to="/messages" className="text-xs font-semibold text-primary hover:underline">
                      {t('intelligence.open_conversation', { defaultValue: 'Open conversation' })}
                    </Link>
                    {online && (
                      <Button size="sm" variant="outline" onClick={() => resolveEscalation.mutate(item._id)}>
                        {t('common.resolve', { defaultValue: 'Resolve' })}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </section>
  );
}
