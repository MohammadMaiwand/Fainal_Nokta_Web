import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { ArrowUpDown } from 'lucide-react';
import { AfghaniIcon } from '@/components/icons/AfghaniIcon';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PageHeader, SearchFilterBar } from '@/shared/components/Common';
import { PrintButton, PrintableSection, PrintHeader, ExportButtons } from '@/shared/print';
import {
  financeService,
  type FinanceQuery,
  type TeacherFinanceDetail,
  type TeacherFinanceOverview
} from '@/features/finance/services/financeService';
import { api } from '@/services/apiClient';
import { useAuthStore } from '@/store/authStore';
import { useDebounce } from '@/hooks/useDebounce';
import { matchesSearch, sortCollection, type ListSortDirection, type ListSortField } from '@/utils/listSearchSort';
import { formatCurrency, formatDate, formatSignedCurrency } from '@/utils/formatters';
import { JalaliDateInput } from '@/components/forms/JalaliDateInput';
import { jalaliRangeToApiQuery } from '@/utils/jalaliQuery';
import { formatJalaliMonth, getCurrentJalaliYearMonth } from '@/utils/date';
import { resolveQuickDatePeriod } from '@/utils/datePeriods';

const chartAxisColor = 'var(--color-chart-axis)';
const chartGridColor = 'var(--color-chart-grid)';

function statusBadgeClass(status: string) {
  if (status === 'paid') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
  if (status === 'unpaid' || status === 'overdue') return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30';
  if (status === 'pending') return 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30';
  return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20';
}

function TeacherDetailPanel({
  detail,
  onPayout,
  payoutPending,
  payoutError
}: {
  detail: TeacherFinanceDetail;
  onPayout?: (payload: { teacherId: string; amount: number; notes?: string }) => void;
  payoutPending?: boolean;
  payoutError?: string;
}) {
  const { t, i18n } = useTranslation();
  const [payoutNotes, setPayoutNotes] = useState('');
  const unpaid = Number(detail.overview?.unpaidSalaryAmount ?? 0);
  const canPayout = unpaid > 0 && Boolean(onPayout);

  return (
    <Card className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{detail.teacher.teacherName}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">{detail.teacher.email}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${statusBadgeClass(detail.overview?.paymentStatus ?? 'pending')}`}>
          {t(`finance.status_${detail.overview?.paymentStatus ?? 'pending'}`, { defaultValue: detail.overview?.paymentStatus ?? 'pending' })}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="app-surface-muted rounded-2xl p-4">
          <p className="app-text-muted text-xs uppercase tracking-wide">{t('finance.assigned_students')}</p>
          <p className="app-text-strong mt-2 font-semibold">{detail.overview?.studentCount ?? 0}</p>
        </div>
        <div className="app-surface-muted rounded-2xl p-4">
          <p className="app-text-muted text-xs uppercase tracking-wide">{t('finance.salary_mode')}</p>
          <p className="app-text-strong mt-2 font-semibold">{t(`finance.mode_${detail.teacher.salaryMode}`, { defaultValue: detail.teacher.salaryMode })}</p>
        </div>
        <div className="app-surface-muted rounded-2xl p-4">
          <p className="app-text-muted text-xs uppercase tracking-wide">{t('finance.total_paid_student_amount')}</p>
          <p className="app-text-strong mt-2 font-semibold">{formatCurrency(detail.overview?.totalPaidStudentAmount, i18n.resolvedLanguage)}</p>
        </div>
        <div className="app-surface-muted rounded-2xl p-4">
          <p className="app-text-muted text-xs uppercase tracking-wide">{t('finance.commission_earned')}</p>
          <p className="app-text-strong mt-2 font-semibold">{formatCurrency(detail.overview?.commissionEarned ?? detail.overview?.totalEarningFromPayments, i18n.resolvedLanguage)}</p>
        </div>
        <div className="app-surface-muted rounded-2xl p-4">
          <p className="app-text-muted text-xs uppercase tracking-wide">{t('finance.fixed_salary')}</p>
          <p className="app-text-strong mt-2 font-semibold">{formatCurrency(detail.teacher.fixedSalaryAmount, i18n.resolvedLanguage)}</p>
        </div>
        <div className="app-surface-muted rounded-2xl p-4">
          <p className="app-text-muted text-xs uppercase tracking-wide">{t('finance.commission_percent')}</p>
          <p className="app-text-strong mt-2 font-semibold">{detail.teacher.commissionPercentage}%</p>
        </div>
        <div className="app-surface-muted rounded-2xl p-4">
          <p className="app-text-muted text-xs uppercase tracking-wide">{t('finance.total_payable')}</p>
          <p className="app-text-strong mt-2 font-semibold">{formatCurrency(detail.overview?.totalSalaryPayable, i18n.resolvedLanguage)}</p>
        </div>
        <div className="app-surface-muted rounded-2xl p-4">
          <p className="app-text-muted text-xs uppercase tracking-wide">{t('finance.paid_salary')}</p>
          <p className="mt-2 font-semibold text-emerald-700 dark:text-emerald-300">{formatCurrency(detail.overview?.paidSalaryAmount, i18n.resolvedLanguage)}</p>
        </div>
        <div className="app-surface-muted rounded-2xl p-4">
          <p className="app-text-muted text-xs uppercase tracking-wide">{t('finance.unpaid_salary')}</p>
          <p className="mt-2 font-semibold text-amber-700 dark:text-amber-300">{formatCurrency(detail.overview?.unpaidSalaryAmount, i18n.resolvedLanguage)}</p>
        </div>
        <div className="app-surface-muted rounded-2xl p-4">
          <p className="app-text-muted text-xs uppercase tracking-wide">{t('finance.payroll_gross_salary', { defaultValue: 'Gross Salary (Month)' })}</p>
          <p className="app-text-strong mt-2 font-semibold">{formatCurrency(detail.overview?.payrollGrossSalary ?? detail.payroll?.grossSalary, i18n.resolvedLanguage)}</p>
        </div>
        <div className="app-surface-muted rounded-2xl p-4">
          <p className="app-text-muted text-xs uppercase tracking-wide">{t('finance.payroll_tax_amount', { defaultValue: 'Government Tax' })}</p>
          <p className="mt-2 font-semibold text-rose-700 dark:text-rose-300">{formatCurrency(detail.overview?.payrollTaxAmount ?? detail.payroll?.taxAmount, i18n.resolvedLanguage)}</p>
        </div>
        <div className="app-surface-muted rounded-2xl p-4">
          <p className="app-text-muted text-xs uppercase tracking-wide">{t('finance.payroll_net_salary', { defaultValue: 'Net Payable' })}</p>
          <p className="mt-2 font-semibold text-emerald-700 dark:text-emerald-300">{formatCurrency(detail.overview?.payrollNetSalary ?? detail.payroll?.netSalary, i18n.resolvedLanguage)}</p>
        </div>
      </div>

      {detail.payroll?.taxExplanation ? (
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
          <p className="font-semibold text-slate-900 dark:text-slate-100">{t('finance.tax_calculation_note', { defaultValue: 'Tax calculation' })}</p>
          <p className="mt-2">
            {t('finance.student_fee_total_month', { defaultValue: 'Student fees this month' })}: {formatCurrency(detail.payroll.totalStudentPaymentsUsed, i18n.resolvedLanguage)}
            {' — '}
            {detail.payroll.percentageUsed}% = {formatCurrency(detail.payroll.commissionAmount, i18n.resolvedLanguage)}
          </p>
          <p className="mt-1">{detail.payroll.taxExplanation}</p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{t('finance.assigned_classes')}</h4>
          <div className="space-y-2">
            {detail.assignedClasses.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200/80 px-3 py-2 text-sm text-slate-800 dark:border-slate-800 dark:text-slate-200">{item.name}</div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{t('finance.assigned_subjects')}</h4>
          <div className="space-y-2">
            {detail.assignedSubjects.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200/80 px-3 py-2 text-sm text-slate-800 dark:border-slate-800 dark:text-slate-200">{item.title}</div>
            ))}
          </div>
        </div>
      </div>

      {canPayout && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 dark:bg-amber-500/10">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">{t('finance.process_payroll_payout')}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t('finance.payout_amount_hint', { amount: formatCurrency(unpaid, i18n.resolvedLanguage) })}
          </p>
          <textarea
            value={payoutNotes}
            onChange={(event) => setPayoutNotes(event.target.value)}
            rows={2}
            placeholder={t('finance.payout_notes_placeholder')}
            className="mt-3 w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <Button
            type="button"
            className="mt-3"
            disabled={payoutPending}
            onClick={() =>
              onPayout?.({
                teacherId: detail.teacher.teacherId,
                amount: unpaid,
                notes: payoutNotes
              })
            }
          >
            {payoutPending ? t('common.processing', { defaultValue: 'Processing...' }) : t('finance.confirm_payout', { defaultValue: 'Confirm payout' })}
          </Button>
          {payoutError ? <p className="mt-2 text-sm text-rose-600 dark:text-rose-300">{payoutError}</p> : null}
        </div>
      )}

      <div>
        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          {t('finance.students_commission_breakdown', { defaultValue: 'Students & teacher commission' })}
        </h4>
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100/80 text-left text-slate-600 dark:bg-slate-900/80 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">{t('common.student')}</th>
                <th className="px-4 py-3">{t('students.fee_amount', { defaultValue: 'Fee' })}</th>
                <th className="px-4 py-3">{t('students.paid_amount', { defaultValue: 'Paid' })}</th>
                <th className="px-4 py-3">{t('finance.commission_percent')}</th>
                <th className="px-4 py-3">{t('finance.commission_from_student', { defaultValue: 'Teacher share' })}</th>
                <th className="px-4 py-3">{t('finance.remaining', { defaultValue: 'Remaining' })}</th>
              </tr>
            </thead>
            <tbody>
              {(detail.students ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-slate-500">
                    {t('common.no_data', { defaultValue: 'No students assigned' })}
                  </td>
                </tr>
              ) : (
                detail.students.map((student) => (
                  <tr key={student.id} className="border-t border-slate-200/70 dark:border-slate-800/80">
                    <td className="px-4 py-3 text-slate-800 dark:text-slate-200">
                      {student.name}
                      {student.studentCode ? (
                        <span className="mt-0.5 block text-xs text-slate-500">{student.studentCode}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{formatCurrency(student.feeAmount ?? 0, i18n.resolvedLanguage)}</td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {formatCurrency(student.paidAmount, i18n.resolvedLanguage)}
                    </td>
                    <td className="px-4 py-3">{student.commissionPercentage ?? detail.teacher.commissionPercentage}%</td>
                    <td className="px-4 py-3 font-semibold text-emerald-700 dark:text-emerald-300">
                      {formatCurrency(student.commissionFromStudent ?? 0, i18n.resolvedLanguage)}
                    </td>
                    <td className="px-4 py-3">{formatCurrency(student.remainingBalance, i18n.resolvedLanguage)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{t('finance.student_payment_revenue')}</h4>
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100/80 text-left text-slate-600 dark:bg-slate-900/80 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">{t('common.student')}</th>
                <th className="px-4 py-3">{t('finance.amount')}</th>
                <th className="px-4 py-3">{t('finance.date')}</th>
                <th className="px-4 py-3">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody>
              {detail.linkedPayments.map((payment) => (
                <tr key={payment.id} className="border-t border-slate-200/70 dark:border-slate-800/80">
                  <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{payment.studentName}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{formatCurrency(payment.amount, i18n.resolvedLanguage)}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatDate(payment.paymentDate, i18n.resolvedLanguage)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${statusBadgeClass(payment.status)}`}>{payment.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

export function FinancePage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canPayout = ['super_admin', 'admin', 'owner'].includes(user?.role ?? '');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<ListSortField>('name');
  const [sortDirection, setSortDirection] = useState<ListSortDirection>('asc');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [quickPeriod, setQuickPeriod] = useState('this_month');
  const [branchId, setBranchId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [payoutError, setPayoutError] = useState('');

  const jalaliRange = jalaliRangeToApiQuery(startDate, endDate);
  const quickRange = resolveQuickDatePeriod(quickPeriod);
  const currentHijriPeriod = getCurrentJalaliYearMonth();
  const query: FinanceQuery = {
    startDate: quickPeriod === 'custom' ? jalaliRange.startDate : quickRange?.from,
    endDate: quickPeriod === 'custom' ? jalaliRange.endDate : quickRange?.to,
    branchId: branchId || undefined,
    teacherId: teacherId || undefined,
    status: statusFilter || undefined
  };

  const canFilterBranch = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'owner';

  const { data: summary, isError } = useQuery({
    queryKey: ['finance-summary', query],
    queryFn: () => financeService.summary(query)
  });
  const { data: academyFinancialSummary } = useQuery({
    queryKey: ['academy-financial-report-net', currentHijriPeriod.year, currentHijriPeriod.month, branchId],
    queryFn: () =>
      api
        .get('/academy-financial-report', {
          params: {
            reportType: 'monthly',
            hijriYear: currentHijriPeriod.year,
            hijriMonth: currentHijriPeriod.month,
            paymentStatus: 'paid',
            ...(branchId ? { branchId } : {})
          }
        })
        .then((res) => res.data.data),
    // For custom finance filters, the cards continue to use their filtered result.
    enabled: quickPeriod === 'this_month' && !teacherId && !statusFilter
  });

  const { data: loanSummary } = useQuery({
    queryKey: ['loans-summary-finance', query.branchId],
    queryFn: () =>
      api.get('/loans/summary', { params: query.branchId ? { branchId: query.branchId } : undefined }).then((res) => res.data.data)
  });

  const { data: teachers = [], isError: teachersError } = useQuery({
    queryKey: ['finance-teachers', query],
    queryFn: () => financeService.teachers(query)
  });

  const { data: teacherDetail, isError: teacherDetailError } = useQuery({
    queryKey: ['finance-teacher-detail', selectedTeacherId, query],
    queryFn: () => financeService.teacherDetail(selectedTeacherId, query),
    enabled: Boolean(selectedTeacherId)
  });

  const { data: branchOptions } = useQuery({
    queryKey: ['finance-branches'],
    queryFn: () =>
      api.get('/branches', { params: { limit: 100 } }).then((res) => {
        const branches = Array.isArray(res.data.data) ? res.data.data : [];
        return branches.map((branch: any) => ({
          value: String(branch._id ?? branch.id),
          label: String(branch.name ?? branch.code ?? '')
        }));
      }),
    enabled: canFilterBranch
  });

  const { data: records, isLoading: recordsLoading, isError: recordsError } = useQuery({
    queryKey: ['finance-records'],
    queryFn: financeService.list
  });

  const payoutMutation = useMutation({
    mutationFn: (payload: { teacherId: string; amount: number; notes?: string }) => {
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return financeService.payoutSalary({ teacherId: payload.teacherId, monthKey, amount: payload.amount, notes: payload.notes });
    },
    onSuccess: () => {
      setPayoutError('');
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['finance-teachers'] });
      queryClient.invalidateQueries({ queryKey: ['finance-teacher-detail'] });
      queryClient.invalidateQueries({ queryKey: ['finance-records'] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message ?? error?.message ?? t('errors.unable_save', { defaultValue: 'Unable to save.' });
      setPayoutError(String(message));
    }
  });

  const debouncedSearch = useDebounce(search, 300);

  const monthlyIncome = useMemo(
    () =>
      (summary?.monthlyIncome ?? summary?.monthlyRevenue ?? []).map((item: any) => ({
        ...item,
        total: item.total ?? item.revenue ?? 0,
        monthLabel: formatJalaliMonth(item.year, item.month, i18n.resolvedLanguage)
      })),
    [i18n.resolvedLanguage, summary?.monthlyIncome, summary?.monthlyRevenue]
  );

  const monthlyExpense = useMemo(
    () =>
      (summary?.monthlyExpense ?? summary?.monthlyExpenses ?? []).map((item) => ({
        ...item,
        monthLabel: formatJalaliMonth(item.year, item.month, i18n.resolvedLanguage)
      })),
    [i18n.resolvedLanguage, summary?.monthlyExpense, summary?.monthlyExpenses]
  );

  const monthlyTeacherSalary = useMemo(
    () =>
      (summary?.monthlyTeacherSalary ?? summary?.salaryPayoutTrend ?? []).map((item) => ({
        ...item,
        monthLabel: formatJalaliMonth(item.year, item.month, i18n.resolvedLanguage)
      })),
    [i18n.resolvedLanguage, summary?.monthlyTeacherSalary, summary?.salaryPayoutTrend]
  );

  const monthlyNetProfit = useMemo(
    () =>
      (summary?.monthlyNetProfit ?? []).map((item) => ({
        ...item,
        monthLabel: formatJalaliMonth(item.year, item.month, i18n.resolvedLanguage)
      })),
    [i18n.resolvedLanguage, summary?.monthlyNetProfit]
  );

  const authoritativeNetProfit = academyFinancialSummary?.netProfit ?? summary?.netProfit ?? 0;
  const metricCards = [
    { key: 'net-profit', label: t('finance.net_profit'), value: formatSignedCurrency(authoritativeNetProfit, i18n.resolvedLanguage), tone: authoritativeNetProfit >= 0 ? 'positive' : 'negative' },
    { key: 'total-income', label: t('finance.total_income'), value: formatCurrency(summary?.totalIncome, i18n.resolvedLanguage), tone: 'neutral' },
    { key: 'student-payments', label: t('finance.student_payment_revenue'), value: formatCurrency(summary?.studentPayments, i18n.resolvedLanguage), tone: 'neutral' },
    { key: 'book-sales', label: t('finance.book_sales_revenue', { defaultValue: 'فروش کتاب' }), value: formatCurrency(summary?.bookSales ?? 0, i18n.resolvedLanguage), tone: 'neutral' },
    { key: 'pending-payments', label: t('finance.pending_student_payments'), value: formatCurrency(summary?.pendingPayments, i18n.resolvedLanguage), tone: 'warning' },
    { key: 'total-expenses', label: t('finance.total_expenses'), value: formatCurrency(summary?.totalExpenses, i18n.resolvedLanguage), tone: 'negative' },
    { key: 'teacher-paid', label: t('finance.paid_salaries'), value: formatCurrency(summary?.totalTeacherPaidSalary, i18n.resolvedLanguage), tone: 'neutral' },
    { key: 'teacher-unpaid', label: t('finance.unpaid_salaries'), value: formatCurrency(summary?.totalTeacherPendingSalary, i18n.resolvedLanguage), tone: 'warning' },
    { key: 'teacher-payable', label: t('finance.teacher_payables'), value: formatCurrency(summary?.totalTeacherPayableSalary, i18n.resolvedLanguage), tone: 'neutral' },
    { key: 'academy-tax', label: t('finance.academy_small_tax', { defaultValue: 'مالیات کوچک' }), value: formatCurrency(summary?.academySmallTax ?? 0, i18n.resolvedLanguage), tone: 'warning' },
    { key: 'loan-debtors', label: t('finance.loan_debtors'), value: String(loanSummary?.totalDebtors ?? 0), tone: 'warning' },
    { key: 'loan-total', label: t('finance.loan_total_amount'), value: formatCurrency(loanSummary?.totalOriginalAmount ?? 0, i18n.resolvedLanguage), tone: 'neutral' },
    { key: 'loan-outstanding', label: t('finance.loan_outstanding'), value: formatCurrency(loanSummary?.totalOutstandingAmount ?? 0, i18n.resolvedLanguage), tone: 'warning' },
    { key: 'loan-overdue', label: t('finance.loan_overdue'), value: formatCurrency(loanSummary?.overdueAmount ?? 0, i18n.resolvedLanguage), tone: 'negative' }
  ] as const;

  const visibleTeachers = useMemo(() => {
    const filtered = (teachers as TeacherFinanceOverview[]).filter((teacher) =>
      matchesSearch(
        { name: teacher.teacherName, email: teacher.email, salaryMode: teacher.salaryMode },
        debouncedSearch
      )
    );
    return sortCollection(filtered, sortField, sortDirection);
  }, [debouncedSearch, sortDirection, sortField, teachers]);

  const teacherOptions = useMemo(
    () => teachers.map((teacher) => ({ value: teacher.teacherId, label: teacher.teacherName })),
    [teachers]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="common.finance"
        description="finance.dashboard_description"
        actions={
          <div className="flex flex-wrap gap-2">
            <PrintButton
              targetId="finance-print-root"
              title={t('common.finance')}
              orientation="landscape"
              label={t('common.print')}
            />
            <ExportButtons
              targetId="finance-print-root"
              title={t('common.finance')}
              fileName="finance-report"
              orientation="landscape"
            />
          </div>
        }
      />

      <Card className="p-4 no-print" data-no-print>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6 md:items-end">
          <div>
            <label className="mb-2 block text-sm text-slate-600 dark:text-slate-300">دوره مالی</label>
            <Select
              value={quickPeriod}
              options={[
                { value: 'today', label: 'روزانه' },
                { value: 'this_week', label: 'هفته‌وار' },
                { value: 'this_month', label: 'ماهانه' },
                { value: 'this_year', label: 'سالانه' },
                { value: 'custom', label: 'تاریخ دلخواه' }
              ]}
              onChange={(value) => setQuickPeriod(String(value))}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-slate-600 dark:text-slate-300">{t('common.start_date')}</label>
            <JalaliDateInput value={startDate} disabled={quickPeriod !== 'custom'} onChange={setStartDate} />
          </div>
          <div>
            <label className="mb-2 block text-sm text-slate-600 dark:text-slate-300">{t('common.end_date')}</label>
            <JalaliDateInput value={endDate} disabled={quickPeriod !== 'custom'} onChange={setEndDate} />
          </div>
          {canFilterBranch && (
            <div>
              <label className="mb-2 block text-sm text-slate-600 dark:text-slate-300">{t('common.branch')}</label>
              <Select
                value={branchId}
                options={[{ value: '', label: t('common.all_branches') }, ...(branchOptions ?? [])]}
                placeholder={t('common.branch')}
                onChange={(value) => setBranchId(String(value))}
              />
            </div>
          )}
          <div>
            <label className="mb-2 block text-sm text-slate-600 dark:text-slate-300">{t('common.teacher')}</label>
            <Select
              value={teacherId}
              options={[{ value: '', label: t('common.all_teachers', { defaultValue: 'All teachers' }) }, ...teacherOptions]}
              placeholder={t('common.teacher')}
              onChange={(value) => setTeacherId(String(value))}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-slate-600 dark:text-slate-300">{t('common.status')}</label>
            <Select
              value={statusFilter}
              options={[
                { value: '', label: t('common.all_statuses', { defaultValue: 'All statuses' }) },
                { value: 'paid', label: t('finance.status_paid') },
                { value: 'unpaid', label: t('finance.status_unpaid') },
                { value: 'pending', label: t('finance.status_pending') }
              ]}
              placeholder={t('common.status')}
              onChange={(value) => setStatusFilter(String(value))}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setBranchId('');
              setTeacherId('');
              setStatusFilter('');
            }}
          >
            {t('common.clear_filters')}
          </Button>
        </div>
      </Card>

      <PrintableSection id="finance-print-root" printRoot="finance-report" className="print-report-source space-y-4 rounded-2xl border border-slate-200/80 bg-white p-4 text-slate-900">
        <PrintHeader
          title={t('common.finance')}
          subtitle={t('finance.dashboard_description')}
          printedBy={user?.name}
          periodLabel={[startDate, endDate].filter(Boolean).join(' — ') || t('common.all', { defaultValue: 'All' })}
          filterSummary={[
            teacherId ? t('common.teacher') : '',
            statusFilter ? `${t('common.status')}: ${t(`finance.status_${statusFilter}`, { defaultValue: statusFilter })}` : '',
            branchId ? t('common.branch') : ''
          ]
            .filter(Boolean)
            .join(' | ')}
        />

        <div className="print-summary-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-4 print:grid-cols-4">
          {metricCards.map((card) => (
            <div key={card.key} className="rounded-xl border border-slate-300 p-3 print-avoid-break">
              <p className="text-xs text-slate-600">{card.label}</p>
              <p className="mt-1 text-base font-bold">{card.value}</p>
            </div>
          ))}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">{t('finance.teacher_salary_overview')}</h3>
          <div className="overflow-x-auto table-shell">
            <table className="print-table min-w-full text-sm">
              <thead>
                <tr>
                  <th>{t('common.teacher')}</th>
                  <th>{t('finance.assigned_students')}</th>
                  <th>{t('finance.salary_mode')}</th>
                  <th>{t('finance.fixed_salary')}</th>
                  <th>{t('finance.commission_percent')}</th>
                  <th>{t('finance.total_paid_student_amount')}</th>
                  <th>{t('finance.commission_earned')}</th>
                  <th>{t('finance.total_payable')}</th>
                  <th>{t('finance.paid_salary')}</th>
                  <th>{t('finance.unpaid_salary')}</th>
                  <th>{t('common.status')}</th>
                </tr>
              </thead>
              <tbody>
                {visibleTeachers.map((teacher) => (
                  <tr key={teacher.teacherId} data-print-row>
                    <td>{teacher.teacherName}</td>
                    <td>{teacher.studentCount}</td>
                    <td>{t(`finance.mode_${teacher.salaryMode}`, { defaultValue: teacher.salaryMode })}</td>
                    <td>{formatCurrency(teacher.fixedSalaryAmount, i18n.resolvedLanguage)}</td>
                    <td>{teacher.commissionPercentage}%</td>
                    <td>{formatCurrency(teacher.totalPaidStudentAmount, i18n.resolvedLanguage)}</td>
                    <td>{formatCurrency(teacher.commissionEarned ?? teacher.totalEarningFromPayments, i18n.resolvedLanguage)}</td>
                    <td>{formatCurrency(teacher.totalSalaryPayable, i18n.resolvedLanguage)}</td>
                    <td>{formatCurrency(teacher.paidSalaryAmount, i18n.resolvedLanguage)}</td>
                    <td>{formatCurrency(teacher.unpaidSalaryAmount, i18n.resolvedLanguage)}</td>
                    <td>{t(`finance.status_${teacher.paymentStatus}`, { defaultValue: teacher.paymentStatus })}</td>
                  </tr>
                ))}
                {!visibleTeachers.length ? (
                  <tr data-print-row>
                    <td colSpan={11}>{t('common.no_records_found')}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </PrintableSection>

      {(isError || teachersError || teacherDetailError || recordsError) && (
        <Card className="border-rose-500/30 bg-rose-500/10 p-6 text-rose-700 dark:text-rose-200 no-print" data-no-print>
          {t('errors.unable_load_records')}
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 no-print" data-no-print>
        {metricCards.map((card) => (
          <Card key={card.key} className="p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{card.label}</p>
            <p
              className={`mt-3 text-2xl font-semibold ${
                card.tone === 'positive'
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : card.tone === 'negative'
                    ? 'text-rose-700 dark:text-rose-300'
                    : card.tone === 'warning'
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              <span dir={card.key === 'net-profit' ? 'ltr' : undefined}>{card.value}</span>
            </p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2 no-print" data-no-print>
        <Card className="p-6">
          <p className="text-sm uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">{t('finance.monthly_income')}</p>
          <div className="mt-6 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyIncome}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="monthLabel" stroke={chartAxisColor} />
                <YAxis stroke={chartAxisColor} />
                <Tooltip />
                <Bar dataKey="total" fill="#22c55e" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-sm uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">{t('finance.monthly_expenses')}</p>
          <div className="mt-6 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyExpense}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="monthLabel" stroke={chartAxisColor} />
                <YAxis stroke={chartAxisColor} />
                <Tooltip />
                <Bar dataKey="total" fill="#ef4444" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-sm uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">{t('finance.monthly_teacher_salary')}</p>
          <div className="mt-6 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTeacherSalary}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="monthLabel" stroke={chartAxisColor} />
                <YAxis stroke={chartAxisColor} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#38bdf8" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-sm uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">{t('finance.monthly_net_profit')}</p>
          <div className="mt-6 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyNetProfit}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="monthLabel" stroke={chartAxisColor} />
                <YAxis stroke={chartAxisColor} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#a855f7" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <AfghaniIcon className="h-5 w-5 text-sky-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('finance.teacher_salary_overview')}</h2>
        </div>
        <SearchFilterBar
          value={search}
          onChange={setSearch}
          placeholder={t('common.search_placeholder', { entity: t('common.teachers') })}
          createVisible={false}
          extraActions={
            <>
              <div className="w-full sm:w-56">
                <Select
                  value={sortField}
                  options={[
                    { value: 'name', label: t('common.sort_name') },
                    { value: 'date', label: t('common.sort_date') }
                  ]}
                  placeholder={t('common.sort')}
                  onChange={(value) => setSortField(String(value) as ListSortField)}
                />
              </div>
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))}>
                <ArrowUpDown className="h-4 w-4" />
                {t(sortDirection === 'asc' ? 'common.ascending' : 'common.descending')}
              </Button>
            </>
          }
        />
        <div className="table-shell mt-4 overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <table className="min-w-full text-sm">
            <thead className="text-left">
              <tr>
                <th className="px-4 py-3">{t('common.teacher')}</th>
                <th className="px-4 py-3">{t('finance.assigned_students')}</th>
                <th className="px-4 py-3">{t('finance.salary_mode')}</th>
                <th className="px-4 py-3">{t('finance.fixed_salary')}</th>
                <th className="px-4 py-3">{t('finance.commission_percent')}</th>
                <th className="px-4 py-3">{t('finance.total_paid_student_amount')}</th>
                <th className="px-4 py-3">{t('finance.commission_earned')}</th>
                <th className="px-4 py-3">{t('finance.total_payable')}</th>
                <th className="px-4 py-3">{t('finance.paid_salary')}</th>
                <th className="px-4 py-3">{t('finance.unpaid_salary')}</th>
                <th className="px-4 py-3">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody>
              {visibleTeachers.map((teacher) => (
                <tr
                  key={teacher.teacherId}
                  className="cursor-pointer border-t transition"
                  onClick={() => setSelectedTeacherId(teacher.teacherId)}
                >
                  <td className="px-4 py-3 font-medium">{teacher.teacherName}</td>
                  <td className="px-4 py-3">{teacher.studentCount}</td>
                  <td className="px-4 py-3">{t(`finance.mode_${teacher.salaryMode}`, { defaultValue: teacher.salaryMode })}</td>
                  <td className="px-4 py-3">{formatCurrency(teacher.fixedSalaryAmount, i18n.resolvedLanguage)}</td>
                  <td className="px-4 py-3">{teacher.commissionPercentage}%</td>
                  <td className="px-4 py-3">{formatCurrency(teacher.totalPaidStudentAmount, i18n.resolvedLanguage)}</td>
                  <td className="px-4 py-3">{formatCurrency(teacher.commissionEarned ?? teacher.totalEarningFromPayments, i18n.resolvedLanguage)}</td>
                  <td className="px-4 py-3">{formatCurrency(teacher.totalSalaryPayable, i18n.resolvedLanguage)}</td>
                  <td className="px-4 py-3 text-emerald-700 dark:text-emerald-300">{formatCurrency(teacher.paidSalaryAmount, i18n.resolvedLanguage)}</td>
                  <td className="px-4 py-3 text-amber-700 dark:text-amber-300">{formatCurrency(teacher.unpaidSalaryAmount, i18n.resolvedLanguage)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${statusBadgeClass(teacher.paymentStatus)}`}>
                      {t(`finance.status_${teacher.paymentStatus}`, { defaultValue: teacher.paymentStatus })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visibleTeachers.length && <p className="p-6 text-slate-500 dark:text-slate-400">{t('common.no_records_found')}</p>}
        </div>
      </Card>

      {teacherDetail && (
        <TeacherDetailPanel
          detail={teacherDetail}
          payoutPending={payoutMutation.isPending}
          payoutError={payoutError}
          onPayout={canPayout ? (payload) => payoutMutation.mutate(payload) : undefined}
        />
      )}

      <Card className="p-6">
        <p className="text-sm uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">{t('finance.branch_finance_report')}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(summary?.branchIncome ?? []).map((item) => (
            <div key={item.branch} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="text-slate-800 dark:text-slate-200">{item.branch}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(item.total, i18n.resolvedLanguage)}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <p className="text-sm uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">{t('finance.recent_activity')}</p>
        <div className="mt-4 grid gap-3">
          {(records ?? []).slice(0, 12).map((record) => (
            <div key={record.id} className="grid gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 md:grid-cols-[1.5fr_auto_auto] dark:border-slate-800 dark:bg-slate-900/60">
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">{record.title}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">{record.category}</div>
              </div>
              <div className="text-slate-600 dark:text-slate-400">{formatDate(record.date, i18n.resolvedLanguage)}</div>
              <div className={`font-semibold ${record.amount < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                {formatCurrency(record.amount, i18n.resolvedLanguage)}
              </div>
            </div>
          ))}
          {recordsLoading && <div className="text-slate-500 dark:text-slate-400">{t('common.loading')}</div>}
          {!recordsLoading && !(records ?? []).length && <div className="text-slate-500 dark:text-slate-400">{t('common.no_records_found')}</div>}
        </div>
      </Card>
    </div>
  );
}
