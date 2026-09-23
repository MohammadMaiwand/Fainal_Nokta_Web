import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export type ActiveFilterChip = {
  key: string;
  label: string;
  onRemove: () => void;
};

type ActiveFilterChipsProps = {
  chips: ActiveFilterChip[];
  onClearAll?: () => void;
  resultCount?: number;
};

export function ActiveFilterChips({ chips, onClearAll, resultCount }: ActiveFilterChipsProps) {
  const { t } = useTranslation();
  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border p-3" style={{ borderColor: 'var(--color-border)' }}>
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        {t('filters.active_filters')} ({chips.length})
      </span>
      {typeof resultCount === 'number' ? (
        <span className="text-xs text-[var(--color-text-muted)]">
          {t('filters.matching_results', { count: resultCount, defaultValue: `${resultCount} matching results` })}
        </span>
      ) : null}
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs text-sky-800 dark:text-sky-200"
        >
          {chip.label}
          <X className="h-3 w-3" aria-hidden />
          <span className="sr-only">{t('filters.remove_filter')}</span>
        </button>
      ))}
      {onClearAll ? (
        <Button type="button" variant="outline" size="sm" onClick={onClearAll}>
          {t('filters.clear_all')}
        </Button>
      ) : null}
    </div>
  );
}
