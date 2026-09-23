import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { formatJalaliDate } from '@/utils/date';

type PrintHeaderProps = {
  title: string;
  subtitle?: string;
  branchName?: string;
  periodLabel?: string;
  filterSummary?: string;
  referenceNumber?: string;
  printedBy?: string;
  extra?: ReactNode;
};

export function PrintHeader({
  title,
  subtitle,
  branchName,
  periodLabel,
  filterSummary,
  referenceNumber,
  printedBy,
  extra
}: PrintHeaderProps) {
  const { t, i18n } = useTranslation();

  return (
    <header className="print-report-header mb-4 border-b border-slate-400 pb-3 text-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="/images/1.png"
            alt="Nokta Academy"
            className="h-12 w-12 object-contain"
          />
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-600">{t('common.home_brand')}</p>
            <h1 className="text-lg font-bold">{title}</h1>
            {subtitle ? <p className="text-sm text-slate-700">{subtitle}</p> : null}
          </div>
        </div>
        <div className="text-xs text-slate-700">
          {referenceNumber ? (
            <p>
              {t('print.reference')}: {referenceNumber}
            </p>
          ) : null}
          <p>
            {t('print.printed_at')}: {formatJalaliDate(new Date(), i18n.resolvedLanguage)}
          </p>
          {printedBy ? (
            <p>
              {t('print.printed_by')}: {printedBy}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-2 grid gap-1 text-xs text-slate-700 sm:grid-cols-2">
        {branchName ? (
          <p>
            {t('common.branch')}: {branchName}
          </p>
        ) : null}
        {periodLabel ? (
          <p>
            {t('print.period')}: {periodLabel}
          </p>
        ) : null}
        {filterSummary ? (
          <p className="sm:col-span-2">
            {t('print.filter_summary')}: {filterSummary}
          </p>
        ) : null}
      </div>
      {extra}
    </header>
  );
}
