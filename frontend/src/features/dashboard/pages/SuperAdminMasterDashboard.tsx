import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell, BookOpen, Building2, CalendarCheck, ClipboardList,
  FileText, GraduationCap, Layers, MessageSquare, ShieldCheck, UserCheck, Users
} from 'lucide-react';
import { AfghaniIcon } from '@/components/icons/AfghaniIcon';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { ModuleControlCard } from '@/features/dashboard/components/ModuleControlCard';
import { dashboardService } from '@/features/dashboard/services/dashboardService';
import { useAuthStore } from '@/store/authStore';
import { userCanOpenPath } from '@/features/resources/config/modules';

const moduleCards = [
  { key: 'branches', labelKey: 'common.branches', path: '/branches', icon: Building2, iconClassName: 'text-orange-400' },
  { key: 'users', labelKey: 'common.users', path: '/users', icon: Users, iconClassName: 'text-emerald-400' },
  { key: 'students', labelKey: 'common.students', path: '/students', icon: GraduationCap, iconClassName: 'text-blue-400' },
  { key: 'teachers', labelKey: 'common.teachers', path: '/teachers', icon: UserCheck, iconClassName: 'text-green-400' },
  { key: 'classes', labelKey: 'common.classes', path: '/classes', icon: Layers, iconClassName: 'text-purple-400' },
  { key: 'courses', labelKey: 'common.courses', path: '/courses', icon: BookOpen, iconClassName: 'text-cyan-400' },
  { key: 'subjects', labelKey: 'common.subjects', path: '/subjects', icon: BookOpen, iconClassName: 'text-amber-400' },
  { key: 'attendance', labelKey: 'common.attendance', path: '/attendance', icon: ClipboardList, iconClassName: 'text-sky-400' },
  { key: 'exams', labelKey: 'common.exams', path: '/exams', icon: CalendarCheck, iconClassName: 'text-yellow-400' },
  { key: 'results', labelKey: 'common.results', path: '/results', icon: FileText, iconClassName: 'text-indigo-400' },
  { key: 'books', labelKey: 'common.books', path: '/books', icon: BookOpen, iconClassName: 'text-teal-400' },
  { key: 'messages', labelKey: 'messages.title', path: '/messages', icon: MessageSquare, iconClassName: 'text-fuchsia-400' },
  { key: 'notifications', labelKey: 'common.notifications', path: '/notifications', icon: Bell, iconClassName: 'text-slate-500 dark:text-slate-300' },
  { key: 'curriculum', labelKey: 'common.curriculum', path: '/curriculum', icon: BookOpen, iconClassName: 'text-rose-400' },
  { key: 'audit', labelKey: 'common.audit_logs', path: '/audit', icon: ShieldCheck, iconClassName: 'text-lime-400' },
  { key: 'roles', labelKey: 'common.roles', path: '/roles', icon: ShieldCheck, iconClassName: 'text-red-400' },
  { key: 'payments', labelKey: 'common.payments', path: '/payments', icon: AfghaniIcon, iconClassName: 'text-green-400' },
  { key: 'finance', labelKey: 'common.finance', path: '/finance', icon: AfghaniIcon, iconClassName: 'text-emerald-400' },
  { key: 'expenses', labelKey: 'common.expenses', path: '/expenses', icon: AfghaniIcon, iconClassName: 'text-rose-400' },
  { key: 'reports', labelKey: 'common.reports', path: '/reports', icon: FileText, iconClassName: 'text-violet-400' },
  { key: 'payroll', labelKey: 'common.payroll_tax', path: '/payroll', icon: AfghaniIcon, iconClassName: 'text-amber-400' },
  { key: 'academyFinancialReport', labelKey: 'common.academy_financial_report', path: '/academy-financial-report', icon: AfghaniIcon, iconClassName: 'text-teal-400' },
  { key: 'timetable', labelKey: 'common.timetable', path: '/timetable', icon: CalendarCheck, iconClassName: 'text-cyan-400' },
  { key: 'families', labelKey: 'common.families', path: '/families', icon: Users, iconClassName: 'text-pink-400' }
] as const;

export function SuperAdminMasterDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-master-summary'],
    queryFn: dashboardService.masterSummary
  });

  const openSection = (path: string, intent?: 'edit' | 'delete' | 'create') => {
    if (!intent) {
      navigate(path);
      return;
    }
    navigate(path, { state: { preferCardView: true, dashboardIntent: intent } });
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 16 }).map((_, index) => (
          <Card key={index} className="min-h-[180px] animate-pulse p-6">
            <div className="h-10 w-10 rounded-2xl bg-slate-200 dark:bg-slate-700" />
            <div className="mt-6 h-5 w-32 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="mt-3 h-10 w-20 rounded bg-slate-100 dark:bg-slate-800" />
          </Card>
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="p-6 text-rose-600 dark:text-rose-200">
        {t('errors.unable_load_records')}
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-8 shadow-lg dark:border-white/10 dark:bg-slate-950/80">
        <p className="text-sm uppercase tracking-[0.35em] text-sky-600 dark:text-sky-300">
          {t('dashboard.super_admin_dashboard')}
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-slate-900 dark:text-white">
          {t('dashboard.master_control_center', { defaultValue: 'Module Control Center' })}
        </h1>
        <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
          {t('dashboard.master_control_description', { defaultValue: 'Manage every module with create, edit, and soft-delete controls.' })}
        </p>
        <Link
          to="/dashboard"
          className="mt-5 inline-flex rounded-full border border-sky-400/30 bg-sky-500/10 px-5 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-500/20 dark:text-sky-100"
        >
          {t('common.dashboard')}
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {moduleCards.filter((item) => userCanOpenPath(user, item.path)).map((item, index) => {
          const count = data[item.key as keyof typeof data];

          return (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: index * 0.02 }}
            >
              <ModuleControlCard
                labelKey={item.labelKey}
                path={item.path}
                icon={item.icon}
                iconClassName={item.iconClassName}
                value={typeof count === 'number' ? count : undefined}
                onOpen={openSection}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
