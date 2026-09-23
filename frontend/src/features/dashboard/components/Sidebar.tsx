import { NavLink } from 'react-router-dom';
import { ChevronLeft, ChevronRight, UserCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { designSystem } from '@/constants/designSystem';
import { getMenuForUser } from '@/features/resources/config/modules';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export function Sidebar({ collapsed, open, onClose, onToggle }: { collapsed: boolean; open: boolean; onClose: () => void; onToggle: () => void }) {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const isRtl = i18n.resolvedLanguage !== 'en';
  const sidebarSide = isRtl ? 'right-0' : 'left-0';
  const sidebarBorder = isRtl ? 'border-l' : 'border-r';
  const mobileSidebarSide = isRtl ? 'right-0' : 'left-0';
  const CollapseIcon = collapsed ? (isRtl ? ChevronLeft : ChevronRight) : (isRtl ? ChevronRight : ChevronLeft);
  const CloseIcon = isRtl ? ChevronRight : ChevronLeft;

  const visibleMenu = useMemo(() => {
    const menu = [...getMenuForUser(user)];

    if (user && !menu.some((item) => item.path === '/profile')) {
      menu.push({ path: '/profile', label: 'common.profile', icon: UserCircle, roles: [] as any });
    }
    return menu;
  }, [user]);

  return (
    <>
      <aside data-no-print className={`sidebar-shell fixed inset-y-0 ${sidebarSide} z-40 hidden flex-col overflow-hidden ${sidebarBorder} backdrop-blur-2xl lg:flex ${collapsed ? 'w-20' : 'w-[270px]'} transition-all duration-300`}>
        <div className="app-border relative flex h-20 items-center justify-between gap-3 border-b px-4">
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center w-full' : ''}`}>
            <div className="flex h-12 w-12 items-center justify-center rounded-3xl border border-white/15 bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-400 text-white shadow-[0_18px_48px_rgba(14,165,233,0.32)] ring-1 ring-cyan-200/20">N</div>
            {!collapsed && (
              <div>
                <p className="app-text-muted text-xs uppercase tracking-[0.35em]">{t('common.home_brand')}</p>
                <p className="app-text-strong text-sm font-semibold">{t('common.dashboard')}</p>
              </div>
            )}
          </div>
          <button type="button" onClick={onToggle} className={`app-surface inline-flex h-11 w-11 items-center justify-center ${designSystem.borderRadius} transition duration-300 hover:brightness-105`}>
            <CollapseIcon size={18} />
          </button>
        </div>

        <nav className="relative flex-1 overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          <div className="space-y-2">
            {visibleMenu.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `sidebar-item w-full ${isActive ? 'sidebar-item-active' : ''}`
                }
              >
                <span className="sidebar-item-icon">
                  <item.icon className="h-5 w-5" />
                </span>
                {!collapsed && <span>{t(item.label)}</span>}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className={`app-border relative border-t p-4 ${collapsed ? 'hidden' : 'block'}`}>
          <div className="glass-panel rounded-[26px] p-4">
            <p className="app-text-muted text-xs uppercase tracking-wider">{t('dashboard.signed_in_as')}</p>
            <p className="app-text-strong mt-2 font-semibold">{user?.name ?? t('common.guest')}</p>
            <p className="app-text-muted text-xs">{user?.role ? t(`common.${user.role}`) : t('common.no_role')}</p>
          </div>
        </div>
      </aside>

      <div className={`fixed inset-0 z-50 ${open ? 'block' : 'hidden'} lg:hidden`}>
        <div className="absolute inset-0 bg-black/60" onClick={onClose}></div>
        <aside className={`sidebar-shell absolute inset-y-0 ${mobileSidebarSide} z-50 w-72 overflow-y-auto ${sidebarBorder} p-5 backdrop-blur-2xl`}>
          <div className="app-surface mb-6 flex items-center justify-between gap-4 rounded-[28px] p-4">
            <div>
              <p className="app-text-muted text-xs uppercase tracking-wider">{t('common.home_brand')}</p>
              <h1 className="app-text-strong text-xl font-semibold">{t('common.dashboard')}</h1>
            </div>
            <button type="button" onClick={onClose} className="app-text transition hover:brightness-75">
              <CloseIcon size={20} />
            </button>
          </div>

          <nav className="space-y-2">
            {visibleMenu.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `sidebar-item w-full ${isActive ? 'sidebar-item-active' : ''}`
                }
                onClick={onClose}
              >
                <span className="sidebar-item-icon">
                  <item.icon className="h-5 w-5" />
                </span>
                <span>{t(item.label)}</span>
              </NavLink>
            ))}
          </nav>
        </aside>
      </div>
    </>
  );
}
