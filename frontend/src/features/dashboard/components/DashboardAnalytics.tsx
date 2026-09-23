import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { userCanOpenPath } from '@/features/resources/config/modules';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { BarChart3, TrendingUp, Users } from 'lucide-react';
import { AfghaniIcon } from '@/components/icons/AfghaniIcon';
import { Card } from '@/components/ui/Card';
import { chartTheme } from '@/constants/chartTheme';
import { ChartCard, EmptyStateCard } from '@/features/dashboard/components/DashboardWidgets';
import { DashboardPeriodFilters } from '@/features/dashboard/components/DashboardPeriodFilters';
import { formatCurrency, roundMoney } from '@/utils/formatters';
import { formatJalaliMonth } from '@/utils/date';

const COLORS = ['#38bdf8', '#22c55e', '#f97316', '#a855f7', '#fb7185', '#0ea5e9'];

interface FinancialSummary {
  monthlyFinances?: Array<{ year: number; month: number; income: number; expenses: number }>;
  expenseCategoryBreakdown?: Array<{ category: string; total: number }>;
  enrollmentTrend?: Array<{ year: number; month: number; students: number; teachers: number }>;
}

import type { DashboardPeriod } from '@/features/dashboard/services/dashboardService';

interface DashboardAnalyticsProps {
  summary: FinancialSummary;
  loading?: boolean;
  period?: DashboardPeriod;
  showPeriodFilter?: boolean;
  onPeriodChange?: (period: DashboardPeriod) => void;
  periodFilterDisabled?: boolean;
}

function monthLabel(year: number, month: number, locale: string) {
  return formatJalaliMonth(year, month, locale);
}

function renderPieLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  name,
  percent
}: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  name?: string;
  percent?: number;
}) {
  if (
    cx === undefined ||
    cy === undefined ||
    midAngle === undefined ||
    innerRadius === undefined ||
    outerRadius === undefined ||
    percent === undefined
  ) {
    return null;
  }

  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos((-midAngle * Math.PI) / 180);
  const y = cy + radius * Math.sin((-midAngle * Math.PI) / 180);

  return (
    <text
      x={x}
      y={y}
      fill="var(--color-chart-axis)"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize="12"
      fontWeight="600"
    >
      {`${name}: ${Math.round(percent * 100)}%`}
    </text>
  );
}

function formatFinanceLabel(
  item: { year: number; month: number; day?: number; hour?: number },
  locale: string,
  period: DashboardPeriod = 'month'
) {
  if (period === 'day' && item.hour !== undefined) {
    return `${item.hour}:00`;
  }
  if (period === 'month' && item.day !== undefined) {
    return `${item.day}/${item.month}`;
  }
  return monthLabel(item.year, item.month, locale);
}

export default function DashboardAnalytics({
  summary,
  loading,
  period = 'month',
  showPeriodFilter = false,
  onPeriodChange,
  periodFilterDisabled = false
}: DashboardAnalyticsProps) {
  const { i18n, t } = useTranslation();
  const user = useAuthStore((state) => state.user);

  const linkedCard = (path: string, content: JSX.Element) => {
    if (!userCanOpenPath(user, path)) return content;
    return (
      <Link to={path} className="block h-full rounded-[inherit] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
        {content}
      </Link>
    );
  };

  const monthlyFinances = summary.monthlyFinances ?? [];
  const enrollmentTrend = summary.enrollmentTrend ?? [];
  const expenseCategoryBreakdown = summary.expenseCategoryBreakdown ?? [];

  const formattedMonthlyFinances = useMemo(
    () =>
      monthlyFinances.map((item) => ({
        ...item,
        monthLabel: formatFinanceLabel(item as { year: number; month: number; day?: number; hour?: number }, i18n.language, period)
      })),
    [monthlyFinances, i18n.language, period]
  );

  const formattedEnrollmentTrend = useMemo(
    () =>
      enrollmentTrend.map((item) => ({
        ...item,
        month: formatFinanceLabel(item as { year: number; month: number; day?: number; hour?: number }, i18n.language, period)
      })),
    [enrollmentTrend, i18n.language, period]
  );

  const totalIncome = useMemo(
    () => roundMoney(monthlyFinances.reduce((sum, item) => sum + item.income, 0)),
    [monthlyFinances]
  );
  const totalExpenses = useMemo(
    () => roundMoney(monthlyFinances.reduce((sum, item) => sum + item.expenses, 0)),
    [monthlyFinances]
  );

  const financeTooltipFormatter = (value: number | string) => formatCurrency(value, i18n.resolvedLanguage);

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="h-80 rounded-3xl bg-slate-800/70" />
        ))}
      </div>
    );
  }

  if (!monthlyFinances.length && !enrollmentTrend.length && !expenseCategoryBreakdown.length) {
    return (
      <div className="grid gap-4 xl:grid-cols-3">
        <EmptyStateCard
          title={t('common.no_data')}
          description={t('common.live_school_metrics')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showPeriodFilter && onPeriodChange ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-200">{t('dashboard.section_analytics')}</h2>
          <DashboardPeriodFilters
            id="dashboard-period-analytics"
            variant="inline"
            value={period}
            onChange={onPeriodChange}
            disabled={periodFilterDisabled}
          />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {linkedCard('/finance',
        <ChartCard title={t('common.chart_monthly_finance')} action={<AfghaniIcon className="h-5 w-5 text-green-400" />}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedMonthlyFinances} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="monthLabel" tick={{ fill: chartTheme.axis, fontSize: 12 }} />
              <YAxis tick={{ fill: chartTheme.axis, fontSize: 12 }} />
              <Tooltip contentStyle={chartTheme.tooltip} formatter={financeTooltipFormatter} />
              <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={3} name={t('common.monthly_income')} />
              <Line type="monotone" dataKey="expenses" stroke="#f97316" strokeWidth={3} name={t('common.monthly_expenses')} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>)}

        {linkedCard('/students',
        <ChartCard title={t('common.chart_enrollment_trend')} action={<Users className="h-5 w-5 text-sky-500" />}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={formattedEnrollmentTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="month" tick={{ fill: chartTheme.axis, fontSize: 12 }} />
              <YAxis tick={{ fill: chartTheme.axis, fontSize: 12 }} />
              <Tooltip contentStyle={chartTheme.tooltip} />
              <Bar dataKey="students" fill="#38bdf8" name={t('common.students')} />
              <Bar dataKey="teachers" fill="#a855f7" name={t('common.teachers')} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>)}

        {linkedCard('/expenses',
        <ChartCard title={t('common.chart_expense_breakdown')} action={<BarChart3 className="h-5 w-5 text-orange-400" />}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip contentStyle={chartTheme.tooltip} formatter={financeTooltipFormatter} />
              <Legend verticalAlign="bottom" wrapperStyle={chartTheme.legend} />
              <Pie
                data={expenseCategoryBreakdown}
                dataKey="total"
                nameKey="category"
                innerRadius={54}
                outerRadius={104}
                paddingAngle={4}
                label={renderPieLabel}
              >
                {expenseCategoryBreakdown.map((entry, index) => (
                  <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>)}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {linkedCard('/finance',
        <Card className="p-6 transition hover:border-sky-400/30">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('common.cash_flow')}</p>
              <h3 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{formatCurrency(totalIncome - totalExpenses, i18n.resolvedLanguage)}</h3>
            </div>
            <TrendingUp className="h-8 w-8 rounded-lg bg-blue-50 p-2 text-green-500 dark:bg-blue-500/10" />
          </div>
        </Card>)}

        {linkedCard('/finance',
        <Card className="p-6 transition hover:border-sky-400/30">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('common.total_income')}</p>
              <h3 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{formatCurrency(totalIncome, i18n.resolvedLanguage)}</h3>
            </div>
            <AfghaniIcon className="h-8 w-8 rounded-lg bg-green-50 p-2 text-green-500 dark:bg-green-500/10" />
          </div>
        </Card>)}

        {linkedCard('/expenses',
        <Card className="p-6 transition hover:border-sky-400/30">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('finance.total_expenses')}</p>
              <h3 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{formatCurrency(totalExpenses, i18n.resolvedLanguage)}</h3>
            </div>
            <AfghaniIcon className="h-8 w-8 rounded-lg bg-rose-50 p-2 text-rose-500 dark:bg-rose-500/10" />
          </div>
        </Card>)}
      </div>
    </div>
  );
}
