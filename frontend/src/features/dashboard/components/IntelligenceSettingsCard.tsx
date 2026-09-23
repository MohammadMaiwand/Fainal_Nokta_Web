import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/services/apiClient';
import { useAuthStore } from '@/store/authStore';
import { normalizeRole } from '@/features/resources/config/modules';

export function IntelligenceSettingsCard() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const role = normalizeRole(user?.role);
  const queryClient = useQueryClient();
  const canManage = role === 'super_admin' || role === 'admin';

  const { data, isLoading } = useQuery({
    queryKey: ['intelligence-settings'],
    queryFn: async () => {
      const response = await api.get('/intelligence/settings');
      return response.data?.data;
    },
    enabled: canManage
  });

  const saveMutation = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const response = await api.put('/intelligence/settings', patch);
      return response.data?.data;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['intelligence-settings'] })
  });

  if (!canManage) return null;

  return (
    <Card className="p-6">
      <p className="text-sm uppercase tracking-wider text-slate-400">
        {t('intelligence.settings_title', { defaultValue: 'Intelligence settings' })}
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-white">
        {t('intelligence.system_analysis', { defaultValue: 'Intelligent System Analysis' })}
      </h2>
      {isLoading && <p className="mt-4 text-sm text-slate-400">{t('common.loading')}</p>}
      {data && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <SettingRow
            label={t('intelligence.unanswered_alerts', { defaultValue: 'Unanswered message threshold' })}
            value={String(data.unansweredMessageThreshold ?? 3)}
          />
          <SettingRow label="Weak topic %" value={String(data.weakTopicThreshold ?? 55)} />
          <SettingRow label="Strong topic %" value={String(data.strongTopicThreshold ?? 80)} />
          <SettingRow label="Cache minutes" value={String(data.cacheDurationMinutes ?? 60)} />
          <SettingRow label="Rule version" value={String(data.ruleVersion ?? 1)} />
          <SettingRow
            label="Online AI"
            value={data.onlineAiEnabled ? t('common.active', { defaultValue: 'Active' }) : t('common.inactive', { defaultValue: 'Inactive' })}
          />
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={saveMutation.isPending || !data}
          onClick={() =>
            saveMutation.mutate({
              unansweredMessageThreshold: Number(data?.unansweredMessageThreshold ?? 3),
              preferOfflineContent: true,
              onlineAiEnabled: false
            })
          }
        >
          {t('common.save', { defaultValue: 'Save defaults' })}
        </Button>
      </div>
    </Card>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-border bg-background px-4 py-4">
      <div className="flex items-center justify-between gap-4">
        <p className="font-medium text-white">{label}</p>
        <span className="text-sm text-slate-400">{value}</span>
      </div>
    </div>
  );
}
