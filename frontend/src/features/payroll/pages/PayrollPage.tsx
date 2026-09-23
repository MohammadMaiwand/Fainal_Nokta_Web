import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PageHeader } from '@/shared/components/Common';
import { PrintButton, PrintHeader, PrintableSection, ExportButtons } from '@/shared/print';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { formatJalaliDate, getCurrentJalaliYearMonth } from '@/utils/date';
import { payrollService } from '@/features/payroll/services/payrollService';
import { financeService } from '@/features/finance/services/financeService';
import { useAuthStore } from '@/store/authStore';
import { normalizeRole } from '@/features/resources/config/modules';

const tabs = ['summary', 'teachers', 'managers', 'calculator', 'reports', 'rules'] as const;
type PayrollTab = (typeof tabs)[number];

interface PayrollPageProps {
  titleKey?: string;
  descriptionKey?: string;
  defaultTab?: PayrollTab;
  visibleTabs?: PayrollTab[];
}

export function PayrollPage({
  titleKey = 'common.payroll_tax',
  descriptionKey = 'finance.payroll_description',
  defaultTab = 'summary',
  visibleTabs = [...tabs]
}: PayrollPageProps = {}) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canEditTaxRules = user?.role === 'super_admin';
  const isTeacher = normalizeRole(user?.role) === 'teacher';
  const effectiveTabs = useMemo(
    () => (isTeacher ? (['teachers', 'calculator'] as PayrollTab[]) : visibleTabs),
    [isTeacher, visibleTabs]
  );
  const [tab, setTab] = useState<PayrollTab>(isTeacher ? 'teachers' : defaultTab);
  const currentJalali = getCurrentJalaliYearMonth();
  const fallbackNow = new Date();
  const initialYear = currentJalali.year > 0 ? currentJalali.year : fallbackNow.getFullYear();
  const initialMonth = currentJalali.month >= 1 && currentJalali.month <= 12 ? currentJalali.month : fallbackNow.getMonth() + 1;
  const [year, setYear] = useState(String(initialYear));
  const [month, setMonth] = useState(String(initialMonth));
  const [branchId, setBranchId] = useState('');
  const [employeeRole, setEmployeeRole] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [calculatorGross, setCalculatorGross] = useState('0');
  const [formError, setFormError] = useState('');
  const [settingForm, setSettingForm] = useState({
    userId: '',
    role: 'teacher',
    branchId: '',
    salaryType: 'fixed',
    fixedAmount: '0',
    percentage: '0',
    percentageScope: 'branch',
    isActive: true
  });

  const queryParams = useMemo(() => ({ year, month, branchId, role: employeeRole, paymentStatus }), [branchId, employeeRole, month, paymentStatus, year]);

  const { data: meta, isError: metaError } = useQuery({
    queryKey: ['payroll-meta'],
    queryFn: payrollService.getMeta,
    enabled: !isTeacher
  });
  const { data: summary, isError: summaryError } = useQuery({
    queryKey: ['payroll-summary', queryParams],
    queryFn: () => payrollService.getSummary(queryParams),
    enabled: !isTeacher
  });
  const { data: settings, isError: settingsError } = useQuery({
    queryKey: ['payroll-settings'],
    queryFn: payrollService.getSettings,
    enabled: !isTeacher
  });
  const { data: records, isError: recordsError } = useQuery({
    queryKey: ['payroll-records', queryParams],
    queryFn: () => payrollService.getRecords(queryParams),
    enabled: !isTeacher
  });
  const { data: myPayroll, isError: myPayrollError, isLoading: myPayrollLoading } = useQuery({
    queryKey: ['payroll-me', year, month],
    queryFn: () => payrollService.getMyPayroll({ year, month }),
    enabled: isTeacher
  });
  const { data: myEarnings } = useQuery({
    queryKey: ['finance-me-earnings'],
    queryFn: () => financeService.myEarnings(),
    enabled: isTeacher
  });
  const { data: taxRules, isError: taxRulesError } = useQuery({
    queryKey: ['payroll-tax-rules'],
    queryFn: payrollService.getTaxRules,
    enabled: !isTeacher
  });
  const { data: taxCalc, isError: taxCalcError } = useQuery({
    queryKey: ['payroll-tax-calc', calculatorGross],
    queryFn: () => payrollService.calculateTax(Number(calculatorGross || 0)),
    enabled: tab === 'calculator'
  });

  const saveSettingMutation = useMutation({
    mutationFn: () =>
      payrollService.saveSetting({
        ...settingForm,
        fixedAmount: Number(settingForm.fixedAmount),
        percentage: Number(settingForm.percentage)
      }),
    onSuccess: () => {
      setFormError('');
      queryClient.invalidateQueries({ queryKey: ['payroll-settings'] });
    },
    onError: (error: any) => setFormError(error?.response?.data?.message ?? error?.message ?? t('errors.unable_save'))
  });

  const calculateMutation = useMutation({
    mutationFn: (userId: string) =>
      payrollService.calculateSalary({
        userId,
        hijriYear: Number(year),
        hijriMonth: Number(month),
        recalculate: true
      }),
    onSuccess: () => {
      setFormError('');
      queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-summary'] });
    },
    onError: (error: any) => setFormError(error?.response?.data?.message ?? error?.message ?? t('errors.unable_save'))
  });

  const calculateMyMutation = useMutation({
    mutationFn: () =>
      payrollService.calculateMySalary({
        hijriYear: Number(year),
        hijriMonth: Number(month)
      }),
    onSuccess: () => {
      setFormError('');
      queryClient.invalidateQueries({ queryKey: ['payroll-me'] });
      queryClient.invalidateQueries({ queryKey: ['finance-me-earnings'] });
    },
    onError: (error: any) => setFormError(error?.response?.data?.message ?? error?.message ?? t('errors.unable_save'))
  });

  const paymentStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'unpaid' | 'paid' }) => payrollService.updatePaymentStatus(id, status),
    onSuccess: () => {
      setFormError('');
      queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-summary'] });
      queryClient.invalidateQueries({ queryKey: ['payments-list'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
    },
    onError: (error: any) => setFormError(error?.response?.data?.message ?? error?.message ?? t('errors.unable_save'))
  });

  const taxStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'pending' | 'submitted' | 'paid' }) => payrollService.updateTaxStatus(id, status),
    onSuccess: () => {
      setFormError('');
      queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
    },
    onError: (error: any) => setFormError(error?.response?.data?.message ?? error?.message ?? t('errors.unable_save'))
  });

  const createTaxRuleMutation = useMutation({
    mutationFn: (payload: Record<string, any>) => payrollService.createTaxRule(payload),
    onSuccess: () => {
      setFormError('');
      queryClient.invalidateQueries({ queryKey: ['payroll-tax-rules'] });
    },
    onError: (error: any) => setFormError(error?.response?.data?.message ?? error?.message ?? t('errors.unable_save'))
  });

  const teacherRecords = (records ?? []).filter((item: any) => item.role === 'teacher');
  const managerRecords = (records ?? []).filter((item: any) => ['manager', 'admin'].includes(item.role));
  const queryError = isTeacher
    ? Boolean(myPayrollError || (tab === 'calculator' && taxCalcError) || formError)
    : Boolean(metaError || summaryError || settingsError || recordsError || taxRulesError || (tab === 'calculator' && taxCalcError) || formError);

  const myRecord = myPayroll?.record;
  const mySetting = myPayroll?.setting;
  const overview = myEarnings?.overview;
  const payrollSnap = myEarnings?.payroll;

  const grossSalary = Number(myRecord?.grossSalary ?? overview?.payrollGrossSalary ?? payrollSnap?.grossSalary ?? 0);
  const taxAmount = Number(myRecord?.taxAmount ?? overview?.payrollTaxAmount ?? payrollSnap?.taxAmount ?? 0);
  const netSalary = Number(myRecord?.netSalary ?? overview?.payrollNetSalary ?? payrollSnap?.netSalary ?? 0);
  const commissionAmount = Number(myRecord?.commissionAmount ?? overview?.commissionEarned ?? payrollSnap?.commissionAmount ?? 0);
  const studentFees = Number(myRecord?.totalStudentPaymentsUsed ?? overview?.totalPaidStudentAmount ?? payrollSnap?.totalStudentPaymentsUsed ?? 0);
  const percentageUsed = Number(myRecord?.percentageUsed ?? mySetting?.percentage ?? overview?.commissionPercentage ?? payrollSnap?.percentageUsed ?? 0);
  const fixedAmount = Number(myRecord?.fixedAmount ?? mySetting?.fixedAmount ?? overview?.fixedSalaryAmount ?? 0);
  const unpaidSalary = Number(overview?.unpaidSalaryAmount ?? Math.max(0, netSalary - Number(overview?.paidSalaryAmount || 0)));
  const paidSalary = Number(overview?.paidSalaryAmount ?? 0);

  if (isTeacher) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={titleKey}
          description={t('finance.teacher_payroll_self_description', {
            defaultValue: 'معاش، مالیه و خالص قابل پرداخت شما برای ماه جاری.'
          })}
        />

        <div className="flex flex-wrap gap-2">
          {effectiveTabs.map((item) => (
            <Button key={item} variant={tab === item ? 'default' : 'outline'} size="sm" onClick={() => setTab(item)}>
              {item === 'teachers' ? t('finance.my_salary', { defaultValue: 'معاش من' }) : t(`finance.tab_${item}`)}
            </Button>
          ))}
        </div>

        {(queryError || formError) && (
          <Card className="border-rose-500/30 bg-rose-500/10 p-4 text-rose-700 dark:text-rose-200">
            {formError || t('errors.unable_load_records')}
          </Card>
        )}

        <Card className="p-4 no-print" data-no-print>
          <div className="grid gap-3 md:grid-cols-3">
            <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder={t('finance.year')} />
            <Input value={month} onChange={(e) => setMonth(e.target.value)} placeholder={t('finance.month')} />
            <Button onClick={() => calculateMyMutation.mutate()} disabled={calculateMyMutation.isPending || myPayrollLoading}>
              {t('finance.recalculate', { defaultValue: 'محاسبه مجدد' })}
            </Button>
          </div>
        </Card>

        {tab === 'teachers' && (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                ['finance.gross_salary', grossSalary],
                ['finance.tax_amount', taxAmount],
                ['finance.net_salary', netSalary],
                ['finance.unpaid_salary', unpaidSalary],
                ['finance.paid_salary', paidSalary],
                ['finance.commission_amount', commissionAmount],
                ['finance.total_student_payments_used', studentFees],
                ['finance.commission_percent', percentageUsed]
              ].map(([label, value]) => (
                <Card key={String(label)} className="p-5">
                  <p className="text-sm text-slate-500">{t(String(label), { defaultValue: String(label) })}</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {String(label).includes('percent')
                      ? `${formatNumber(Number(value || 0), i18n.resolvedLanguage)}%`
                      : formatCurrency(Number(value || 0), i18n.resolvedLanguage)}
                  </p>
                </Card>
              ))}
            </div>

            <Card className="space-y-3 p-5">
              <p className="font-semibold">{t('finance.salary_settings', { defaultValue: 'تنظیمات معاش' })}</p>
              <div className="grid gap-3 md:grid-cols-3 text-sm">
                <p>
                  {t('students.salary_type', { defaultValue: 'نوع معاش' })}:{' '}
                  <span className="font-semibold">{mySetting?.salaryType || overview?.salaryMode || myEarnings?.teacher?.salaryMode || '-'}</span>
                </p>
                <p>
                  {t('finance.fixed_salary', { defaultValue: 'معاش ثابت' })}:{' '}
                  <span className="font-semibold">{formatCurrency(fixedAmount, i18n.resolvedLanguage)}</span>
                </p>
                <p>
                  {t('finance.commission_percent', { defaultValue: 'فیصدی' })}:{' '}
                  <span className="font-semibold">{formatNumber(percentageUsed, i18n.resolvedLanguage)}%</span>
                </p>
                <p>
                  {t('finance.tax_category', { defaultValue: 'کتگوری مالیه' })}:{' '}
                  <span className="font-semibold">{myRecord?.taxCategory || payrollSnap?.taxCategory || '-'}</span>
                </p>
                <p>
                  {t('finance.payment_status', { defaultValue: 'وضعیت پرداخت' })}:{' '}
                  <span className="font-semibold">{myRecord?.paymentStatus || overview?.paymentStatus || '-'}</span>
                </p>
                <p>
                  {t('finance.tax_status', { defaultValue: 'وضعیت مالیه' })}:{' '}
                  <span className="font-semibold">{myRecord?.taxStatus || '-'}</span>
                </p>
              </div>
              {(myRecord?.taxExplanation || payrollSnap?.taxExplanation) && (
                <p className="rounded-xl border border-slate-200 p-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                  {myRecord?.taxExplanation || payrollSnap?.taxExplanation}
                </p>
              )}
            </Card>

            {myEarnings?.students?.length ? (
              <Card className="overflow-x-auto p-4">
                <p className="mb-3 font-semibold">{t('dashboard.my_students', { defaultValue: 'شاگردان من' })}</p>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="px-2 py-2">{t('common.name')}</th>
                      <th className="px-2 py-2">{t('common.fee', { defaultValue: 'فیس' })}</th>
                      <th className="px-2 py-2">{t('finance.paid_salary', { defaultValue: 'پرداخت‌شده' })}</th>
                      <th className="px-2 py-2">{t('finance.unpaid_salary', { defaultValue: 'باقی' })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myEarnings.students.map((student) => (
                      <tr key={student.id} className="border-t border-slate-200 dark:border-slate-800">
                        <td className="px-2 py-2">{student.name}</td>
                        <td className="px-2 py-2">{formatCurrency(student.feeAmount ?? 0, i18n.resolvedLanguage)}</td>
                        <td className="px-2 py-2">{formatCurrency(student.paidAmount, i18n.resolvedLanguage)}</td>
                        <td className="px-2 py-2">{formatCurrency(student.remainingBalance, i18n.resolvedLanguage)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            ) : null}
          </>
        )}

        {tab === 'calculator' && (
          <Card className="space-y-4 p-5">
            <Input type="number" value={calculatorGross} onChange={(e) => setCalculatorGross(e.target.value)} placeholder={t('finance.gross_salary')} />
            <div className="grid gap-2">
              <p>{t('finance.tax_category')}: {taxCalc?.taxCategory}</p>
              <p>{t('finance.tax_formula')}: {taxCalc?.formula}</p>
              <p>{t('finance.tax_amount')}: {formatCurrency(taxCalc?.taxAmount, i18n.resolvedLanguage)}</p>
              <p>{t('finance.net_salary')}: {formatCurrency(taxCalc?.netSalary, i18n.resolvedLanguage)}</p>
              <p>{t('finance.tax_explanation')}: {taxCalc?.explanation}</p>
            </div>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={titleKey} description={descriptionKey} />
      <div className="flex flex-wrap gap-2">
        {effectiveTabs.map((item) => (
          <Button key={item} variant={tab === item ? 'default' : 'outline'} size="sm" onClick={() => setTab(item)}>
            {t(`finance.tab_${item}`)}
          </Button>
        ))}
      </div>

      {(queryError || formError) && (
        <Card className="border-rose-500/30 bg-rose-500/10 p-4 text-rose-700 dark:text-rose-200">
          {formError || t('errors.unable_load_records')}
        </Card>
      )}

      <Card className="p-4 no-print" data-no-print>
        <div className="grid gap-3 md:grid-cols-5">
          <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder={t('finance.year')} />
          <Input value={month} onChange={(e) => setMonth(e.target.value)} placeholder={t('finance.month')} />
          <Select value={branchId} onChange={(v) => setBranchId(String(v))} options={[{ value: '', label: t('common.all_branches') }, ...((meta?.branches ?? []) as any[])]} />
          <Select value={employeeRole} onChange={(v) => setEmployeeRole(String(v))} options={[{ value: 'all', label: t('finance.all_roles') }, { value: 'teacher', label: t('common.teacher') }, { value: 'manager', label: t('finance.manager') }]} />
          <Select value={paymentStatus} onChange={(v) => setPaymentStatus(String(v))} options={[{ value: '', label: t('common.status') }, { value: 'unpaid', label: t('finance.status_unpaid') }, { value: 'paid', label: t('finance.status_paid') }]} />
        </div>
      </Card>

      {tab === 'summary' && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ['finance.total_gross_month', summary?.totalGrossSalary],
            ['finance.total_tax_month', summary?.totalTaxAmount],
            ['finance.total_net_month', summary?.totalNetSalary],
            ['finance.total_teacher_count', summary?.teacherCount],
            ['finance.total_manager_count', summary?.managerCount],
            ['finance.total_exempt_count', summary?.exemptCount],
            ['finance.total_taxed_count', summary?.taxedCount],
            ['finance.total_student_payments_used', summary?.totalStudentPaymentsUsed]
          ].map(([label, value]) => (
            <Card key={String(label)} className="p-5">
              <p className="text-sm text-slate-500">{t(String(label))}</p>
              <p className="mt-2 text-2xl font-semibold">
                {String(label).includes('count') ? formatNumber(Number(value || 0), i18n.resolvedLanguage) : formatCurrency(Number(value || 0), i18n.resolvedLanguage)}
              </p>
            </Card>
          ))}
        </div>
      )}

      {(tab === 'teachers' || tab === 'managers' || tab === 'reports') && (
        <Card className="overflow-x-auto p-4">
          <PrintableSection id="payroll-print-root" printRoot="payroll-report" className="space-y-3">
            <div className="hidden print:block">
              <PrintHeader
                title={t('common.payroll_tax')}
                periodLabel={`${t('finance.year')}: ${year} | ${t('finance.month')}: ${month}`}
                filterSummary={`${t('finance.all_roles')}: ${employeeRole} | ${t('common.status')}: ${paymentStatus || t('common.all', { defaultValue: 'All' })}`}
                printedBy={user?.name}
              />
            </div>
            <table className="print-table min-w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="px-2 py-2">{t('common.name')}</th>
                  <th className="px-2 py-2">{t('common.role')}</th>
                  <th className="px-2 py-2">{t('common.branch')}</th>
                  <th className="px-2 py-2">{t('finance.gross_salary')}</th>
                  <th className="px-2 py-2">{t('finance.tax_category')}</th>
                  <th className="px-2 py-2">{t('finance.tax_amount')}</th>
                  <th className="px-2 py-2">{t('finance.net_salary')}</th>
                  <th className="px-2 py-2">{t('finance.calculated_at')}</th>
                  <th className="px-2 py-2">{t('finance.payment_status')}</th>
                  <th className="px-2 py-2">{t('finance.tax_status')}</th>
                  <th className="no-print px-2 py-2" data-no-print>
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(tab === 'teachers' ? teacherRecords : tab === 'managers' ? managerRecords : records ?? []).map((row: any) => (
                  <tr key={row._id} className="border-t border-slate-200 dark:border-slate-800" data-print-row>
                    <td className="px-2 py-2">{row.userId?.name}</td>
                    <td className="px-2 py-2">{row.role}</td>
                    <td className="px-2 py-2">{row.branchId?.name || '-'}</td>
                    <td className="px-2 py-2">{formatCurrency(row.grossSalary, i18n.resolvedLanguage)}</td>
                    <td className="px-2 py-2">{row.taxCategory}</td>
                    <td className="px-2 py-2">{formatCurrency(row.taxAmount, i18n.resolvedLanguage)}</td>
                    <td className="px-2 py-2">{formatCurrency(row.netSalary, i18n.resolvedLanguage)}</td>
                    <td className="px-2 py-2">{formatJalaliDate(row.calculatedAt, i18n.resolvedLanguage)}</td>
                    <td className="px-2 py-2">{row.paymentStatus}</td>
                    <td className="px-2 py-2">{row.taxStatus}</td>
                    <td className="no-print px-2 py-2" data-no-print>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => paymentStatusMutation.mutate({ id: row._id, status: row.paymentStatus === 'paid' ? 'unpaid' : 'paid' })}>
                          {t('finance.toggle_paid')}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => taxStatusMutation.mutate({ id: row._id, status: row.taxStatus === 'pending' ? 'submitted' : 'paid' })}>
                          {t('finance.mark_tax')}
                        </Button>
                        <Button size="sm" onClick={() => calculateMutation.mutate(String(row.userId?._id || row.userId))}>
                          {t('finance.recalculate')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PrintableSection>
          {tab === 'reports' && (
            <div className="mt-4 flex flex-wrap gap-2 no-print" data-no-print>
              <ExportButtons
                targetId="payroll-print-root"
                title={t('finance.print_report')}
                fileName="teacher-employee-payroll"
                orientation="landscape"
              />
              <PrintButton
                targetId="payroll-print-root"
                title={t('finance.print_report')}
                label={t('finance.print_report')}
                orientation="landscape"
              />
            </div>
          )}
        </Card>
      )}

      {tab === 'calculator' && (
        <Card className="space-y-4 p-5">
          <Input type="number" value={calculatorGross} onChange={(e) => setCalculatorGross(e.target.value)} placeholder={t('finance.gross_salary')} />
          <div className="grid gap-2">
            <p>{t('finance.tax_category')}: {taxCalc?.taxCategory}</p>
            <p>{t('finance.tax_formula')}: {taxCalc?.formula}</p>
            <p>{t('finance.tax_amount')}: {formatCurrency(taxCalc?.taxAmount, i18n.resolvedLanguage)}</p>
            <p>{t('finance.net_salary')}: {formatCurrency(taxCalc?.netSalary, i18n.resolvedLanguage)}</p>
            <p>{t('finance.tax_explanation')}: {taxCalc?.explanation}</p>
          </div>
        </Card>
      )}

      {(tab === 'teachers' || tab === 'managers') && (
        <Card className="space-y-3 p-5">
          <p className="font-semibold">{t('finance.salary_settings')}</p>
          <div className="grid gap-3 md:grid-cols-3">
            <Select value={settingForm.userId} onChange={(v) => setSettingForm((c) => ({ ...c, userId: String(v) }))} options={(meta?.users ?? []).map((u: any) => ({ value: u.value, label: `${u.label} (${u.role})` }))} />
            <Select
              value={settingForm.role}
              onChange={(v) => {
                const role = String(v);
                setSettingForm((c) => ({
                  ...c,
                  role,
                  percentageScope: role === 'teacher' ? 'branch' : c.percentageScope
                }));
              }}
              options={[{ value: 'teacher', label: t('common.teacher') }, { value: 'manager', label: t('finance.manager') }, { value: 'admin', label: t('common.admin') }]}
            />
            <Select value={settingForm.branchId} onChange={(v) => setSettingForm((c) => ({ ...c, branchId: String(v) }))} options={(meta?.branches ?? []) as any[]} />
            <Select value={settingForm.salaryType} onChange={(v) => setSettingForm((c) => ({ ...c, salaryType: String(v) }))} options={[{ value: 'fixed', label: t('finance.fixed_salary_only') }, { value: 'percentage', label: t('finance.percentage_salary') }, { value: 'fixed_plus_percentage', label: t('finance.fixed_plus_percentage') }]} />
            <Input type="number" value={settingForm.fixedAmount} onChange={(e) => setSettingForm((c) => ({ ...c, fixedAmount: e.target.value }))} placeholder={t('finance.fixed_salary')} />
            <Input type="number" value={settingForm.percentage} onChange={(e) => setSettingForm((c) => ({ ...c, percentage: e.target.value }))} placeholder={t('finance.commission_percent')} />
            <Select
              value={settingForm.percentageScope}
              onChange={(v) => setSettingForm((c) => ({ ...c, percentageScope: String(v) }))}
              disabled={settingForm.role === 'teacher'}
              options={
                settingForm.role === 'teacher'
                  ? [{ value: 'branch', label: t('finance.commission_scope_teacher') }]
                  : [
                      { value: 'branch', label: t('finance.commission_scope_branch') },
                      { value: 'all_system', label: t('finance.commission_scope_system') }
                    ]
              }
            />
          </div>
          <Button onClick={() => saveSettingMutation.mutate()} disabled={saveSettingMutation.isPending}>{t('common.save')}</Button>
          <div className="space-y-2">
            {(settings ?? []).slice(0, 10).map((item: any) => (
              <div key={item._id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                {item.userId?.name} - {item.salaryType} - {formatCurrency(item.fixedAmount, i18n.resolvedLanguage)} - {item.percentage}%
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'rules' && (
        <Card className="space-y-4 p-5">
          <p className="font-semibold">{t('finance.tax_rules')}</p>
          {(taxRules ?? []).map((rule: any) => (
            <div key={rule._id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <p>{rule.categoryNameDari} | {rule.minAmount} - {rule.maxAmount ?? 'بیشتر'} | {rule.baseTax} + {rule.percentage}%</p>
              <p className="text-sm text-slate-500">{rule.explanationDari}</p>
            </div>
          ))}
          {canEditTaxRules && (
            <Button
              onClick={() =>
                createTaxRuleMutation.mutate({
                  minAmount: 0,
                  maxAmount: 0,
                  baseTax: 0,
                  percentage: 0,
                  categoryNameDari: 'کتگوری جدید',
                  explanationDari: 'توضیح جدید',
                  isActive: false,
                  effectiveFrom: new Date().toISOString()
                })
              }
            >
              {t('finance.add_tax_rule')}
            </Button>
          )}
          {!canEditTaxRules && <p className="text-sm text-slate-500">{t('finance.tax_rule_view_only')}</p>}
        </Card>
      )}
    </div>
  );
}
