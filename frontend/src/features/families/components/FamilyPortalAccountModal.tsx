import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormModal } from '@/shared/components/Common';
import { Input } from '@/components/ui/Input';
import { api } from '@/services/apiClient';

type PortalSection = {
  key: string;
  labelKey: string;
  defaultEnabled?: boolean;
  enabled?: boolean;
};

type PortalAccountPayload = {
  familyId: string;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
  portalUser: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    active: boolean;
    status: string;
    sections: PortalSection[];
  } | null;
  availableSections: PortalSection[];
};

type FamilyPortalAccountModalProps = {
  family: { _id?: string; id?: string; guardianName?: string; guardianEmail?: string; guardianPhone?: string } | null;
  open: boolean;
  onClose: () => void;
};

export function FamilyPortalAccountModal({ family, open, onClose }: FamilyPortalAccountModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const familyId = String(family?._id ?? family?.id ?? '');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [active, setActive] = useState(true);
  const [sections, setSections] = useState<string[]>([]);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const portalQuery = useQuery({
    queryKey: ['family-portal-account', familyId],
    queryFn: async () => {
      const response = await api.get(`/families/${familyId}/portal-account`);
      return response.data.data as PortalAccountPayload;
    },
    enabled: open && Boolean(familyId),
    staleTime: 0
  });

  useEffect(() => {
    if (!open) return;
    setFormError('');
    setSuccessMessage('');
    setPassword('');

    const payload = portalQuery.data;
    if (!payload) {
      setName(family?.guardianName || '');
      setEmail(family?.guardianEmail || '');
      setPhone(family?.guardianPhone || '');
      setActive(true);
      setSections([]);
      return;
    }

    const portal = payload.portalUser;
    setName(portal?.name || payload.guardianName || '');
    setEmail(portal?.email || payload.guardianEmail || '');
    setPhone(portal?.phone || payload.guardianPhone || '');
    setActive(portal?.active ?? true);
    setSections(
      (portal?.sections ?? payload.availableSections)
        .filter((section) => (portal ? section.enabled : section.defaultEnabled))
        .map((section) => section.key)
    );
  }, [open, portalQuery.data, family]);

  const sectionOptions = useMemo(() => {
    const fromPortal = portalQuery.data?.portalUser?.sections;
    const available = portalQuery.data?.availableSections;
    return fromPortal?.length ? fromPortal : available ?? [];
  }, [portalQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        active,
        sections
      };
      if (password.trim()) {
        payload.password = password.trim();
      }
      const response = await api.patch(`/families/${familyId}/portal-account`, payload);
      return response.data;
    },
    onSuccess: async () => {
      setPassword('');
      setSuccessMessage(t('families.portal_updated', { defaultValue: 'اکانت خانواده با موفقیت به‌روزرسانی شد.' }));
      setFormError('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['family-portal-account', familyId] }),
        queryClient.invalidateQueries({ queryKey: ['/families'] }),
        queryClient.invalidateQueries({ predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === '/families' })
      ]);
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        t('families.portal_update_failed', { defaultValue: 'به‌روزرسانی اکانت خانواده ناموفق بود.' });
      setFormError(String(message));
      setSuccessMessage('');
    }
  });

  const toggleSection = (key: string) => {
    setSections((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    setSuccessMessage('');

    if (!name.trim()) {
      setFormError(t('common.required_field', { defaultValue: 'این فیلد لازم است.' }));
      return;
    }
    if (!email.trim()) {
      setFormError(t('common.email_required', { defaultValue: 'ایمیل لازم است.' }));
      return;
    }
    if (!portalQuery.data?.portalUser && !password.trim()) {
      setFormError(t('families.password_required_create', { defaultValue: 'برای ساخت اکانت خانواده رمز عبور لازم است.' }));
      return;
    }
    if (password.trim() && password.trim().length < 6) {
      setFormError(t('families.password_min', { defaultValue: 'رمز عبور حداقل ۶ حرف باشد.' }));
      return;
    }
    if (sections.length === 0) {
      setFormError(t('families.sections_required', { defaultValue: 'حداقل یک بخش دسترسی را انتخاب کنید.' }));
      return;
    }

    saveMutation.mutate();
  };

  if (!open || !familyId) return null;

  return (
    <FormModal
      open={open}
      title={t('families.manage_portal_account', { defaultValue: 'مدیریت اکانت خانواده' })}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel={t('common.save', { defaultValue: 'ذخیره' })}
      loading={saveMutation.isPending || portalQuery.isLoading}
    >
      {portalQuery.isLoading ? (
        <p className="text-sm text-slate-400">{t('common.loading', { defaultValue: 'در حال بارگذاری...' })}</p>
      ) : null}

      {formError ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{formError}</div>
      ) : null}
      {successMessage ? (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-100">{successMessage}</div>
      ) : null}

      <div>
        <label className="mb-1 block text-sm text-slate-300">{t('common.full_name', { defaultValue: 'نام کامل' })}</label>
        <Input value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" />
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-300">{t('common.login_email', { defaultValue: 'ایمیل ورود' })}</label>
        <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="off" dir="ltr" />
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-300">
          {t('common.login_password', { defaultValue: 'رمز عبور' })}
          {portalQuery.data?.portalUser ? (
            <span className="ms-2 text-xs text-slate-500">
              ({t('families.password_optional_hint', { defaultValue: 'خالی بگذارید اگر نمی‌خواهید عوض شود' })})
            </span>
          ) : null}
        </label>
        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          dir="ltr"
          placeholder={portalQuery.data?.portalUser ? '••••••••' : ''}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-300">{t('common.phone', { defaultValue: 'تلفن' })}</label>
        <Input value={phone} onChange={(event) => setPhone(event.target.value)} dir="ltr" />
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
        <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className="h-4 w-4" />
        {t('common.active', { defaultValue: 'فعال' })}
      </label>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-200">
          {t('families.portal_sections', { defaultValue: 'بخش‌های قابل دسترس' })}
        </p>
        <p className="text-xs text-slate-400">
          {t('families.portal_sections_hint', {
            defaultValue: 'فقط بخش‌هایی که تیک خورده‌اند در سایدبار خانواده نمایش داده می‌شوند.'
          })}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {sectionOptions.map((section) => (
            <label
              key={section.key}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2.5 text-sm text-slate-200"
            >
              <input
                type="checkbox"
                checked={sections.includes(section.key)}
                onChange={() => toggleSection(section.key)}
                className="h-4 w-4"
              />
              <span>{t(section.labelKey, { defaultValue: section.key })}</span>
            </label>
          ))}
        </div>
      </div>
    </FormModal>
  );
}
