import React, { Suspense, lazy, useEffect, type ComponentType } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n, { applyDocumentLanguage } from '@/locales/i18n';
import { ProtectedRoute } from '@/middleware/ProtectedRoute';
import { allModuleConfigs } from '@/features/resources/config/modules';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/features/auth/services/authService';
import { Card } from '@/components/ui/Card';
import { clearAuthSession, getStoredAuthValue, getStoredUser, isRememberedSession } from '@/features/auth/utils/authStorage';
import { reportClientError } from '@/utils/monitoring';

function isAuthNetworkFailure(error: any) {
  const status = error?.response?.status;
  if (status === 401 || status === 403) return false;
  return (
    !status ||
    error?.code === 'ERR_NETWORK' ||
    error?.code === 'ECONNABORTED' ||
    error?.message === 'Network Error'
  );
}

function lazyNamedComponent<T extends Record<string, ComponentType<any>>, K extends keyof T>(
  loader: () => Promise<T>,
  exportName: K
) {
  return lazy(() => loader().then((module) => ({ default: module[exportName] as ComponentType<any> })));
}

const AppShell = lazyNamedComponent(() => import('@/layouts/AppShell'), 'AppShell');
const LoginPage = lazyNamedComponent(() => import('@/features/auth/pages/LoginPage'), 'LoginPage');
const HomePage = lazyNamedComponent(() => import('@/pages/HomePage'), 'HomePage');
const CatalogDetailPage = lazyNamedComponent(() => import('@/pages/CatalogDetailPage'), 'CatalogDetailPage');
const NotFoundPage = lazyNamedComponent(() => import('@/pages/NotFoundPage'), 'NotFoundPage');
const ProfilePage = lazyNamedComponent(() => import('@/pages/ProfilePage'), 'ProfilePage');
const DashboardPage = lazyNamedComponent(() => import('@/features/dashboard/pages/DashboardPage'), 'DashboardPage');
const SuperAdminDashboard = lazyNamedComponent(() => import('@/features/dashboard/pages/SuperAdminDashboard'), 'SuperAdminDashboard');
const SuperAdminMasterDashboard = lazyNamedComponent(() => import('@/features/dashboard/pages/SuperAdminMasterDashboard'), 'SuperAdminMasterDashboard');
const ForbiddenPage = lazyNamedComponent(() => import('@/pages/ForbiddenPage'), 'ForbiddenPage');
const ManageUsersPage = lazyNamedComponent(() => import('@/features/dashboard/pages/ManageUsersPage'), 'ManageUsersPage');
const UsersPage = lazyNamedComponent(() => import('@/features/dashboard/pages/UsersPage'), 'UsersPage');
const AnalyticsPage = lazyNamedComponent(() => import('@/features/dashboard/pages/AnalyticsPage'), 'AnalyticsPage');
const CampaignPage = lazyNamedComponent(() => import('@/features/dashboard/pages/CampaignPage'), 'CampaignPage');
const EcommercePage = lazyNamedComponent(() => import('@/features/dashboard/pages/EcommercePage'), 'EcommercePage');
const SettingsPage = lazyNamedComponent(() => import('@/features/dashboard/pages/SettingsPage'), 'SettingsPage');
const CrudPage = lazyNamedComponent(() => import('@/features/resources/pages/CrudPage'), 'CrudPage');
const AttendancePage = lazyNamedComponent(() => import('@/features/attendance/pages/AttendancePage'), 'AttendancePage');
const TimetablePage = lazyNamedComponent(() => import('@/features/timetable/pages/TimetablePage'), 'TimetablePage');
const FinancePage = lazyNamedComponent(() => import('@/features/finance/pages/FinancePage'), 'FinancePage');
const ExpensesPage = lazyNamedComponent(() => import('@/features/finance/pages/ExpensesPage'), 'ExpensesPage');
const ReportsPage = lazyNamedComponent(() => import('@/features/reports/pages/ReportsPage'), 'ReportsPage');
const RolesPage = lazyNamedComponent(() => import('@/features/roles/pages/RolesPage'), 'RolesPage');
const RegisterPage = lazyNamedComponent(() => import('@/features/auth/pages/RegisterPage'), 'RegisterPage');
const MessagesPage = lazyNamedComponent(() => import('@/features/messages/pages/MessagesPage'), 'MessagesPage');
const PayrollPage = lazyNamedComponent(() => import('@/features/payroll/pages/PayrollPage'), 'PayrollPage');
const AcademyFinancialReportPage = lazyNamedComponent(() => import('@/features/academy-financial-report/pages/AcademyFinancialReportPage'), 'AcademyFinancialReportPage');
const GlobalSearchPage = lazyNamedComponent(() => import('@/features/search/pages/GlobalSearchPage'), 'GlobalSearchPage');
const SecurityEventsPage = lazyNamedComponent(() => import('@/features/security/pages/SecurityEventsPage'), 'SecurityEventsPage');
const PaymentsPage = lazyNamedComponent(() => import('@/features/payments/pages/PaymentsPage'), 'PaymentsPage');
const LoansPage = lazyNamedComponent(() => import('@/features/loans/pages/LoansPage'), 'LoansPage');
const PrivacyPage = lazyNamedComponent(() => import('@/pages/PrivacyPage'), 'PrivacyPage');
const TermsPage = lazyNamedComponent(() => import('@/pages/TermsPage'), 'TermsPage');
const EnterprisePage = lazyNamedComponent(() => import('@/features/enterprise/pages/EnterprisePage'), 'EnterprisePage');
const AIAssistantPage = lazyNamedComponent(() => import('@/features/ai/pages/AIAssistantPage'), 'AIAssistantPage');
const ExamsPage = lazyNamedComponent(() => import('@/features/exams/pages/ExamsPage'), 'ExamsPage');
const ExamRoutePage = lazyNamedComponent(() => import('@/features/exams/pages/ExamRoutePage'), 'ExamRoutePage');
const AcademicStandardsPage = lazyNamedComponent(() => import('@/features/standards/pages/AcademicStandardsPage'), 'AcademicStandardsPage');

class AppErrorBoundary extends React.Component<{ children: React.ReactNode; fallback: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    reportClientError(error, { componentStack: info.componentStack, boundary: 'AppRoutes' });
    console.error('Application render error', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

function AppErrorFallback() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <Card className="max-w-lg p-8 text-center">
        <h1 className="app-text-strong text-2xl font-semibold">{t('common.error')}</h1>
        <p className="app-text-muted mt-3">{t('errors.unable_load_records')}</p>
      </Card>
    </div>
  );
}

function App() {
  const { t, i18n: translationI18n } = useTranslation();
  const authLoading = useAuthStore((state) => state.authLoading);
  const setAuth = useAuthStore((state) => state.setAuth);
  const setLoading = useAuthStore((state) => state.setLoading);

  const customModulePaths = new Set([
    '/attendance',
    '/timetable',
    '/expenses',
    '/finance',
    '/loans',
    '/reports',
    '/roles',
    '/users',
    '/messages',
    '/payroll',
    '/academy-financial-report',
    '/payments',
    '/enterprise',
    '/ai-assistant',
    '/academic-standards',
    '/exams'
  ]);

  useEffect(() => {
    const token = getStoredAuthValue('accessToken');
    const refreshToken = getStoredAuthValue('refreshToken');

    // Prevent infinite "checking session" if profile/refresh hangs on a dead API.
    const loadingWatchdog = window.setTimeout(() => {
      setLoading(false);
    }, 20_000);

    if (!token) {
      window.clearTimeout(loadingWatchdog);
      setLoading(false);
      return () => window.clearTimeout(loadingWatchdog);
    }

    authService.profile()
      .then((result) => {
        const latestAccess = getStoredAuthValue('accessToken') || token;
        const latestRefresh = getStoredAuthValue('refreshToken') || refreshToken;
        setAuth(result.data, latestAccess, latestRefresh, isRememberedSession());
      })
      .catch(async (error: any) => {
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          clearAuthSession();
          setAuth(null, null, null);
          return;
        }

        try {
          if (refreshToken) {
            const refreshed = await authService.refresh(refreshToken);
            const payload = refreshed?.data ?? refreshed ?? {};
            const nextAccess = payload.tokens?.accessToken ?? payload.accessToken ?? getStoredAuthValue('accessToken');
            const nextRefresh = payload.tokens?.refreshToken ?? payload.refreshToken ?? refreshToken;
            const nextUser = payload.user ?? null;
            if (nextAccess && nextUser) {
              setAuth(nextUser, nextAccess, nextRefresh, isRememberedSession());
              return;
            }
          }
          const retry = await authService.profile();
          const latestAccess = getStoredAuthValue('accessToken') || token;
          const latestRefresh = getStoredAuthValue('refreshToken') || refreshToken;
          setAuth(retry.data, latestAccess, latestRefresh, isRememberedSession());
        } catch (retryError: any) {
          // Keep last known session when local API / Mongo is briefly unreachable (offline LAN mode).
          const storedUser = getStoredUser();
          if (isAuthNetworkFailure(retryError) && storedUser && token) {
            setAuth(storedUser as any, token, refreshToken, isRememberedSession());
            return;
          }
          clearAuthSession();
          setAuth(null, null, null);
        }
      })
      .finally(() => {
        window.clearTimeout(loadingWatchdog);
        setLoading(false);
      });

    return () => window.clearTimeout(loadingWatchdog);
  }, [setAuth, setLoading]);

  useEffect(() => {
    applyDocumentLanguage(translationI18n.resolvedLanguage || i18n.language);
  }, [translationI18n.resolvedLanguage]);

  if (authLoading) {
    return <div className="app-text min-h-screen grid place-items-center">{t('common.checking_credentials')}</div>;
  }

  return (
    <AppErrorBoundary fallback={<AppErrorFallback />}>
      <Suspense fallback={<div className="app-text min-h-screen grid place-items-center">{t('common.loading')}</div>}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/home/classes/:id" element={<CatalogDetailPage />} />
          <Route path="/home/courses/:id" element={<CatalogDetailPage />} />
          <Route path="/forbidden" element={<ForbiddenPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/" element={<Navigate to="/home" replace />} />

          {/* Single AppShell sidebar (Super Admin style) for every authenticated role */}
          <Route element={<AppShell />}>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'admin', 'teacher', 'student', 'parent', 'owner', 'branch_manager', 'system_automation']}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route path="/dashboard/super-admin" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/super-admin/master" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminMasterDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/manage-users" element={<ProtectedRoute allowedRoles={['super_admin']}><ManageUsersPage /></ProtectedRoute>} />
            <Route path="/dashboard/admin" element={<ProtectedRoute allowedRoles={['admin']}><DashboardPage /></ProtectedRoute>} />
            <Route path="/dashboard/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><DashboardPage /></ProtectedRoute>} />
            <Route path="/dashboard/student" element={<ProtectedRoute allowedRoles={['student']}><DashboardPage /></ProtectedRoute>} />
            <Route path="/dashboard/parent" element={<ProtectedRoute allowedRoles={['parent']}><DashboardPage /></ProtectedRoute>} />
            <Route path="/dashboard/family" element={<ProtectedRoute allowedRoles={['parent', 'family_student']}><DashboardPage /></ProtectedRoute>} />
            <Route path="/dashboard/owner" element={<ProtectedRoute allowedRoles={['owner']}><DashboardPage /></ProtectedRoute>} />
            <Route path="/dashboard/branch-manager" element={<ProtectedRoute allowedRoles={['branch_manager']}><DashboardPage /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute allowedRoles={['super_admin']}><UsersPage /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner']}><AnalyticsPage /></ProtectedRoute>} />
            <Route path="/campaign" element={<ProtectedRoute allowedRoles={['admin', 'branch_manager']}><CampaignPage /></ProtectedRoute>} />
            <Route path="/ecommerce" element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner']}><EcommercePage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'teacher', 'student', 'parent', 'owner', 'branch_manager']}><SettingsPage /></ProtectedRoute>} />
            <Route path="/attendance" element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'branch_manager', 'teacher', 'student', 'parent', 'owner']}><AttendancePage /></ProtectedRoute>} />
            <Route path="/timetable" element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'branch_manager', 'teacher', 'student', 'parent', 'owner']}><TimetablePage /></ProtectedRoute>} />
            <Route path="/finance" element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'branch_manager', 'owner']}><FinancePage /></ProtectedRoute>} />
            <Route path="/loans" element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'branch_manager', 'owner']}><LoansPage /></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'branch_manager', 'owner']}><ExpensesPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'branch_manager', 'owner']}><ReportsPage /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'branch_manager', 'teacher', 'student', 'parent', 'owner']}><MessagesPage /></ProtectedRoute>} />
            <Route path="/payroll" element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'branch_manager', 'owner', 'teacher']}><PayrollPage /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'branch_manager', 'owner', 'student', 'parent']}><PaymentsPage /></ProtectedRoute>} />
            <Route path="/academy-financial-report" element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'branch_manager', 'owner']}><AcademyFinancialReportPage /></ProtectedRoute>} />
            <Route path="/enterprise" element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'branch_manager', 'owner']}><EnterprisePage /></ProtectedRoute>} />
            <Route path="/ai-assistant" element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'teacher', 'owner', 'branch_manager', 'system_automation']}><AIAssistantPage /></ProtectedRoute>} />
            <Route path="/academic-standards" element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'branch_manager', 'owner']}><AcademicStandardsPage /></ProtectedRoute>} />
            <Route path="/exams" element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'branch_manager', 'teacher', 'student', 'parent', 'owner']}><ExamsPage /></ProtectedRoute>} />
            <Route path="/exams/:examId" element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'branch_manager', 'teacher', 'student', 'parent', 'owner']}><ExamRoutePage /></ProtectedRoute>} />
            <Route path="/global-search" element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'branch_manager', 'teacher', 'owner', 'accountant', 'librarian']}><GlobalSearchPage /></ProtectedRoute>} />
            <Route path="/security-events" element={<ProtectedRoute allowedRoles={['super_admin', 'owner']}><SecurityEventsPage /></ProtectedRoute>} />
            <Route path="/roles" element={<ProtectedRoute allowedRoles={['super_admin', 'owner']}><RolesPage /></ProtectedRoute>} />
            {allModuleConfigs.filter((config) => !customModulePaths.has(config.path)).map((config) => (
              <Route
                key={config.path}
                path={config.path}
                element={
                  <ProtectedRoute allowedRoles={config.permissions.view}>
                    <CrudPage config={config} />
                  </ProtectedRoute>
                }
              />
            ))}
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </AppErrorBoundary>
  );
}

export default App;
