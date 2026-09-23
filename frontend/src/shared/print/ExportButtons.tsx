import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { exportElement, type ExportFormat } from './exportElement';
import type { PrintOrientation } from './printElement';
import { getPrintDirection } from './printElement';

type ExportButtonsProps = {
  targetId?: string;
  targetSelector?: string;
  title?: string;
  fileName?: string;
  orientation?: PrintOrientation;
  className?: string;
  disabled?: boolean;
  showPdf?: boolean;
  showExcel?: boolean;
  beforeExport?: (format: ExportFormat) => boolean | Promise<boolean>;
};

export function ExportButtons({
  targetId,
  targetSelector,
  title,
  fileName,
  orientation = 'portrait',
  className,
  disabled,
  showPdf = true,
  showExcel = true,
  beforeExport
}: ExportButtonsProps) {
  const { t, i18n } = useTranslation();
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const [message, setMessage] = useState('');

  const runExport = async (format: ExportFormat) => {
    setMessage('');
    setBusy(format);
    try {
      if (beforeExport) {
        const allowed = await beforeExport(format);
        if (!allowed) return;
      }
      const ok = await exportElement(format, {
        targetId,
        targetSelector,
        title,
        fileName: fileName || title,
        orientation,
        onEmpty: () => setMessage(t('print.no_data'))
      });
      if (!ok && !message) {
        setMessage(t('print.no_data'));
      }
    } catch (error: any) {
      setMessage(error?.message || t('print.export_failed', { defaultValue: 'Export failed.' }));
    } finally {
      setBusy(null);
    }
  };

  // Keep language direction consistent with print (used by clone portal via document.dir)
  void getPrintDirection(i18n.resolvedLanguage || i18n.language);

  return (
    <div className={`no-print inline-flex flex-col items-start gap-1 ${className || ''}`.trim()} data-no-print>
      <div className="flex flex-wrap gap-2">
        {showPdf ? (
          <Button
            type="button"
            variant="outline"
            disabled={disabled || Boolean(busy)}
            onClick={() => {
              void runExport('pdf');
            }}
          >
            <FileText className="h-4 w-4" />
            {busy === 'pdf' ? t('print.preparing_export', { defaultValue: 'Preparing…' }) : t('finance.export_pdf', { defaultValue: 'Export PDF' })}
          </Button>
        ) : null}
        {showExcel ? (
          <Button
            type="button"
            variant="outline"
            disabled={disabled || Boolean(busy)}
            onClick={() => {
              void runExport('excel');
            }}
          >
            <FileSpreadsheet className="h-4 w-4" />
            {busy === 'excel' ? t('print.preparing_export', { defaultValue: 'Preparing…' }) : t('finance.export_excel', { defaultValue: 'Export Excel' })}
          </Button>
        ) : null}
        {!showPdf && !showExcel ? (
          <Button type="button" variant="outline" disabled>
            <Download className="h-4 w-4" />
            {t('common.export', { defaultValue: 'Export' })}
          </Button>
        ) : null}
      </div>
      {message ? <p className="text-xs text-amber-700 dark:text-amber-300">{message}</p> : null}
    </div>
  );
}
