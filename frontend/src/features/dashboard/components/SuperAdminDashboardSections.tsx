import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users, UserCheck, Layers, BookOpen, Archive, Bell, ClipboardList,
  FileText, CalendarDays, GraduationCap,
  MessageSquare, Building2, BarChart3, ShieldCheck, CalendarCheck
} from 'lucide-react';
import { AfghaniIcon } from '@/components/icons/AfghaniIcon';
import { DashboardPeriodFilters } from '@/features/dashboard/components/DashboardPeriodFilters';
import { ModuleControlCard } from '@/features/dashboard/components/ModuleControlCard';
import type { DashboardPeriod, DashboardSummary } from '@/features/dashboard/services/dashboardService';

type MetricKey = keyof DashboardSummary;

type SectionCard = {
  key?: MetricKey;
  labelKey: string;
  path: string;
  icon: typeof Users;
  iconClassName: string;
  currency?: boolean;
  signedCurrency?: boolean;
};

type DashboardSection = {
  titleKey: string;
  cards: SectionCard[];
};

const dashboardSections: DashboardSection[] = [
  {
    titleKey: 'dashboard.section_academic',
    cards: [
      { key: 'totalBranches', labelKey: 'dashboard.total_branches', path: '/branches', icon: Building2, iconClassName: 'text-orange-400' },
      { key: 'totalUsers', labelKey: 'common.users', path: '/users', icon: Users, iconClassName: 'text-emerald-400' },
      { key: 'totalStudents', labelKey: 'dashboard.total_students', path: '/students', icon: Users, iconClassName: 'text-blue-400' },
      { key: 'totalTeachers', labelKey: 'dashboard.total_teachers', path: '/teachers', icon: UserCheck, iconClassName: 'text-green-400' },
      { key: 'totalClasses', labelKey: 'dashboard.total_classes', path: '/classes', icon: Layers, iconClassName: 'text-purple-400' },
      { labelKey: 'common.courses', path: '/courses', icon: BookOpen, iconClassName: 'text-cyan-400' },
      { key: 'totalSubjects', labelKey: 'dashboard.total_subjects', path: '/subjects', icon: BookOpen, iconClassName: 'text-orange-400' },
      { key: 'totalFamilies', labelKey: 'common.families', path: '/families', icon: Archive, iconClassName: 'text-pink-400' },
      { key: 'totalAttendance', labelKey: 'common.attendance', path: '/attendance', icon: CalendarDays, iconClassName: 'text-sky-400' },
      { key: 'totalExams', labelKey: 'common.exams', path: '/exams', icon: FileText, iconClassName: 'text-indigo-400' },
      { key: 'totalResults', labelKey: 'common.results', path: '/results', icon: GraduationCap, iconClassName: 'text-emerald-400' },
      { labelKey: 'common.curriculum', path: '/curriculum', icon: BookOpen, iconClassName: 'text-amber-400' }
    ]
  },
  {
    titleKey: 'dashboard.section_financial',
    cards: [
      { key: 'incomeTotal', labelKey: 'dashboard.total_income', path: '/finance', icon: AfghaniIcon, iconClassName: 'text-yellow-400', currency: true },
      { key: 'studentFeeAccrualTotal', labelKey: 'finance.student_fee_accrual', path: '/students', icon: AfghaniIcon, iconClassName: 'text-sky-400', currency: true },
      { key: 'bookSalesTotal', labelKey: 'finance.book_sales_revenue', path: '/books', icon: AfghaniIcon, iconClassName: 'text-violet-400', currency: true },
      { key: 'expenseTotal', labelKey: 'finance.total_expenses', path: '/expenses', icon: AfghaniIcon, iconClassName: 'text-rose-400', currency: true },
      { key: 'paymentIncomeTotal', labelKey: 'common.payments', path: '/payments', icon: AfghaniIcon, iconClassName: 'text-indigo-400', currency: true },
      { key: 'outstandingBalance', labelKey: 'finance.pending_balances', path: '/payments', icon: AfghaniIcon, iconClassName: 'text-orange-400', currency: true },
      { key: 'totalPayments', labelKey: 'dashboard.total_payment_records', path: '/payments', icon: AfghaniIcon, iconClassName: 'text-lime-400' },
      { key: 'totalFinanceEntries', labelKey: 'common.finance', path: '/finance', icon: AfghaniIcon, iconClassName: 'text-green-400' },
      { key: 'payrollNetTotal', labelKey: 'common.payroll_tax', path: '/payroll', icon: AfghaniIcon, iconClassName: 'text-amber-400', currency: true },
      { key: 'academyNetTotal', labelKey: 'finance.net_profit', path: '/academy-financial-report', icon: AfghaniIcon, iconClassName: 'text-teal-400', currency: true, signedCurrency: true },
      { key: 'totalReports', labelKey: 'common.reports', path: '/reports', icon: BarChart3, iconClassName: 'text-violet-400' }
    ]
  },
  {
    titleKey: 'dashboard.section_operations',
    cards: [
      { key: 'totalBooks', labelKey: 'dashboard.total_books', path: '/books', icon: BookOpen, iconClassName: 'text-cyan-400' },
      { key: 'totalMessages', labelKey: 'messages.title', path: '/messages', icon: MessageSquare, iconClassName: 'text-fuchsia-400' },
      { key: 'totalNotifications', labelKey: 'dashboard.notifications', path: '/notifications', icon: Bell, iconClassName: 'text-slate-500 dark:text-slate-300' },
      { key: 'totalStudentFees', labelKey: 'finance.total_paid_student_amount', path: '/payments', icon: AfghaniIcon, iconClassName: 'text-amber-400', currency: true },
      { labelKey: 'common.timetable', path: '/timetable', icon: CalendarCheck, iconClassName: 'text-sky-400' }
    ]
  },
  {
    titleKey: 'dashboard.section_system',
    cards: [
      { key: 'totalAuditLogs', labelKey: 'common.audit_logs', path: '/audit', icon: ClipboardList, iconClassName: 'text-teal-400' },
      { labelKey: 'common.roles', path: '/roles', icon: ShieldCheck, iconClassName: 'text-red-400' }
    ]
  }
];

function resolveMetricValue(summary: DashboardSummary, key?: MetricKey) {
  if (!key) return undefined;
  const value = summary[key];
  return typeof value === 'number' ? value : 0;
}

type SuperAdminDashboardSectionsProps = {
  summary: DashboardSummary;
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
  disabled?: boolean;
};

export function SuperAdminDashboardSections({
  summary,
  period,
  onPeriodChange,
  disabled = false
}: SuperAdminDashboardSectionsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const openSection = (path: string, intent?: 'edit' | 'delete' | 'create') => {
    if (!intent) {
      navigate(path);
      return;
    }
    navigate(path, { state: { preferCardView: true, dashboardIntent: intent } });
  };

  return (
    <div className="space-y-8">
      {dashboardSections.map((section) => (
        <section key={section.titleKey} className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-200">{t(section.titleKey)}</h2>
            <DashboardPeriodFilters
              id={`dashboard-period-${section.titleKey}`}
              variant="inline"
              value={period}
              onChange={onPeriodChange}
              disabled={disabled}
            />
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {section.cards.map((card) => (
              <ModuleControlCard
                key={`${section.titleKey}-${card.path}-${card.labelKey}`}
                labelKey={card.labelKey}
                path={card.path}
                icon={card.icon}
                iconClassName={card.iconClassName}
                value={resolveMetricValue(summary, card.key)}
                currency={card.currency}
                signedCurrency={card.signedCurrency}
                onOpen={openSection}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
