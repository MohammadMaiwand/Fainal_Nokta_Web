import { useQuery } from '@tanstack/react-query';
import { Bell, Menu, ChevronDown, LogOut, UserCircle, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { authService } from '@/features/auth/services/authService';
import { useAuthStore } from '@/store/authStore';
import { designSystem } from '@/constants/designSystem';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '@/services/apiClient';
import { getStoredAuthValue } from '@/features/auth/utils/authStorage';
import { userCanOpenPath } from '@/features/resources/config/modules';

export function Navbar({ title, onMenu }: { title: string; onMenu: () => void }) {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const location = useLocation();

  const canAccessNotifications = userCanOpenPath(user, '/notifications');

  const notificationsActive = location.pathname === '/notifications';

  const { data: unreadCountData } = useQuery({
    queryKey: ['notifications-unread-count', user?.id],
    queryFn: () => api.get('/notifications/unread-count').then((res) => res.data.data as { unreadCount: number }),
    enabled: canAccessNotifications,
    staleTime: 45_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false
  });

  const handleLogout = async () => {
    try {
      await authService.logout(getStoredAuthValue('refreshToken'));
    } catch {
      // Local logout still guarantees client-side cleanup.
    } finally {
      logout();
      navigate('/login');
    }
  };

  const handleNotificationClick = () => {
    if (!canAccessNotifications) {
      navigate('/forbidden');
      return;
    }

    navigate('/notifications');
  };

  const unreadCount = unreadCountData?.unreadCount ?? 0;

  return (
    <header data-no-print className={`app-header sticky top-0 z-30 shrink-0 border-b px-4 py-4 backdrop-blur-xl lg:px-6 ${designSystem.transitions}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <button type="button" onClick={onMenu} className="app-surface inline-flex h-11 w-11 items-center justify-center rounded-3xl transition duration-300 hover:brightness-105 lg:hidden">
            <Menu size={20} />
          </button>
          <div>
            <p className="app-text-muted text-sm uppercase tracking-[0.3em]">{title}</p>
            <h1 className="app-text-strong text-2xl font-semibold">{title}</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canAccessNotifications && (
            <button
              type="button"
              onClick={handleNotificationClick}
              aria-label={t('common.notifications')}
              className={`relative inline-flex h-11 w-11 items-center justify-center rounded-3xl border transition duration-300 hover:scale-105 ${
                notificationsActive
                  ? 'border-sky-400/60 bg-sky-500/20 text-sky-200 shadow-[0_0_30px_rgba(56,189,248,0.25)]'
                  : 'app-surface hover:brightness-105'
              }`}
            >
              {unreadCount > 0 && (
                <span className="absolute -end-2 -top-2 min-w-[1.35rem] rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
              <Bell size={20} />
            </button>
          )}
          <ThemeToggle />
          <LanguageSwitcher />
          <details className="relative">
            <summary className="app-surface flex cursor-pointer items-center gap-3 rounded-[28px] px-4 py-3 transition duration-300 hover:brightness-105">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-r from-primary/30 via-secondary/20 to-accent/30 text-primary shadow-[0_15px_40px_rgba(34,197,94,0.12)]">
                {user?.profileImage ? (
                  <img src={user.profileImage} alt={user.name ?? ''} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
                )}
              </div>
              <div className="hidden min-w-[120px] flex-col sm:flex">
                <span className="app-text-strong font-semibold">{user?.name ?? t('common.guest')}</span>
                <span className="app-text-muted text-xs">{user?.role ? t(`common.${user.role}`) : t('common.no_role')}</span>
              </div>
              <ChevronDown className="app-text-muted h-4 w-4" />
            </summary>
            <div className="glass-panel absolute end-0 z-20 mt-3 w-48 rounded-[28px] p-3 backdrop-blur-xl">
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="app-text flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm transition duration-300 hover:bg-white/10"
              >
                <span>{t('common.profile', { defaultValue: 'Profile' })}</span>
                <UserCircle size={16} />
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="danger-soft-button flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm transition duration-300 hover:scale-[1.03]"
              >
                <span>{t('common.logout')}</span>
                <LogOut size={16} />
              </button>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
