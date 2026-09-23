import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Eye, EyeOff, LogIn, Wifi, WifiOff } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/features/auth/services/authService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { accounts, isDemoLoginEnabled, loginRoleOptions, type AccountRole } from '@/features/auth/constants/accounts';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Select } from '@/components/ui/Select';
import { useTheme } from '@/app/providers/ThemeProvider';
import { clearOfflineApiCache } from '@/services/apiClient';
import { CaptchaChallengeField } from '@/features/auth/components/CaptchaChallengeField';
import { isPublicInternetOffline } from '@/utils/network';

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const isRtl = i18n.resolvedLanguage !== 'en';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<AccountRole | ''>('');
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [pendingLoginEmail, setPendingLoginEmail] = useState('');
  const [twoFactorHint, setTwoFactorHint] = useState('');
  const [twoFactorPreviewCode, setTwoFactorPreviewCode] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [captchaChallengeId, setCaptchaChallengeId] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaKey, setCaptchaKey] = useState(0);
  const [noPublicInternet, setNoPublicInternet] = useState(() => isPublicInternetOffline());
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refreshCaptcha = useCallback(() => {
    setCaptchaAnswer('');
    setCaptchaChallengeId('');
    setCaptchaKey((value) => value + 1);
  }, []);

  useEffect(() => {
    const sync = () => setNoPublicInternet(isPublicInternetOffline());
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  const handleRoleChange = (role: AccountRole) => {
    setSelectedRole(role);
    if (!isDemoLoginEnabled) return;
    const account = accounts[role];
    if (account?.email) {
      setEmail(account.email);
      setPassword(account.password);
    } else {
      setEmail('');
      setPassword('');
    }
  };

  const selectedAccount = isDemoLoginEnabled && selectedRole ? accounts[selectedRole] : undefined;

  const mapLoginError = (error: unknown) => {
    const axiosMessage =
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
        ? (error as { response: { data: { message: string } } }).response.data.message
        : '';
    const fallbackMessage = error instanceof Error ? error.message : '';
    const message = axiosMessage || fallbackMessage;
    const translated: Record<string, string> = {
      'Account is inactive': t('auth.account_inactive', { defaultValue: 'این حساب فعال نیست. با اداره تماس بگیرید.' }),
      'Account is suspended': t('auth.account_suspended', { defaultValue: 'این حساب تعلیق شده است.' }),
      'Account is blocked': t('auth.account_blocked', { defaultValue: 'این حساب مسدود شده است.' }),
      'Account is expired': t('auth.account_expired', { defaultValue: 'اعتبار این حساب پایان یافته است.' }),
      'Student account is blocked because registration has expired': t('auth.registration_expired', { defaultValue: 'اعتبار ثبت‌نام شاگرد پایان یافته است. با اداره تماس بگیرید.' }),
      'Account is temporarily locked due to failed login attempts': t('auth.account_locked', { defaultValue: 'حساب پس از ورودهای نادرست موقتاً قفل شده است.' }),
      'Selected role does not match this account': t('auth.role_mismatch', {
        defaultValue: 'صلاحیت انتخاب‌شده با این حساب هم‌خوان نیست. نقش درست را انتخاب کنید.'
      }),
      'Role is required for login': t('auth.role_required', {
        defaultValue: 'لطفاً صلاحیت / نقش حساب را انتخاب کنید.'
      })
    };
    return translated[message] || message || t('login_error');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!selectedRole) {
      setError(t('auth.role_required', { defaultValue: 'لطفاً صلاحیت / نقش حساب را انتخاب کنید.' }));
      return;
    }

    if (!captchaChallengeId || !captchaAnswer.trim()) {
      setError(t('auth.captcha_required', { defaultValue: 'Please complete the security check.' }));
      return;
    }

    setIsSubmitting(true);

    try {
      const loginEmail = email || selectedAccount?.email || '';
      const loginPassword = password || selectedAccount?.password || '';
      const response = await authService.login({
        email: loginEmail,
        password: loginPassword,
        captchaChallengeId,
        captchaAnswer: captchaAnswer.trim(),
        role: selectedRole
      });
      const twoFactorPayload = response?.data;
      if (twoFactorPayload?.twoFactorRequired) {
        setTwoFactorRequired(true);
        setPendingLoginEmail(loginEmail);
        setTwoFactorCode('');
        setTwoFactorHint(twoFactorPayload?.challenge?.phoneMasked || '');
        setTwoFactorPreviewCode(twoFactorPayload?.challenge?.codePreview || '');
        setError('');
        refreshCaptcha();
        return;
      }

      const payload = response?.data;
      const accessToken = payload?.tokens?.accessToken ?? payload?.token;
      const refreshToken = payload?.tokens?.refreshToken ?? payload?.refreshToken ?? null;

      if (!payload || payload.success !== true || !accessToken || !payload.user) {
        throw new Error('Invalid login response');
      }

      setAuth(payload.user, accessToken, refreshToken, rememberMe);
      clearOfflineApiCache();
      queryClient.clear();
      refreshCaptcha();
      navigate('/dashboard', { replace: true });
    } catch (error: unknown) {
      setError(mapLoginError(error));
      refreshCaptcha();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyTwoFactor = async () => {
    if (!twoFactorCode.trim()) {
      setError(t('common.required_field', { defaultValue: 'Required field' }));
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      const response = await authService.verifyLoginTwoFactor({
        email: pendingLoginEmail || email || selectedAccount?.email || '',
        code: twoFactorCode.trim()
      });

      const payload = response?.data;
      const accessToken = payload?.tokens?.accessToken ?? payload?.token;
      const refreshToken = payload?.tokens?.refreshToken ?? payload?.refreshToken ?? null;
      if (!payload || payload.success !== true || !accessToken || !payload.user) {
        throw new Error('Invalid login response');
      }

      setAuth(payload.user, accessToken, refreshToken, rememberMe);
      clearOfflineApiCache();
      queryClient.clear();
      navigate('/dashboard', { replace: true });
    } catch (error: unknown) {
      setError(mapLoginError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`login-page relative flex min-h-[100dvh] flex-col overflow-x-hidden overflow-y-auto ${
        isDark ? 'login-page--dark' : 'login-page--light'
      }`}
    >
      <div className="login-bg" aria-hidden="true">
        <div className="login-bg-base" />
        <div className="login-bg-grid" />
        <div className="login-bg-orb login-bg-orb--a" />
        <div className="login-bg-orb login-bg-orb--b" />
        <div className="login-bg-orb login-bg-orb--c" />
        <div className="login-bg-sheen" />
      </div>

      <header
        className={`login-minibar ${
          isDark ? 'border-white/10 bg-slate-950/95 text-slate-100' : 'border-slate-200/80 bg-white/95 text-slate-800'
        }`}
      >
        <div className="flex min-w-0 items-center justify-start gap-1.5 sm:gap-2">
          <div
            className={`inline-flex shrink-0 items-center gap-1 rounded-lg border p-1 ${
              isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-100/80'
            }`}
          >
            <ThemeToggle className="shrink-0" />
            <LanguageSwitcher compact />
          </div>
          <div
            className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium sm:text-[11px] ${
              noPublicInternet
                ? isDark
                  ? 'border-sky-300/30 bg-sky-500/10 text-sky-100'
                  : 'border-sky-200 bg-sky-50 text-sky-800'
                : isDark
                  ? 'border-emerald-300/30 bg-emerald-500/10 text-emerald-100'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
            role="status"
            aria-live="polite"
          >
            {noPublicInternet ? <WifiOff className="h-3 w-3 shrink-0" aria-hidden="true" /> : <Wifi className="h-3 w-3 shrink-0" aria-hidden="true" />}
            <span className="truncate">
              {noPublicInternet
                ? t('auth.status_local', { defaultValue: 'Local / offline OK' })
                : t('auth.status_online', { defaultValue: 'Online' })}
            </span>
          </div>
        </div>

        <h1
          className={`login-minibar-title ${isDark ? 'text-white' : 'text-slate-900'}`}
          title={`${t('common.welcome')} — ${t('common.login_title')}`}
        >
          <span className={isDark ? 'text-sky-300' : 'text-sky-700'}>{t('common.welcome')}</span>
          <span className={`mx-1 font-normal ${isDark ? 'text-slate-500' : 'text-slate-400'}`} aria-hidden="true">
            ·
          </span>
          <span>{t('common.login_title')}</span>
        </h1>

        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 gap-1 px-2 text-xs"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="max-sm:hidden">{t('common.back_to_home', { defaultValue: 'Back to Main' })}</span>
            <span className="sm:hidden">{t('common.back', { defaultValue: 'Back' })}</span>
          </Button>
        </div>
      </header>

      <main className="login-page-main flex flex-col items-center justify-start sm:justify-center">
        <div className="login-page-shell w-full">
          <Card
            className={`login-form-panel surface-elevated w-full border p-3 backdrop-blur-xl sm:p-4 ${
              isDark
                ? 'border-white/10 bg-slate-950/80 shadow-[0_30px_120px_rgba(15,23,42,0.5)]'
                : 'border-slate-200/80 bg-white/85 shadow-[0_24px_80px_rgba(15,23,42,0.12)]'
            }`}
          >
            {!twoFactorRequired ? (
              <form onSubmit={handleSubmit} className="space-y-2.5" noValidate>
                <div className="space-y-1">
                  <label htmlFor="role" className={`block text-xs font-medium ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>
                    {t('common.select_role', { defaultValue: 'انتخاب صلاحیت' })}
                  </label>
                  <Select
                    id="role"
                    value={selectedRole}
                    placeholder={t('common.choose_role', { defaultValue: 'نقش حساب را انتخاب کنید' })}
                    options={loginRoleOptions.map((item) => ({
                      value: item.value,
                      label: t(item.labelKey, { defaultValue: item.value })
                    }))}
                    onChange={(value) => handleRoleChange(value as AccountRole)}
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="email" className={`block text-xs font-medium ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>
                    {t('common.email')}
                  </label>
                  <Input
                    id="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    autoComplete="username"
                    required
                    placeholder={t('common.login_placeholder_email')}
                    className="bg-white/5"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="password" className={`block text-xs font-medium ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>
                    {t('common.password')}
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      placeholder={t('common.login_placeholder_password')}
                      className={`bg-white/5 ${isRtl ? 'pl-12' : 'pr-12'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className={`absolute inset-y-0 ${isRtl ? 'left-0 pl-4' : 'right-0 pr-4'} flex items-center transition ${
                        isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                      }`}
                      aria-label={
                        showPassword
                          ? t('auth.hide_password', { defaultValue: 'Hide password' })
                          : t('auth.show_password', { defaultValue: 'Show password' })
                      }
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <CaptchaChallengeField
                  key={captchaKey}
                  challengeId={captchaChallengeId}
                  answer={captchaAnswer}
                  onChallengeIdChange={setCaptchaChallengeId}
                  onAnswerChange={setCaptchaAnswer}
                  disabled={isSubmitting}
                  isDark={isDark}
                  compact
                />

                <label
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
                    isDark ? 'border-white/10 bg-white/5 text-slate-200' : 'border-slate-200 bg-white/80 text-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-3.5 w-3.5 rounded border-white/20 bg-slate-900 text-sky-400 focus:ring-sky-400"
                  />
                  <span>{t('auth.remember_me', { defaultValue: 'Remember Me' })}</span>
                </label>

                {error && (
                  <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-200" role="alert">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full justify-center gap-2" disabled={isSubmitting || !captchaChallengeId}>
                  <LogIn className="h-4 w-4" /> {isSubmitting ? t('common.loading') : t('common.sign_in')}
                </Button>
              </form>
            ) : (
              <div className="space-y-2.5">
                <div
                  className={`rounded-lg border px-2.5 py-1.5 text-xs ${
                    isDark ? 'border-cyan-300/30 bg-cyan-500/10 text-cyan-100' : 'border-sky-200 bg-sky-50 text-sky-700'
                  }`}
                >
                  {t('auth.two_factor_prompt', { defaultValue: 'Enter the 6-digit verification code to complete sign in.' })}
                  {twoFactorHint ? ` (${twoFactorHint})` : ''}
                </div>
                {twoFactorPreviewCode ? (
                  <div
                    className={`rounded-lg border px-2.5 py-1.5 text-[11px] ${
                      isDark ? 'border-amber-300/30 bg-amber-500/10 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-700'
                    }`}
                  >
                    {t('auth.dev_preview_code', { defaultValue: 'Development preview code' })}:{' '}
                    <span className="font-semibold tracking-[0.2em]">{twoFactorPreviewCode}</span>
                  </div>
                ) : null}

                <div className="space-y-1">
                  <label htmlFor="twoFactorCode" className={`block text-xs font-medium ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>
                    {t('auth.verification_code', { defaultValue: 'Verification Code' })}
                  </label>
                  <Input
                    id="twoFactorCode"
                    value={twoFactorCode}
                    onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    placeholder="123456"
                    className="bg-white/5 text-center tracking-[0.45em]"
                  />
                </div>

                {error && (
                  <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-200" role="alert">
                    {error}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button type="button" className="flex-1 justify-center gap-2" disabled={isSubmitting} onClick={handleVerifyTwoFactor}>
                    <LogIn className="h-4 w-4" />
                    {isSubmitting ? t('common.loading') : t('auth.verify_and_sign_in', { defaultValue: 'Verify and Sign In' })}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setTwoFactorRequired(false);
                      setTwoFactorCode('');
                      setPendingLoginEmail('');
                      setTwoFactorHint('');
                      setTwoFactorPreviewCode('');
                      setError('');
                      refreshCaptcha();
                    }}
                  >
                    {t('common.back', { defaultValue: 'Back' })}
                  </Button>
                </div>
              </div>
            )}

            <div className={`mt-2.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <Link to="/register" className={`font-semibold transition ${isDark ? 'text-sky-300 hover:text-sky-200' : 'text-sky-700 hover:text-sky-900'}`}>
                {t('auth.register_here', { defaultValue: 'Register here' })}
              </Link>
              <span aria-hidden="true">·</span>
              <Link to="/privacy" className="underline-offset-2 hover:underline">
                {t('legal.privacy_title')}
              </Link>
              <span aria-hidden="true">·</span>
              <Link to="/terms" className="underline-offset-2 hover:underline">
                {t('legal.terms_title')}
              </Link>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
