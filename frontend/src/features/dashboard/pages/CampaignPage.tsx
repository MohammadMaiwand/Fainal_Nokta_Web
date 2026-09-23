import { useQuery } from '@tanstack/react-query';
import { Bell, Megaphone, Users, GraduationCap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { dashboardService } from '@/features/dashboard/services/dashboardService';

export function CampaignPage() {
  const { t } = useTranslation();
  const { data } = useQuery({
    queryKey: ['campaignSummary'],
    queryFn: () => dashboardService.summary()
  });

  const cards = [
    { key: 'totalNotifications', label: t('common.notifications'), icon: Bell },
    { key: 'totalUsers', label: t('common.users'), icon: Users },
    { key: 'totalStudents', label: t('common.students'), icon: GraduationCap },
    { key: 'totalFamilies', label: t('common.families'), icon: Megaphone }
  ] as const;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{t('dashboard.campaign')}</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">{t('common.notifications')}</h2>
        <p className="mt-2 max-w-3xl text-slate-400">{t('common.home_feature_communication')}</p>
      </Card>

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.key} className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-wider text-slate-400">{card.label}</p>
                <h2 className="mt-3 text-3xl font-semibold text-white">{(data?.[card.key] ?? 0).toLocaleString()}</h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-primary via-secondary to-accent text-white">
                <card.icon className="h-6 w-6" />
              </div>
            </div>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-xl font-semibold text-white">{t('common.actions')}</h3>
          <div className="mt-4 space-y-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-slate-200">
              {t('dashboard.manage_users')}
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-slate-200">
              {t('common.notifications')}
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-slate-200">
              {t('common.reports')}
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="text-xl font-semibold text-white">{t('common.dashboard')}</h3>
          <p className="mt-3 text-slate-400">{t('common.live_school_metrics')}</p>
        </Card>
      </section>
    </div>
  );
}
