import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import DashboardAnalytics from '@/features/dashboard/components/DashboardAnalytics';
import { dashboardService } from '@/features/dashboard/services/dashboardService';

export function AnalyticsPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboardAnalytics'],
    queryFn: () => dashboardService.summary()
  });

  return (
    <div className="space-y-6">
      {isError && (
        <Card className="border border-rose-500/40 bg-rose-500/5 p-6 text-rose-200">
          <p>{t('errors.unable_load_records')}</p>
        </Card>
      )}
      <DashboardAnalytics summary={data ?? {}} loading={isLoading} />
    </div>
  );
}
