import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { HISTORICAL_DATE_PERIODS, periodLabelKey, type QuickDatePeriod } from '@/utils/datePeriods';

export type FilterSelectOption = { value: string; label: string };

type DataFilterToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  period?: string;
  onPeriodChange?: (period: QuickDatePeriod) => void;
  from?: string;
  to?: string;
  onFromChange?: (value: string) => void;
  onToChange?: (value: string) => void;
  status?: string;
  statusOptions?: FilterSelectOption[];
  onStatusChange?: (value: string) => void;
  branchId?: string;
  branchOptions?: FilterSelectOption[];
  onBranchChange?: (value: string) => void;
  extraFilters?: React.ReactNode;
  activeCount?: number;
  onClear?: () => void;
  showDateFilters?: boolean;
};

export function DataFilterToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  period = 'all',
  onPeriodChange,
  from = '',
  to = '',
  onFromChange,
  onToChange,
  status = '',
  statusOptions,
  onStatusChange,
  branchId = '',
  branchOptions,
  onBranchChange,
  extraFilters,
  activeCount = 0,
  onClear,
  showDateFilters = true
}: DataFilterToolbarProps) {
  const { t } = useTranslation();
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const periodOptions = useMemo(
    () =>
      HISTORICAL_DATE_PERIODS.map((item) => ({
        value: item,
        label: t(periodLabelKey(item))
      })),
    [t]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-sm text-[var(--color-text-muted)]">{t('filters.search')}</label>
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder || t('filters.search_placeholder')}
            aria-label={t('filters.search')}
          />
        </div>
        {showDateFilters && onPeriodChange ? (
          <div className="w-full lg:w-56">
            <label className="mb-1 block text-sm text-[var(--color-text-muted)]">{t('filters.quick_date')}</label>
            <Select value={period} onChange={(value) => onPeriodChange(String(value) as QuickDatePeriod)} options={periodOptions} />
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setAdvancedOpen((current) => !current)}>
            <Filter className="h-4 w-4" />
            {t('filters.filter')}
            {activeCount > 0 ? ` (${activeCount})` : ''}
          </Button>
          {onClear && activeCount > 0 ? (
            <Button type="button" variant="outline" onClick={onClear}>
              {t('filters.clear_all')}
            </Button>
          ) : null}
        </div>
      </div>

      {advancedOpen ? (
        <div className="grid gap-3 rounded-xl border p-4 md:grid-cols-2 xl:grid-cols-4" style={{ borderColor: 'var(--color-border)' }}>
          {statusOptions && onStatusChange ? (
            <div>
              <label className="mb-1 block text-sm text-[var(--color-text-muted)]">{t('filters.status')}</label>
              <Select
                value={status}
                onChange={(value) => onStatusChange(String(value))}
                options={[{ value: '', label: t('filters.all_statuses') }, ...statusOptions]}
              />
            </div>
          ) : null}
          {branchOptions && onBranchChange ? (
            <div>
              <label className="mb-1 block text-sm text-[var(--color-text-muted)]">{t('filters.branch')}</label>
              <Select
                value={branchId}
                onChange={(value) => onBranchChange(String(value))}
                options={[{ value: '', label: t('filters.all_branches') }, ...branchOptions]}
              />
            </div>
          ) : null}
          {showDateFilters && period === 'custom' ? (
            <>
              <div>
                <label className="mb-1 block text-sm text-[var(--color-text-muted)]">{t('filters.from_date')}</label>
                <Input type="date" value={from} onChange={(event) => onFromChange?.(event.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--color-text-muted)]">{t('filters.to_date')}</label>
                <Input type="date" value={to} onChange={(event) => onToChange?.(event.target.value)} />
              </div>
            </>
          ) : null}
          {extraFilters}
        </div>
      ) : null}
    </div>
  );
}
