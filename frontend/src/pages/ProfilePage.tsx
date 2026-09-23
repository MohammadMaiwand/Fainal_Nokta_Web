import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, KeyRound, ShieldCheck, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authService } from '@/features/auth/services/authService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/authStore';
import { PhoneContactBlock } from '@/components/contact/PhoneContactBlock';
import { isValidAfghanPhone, sanitizeAfghanPhoneInput } from '@/utils/formValidation';
import { getStoredAuthValue } from '@/features/auth/utils/authStorage';

export function ProfilePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const localUser = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', profileImage: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });

  const { data, isLoading, error } = useQuery({
    queryKey: ['profile'],
    queryFn: authService.profile,
    retry: 1,
    refetchOnWindowFocus: false
  });

  const profile = (data as any)?.data ?? localUser;
  const permissionKeys = useMemo(() => profile?.permissionKeys ?? profile?.directPermissionKeys ?? [], [profile]);

  useEffect(() => {
    if (!profile) return;
    setForm({
      name: profile.name ?? '',
      email: profile.email ?? '',
      phone: profile.phone ?? '',
      profileImage: profile.profileImage ?? ''
    });
  }, [profile?.id]);

  const updateMutation = useMutation({
    mutationFn: authService.updateProfile,
    onSuccess: (result) => {
      const nextProfile = result.data;
      const latestAccess = getStoredAuthValue('accessToken');
      const latestRefresh = getStoredAuthValue('refreshToken');
      setAuth(nextProfile, latestAccess, latestRefresh);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setMessage(t('common.saved_successfully', { defaultValue: 'Saved successfully' }));
    },
    onError: (err: any) => setMessage(err?.response?.data?.message ?? err?.message ?? t('errors.unable_save', { defaultValue: 'Unable to save.' }))
  });

  const passwordMutation = useMutation({
    mutationFn: authService.changePassword,
    onSuccess: () => {
      setPasswordForm({ currentPassword: '', newPassword: '' });
      setMessage(t('auth.password_changed', { defaultValue: 'Password changed successfully' }));
    },
    onError: (err: any) => setMessage(err?.response?.data?.message ?? err?.message ?? t('auth.password_change_failed', { defaultValue: 'Unable to change password.' }))
  });

  const imageMutation = useMutation({
    mutationFn: authService.uploadProfileImage,
    onSuccess: (result) => {
      const profileImage = result.data?.profileImage ?? result.profileImage;
      setForm((current) => ({ ...current, profileImage }));
      updateMutation.mutate({ profileImage });
    },
    onError: (err: any) => setMessage(err?.response?.data?.message ?? err?.message ?? t('errors.unable_upload', { defaultValue: 'Unable to upload image.' }))
  });

  const avatarUrl = form.profileImage || profile?.profileImage || '';

  return (
    <div className="space-y-6">
      <div>
        <p className="app-text-muted text-xs uppercase tracking-[0.3em]">{t('common.profile', { defaultValue: 'Profile' })}</p>
        <h1 className="app-text-strong text-3xl font-semibold">{t('common.my_profile', { defaultValue: 'My Profile' })}</h1>
        <p className="app-text-muted mt-2">{t('common.manage_account_details', { defaultValue: 'Manage your account details, avatar, and password.' })}</p>
      </div>

      {message && <Card className="border border-sky-400/30 bg-sky-500/10 p-4 text-sky-100">{message}</Card>}
      {isLoading && <Card className="p-6 app-text-muted">{t('common.loading')}</Card>}
      {error && <Card className="border border-rose-500/30 bg-rose-500/5 p-6 text-rose-200">{t('errors.unable_load_records')}</Card>}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6">
          <form
            className="space-y-5"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              if (form.phone.trim() && !isValidAfghanPhone(form.phone)) {
                setMessage(t('errors.invalid_afghan_phone', {
                  defaultValue: 'Phone must be 10 digits and start with 070, 078, 079, 072, 077, or 074.'
                }));
                return;
              }
              updateMutation.mutate(form);
            }}
          >
            <div className="flex flex-wrap items-center gap-5">
              <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-sky-500/25 via-cyan-500/15 to-emerald-400/20 text-sky-700 dark:text-sky-200">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={profile?.name ?? ''} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-10 w-10" strokeWidth={1.6} aria-hidden="true" />
                )}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm transition hover:bg-white/10">
                <Camera className="h-4 w-4" />
                {t('common.update_profile_image', { defaultValue: 'Update profile image' })}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) imageMutation.mutate(file);
                  }}
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input value={form.name} placeholder={t('common.full_name')} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
              <Input type="email" value={form.email} placeholder={t('common.email_address')} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              <div className="md:col-span-2 space-y-2">
                <Input
                  value={form.phone}
                  placeholder="0781923460"
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(event) => setForm((current) => ({ ...current, phone: sanitizeAfghanPhoneInput(event.target.value) }))}
                />
                <PhoneContactBlock phone={form.phone} whatsapp={profile?.whatsapp} variant="form-preview" />
              </div>
              <Input value={profile?.role ? t(`common.${profile.role}`) : ''} disabled placeholder={t('common.role')} />
            </div>

            <Button type="submit" disabled={updateMutation.isPending || imageMutation.isPending}>
              {updateMutation.isPending || imageMutation.isPending ? t('common.saving', { defaultValue: 'Saving...' }) : t('common.save')}
            </Button>
          </form>
        </Card>

        <Card className="p-6">
          <div className="mb-5 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
            <div>
              <p className="app-text-strong font-semibold">{t('common.permissions', { defaultValue: 'Permissions' })}</p>
              <p className="app-text-muted text-sm">{t('common.own_role_permissions', { defaultValue: 'Your role and active permission keys.' })}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(permissionKeys.length ? permissionKeys.slice(0, 30) : [profile?.role ?? t('common.no_role')]).map((permission: string) => (
              <span key={permission} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">{permission}</span>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-5 flex items-center gap-3">
          <KeyRound className="h-5 w-5 text-amber-300" />
          <div>
            <p className="app-text-strong font-semibold">{t('auth.change_password', { defaultValue: 'Change password' })}</p>
            <p className="app-text-muted text-sm">{t('auth.current_password_required', { defaultValue: 'Current password is required for your own account.' })}</p>
          </div>
        </div>
        <form
          className="grid gap-4 md:grid-cols-[1fr_1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            passwordMutation.mutate(passwordForm);
          }}
        >
          <Input type="password" value={passwordForm.currentPassword} placeholder={t('auth.current_password', { defaultValue: 'Current password' })} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} />
          <Input type="password" value={passwordForm.newPassword} placeholder={t('auth.new_password', { defaultValue: 'New password' })} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} />
          <Button type="submit" disabled={passwordMutation.isPending}>
            {passwordMutation.isPending ? t('common.saving', { defaultValue: 'Saving...' }) : t('auth.change_password', { defaultValue: 'Change password' })}
          </Button>
        </form>
      </Card>
    </div>
  );
}
