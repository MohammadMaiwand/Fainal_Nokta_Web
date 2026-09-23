import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Select } from '@/components/ui/Select';
import type { DashboardPeriod } from '@/features/dashboard/services/dashboardService';

const periods: DashboardPeriod[] = ['day', 'month', 'quarter', 'year'];

const periodLabelKeys: Record<DashboardPeriod, string> = {
  day: 'dashboard.period_day',
  month: 'dashboard.period_month',
  quarter: 'dashboard.period_quarter',
  year: 'dashboard.period_year'
};

type DashboardPeriodFiltersProps = {
  value: DashboardPeriod;
  onChange: (period: DashboardPeriod) => void;
  disabled?: boolean;
  variant?: 'default' | 'inline';
  id?: string;
};

export function DashboardPeriodFilters({
  value,
  onChange,
  disabled,
  variant = 'default',
  id = 'dashboard-period-filter'
}: DashboardPeriodFiltersProps) {
  const { t } = useTranslation();

  const options = useMemo(
    () => periods.map((period) => ({
      value: period,
      label: t(periodLabelKeys[period])
    })),
    [t]
  );

  const isInline = variant === 'inline';

  return (
    <div className={isInline ? 'w-full min-w-[9rem] max-w-[11rem]' : 'w-full max-w-xs'}>
      <Select
        id={id}
        label={isInline ? undefined : t('dashboard.period_filter_label')}
        value={value}
        options={options}
        disabled={disabled}
        placeholder={t('dashboard.period_filter_label')}
        onChange={(next) => onChange(next as DashboardPeriod)}
      />
    </div>
  );
}
