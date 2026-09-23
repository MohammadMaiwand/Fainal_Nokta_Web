import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from 'react-i18next';
import { isPathDeniedForRole, normalizeRole, userCanOpenPath, type Role } from '@/features/resources/config/modules';

function roleIsAllowed(userRole: Role | string | undefined, allowedRoles: Role[]) {
  const normalizedRole = normalizeRole(userRole as Role) ?? userRole;
  return allowedRoles.some(
    (role) => (normalizeRole(role) ?? role) === normalizedRole || role === userRole
  );
}

export function ProtectedRoute({ children, allowedRoles }: { children: JSX.Element; allowedRoles?: Role[] }) {
  const { t } = useTranslation();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.authLoading);

  if (authLoading) {
    return <div className="min-h-screen grid place-items-center text-slate-200">{t('common.checking_session')}</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const normalizedRole = normalizeRole(user.role as Role) ?? user.role;

  if (isPathDeniedForRole(normalizedRole, location.pathname) && !userCanOpenPath(user, location.pathname)) {
    return <Navigate to="/forbidden" replace />;
  }

  const roleSpecificDashboard =
    location.pathname.startsWith('/dashboard/') &&
    location.pathname !== '/dashboard/manage-users';

  if (roleSpecificDashboard && allowedRoles && !roleIsAllowed(user.role, allowedRoles)) {
    return <Navigate to="/forbidden" replace />;
  }

  // Permission/menu rules are the source of truth for module pages (supports custom family sections).
  if (!userCanOpenPath(user, location.pathname)) {
    return <Navigate to="/forbidden" replace />;
  }

  return children;
}
