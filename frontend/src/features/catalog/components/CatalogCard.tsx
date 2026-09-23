import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/utils/formatters';
import { getCatalogIconStyle } from '@/utils/entityIcons';
import type { CatalogOffering } from '@/features/catalog/types';

type CatalogCardProps = {
  item: CatalogOffering;
  isDark: boolean;
  onViewDetails: (item: CatalogOffering) => void;
  onRegister: (item: CatalogOffering) => void;
};

export function CatalogCard({ item, isDark, onViewDetails, onRegister }: CatalogCardProps) {
  const { t, i18n } = useTranslation();
  const titleClass = isDark ? 'text-white' : 'text-slate-950';
  const textClass = isDark ? 'text-slate-300' : 'text-slate-700';
  const cardClass = isDark
    ? 'border-slate-800/80 bg-slate-900/90 shadow-slate-950/25 hover:border-sky-400/55'
    : 'border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.10)] hover:border-sky-300 hover:shadow-[0_30px_80px_rgba(14,165,233,0.18)]';
  const mediaClass = isDark
    ? 'bg-gradient-to-br from-slate-800 via-slate-900 to-sky-950 text-sky-200'
    : 'bg-gradient-to-br from-sky-50 via-white to-emerald-50 text-sky-700';

  const fee = Number(item.fee ?? item.feeAmount ?? 0);
  const catalogIcon = getCatalogIconStyle(item.catalogType);
  const CatalogIcon = catalogIcon.icon;

  return (
    <article className={`overflow-hidden rounded-3xl border ${cardClass} transition duration-500 hover:-translate-y-1`}>
      <div className={isDark ? 'aspect-[16/9] bg-slate-800' : 'aspect-[16/9] bg-slate-100'}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.titleText} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className={`grid h-full place-items-center bg-gradient-to-br ${catalogIcon.backgroundClassName} ${mediaClass}`}>
            <CatalogIcon className={`h-16 w-16 ${catalogIcon.iconClassName}`} strokeWidth={1.6} aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="space-y-4 p-6">
        <div className={`flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] ${isDark ? 'text-sky-300' : 'text-sky-700'}`}>
          <span>{item.catalogType === 'class' ? t('common.class') : t('common.course')}</span>
          <span>{item.academicCategory || t('common.general')}</span>
        </div>
        <h3 className={`text-2xl font-semibold ${titleClass}`}>{item.titleText}</h3>
        <p className={`text-sm leading-7 ${textClass}`}>{item.shortDescription || item.descriptionText || t('common.not_available')}</p>
        <div className={`grid gap-2 text-sm sm:grid-cols-2 ${textClass}`}>
          <p>{t('common.instructor')}: {item.teacherName || t('common.not_available')}</p>
          <p>{t('common.subject')}: {item.subjectName || item.academicCategory || t('common.not_available')}</p>
          <p>{t('common.schedule')}: {item.schedule || t('common.not_available')}</p>
          <p>{t('common.duration')}: {item.duration || t('common.not_available')}</p>
          <p>{t('common.fee')}: {formatCurrency(fee, i18n.resolvedLanguage)}</p>
          {typeof item.availableSeats === 'number' && (
            <p>{t('common.available_seats')}: {item.availableSeats}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button size="sm" variant="outline" onClick={() => onViewDetails(item)} className={isDark ? '' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'}>
            {t('common.view_details')}
          </Button>
          <Button size="sm" onClick={() => onRegister(item)}>
            {t('common.register_now')}
          </Button>
        </div>
      </div>
    </article>
  );
}
