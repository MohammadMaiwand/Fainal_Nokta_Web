import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { PageHeader } from '@/shared/components/Common';
import { reportsService } from '@/features/reports/services/reportsService';
import { financeService } from '@/features/finance/services/financeService';
import { dashboardService } from '@/features/dashboard/services/dashboardService';
import { attendanceService } from '@/features/attendance/services/attendanceService';
import { formatCurrency, formatDate, formatNumber } from '@/utils/formatters';

const COLORS = ['#38bdf8', '#22c55e', '#f97316', '#a855f7', '#fb7185', '#facc15'];
const chartAxisColor = 'var(--color-text-soft)';
const chartGridColor = 'rgba(148,163,184,0.2)';

/** UI sections shown in the filter — each switches the lower detail panel */
const reportSections = [
  'overview',
  'financial',
  'registrations',
  'students_fees',
  'teacher_salaries',
  'payments',
  'expenses',
  'attendance',
  'academic',
  'exams',
  'security',
  'operations'
] as const;

type ReportSection = (typeof reportSections)[number];

/** Map UI section → backend generate snapshot type */
function mapSectionToGenerateType(section: ReportSection): 'financial' | 'attendance' | 'academic' | 'security' | 'operations' {
  if (section === 'attendance') return 'attendance';
  if (section === 'security') return 'security';
  if (section === 'academic' || section === 'exams' || section === 'registrations') return 'academic';
  if (
    section === 'financial'
    || section === 'students_fees'
    || section === 'teacher_salaries'
    || section === 'payments'
    || section === 'expenses'
  ) {
    return 'financial';
  }
  return 'operations';
}

function MetricCard({
  label,
  value,
  currency,
  language
}: {
  label: string;
  value: number | string | null | undefined;
  currency?: boolean;
  language: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100 sm:text-3xl">
        {currency
          ? formatCurrency(Number(value || 0), language)
          : typeof value === 'string'
            ? value
            : formatNumber(Number(value || 0), language)}
      </p>
    </Card>
  );
}

function DetailTable({
  headers,
  rows,
  emptyLabel
}: {
  headers: string[];
  rows: Array<Array<string | number>>;
  emptyLabel: string;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-start font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-slate-200/70 dark:border-slate-800">
              {row.map((cell, cellIndex) => (
                <td key={`${index}-${cellIndex}`} className="px-3 py-2 text-slate-800 dark:text-slate-100">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={headers.length} className="px-3 py-6 text-center text-slate-500">
                {emptyLabel}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function ReportsPage() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || 'fa';
  const queryClient = useQueryClient();
  const [section, setSection] = useState<ReportSection>('overview');
  const [generateStatus, setGenerateStatus] = useState('');

  const analyticsQuery = useQuery({
    queryKey: ['reports-analytics'],
    queryFn: reportsService.analytics
  });

  const savedReportsQuery = useQuery({
    queryKey: ['reports-list'],
    queryFn: reportsService.list
  });

  const financeQuery = useQuery({
    queryKey: ['reports-finance-summary'],
    queryFn: () => financeService.summary(),
    enabled: ['financial', 'students_fees', 'teacher_salaries', 'payments', 'expenses', 'overview'].includes(section)
  });

  const teachersFinanceQuery = useQuery({
    queryKey: ['reports-finance-teachers'],
    queryFn: () => financeService.teachers(),
    enabled: section === 'teacher_salaries' || section === 'financial'
  });

  const dashboardQuery = useQuery({
    queryKey: ['reports-dashboard-summary'],
    queryFn: () => dashboardService.summary('month'),
    enabled: ['overview', 'registrations', 'students_fees', 'academic', 'exams', 'operations', 'security'].includes(section)
  });

  const attendanceQuery = useQuery({
    queryKey: ['reports-attendance-summary'],
    queryFn: () => attendanceService.summary(),
    enabled: section === 'attendance'
  });

  const generateMutation = useMutation({
    mutationFn: () => reportsService.generate({ type: mapSectionToGenerateType(section) }),
    onSuccess: () => {
      setGenerateStatus(t('reports.generate_success'));
      void queryClient.invalidateQueries({ queryKey: ['reports-list'] });
    },
    onError: () => setGenerateStatus(t('reports.generate_failed'))
  });

  const cards = analyticsQuery.data?.cards;
  const charts = analyticsQuery.data?.charts;
  const finance = financeQuery.data;
  const teachers = teachersFinanceQuery.data ?? [];
  const dashboard = dashboardQuery.data;
  const attendance = attendanceQuery.data;
  const savedReports = savedReportsQuery.data ?? [];

  const sectionOptions = useMemo(
    () => reportSections.map((value) => ({ value, label: t(`reports.section_${value}`) })),
    [t]
  );

  const teacherSalaryRows = useMemo(
    () =>
      teachers.map((teacher) => [
        teacher.teacherName || '—',
        formatNumber(teacher.studentCount || 0, language),
        formatCurrency(teacher.totalSalaryPayable || 0, language),
        formatCurrency(teacher.paidSalaryAmount || 0, language),
        formatCurrency(teacher.unpaidSalaryAmount || 0, language),
        t(`finance.status_${teacher.paymentStatus}`, { defaultValue: teacher.paymentStatus })
      ]),
    [teachers, language, t]
  );

  const enrollmentRows = useMemo(
    () =>
      (dashboard?.enrollmentTrend ?? []).slice(-12).map((row: { year: number; month: number; students?: number; teachers?: number }) => [
        `${row.year}/${String(row.month).padStart(2, '0')}`,
        formatNumber(row.students || 0, language),
        formatNumber(row.teachers || 0, language)
      ]),
    [dashboard?.enrollmentTrend, language]
  );

  const overviewCards = [
    { key: 'totalStudents', label: t('dashboard.total_students'), value: cards?.totalStudents },
    { key: 'totalTeachers', label: t('dashboard.total_teachers'), value: cards?.totalTeachers },
    { key: 'totalClasses', label: t('dashboard.total_classes'), value: cards?.totalClasses },
    { key: 'totalExams', label: t('dashboard.total_exams'), value: cards?.totalExams },
    { key: 'totalResults', label: t('dashboard.total_results'), value: cards?.totalResults },
    { key: 'totalBranches', label: t('dashboard.total_branches'), value: cards?.totalBranches },
    { key: 'totalIncome', label: t('common.total_income'), value: cards?.totalIncome, currency: true },
    { key: 'monthlyRevenue', label: t('finance.monthly_revenue'), value: cards?.monthlyRevenue, currency: true },
    { key: 'monthlyExpenses', label: t('finance.monthly_expenses'), value: cards?.monthlyExpenses, currency: true },
    {
      key: 'attendanceSummary',
      label: t('attendance.attendance_summary'),
      value: (cards?.attendanceSummary?.present ?? 0) + (cards?.attendanceSummary?.absent ?? 0)
    },
    { key: 'paymentSummary', label: t('payments.payment_summary'), value: cards?.paymentSummary?.totalCollected, currency: true }
  ];

  const loadingDetail =
    (financeQuery.isLoading && ['financial', 'students_fees', 'teacher_salaries', 'payments', 'expenses'].includes(section))
    || (dashboardQuery.isLoading && ['registrations', 'students_fees', 'academic', 'exams', 'operations'].includes(section))
    || (attendanceQuery.isLoading && section === 'attendance')
    || (teachersFinanceQuery.isLoading && section === 'teacher_salaries');

  return (
    <div className="space-y-6">
      <PageHeader title="common.reports" description="reports.summary" />

      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-sm text-slate-600 dark:text-slate-300">{t('reports.section_filter')}</label>
            <Select
              value={section}
              options={sectionOptions}
              placeholder={t('reports.section_filter')}
              onChange={(value) => {
                setSection(String(value) as ReportSection);
                setGenerateStatus('');
              }}
            />
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t('reports.section_filter_hint')}</p>
          </div>
          <Button type="button" disabled={generateMutation.isPending} onClick={() => generateMutation.mutate()}>
            {generateMutation.isPending ? t('common.loading') : t('reports.generate_report')}
          </Button>
        </div>
        {generateStatus && <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">{generateStatus}</p>}
      </Card>

      {analyticsQuery.isError && (
        <Card className="border-rose-500/30 bg-rose-500/10 p-6 text-rose-700 dark:text-rose-200">
          {t('errors.unable_load_records')}
        </Card>
      )}

      <Card className="border-sky-200/70 bg-sky-50/50 p-4 dark:border-sky-500/20 dark:bg-sky-500/10">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          {t('reports.showing_section')}: {t(`reports.section_${section}`)}
        </p>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{t(`reports.section_${section}_hint`)}</p>
      </Card>

      {loadingDetail && (
        <Card className="p-6 text-sm text-slate-500 dark:text-slate-400">{t('common.loading')}</Card>
      )}

      {/* —— Overview —— */}
      {section === 'overview' && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {overviewCards.map((card) => (
              <MetricCard
                key={card.key}
                label={card.label}
                value={card.value}
                currency={card.currency}
                language={language}
              />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{t('reports.student_growth')}</p>
              <div className="mt-6 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts?.studentGrowth ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                    <XAxis dataKey="label" stroke={chartAxisColor} />
                    <YAxis stroke={chartAxisColor} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#38bdf8" radius={[12, 12, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{t('reports.payment_growth')}</p>
              <div className="mt-6 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts?.paymentGrowth ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                    <XAxis dataKey="label" stroke={chartAxisColor} />
                    <YAxis stroke={chartAxisColor} />
                    <Tooltip />
                    <Line type="monotone" dataKey="total" stroke="#22c55e" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{t('reports.expense_comparison')}</p>
              <div className="mt-6 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts?.expenseComparison ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                    <XAxis dataKey="label" stroke={chartAxisColor} />
                    <YAxis stroke={chartAxisColor} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#f97316" radius={[12, 12, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{t('reports.attendance_trend')}</p>
              <div className="mt-6 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts?.attendanceTrend ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                    <XAxis dataKey="label" stroke={chartAxisColor} />
                    <YAxis stroke={chartAxisColor} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="present" stroke="#22c55e" strokeWidth={3} />
                    <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={3} />
                    <Line type="monotone" dataKey="late" stroke="#facc15" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{t('reports.expense_breakdown')}</p>
            <div className="mt-6 h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={charts?.expenseBreakdown ?? []} dataKey="total" nameKey="category" outerRadius={120}>
                    {(charts?.expenseBreakdown ?? []).map((entry, index) => (
                      <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}

      {/* —— Financial —— */}
      {section === 'financial' && !financeQuery.isLoading && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label={t('finance.total_income')} value={finance?.totalIncome} currency language={language} />
            <MetricCard label={t('finance.student_payment_revenue')} value={finance?.studentPayments} currency language={language} />
            <MetricCard label={t('finance.total_expenses')} value={finance?.totalExpenses} currency language={language} />
            <MetricCard label={t('finance.net_profit')} value={finance?.netProfit} currency language={language} />
            <MetricCard label={t('reports.teacher_salaries_total')} value={finance?.totalTeacherPayableSalary} currency language={language} />
            <MetricCard label={t('reports.teacher_salaries_paid')} value={finance?.totalTeacherPaidSalary} currency language={language} />
            <MetricCard label={t('reports.teacher_salaries_pending')} value={finance?.totalTeacherPendingSalary} currency language={language} />
            <MetricCard label={t('finance.pending_student_payments')} value={finance?.pendingPayments} currency language={language} />
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{t('reports.payment_growth')}</p>
              <div className="mt-6 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts?.paymentGrowth ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                    <XAxis dataKey="label" stroke={chartAxisColor} />
                    <YAxis stroke={chartAxisColor} />
                    <Tooltip />
                    <Line type="monotone" dataKey="total" stroke="#22c55e" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{t('reports.expense_comparison')}</p>
              <div className="mt-6 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts?.expenseComparison ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                    <XAxis dataKey="label" stroke={chartAxisColor} />
                    <YAxis stroke={chartAxisColor} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#f97316" radius={[12, 12, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
          {teachers.length > 0 && (
            <Card className="space-y-3 p-5">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{t('reports.teacher_salaries_detail')}</p>
              <DetailTable
                headers={[
                  t('common.teachers'),
                  t('dashboard.total_students'),
                  t('reports.payable'),
                  t('reports.paid'),
                  t('reports.pending'),
                  t('common.status')
                ]}
                rows={teacherSalaryRows}
                emptyLabel={t('reports.no_section_data')}
              />
            </Card>
          )}
        </div>
      )}

      {/* —— Registrations —— */}
      {section === 'registrations' && !dashboardQuery.isLoading && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label={t('dashboard.total_students')} value={dashboard?.totalStudents} language={language} />
            <MetricCard label={t('dashboard.total_teachers')} value={dashboard?.totalTeachers} language={language} />
            <MetricCard label={t('dashboard.total_classes')} value={dashboard?.totalClasses} language={language} />
            <MetricCard label={t('dashboard.total_families')} value={dashboard?.totalFamilies} language={language} />
          </div>
          <Card className="space-y-3 p-5">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{t('reports.registration_trend')}</p>
            <DetailTable
              headers={[t('dashboard.period_month'), t('dashboard.total_students'), t('dashboard.total_teachers')]}
              rows={enrollmentRows}
              emptyLabel={t('reports.no_section_data')}
            />
          </Card>
        </div>
      )}

      {/* —— Students & fees —— */}
      {section === 'students_fees' && !(dashboardQuery.isLoading || financeQuery.isLoading) && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label={t('dashboard.total_students')} value={dashboard?.totalStudents ?? cards?.totalStudents} language={language} />
            <MetricCard label={t('reports.total_student_fees')} value={dashboard?.totalStudentFees ?? dashboard?.studentFeeAccrualTotal} currency language={language} />
            <MetricCard label={t('finance.student_payment_revenue')} value={finance?.studentPayments} currency language={language} />
            <MetricCard label={t('finance.pending_student_payments')} value={finance?.pendingPayments} currency language={language} />
            <MetricCard label={t('finance.student_fee_accrual')} value={dashboard?.studentFeeAccrualTotal} currency language={language} />
            <MetricCard label={t('finance.pending_balances')} value={dashboard?.outstandingBalance} currency language={language} />
            <MetricCard label={t('dashboard.total_classes')} value={dashboard?.totalClasses} language={language} />
            <MetricCard label={t('dashboard.total_families')} value={dashboard?.totalFamilies} language={language} />
          </div>
          <Card className="p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{t('reports.payment_growth')}</p>
            <div className="mt-6 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts?.paymentGrowth ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                  <XAxis dataKey="label" stroke={chartAxisColor} />
                  <YAxis stroke={chartAxisColor} />
                  <Tooltip />
                  <Line type="monotone" dataKey="total" stroke="#22c55e" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* —— Teacher salaries —— */}
      {section === 'teacher_salaries' && !(financeQuery.isLoading || teachersFinanceQuery.isLoading) && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label={t('reports.teacher_salaries_total')} value={finance?.totalTeacherPayableSalary} currency language={language} />
            <MetricCard label={t('reports.teacher_salaries_paid')} value={finance?.totalTeacherPaidSalary} currency language={language} />
            <MetricCard label={t('reports.teacher_salaries_pending')} value={finance?.totalTeacherPendingSalary} currency language={language} />
            <MetricCard label={t('dashboard.total_teachers')} value={teachers.length || dashboard?.totalTeachers} language={language} />
          </div>
          <Card className="space-y-3 p-5">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{t('reports.teacher_salaries_detail')}</p>
            <DetailTable
              headers={[
                t('common.teachers'),
                t('dashboard.total_students'),
                t('reports.payable'),
                t('reports.paid'),
                t('reports.pending'),
                t('common.status')
              ]}
              rows={teacherSalaryRows}
              emptyLabel={t('reports.no_section_data')}
            />
          </Card>
        </div>
      )}

      {/* —— Payments —— */}
      {section === 'payments' && !financeQuery.isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label={t('finance.student_payment_revenue')} value={finance?.studentPayments} currency language={language} />
          <MetricCard label={t('finance.pending_student_payments')} value={finance?.pendingPayments} currency language={language} />
          <MetricCard label={t('payments.payment_summary')} value={finance?.paidInvoices} language={language} />
          <MetricCard label={t('common.total_income')} value={finance?.totalIncome} currency language={language} />
        </div>
      )}

      {/* —— Expenses —— */}
      {section === 'expenses' && !financeQuery.isLoading && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard label={t('finance.total_expenses')} value={finance?.totalExpenses} currency language={language} />
            <MetricCard label={t('finance.monthly_expenses')} value={cards?.monthlyExpenses} currency language={language} />
            <MetricCard label={t('finance.net_profit')} value={finance?.netProfit} currency language={language} />
          </div>
          <Card className="p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{t('reports.expense_breakdown')}</p>
            <div className="mt-6 h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={charts?.expenseBreakdown ?? []} dataKey="total" nameKey="category" outerRadius={120}>
                    {(charts?.expenseBreakdown ?? []).map((entry, index) => (
                      <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* —— Attendance —— */}
      {section === 'attendance' && !attendanceQuery.isLoading && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label={t('attendance.present')} value={attendance?.present ?? cards?.attendanceSummary?.present} language={language} />
            <MetricCard label={t('attendance.absent')} value={attendance?.absent ?? cards?.attendanceSummary?.absent} language={language} />
            <MetricCard label={t('attendance.late')} value={attendance?.late ?? cards?.attendanceSummary?.late} language={language} />
            <MetricCard
              label={t('attendance.attendance_summary')}
              value={
                Number(attendance?.present ?? cards?.attendanceSummary?.present ?? 0)
                + Number(attendance?.absent ?? cards?.attendanceSummary?.absent ?? 0)
                + Number(attendance?.late ?? cards?.attendanceSummary?.late ?? 0)
              }
              language={language}
            />
          </div>
          <Card className="p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{t('reports.attendance_trend')}</p>
            <div className="mt-6 h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={
                    (attendance?.recentTrend?.length
                      ? attendance.recentTrend.map((row) => ({
                          label: row.date,
                          present: row.present,
                          absent: row.absent,
                          late: row.late
                        }))
                      : charts?.attendanceTrend) ?? []
                  }
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                  <XAxis dataKey="label" stroke={chartAxisColor} />
                  <YAxis stroke={chartAxisColor} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="present" stroke="#22c55e" strokeWidth={3} />
                  <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={3} />
                  <Line type="monotone" dataKey="late" stroke="#facc15" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* —— Academic —— */}
      {section === 'academic' && !dashboardQuery.isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label={t('dashboard.total_students')} value={dashboard?.totalStudents} language={language} />
          <MetricCard label={t('dashboard.total_teachers')} value={dashboard?.totalTeachers} language={language} />
          <MetricCard label={t('dashboard.total_classes')} value={dashboard?.totalClasses} language={language} />
          <MetricCard label={t('dashboard.total_subjects')} value={dashboard?.totalSubjects} language={language} />
          <MetricCard label={t('dashboard.total_exams')} value={dashboard?.totalExams} language={language} />
          <MetricCard label={t('dashboard.total_results')} value={dashboard?.totalResults} language={language} />
        </div>
      )}

      {/* —— Exams —— */}
      {section === 'exams' && !dashboardQuery.isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard label={t('dashboard.total_exams')} value={dashboard?.totalExams ?? cards?.totalExams} language={language} />
          <MetricCard label={t('dashboard.total_results')} value={dashboard?.totalResults ?? cards?.totalResults} language={language} />
          <MetricCard label={t('dashboard.total_classes')} value={dashboard?.totalClasses ?? cards?.totalClasses} language={language} />
        </div>
      )}

      {/* —— Security —— */}
      {section === 'security' && !dashboardQuery.isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard label={t('dashboard.total_users')} value={dashboard?.totalUsers} language={language} />
          <MetricCard label={t('dashboard.total_audit_logs')} value={dashboard?.totalAuditLogs} language={language} />
          <MetricCard label={t('dashboard.total_notifications')} value={dashboard?.totalNotifications} language={language} />
        </div>
      )}

      {/* —— Operations —— */}
      {section === 'operations' && !dashboardQuery.isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label={t('dashboard.total_students')} value={dashboard?.totalStudents} language={language} />
          <MetricCard label={t('dashboard.total_teachers')} value={dashboard?.totalTeachers} language={language} />
          <MetricCard label={t('dashboard.total_classes')} value={dashboard?.totalClasses} language={language} />
          <MetricCard label={t('dashboard.total_notifications')} value={dashboard?.totalNotifications} language={language} />
          <MetricCard label={t('dashboard.total_messages')} value={dashboard?.totalMessages} language={language} />
          <MetricCard label={t('dashboard.total_books')} value={dashboard?.totalBooks} language={language} />
          <MetricCard label={t('dashboard.total_branches')} value={dashboard?.totalBranches} language={language} />
          <MetricCard label={t('dashboard.total_reports')} value={dashboard?.totalReports} language={language} />
        </div>
      )}

      <Card className="p-6">
        <p className="mb-4 text-sm uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">{t('reports.saved_reports')}</p>
        <div className="grid gap-3">
          {savedReports.map((report: any) => (
            <div
              key={report._id ?? report.id}
              className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {report.title ?? t(`reports.type_${report.type}`)}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {t(`reports.type_${report.type}`)} · {report.periodKey}
                  </p>
                </div>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-700 dark:text-emerald-300">
                  {report.status ?? 'generated'}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {formatDate(report.createdAt, language)}
              </p>
            </div>
          ))}
          {!savedReports.length && (
            <p className="text-slate-500 dark:text-slate-400">{t('reports.no_saved_reports')}</p>
          )}
        </div>
      </Card>
    </div>
  );
}
