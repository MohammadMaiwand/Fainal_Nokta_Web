import { useMemo, useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '@/locales/i18n';
import { useAuthStore } from '@/store/authStore';
import { getMenuForUser, getRouteLabel, normalizeRole, userCanOpenPath } from '@/features/resources/config/modules';
import { Bell, LogOut, Menu, Search, ChevronLeft, ChevronRight, X, User, UserCircle } from 'lucide-react';
import { messagesService } from '@/features/messages/services/messagesService';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { authService } from '@/features/auth/services/authService';
import { getStoredAuthValue } from '@/features/auth/utils/authStorage';
import { api } from '@/services/apiClient';

const sidebarIconClasses: Record<string, string> = {
  '/dashboard': 'text-indigo-600 dark:text-indigo-300',
  '/enterprise': 'text-cyan-700 dark:text-cyan-300',
  '/academic-standards': 'text-violet-700 dark:text-violet-300',
  '/branches': 'text-sky-700 dark:text-sky-300',
  '/users': 'text-slate-900 dark:text-slate-100',
  '/students': 'text-emerald-700 dark:text-emerald-300',
  '/teachers': 'text-cyan-700 dark:text-cyan-300',
  '/classes': 'text-amber-700 dark:text-amber-300',
  '/timetable': 'text-teal-700 dark:text-teal-300',
  '/courses': 'text-fuchsia-700 dark:text-fuchsia-300',
  '/subjects': 'text-indigo-700 dark:text-indigo-300',
  '/attendance': 'text-lime-700 dark:text-lime-300',
  '/exams': 'text-yellow-700 dark:text-yellow-300',
  '/results': 'text-blue-700 dark:text-blue-300',
  '/payments': 'text-emerald-700 dark:text-emerald-300',
  '/finance': 'text-emerald-700 dark:text-emerald-300',
  '/loans': 'text-amber-700 dark:text-amber-300',
  '/expenses': 'text-rose-700 dark:text-rose-300',
  '/payroll': 'text-orange-700 dark:text-orange-300',
  '/academy-financial-report': 'text-emerald-800 dark:text-emerald-200',
  '/reports': 'text-sky-800 dark:text-sky-200',
  '/books': 'text-indigo-700 dark:text-indigo-300',
  '/families': 'text-cyan-700 dark:text-cyan-300',
  '/curriculum': 'text-purple-700 dark:text-purple-300',
  '/ai-assistant': 'text-fuchsia-700 dark:text-fuchsia-300',
  '/audit': 'text-slate-900 dark:text-slate-100',
  '/notifications': 'text-blue-700 dark:text-blue-300',
  '/profile': 'text-slate-900 dark:text-slate-100',
  '/roles': 'text-slate-900 dark:text-slate-100',
  '/messages': 'text-sky-700 dark:text-sky-300',
  '/settings': 'text-slate-700 dark:text-slate-200',
};

export function AppShell() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const canAccessNotifications = userCanOpenPath(user, '/notifications');
  const canAccessMessages = userCanOpenPath(user, '/messages');
  const { data: unreadCountData } = useQuery({
    queryKey: ['notifications-unread-count', user?.id],
    queryFn: () => api.get('/notifications/unread-count').then((res) => res.data.data as { unreadCount: number }),
    enabled: canAccessNotifications,
    staleTime: 90_000,
    refetchInterval: 120_000,
    refetchIntervalInBackground: false
  });
  const { data: messageUnreadData } = useQuery({
    queryKey: ['messages-unread-count', user?.id],
    queryFn: () => messagesService.unreadCount(),
    enabled: canAccessMessages,
    staleTime: 90_000,
    refetchInterval: 120_000,
    refetchIntervalInBackground: false
  });
  const unreadCount = unreadCountData?.unreadCount ?? 0;
  const messageUnreadCount = messageUnreadData?.unreadCount ?? 0;

  const sidebarLinkClass = (isActive: boolean) =>
    `sidebar-item w-full ${isActive ? 'sidebar-item-active' : ''}`;

  const menu = useMemo(() => {
    const role = normalizeRole(user?.role);
    const dashboardLabelByRole: Record<string, string> = {
      super_admin: 'dashboard.super_admin_dashboard',
      admin: 'dashboard.admin_dashboard',
      teacher: 'dashboard.teacher_dashboard',
      student: 'dashboard.student_dashboard',
      parent: 'dashboard.family_dashboard',
      owner: 'dashboard.owner_dashboard',
      branch_manager: 'dashboard.branch_manager_dashboard',
      system_automation: 'common.dashboard'
    };

    const items = getMenuForUser(user).map((item) => {
      if (item.path === '/dashboard') {
        const labelKey = (role && dashboardLabelByRole[role]) || item.label;
        return { ...item, label: t(labelKey, { defaultValue: t(item.label) }) };
      }
      return { ...item, label: t(item.label) };
    });
    if (user && !items.some((item) => item.path === '/profile')) {
      items.push({
        path: '/profile',
        label: t('common.profile'),
        icon: UserCircle,
        roles: [] as any,
      });
    }
    return items;
  }, [user, t]);

  const displayRoleKey = user?.originalRole || user?.role;

  const activeLabel = useMemo(
    () => t(getRouteLabel(user?.role ?? null, location.pathname)),
    [location.pathname, t, user?.role]
  );

  const handleLogout = useCallback(async () => {
    try {
      await authService.logout(getStoredAuthValue('refreshToken'));
    } catch {
      // Local logout still guarantees client-side cleanup.
    } finally {
      logout();
      navigate('/login');
    }
  }, [logout, navigate]);

  const profileImage = user?.profileImage || '';

  const isRtl = i18n.language !== 'en';
  const sidebarPosition = isRtl ? 'right-0' : 'left-0';
  const sidebarBorder = isRtl ? 'border-l' : 'border-r';
  const contentSpacing = isRtl ? (collapsed ? 'lg:mr-20' : 'lg:mr-64') : (collapsed ? 'lg:ml-20' : 'lg:ml-64');
  const mobileDrawerPosition = isRtl ? 'right-0' : 'left-0';
  const mobileDrawerAnimate = isRtl ? 320 : -320;
  const CollapseIcon = collapsed ? (isRtl ? ChevronLeft : ChevronRight) : (isRtl ? ChevronRight : ChevronLeft);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
      if (!isShortcut) return;
      event.preventDefault();
      navigate('/global-search');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate]);

  return (
    <div className={`app-bg h-dvh max-h-dvh overflow-hidden ${i18n.language === 'en' ? 'ltr' : 'rtl'}`}>
      <div className="relative flex h-dvh max-h-dvh overflow-hidden">
        <motion.aside
          data-no-print
          initial={false}
          animate={{ width: collapsed ? 80 : 260 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className={`sidebar-shell fixed inset-y-0 ${sidebarPosition} z-40 hidden flex-col ${sidebarBorder} backdrop-blur-xl lg:flex`}
        >
          <div className="app-border flex h-20 items-center justify-between gap-3 border-b px-4">
            <div className={`flex items-center gap-3 ${collapsed ? 'justify-center w-full' : ''}`}>
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white/95 shadow-[0_15px_40px_rgba(245,158,11,0.18)] ring-1 ring-amber-200/40">
                <img src="/images/1.png" alt="Nokta Academy" className="h-full w-full object-contain p-1" />
              </div>
              {!collapsed && (
                <div>
                  <p className="app-text-muted text-xs uppercase tracking-[0.35em]">{t('common.home_brand')}</p>
                  <p className="app-text-strong text-sm font-semibold">{t('common.dashboard')}</p>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              className="app-surface inline-flex h-11 w-11 items-center justify-center rounded-3xl transition duration-300 hover:brightness-105"
            >
              <CollapseIcon size={18} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-2 py-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
            <div className="space-y-2">
              {menu.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/dashboard'}
                  className={({ isActive }) => sidebarLinkClass(isActive)}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="sidebar-item-icon">
                    <item.icon size={18} className={`h-[1.125rem] w-[1.125rem] shrink-0 ${sidebarIconClasses[item.path] ?? 'text-slate-500 dark:text-slate-300'}`} />
                  </span>
                  <span className={`${collapsed ? 'hidden' : 'block min-w-0 flex-1 truncate'}`}>{item.label}</span>
                  {!collapsed && (
                    <span className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center">
                      {item.path === '/messages' && messageUnreadCount > 0 ? (
                        <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                          {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
                        </span>
                      ) : null}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </nav>

          <div className={`app-border border-t p-4 ${collapsed ? 'hidden' : 'block'}`}>
            <div className="glass-panel p-4">
              <p className="app-text-muted text-xs uppercase tracking-wider">{t('dashboard.signed_in_as')}</p>
              <p className="app-text-strong mt-2 font-semibold">{user?.name ?? t('common.guest')}</p>
              <p className="app-text-muted text-xs">{displayRoleKey ? t(`common.${displayRoleKey}`) : t('common.no_role')}</p>
            </div>
            <button
              onClick={handleLogout}
              className="danger-soft-button mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition duration-200 hover:brightness-105"
            >
              <LogOut size={16} /> {t('common.logout')}
            </button>
          </div>
        </motion.aside>

        <AnimatePresence>
          {sidebarOpen && (
            <motion.div className="fixed inset-0 z-50 lg:hidden" data-no-print>
              <motion.button
                type="button"
                className="absolute inset-0 bg-black/60"
                onClick={() => setSidebarOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
              <motion.div
                initial={{ x: mobileDrawerAnimate }}
                animate={{ x: 0 }}
                exit={{ x: mobileDrawerAnimate }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className={`sidebar-shell absolute inset-y-0 ${mobileDrawerPosition} z-50 w-72 overflow-y-auto ${sidebarBorder} p-5 backdrop-blur-xl`}
              >
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <p className="app-text-muted text-xs uppercase tracking-wider">{t('common.home_brand')}</p>
                    <h1 className="app-text-strong text-xl font-semibold">{t('common.dashboard')}</h1>
                  </div>
                  <button type="button" className="app-text" onClick={() => setSidebarOpen(false)}>
                    <X size={20} />
                  </button>
                </div>
                <nav className="space-y-2">
                  {menu.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/dashboard'}
                      className={({ isActive }) => sidebarLinkClass(isActive)}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="sidebar-item-icon">
                        <item.icon size={18} className={`h-[1.125rem] w-[1.125rem] shrink-0 ${sidebarIconClasses[item.path] ?? 'text-slate-500 dark:text-slate-300'}`} />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      <span className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center">
                        {item.path === '/messages' && messageUnreadCount > 0 ? (
                          <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                            {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
                          </span>
                        ) : null}
                      </span>
                    </NavLink>
                  ))}
                </nav>
                <div className="mt-6 glass-panel p-4">
                  <p className="app-text-muted text-xs uppercase tracking-wider">{t('dashboard.signed_in_as')}</p>
                  <p className="app-text-strong mt-2 font-semibold">{user?.name ?? t('common.guest')}</p>
                  <p className="app-text-muted text-xs">{displayRoleKey ? t(`common.${displayRoleKey}`) : t('common.no_role')}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="danger-soft-button mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition duration-200 hover:brightness-105"
                >
                  <LogOut size={16} /> {t('common.logout')}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`flex h-dvh max-h-dvh flex-1 flex-col overflow-hidden transition-all duration-300 ${contentSpacing}`}>
          <header className="app-header z-30 shrink-0 border-b px-4 py-4 backdrop-blur-xl lg:px-6" data-no-print>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="app-surface inline-flex h-11 w-11 items-center justify-center rounded-3xl transition duration-300 hover:brightness-105 lg:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu size={20} />
                </button>
                <div>
                  <p className="app-text-muted text-sm uppercase tracking-[0.3em]">{activeLabel}</p>
                  <h1 className="app-text-strong text-2xl font-semibold">{activeLabel}</h1>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/global-search')}
                  aria-label={t('common.global_search')}
                  className="app-surface inline-flex h-11 items-center gap-2 rounded-3xl px-3 text-sm transition duration-300 hover:brightness-105"
                >
                  <Search size={16} />
                  <span className="hidden md:inline">{t('common.global_search')}</span>
                </button>
                <ThemeToggle className="shrink-0" />
                <LanguageSwitcher compact />
                {canAccessNotifications && (
                  <button
                    type="button"
                    onClick={() => navigate('/notifications')}
                    aria-label={t('common.notifications')}
                    className="app-surface relative inline-flex h-11 w-11 items-center justify-center rounded-3xl transition duration-300 hover:brightness-105"
                  >
                    {unreadCount > 0 && (
                      <span className="absolute -end-2 -top-2 min-w-[1.35rem] rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none text-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                    <Bell size={18} />
                  </button>
                )}
                <div className="app-surface flex items-center gap-3 rounded-[28px] px-4 py-3 text-sm">
                  {profileImage ? (
                    <img src={profileImage} alt={user?.name ?? t('common.profile')} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary" aria-hidden="true">
                      <User className="h-5 w-5" strokeWidth={1.8} />
                    </div>
                  )}
                  <div>
                    <div className="app-text-strong font-semibold">{user?.name ?? t('common.guest')}</div>
                    <div className="app-text-muted text-xs">{displayRoleKey ? t(`common.${displayRoleKey}`) : t('common.no_role')}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="danger-soft-button inline-flex h-11 items-center rounded-[28px] px-4 py-3 text-sm font-semibold transition duration-300 hover:scale-[1.03]"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </header>

          <main className="main-content min-h-0 flex-1 overflow-y-auto overflow-x-clip px-4 py-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
