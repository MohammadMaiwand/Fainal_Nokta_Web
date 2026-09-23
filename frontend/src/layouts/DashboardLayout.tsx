import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '@/features/dashboard/components/Sidebar';
import { Navbar } from '@/features/dashboard/components/Navbar';

const routeLabels: Record<string, string> = {
  '/dashboard': 'common.dashboard',
  '/dashboard/super-admin': 'dashboard.super_admin_dashboard',
  '/dashboard/manage-users': 'dashboard.manage_users',
  '/users': 'dashboard.users_management',
  '/analytics': 'dashboard.analytics',
  '/campaign': 'dashboard.campaign',
  '/ecommerce': 'dashboard.ecommerce',
  '/settings': 'dashboard.settings'
};

export function DashboardLayout() {
  const { t, i18n } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const isRtl = i18n.resolvedLanguage !== 'en';

  const title = useMemo(() => t(routeLabels[location.pathname] ?? 'common.dashboard'), [location.pathname, t]);
  const contentSpacing = isRtl
    ? collapsed ? 'lg:pr-20' : 'lg:pr-[260px]'
    : collapsed ? 'lg:pl-20' : 'lg:pl-[260px]';

  return (
    <div className={`app-bg h-screen overflow-hidden ${i18n.resolvedLanguage === 'en' ? 'ltr' : 'rtl'}`}>
      <Sidebar collapsed={collapsed} open={sidebarOpen} onClose={() => setSidebarOpen(false)} onToggle={() => setCollapsed((prev) => !prev)} />
      <div className={`flex h-screen flex-1 flex-col overflow-hidden transition-all duration-300 ${contentSpacing}`}>
        <Navbar title={title} onMenu={() => setSidebarOpen(true)} />
        <main className="main-content flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
