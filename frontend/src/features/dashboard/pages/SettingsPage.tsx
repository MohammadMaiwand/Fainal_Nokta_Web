import { Settings, ShieldCheck, UserCircle2, BadgeCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/authStore';
import { IntelligenceSettingsCard } from '@/features/dashboard/components/IntelligenceSettingsCard';

export function SettingsPage() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const roleLabel = user?.role ? t(`common.${user.role}`) : t('common.no_role');

  return (
    <div className="space-y-6">
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-wider text-slate-400">{t('common.your_profile')}</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">{user?.name ?? t('common.guest')}</h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-primary via-secondary to-accent text-white">
              <UserCircle2 className="h-6 w-6" />
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-wider text-slate-400">{t('common.account_status')}</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">{t('common.active')}</h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-primary via-secondary to-accent text-white">
              <BadgeCheck className="h-6 w-6" />
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-wider text-slate-400">{t('common.role')}</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">{roleLabel}</h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-primary via-secondary to-accent text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-wider text-slate-400">{t('common.frontend_access')}</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">{t('common.dashboard')}</h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-primary via-secondary to-accent text-white">
              <Settings className="h-6 w-6" />
            </div>
          </div>
        </Card>
      </section>

      <Card className="p-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="text-sm uppercase tracking-wider text-slate-400">{t('common.my_settings')}</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">{t('common.manage_account_details')}</h2>
            <p className="mt-4 text-sm text-slate-400">{t('common.backend_permissions')}</p>
          </div>
          <div className="space-y-4">
            {[
              { label: t('common.email_address'), value: user?.email ?? t('common.not_available') },
              { label: t('common.role'), value: roleLabel },
              { label: t('common.frontend_access'), value: t('common.use_sidebar') }
            ].map((item) => (
              <div key={item.label} className="rounded-3xl border border-border bg-background px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium text-white">{item.label}</p>
                  <span className="text-sm text-slate-400">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <IntelligenceSettingsCard />
    </div>
  );
}
