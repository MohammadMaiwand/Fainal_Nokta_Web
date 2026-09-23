import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/utils/formatters';
import type { CatalogOffering } from '@/features/catalog/types';

type CatalogDetailModalProps = {
  item: CatalogOffering | null;
  isDark: boolean;
  onClose: () => void;
  onRegister: (item: CatalogOffering) => void;
};

export function CatalogDetailModal({ item, isDark, onClose, onRegister }: CatalogDetailModalProps) {
  const { t, i18n } = useTranslation();
  if (!item) return null;

  const panelClass = isDark ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-900';
  const fee = Number(item.fee ?? item.feeAmount ?? 0);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm">
      <div className={`relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border p-6 shadow-2xl ${panelClass}`}>
        <button type="button" onClick={onClose} className="absolute end-4 top-4 rounded-full p-2 hover:bg-slate-500/10" aria-label={t('common.close')}>
          <X className="h-5 w-5" />
        </button>
        <p className="text-xs uppercase tracking-[0.3em] text-sky-500">{t('common.details')}</p>
        <h2 className="mt-2 text-3xl font-semibold">{item.titleText}</h2>
        <p className="mt-4 text-sm leading-7 opacity-80">{item.fullDescription || item.descriptionText || item.shortDescription}</p>
        <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <p>{t('common.instructor')}: {item.teacherName || t('common.not_available')}</p>
          <p>{t('common.subject')}: {item.subjectName || t('common.not_available')}</p>
          <p>{t('common.schedule')}: {item.schedule || t('common.not_available')}</p>
          <p>{t('common.duration')}: {item.duration || t('common.not_available')}</p>
          <p>{t('common.fee')}: {formatCurrency(fee, i18n.resolvedLanguage)}</p>
          {typeof item.availableSeats === 'number' && <p>{t('common.available_seats')}: {item.availableSeats}</p>}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={() => onRegister(item)}>{t('common.register_now')}</Button>
          <Button variant="ghost" onClick={onClose}>{t('common.close')}</Button>
        </div>
      </div>
    </div>
  );
}
