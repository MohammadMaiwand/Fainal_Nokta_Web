import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';
import { ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatNumber, formatSignedCurrency } from '@/utils/formatters';
import { superAdminModuleActions, userCanOpenPath } from '@/features/resources/config/modules';
import { useAuthStore } from '@/store/authStore';

export type ModuleOpenIntent = 'edit' | 'delete' | 'create';

type ModuleControlCardProps = {
  labelKey: string;
  path: string;
  icon: LucideIcon;
  iconClassName?: string;
  value?: number | string;
  currency?: boolean;
  signedCurrency?: boolean;
  onOpen: (path: string, intent?: ModuleOpenIntent) => void;
};

export function ModuleControlCard({
  labelKey,
  path,
  icon: Icon,
  iconClassName = 'text-sky-500',
  value,
  currency = false,
  signedCurrency = false,
  onOpen
}: ModuleControlCardProps) {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const canNavigate = userCanOpenPath(user, path);
  const { canEdit, canDelete } = superAdminModuleActions(path);
  const displayValue = value === undefined
    ? null
    : signedCurrency
      ? formatSignedCurrency(value, i18n.resolvedLanguage)
      : currency
      ? formatCurrency(value, i18n.resolvedLanguage)
      : formatNumber(value, i18n.resolvedLanguage);

  const handleIntent = (event: MouseEvent, intent: ModuleOpenIntent) => {
    event.stopPropagation();
    onOpen(path, intent);
  };

  const handleCardOpen = () => {
    if (canNavigate) {
      onOpen(path);
    }
  };

  return (
    <Card
      className={`group flex h-full flex-col border border-slate-200/80 bg-white/90 p-6 text-slate-900 transition-colors dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-100 ${
        canNavigate ? 'cursor-pointer hover:border-sky-400/40 hover:bg-slate-50 dark:hover:bg-slate-900/70' : ''
      }`}
      onClick={canNavigate ? handleCardOpen : undefined}
      onKeyDown={canNavigate ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleCardOpen();
        }
      } : undefined}
      role={canNavigate ? 'link' : undefined}
      tabIndex={canNavigate ? 0 : undefined}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <Icon className={`h-8 w-8 ${iconClassName} transition-transform group-hover:scale-110`} />
        <span className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
          {canNavigate ? <ExternalLink className="h-3.5 w-3.5 opacity-70" /> : null}
          {t('dashboard.statistics')}
        </span>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-slate-900 group-hover:text-sky-700 dark:text-slate-100 dark:group-hover:text-sky-300">
        {t(labelKey)}
      </h3>
      {displayValue !== null ? (
        <p className={`text-3xl font-bold ${signedCurrency && Number(value) < 0 ? 'text-rose-600 dark:text-rose-300' : signedCurrency ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-200'}`} dir="ltr">
          {displayValue}
        </p>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('common.manage_records', { defaultValue: 'Manage records' })}</p>
      )}
      {canNavigate ? (
        <p className="mt-2 text-xs text-sky-700 dark:text-sky-300">{t('dashboard.open_section', { defaultValue: 'برای مشاهده بخش کلیک کنید' })}</p>
      ) : null}
      <div className="mt-auto flex flex-wrap gap-2 pt-5" onClick={(event) => event.stopPropagation()}>
        {canEdit ? (
          <Button type="button" variant="outline" size="sm" onClick={(event) => handleIntent(event, 'edit')}>
            {t('common.edit')}
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={(event) => handleIntent(event, 'edit')}>
            {t('common.view_details')}
          </Button>
        )}
        {canDelete ? (
          <Button type="button" variant="destructive" size="sm" onClick={(event) => handleIntent(event, 'delete')}>
            {t('common.delete')}
          </Button>
        ) : null}
        {canEdit ? (
          <Button type="button" variant="secondary" size="sm" onClick={(event) => handleIntent(event, 'create')}>
            {t('common.create')}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
