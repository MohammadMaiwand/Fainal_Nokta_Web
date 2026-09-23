import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { dashboardService, type DashboardPeriod } from '@/features/dashboard/services/dashboardService';
import { DashboardPeriodFilters } from '@/features/dashboard/components/DashboardPeriodFilters';
import { SuperAdminDashboardSections } from '@/features/dashboard/components/SuperAdminDashboardSections';
import DashboardAnalytics from '@/features/dashboard/components/DashboardAnalytics';
import { Card } from '@/components/ui/Card';

export function SuperAdminDashboard() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<DashboardPeriod>('month');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-full', period],
    queryFn: () => dashboardService.summary(period)
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="mb-2 h-4 w-3/4 rounded bg-slate-700" />
              <div className="h-8 w-1/2 rounded bg-slate-700" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-12 text-center">
        <p className="text-slate-400">{t('errors.unable_load_records')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">{t('dashboard.super_admin_dashboard')}</h1>
          <p className="mt-2 text-slate-400">{t('common.live_school_metrics')}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <DashboardPeriodFilters value={period} onChange={setPeriod} disabled={isLoading} />
          <Link
            to="/dashboard/super-admin/master"
            className="inline-flex items-center justify-center rounded-[28px] border border-sky-400/30 bg-sky-500/10 px-5 py-3 text-sm font-semibold text-sky-100 transition duration-300 hover:bg-sky-500/20"
          >
            {t('dashboard.open_master_dashboard', { defaultValue: 'Open master management view' })}
          </Link>
        </div>
      </div>

      <SuperAdminDashboardSections
        summary={data}
        period={period}
        onPeriodChange={setPeriod}
        disabled={isLoading}
      />
      <DashboardAnalytics
        summary={data}
        period={period}
        onPeriodChange={setPeriod}
        periodFilterDisabled={isLoading}
        showPeriodFilter
      />
    </div>
  );
}
