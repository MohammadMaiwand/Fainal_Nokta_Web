import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
};

type ListPaginationProps = {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizeOptions?: number[];
  disabled?: boolean;
};

export function ListPagination({
  meta,
  onPageChange,
  onLimitChange,
  pageSizeOptions = [10, 20, 25, 50, 100],
  disabled
}: ListPaginationProps) {
  const { t } = useTranslation();
  const totalPages = meta.totalPages || Math.max(1, Math.ceil((meta.total || 0) / (meta.limit || 1)) || 1);
  const page = meta.page || 1;
  const hasPrev = meta.hasPreviousPage ?? page > 1;
  const hasNext = meta.hasNextPage ?? page < totalPages;

  return (
    <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'var(--color-border)' }}>
      <p className="text-sm text-[var(--color-text-muted)]">
        {t('filters.results_count', {
          count: meta.total || 0,
          page,
          pages: totalPages,
          defaultValue: `${meta.total || 0} results · page ${page} of ${totalPages}`
        })}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {onLimitChange ? (
          <Select
            value={String(meta.limit || 20)}
            onChange={(value) => onLimitChange(Number(value))}
            options={pageSizeOptions.map((size) => ({
              value: String(size),
              label: t('filters.page_size_option', {
                size,
                defaultValue: `${size} / page`
              })
            }))}
            disabled={disabled}
          />
        ) : null}
        <Button type="button" variant="outline" size="sm" disabled={disabled || !hasPrev} onClick={() => onPageChange(page - 1)}>
          {t('filters.previous_page')}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={disabled || !hasNext} onClick={() => onPageChange(page + 1)}>
          {t('filters.next_page')}
        </Button>
      </div>
    </div>
  );
}
