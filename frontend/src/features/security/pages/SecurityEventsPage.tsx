import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/apiClient';
import { formatDateTime } from '@/utils/formatters';

type SecurityEvent = {
  _id: string;
  action: string;
  severity: 'info' | 'warning' | 'critical';
  createdAt: string;
  targetType?: string;
  target?: string;
};

export function SecurityEventsPage() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['security-events'],
    queryFn: () => api.get('/audit/security-events', { params: { page: 1, limit: 50 } }).then((res) => res.data.data as SecurityEvent[])
  });

  return (
    <div className="app-surface rounded-2xl p-4">
      <h2 className="mb-3 text-lg font-semibold">{t('common.security_events')}</h2>
      {isLoading ? <p className="app-text-muted text-sm">{t('common.loading')}</p> : null}
      <div className="space-y-2">
        {(data ?? []).map((item) => (
          <div key={item._id} className="rounded-xl border border-slate-200/60 p-3 dark:border-slate-700">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">{item.action}</span>
              <span className="app-text-muted text-xs">{formatDateTime(item.createdAt, i18n.resolvedLanguage)}</span>
            </div>
            <div className="mt-1 text-xs">
              <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">{item.severity}</span>
              {item.targetType ? <span className="ms-2">{item.targetType}</span> : null}
              {item.target ? <span className="ms-2">{item.target}</span> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
