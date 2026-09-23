import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Wallet } from 'lucide-react';
import { PageHeader } from '@/shared/components/Common';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { formatCurrency } from '@/utils/formatters';
import { formatJalaliDate } from '@/utils/date';
import { useAuthStore } from '@/store/authStore';
import { useDebounce } from '@/hooks/useDebounce';
import { useListQueryParams } from '@/hooks/useListQueryParams';
import { loanService } from '@/features/loans/services/loanService';
import { MakeLoanWizard } from '@/features/loans/components/MakeLoanWizard';
import { DataFilterToolbar } from '@/shared/filters/DataFilterToolbar';
import { ActiveFilterChips } from '@/shared/filters/ActiveFilterChips';
import { ListPagination } from '@/shared/filters/ListPagination';
import { periodLabelKey } from '@/utils/datePeriods';
import { api } from '@/services/apiClient';
import { JalaliDateInput } from '@/components/forms/JalaliDateInput';
import { formatIsoToJalaliInput, isValidJalaliDateInput, jalaliInputToIsoDate } from '@/utils/jalaliDateInput';
import { PrintButton, PrintableSection, PrintHeader, ExportButtons } from '@/shared/print';
function statusKey(status: string) {
  const normalized = String(status || '').toLowerCase();
  return `loans.status_${normalized}`;
}

export function LoansPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canManage = ['super_admin', 'admin', 'branch_manager', 'owner'].includes(user?.role ?? '');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [detailLoan, setDetailLoan] = useState<any | null>(null);
  const [repayLoan, setRepayLoan] = useState<any | null>(null);
  const [repayForm, setRepayForm] = useState({
    amount: '',
    repaymentMethod: 'cash',
    repaymentDate: formatIsoToJalaliInput(new Date()),
    note: ''
  });

  const { state, setMany, clearAll, apiParams, activeCount } = useListQueryParams({
    defaults: { limit: 20, sortBy: 'loanDate', sortOrder: 'desc', period: 'all' },
    extraKeys: ['personType', 'loanType']
  });
  const debouncedSearch = useDebounce(String(state.search || ''), 350);

  const { data: branches = [] } = useQuery({
    queryKey: ['loan-branches'],
    queryFn: () => api.get('/branches', { params: { limit: 200 } }).then((res) => res.data.data ?? []),
    enabled: canManage
  });

  const listParams = useMemo(
    () => ({
      ...apiParams,
      search: debouncedSearch || undefined
    }),
    [apiParams, debouncedSearch]
  );

  const { data: summary } = useQuery({
    queryKey: ['loans-summary', state.branchId],
    queryFn: () => loanService.summary(state.branchId ? { branchId: state.branchId } : undefined)
  });

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['loans-list', listParams],
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    queryFn: () => loanService.listPaged(listParams)
  });

  const loans = data?.items ?? [];
  const pagination = data?.pagination ?? { page: state.page, limit: state.limit, total: 0 };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['loans-list'] });
    queryClient.invalidateQueries({ queryKey: ['loans-summary'] });
    queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
  };

  const repayMutation = useMutation({
    mutationFn: async () => {
      if (!repayLoan) throw new Error(t('loans.repayment_failed'));
      const amount = Number(repayForm.amount || 0);
      if (!(amount > 0)) throw new Error(t('loans.invalid_amount'));
      if (amount > Number(repayLoan.remainingAmount || 0) + 0.0001) {
        throw new Error(t('loans.overpay_not_allowed'));
      }
      if (!isValidJalaliDateInput(repayForm.repaymentDate)) throw new Error(t('payments.invalid_date'));
      const repaymentDate = jalaliInputToIsoDate(repayForm.repaymentDate);
      return loanService.repay(String(repayLoan._id), {
        amount,
        repaymentMethod: repayForm.repaymentMethod,
        repaymentDate: repaymentDate || undefined,
        note: repayForm.note || undefined
      });
    },
    onSuccess: (response: any) => {
      const receipt = response?.data?.receipt || response?.receipt;
      setMessage(t('loans.repayment_saved'));
      setRepayLoan(null);
      if (receipt) setDetailLoan({ ...(response?.data?.loan || repayLoan), lastReceipt: receipt });
      invalidate();
    },
    onError: (error: any) => {
      setMessage(error?.response?.data?.message || error?.message || t('loans.repayment_failed'));
    }
  });

  const { data: repayments = [] } = useQuery({
    queryKey: ['loan-repayments', detailLoan?._id],
    enabled: Boolean(detailLoan?._id),
    queryFn: () => api.get(`/loans/${detailLoan._id}/repayments`).then((res) => res.data.data ?? [])
  });

  const summaryCards = [
    { key: 'total', label: t('loans.total_loans'), value: summary?.totalLoans ?? 0 },
    { key: 'debtors', label: t('loans.total_debtors'), value: summary?.totalDebtors ?? 0 },
    {
      key: 'original',
      label: t('loans.total_loan_amount'),
      value: formatCurrency(summary?.totalOriginalAmount ?? 0, i18n.resolvedLanguage)
    },
    {
      key: 'repaid',
      label: t('loans.total_repaid'),
      value: formatCurrency(summary?.totalRepaidAmount ?? 0, i18n.resolvedLanguage)
    },
    {
      key: 'outstanding',
      label: t('loans.total_outstanding'),
      value: formatCurrency(summary?.totalOutstandingAmount ?? 0, i18n.resolvedLanguage)
    },
    {
      key: 'overdue',
      label: t('loans.overdue_amount'),
      value: formatCurrency(summary?.overdueAmount ?? 0, i18n.resolvedLanguage)
    }
  ];

  const chips = [
    state.search
      ? { key: 'search', label: `${t('filters.search')}: ${state.search}`, onRemove: () => setMany({ search: '' }) }
      : null,
    state.status
      ? { key: 'status', label: `${t('filters.status')}: ${t(statusKey(String(state.status)))}`, onRemove: () => setMany({ status: '' }) }
      : null,
    state.branchId
      ? {
          key: 'branch',
          label: `${t('filters.branch')}: ${branches.find((item: any) => String(item._id) === state.branchId)?.name || state.branchId}`,
          onRemove: () => setMany({ branchId: '' })
        }
      : null,
    state.period && state.period !== 'all'
      ? { key: 'period', label: t(periodLabelKey(String(state.period))), onRemove: () => setMany({ period: 'all', from: '', to: '' }) }
      : null,
    state.personType
      ? {
          key: 'personType',
          label: `${t('loans.person_type')}: ${t(`loans.target_${state.personType}`)}`,
          onRemove: () => setMany({ personType: '' })
        }
      : null,
    state.loanType
      ? {
          key: 'loanType',
          label: `${t('loans.loan_type')}: ${t(`loans.type_${state.loanType}`)}`,
          onRemove: () => setMany({ loanType: '' })
        }
      : null
  ].filter(Boolean) as Array<{ key: string; label: string; onRemove: () => void }>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="common.loans"
        description={t('loans.page_description')}
        actions={
          canManage ? (
            <Button type="button" onClick={() => setWizardOpen(true)}>
              <Wallet className="h-4 w-4" />
              {t('loans.new_loan')}
            </Button>
          ) : undefined
        }
      />

      {isError ? (
        <Card className="border-rose-500/30 bg-rose-500/10 p-4 text-rose-700 dark:text-rose-200">
          {t('errors.unable_load_records')}
        </Card>
      ) : null}

      {message ? (
        <Card className="border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-200">
          {message}
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {summaryCards.map((card) => (
          <Card key={card.key} className="p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">{card.label}</p>
            <p className="mt-2 text-lg font-semibold text-[var(--color-text-strong)]">{card.value}</p>
          </Card>
        ))}
      </div>

      <Card className="space-y-4 p-4">
        <DataFilterToolbar
          search={String(state.search || '')}
          onSearchChange={(search) => setMany({ search })}
          searchPlaceholder={t('loans.search_person_placeholder')}
          period={String(state.period || 'all')}
          onPeriodChange={(period) => setMany({ period, ...(period === 'custom' ? {} : { from: '', to: '' }) })}
          from={String(state.from || '')}
          to={String(state.to || '')}
          onFromChange={(from) => setMany({ from, period: 'custom' })}
          onToChange={(to) => setMany({ to, period: 'custom' })}
          status={String(state.status || '')}
          onStatusChange={(status) => setMany({ status })}
          statusOptions={[
            { value: 'active', label: t('loans.status_active') },
            { value: 'partially_repaid', label: t('loans.status_partially_repaid') },
            { value: 'paid', label: t('loans.status_paid') },
            { value: 'overdue', label: t('loans.status_overdue') },
            { value: 'cancelled', label: t('loans.status_cancelled') }
          ]}
          branchId={String(state.branchId || '')}
          onBranchChange={(branchId) => setMany({ branchId })}
          branchOptions={branches.map((branch: any) => ({ value: String(branch._id), label: branch.name }))}
          activeCount={activeCount}
          onClear={clearAll}
          extraFilters={
            <>
              <div>
                <label className="mb-1 block text-sm text-[var(--color-text-muted)]">{t('loans.person_type')}</label>
                <Select
                  value={String(state.personType || '')}
                  onChange={(value) => setMany({ personType: String(value) })}
                  options={[
                    { value: '', label: t('common.all', { defaultValue: 'All' }) },
                    { value: 'student', label: t('loans.target_student') },
                    { value: 'teacher', label: t('loans.target_teacher') },
                    { value: 'manager', label: t('loans.target_manager') },
                    { value: 'employee', label: t('loans.target_employee') }
                  ]}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--color-text-muted)]">{t('loans.loan_type')}</label>
                <Select
                  value={String(state.loanType || '')}
                  onChange={(value) => setMany({ loanType: String(value) })}
                  options={[
                    { value: '', label: t('common.all', { defaultValue: 'All' }) },
                    { value: 'CASH_LOAN', label: t('loans.type_CASH_LOAN') },
                    { value: 'SALARY_ADVANCE', label: t('loans.type_SALARY_ADVANCE') },
                    { value: 'STUDENT_FEE_DEBT', label: t('loans.type_STUDENT_FEE_DEBT') },
                    { value: 'EMERGENCY_LOAN', label: t('loans.type_EMERGENCY_LOAN') },
                    { value: 'OTHER', label: t('loans.type_OTHER') }
                  ]}
                />
              </div>
            </>
          }
        />

        <ActiveFilterChips chips={chips} onClearAll={clearAll} resultCount={pagination.total} />

        <div className="flex flex-wrap gap-2 no-print" data-no-print>
          <PrintButton
            targetId="loans-print-root"
            title={t('loans.title')}
            label={t('common.print')}
            orientation="landscape"
            disabled={!loans.length}
          />
          <ExportButtons
            targetId="loans-print-root"
            title={t('loans.title')}
            fileName="loans-report"
            orientation="landscape"
            disabled={!loans.length}
          />
        </div>

        <PrintableSection id="loans-print-root" printRoot="loans-report">
          <div className="mb-3 hidden print:block">
            <PrintHeader
              title={t('loans.title')}
              printedBy={user?.name}
              filterSummary={chips.map((chip) => chip.label).join(' | ') || undefined}
            />
          </div>
        <div className={`overflow-x-auto transition-opacity ${isFetching ? 'opacity-80' : ''}`}>
          <table className="print-table min-w-full text-right text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[var(--color-text-muted)]">
                <th className="px-3 py-2">{t('loans.loan_number')}</th>
                <th className="px-3 py-2">{t('loans.borrower')}</th>
                <th className="px-3 py-2">{t('loans.father_name')}</th>
                <th className="px-3 py-2">{t('loans.person_type')}</th>
                <th className="px-3 py-2">{t('loans.loan_type')}</th>
                <th className="px-3 py-2">{t('loans.loan_amount')}</th>
                <th className="px-3 py-2">{t('loans.repaid_amount')}</th>
                <th className="px-3 py-2">{t('loans.remaining_amount')}</th>
                <th className="px-3 py-2">{t('loans.loan_date')}</th>
                <th className="px-3 py-2">{t('loans.loan_status')}</th>
                <th className="no-print px-3 py-2" data-no-print>
                  {t('loans.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="px-3 py-6 text-center">
                    {t('loans.loading')}
                  </td>
                </tr>
              ) : loans.length ? (
                  loans.map((loan: any) => (
                  <tr key={loan._id} className="border-b border-white/5" data-print-row>
                    <td className="px-3 py-2">{loan.loanNumber}</td>
                    <td className="px-3 py-2">{loan.personName || '—'}</td>
                    <td className="px-3 py-2">{loan.fatherName || '—'}</td>
                    <td className="px-3 py-2">{t(`loans.target_${loan.personType}`, { defaultValue: loan.personType })}</td>
                    <td className="px-3 py-2">{t(`loans.type_${loan.loanType}`, { defaultValue: loan.loanType })}</td>
                    <td className="px-3 py-2">{formatCurrency(loan.originalAmount || 0, i18n.resolvedLanguage)}</td>
                    <td className="px-3 py-2">{formatCurrency(loan.repaidAmount || 0, i18n.resolvedLanguage)}</td>
                    <td className="px-3 py-2">{formatCurrency(loan.remainingAmount || 0, i18n.resolvedLanguage)}</td>
                    <td className="px-3 py-2">{formatJalaliDate(loan.loanDate, i18n.resolvedLanguage)}</td>
                    <td className="px-3 py-2">{t(statusKey(loan.status), { defaultValue: loan.status })}</td>
                      <td className="no-print px-3 py-2" data-no-print>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" onClick={() => setDetailLoan(loan)}>
                          {t('loans.view_details')}
                        </Button>
                        {canManage && Number(loan.remainingAmount || 0) > 0 && !['cancelled', 'reversed', 'paid'].includes(String(loan.status)) ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setRepayLoan(loan);
                              setRepayForm({
                                amount: String(loan.remainingAmount || ''),
                                repaymentMethod: 'cash',
                                repaymentDate: formatIsoToJalaliInput(new Date()),
                                note: ''
                              });
                            }}
                          >
                            {t('loans.record_repayment')}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="px-3 py-6 text-center">
                    {activeCount > 0 ? t('filters.no_matching_filters') : t('loans.no_records')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </PrintableSection>

        <div className="no-print" data-no-print>
        <ListPagination
          meta={pagination}
          disabled={isFetching}
          onPageChange={(page) => setMany({ page }, { resetPage: false })}
          onLimitChange={(limit) => setMany({ limit, page: 1 }, { resetPage: false })}
        />
        </div>
      </Card>

      {detailLoan ? (
        <Card className="space-y-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-[var(--color-text-strong)]">
              {t('loans.view_details')} — {detailLoan.loanNumber}
            </h3>
            <Button type="button" variant="outline" onClick={() => setDetailLoan(null)}>
              {t('loans.close')}
            </Button>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <p>
              {t('loans.borrower')}: {detailLoan.personName || '—'}
            </p>
            <p>
              {t('loans.father_name')}: {detailLoan.fatherName || '—'}
            </p>
            <p>
              {t('loans.person_type')}: {t(`loans.target_${detailLoan.personType}`, { defaultValue: detailLoan.personType })}
            </p>
            <p>
              {t('loans.loan_amount')}: {formatCurrency(detailLoan.originalAmount || 0, i18n.resolvedLanguage)}
            </p>
            <p>
              {t('loans.repaid_amount')}: {formatCurrency(detailLoan.repaidAmount || 0, i18n.resolvedLanguage)}
            </p>
            <p>
              {t('loans.remaining_amount')}: {formatCurrency(detailLoan.remainingAmount || 0, i18n.resolvedLanguage)}
            </p>
            <p>
              {t('loans.loan_date')}: {formatJalaliDate(detailLoan.loanDate, i18n.resolvedLanguage)}
            </p>
            <p>
              {t('loans.due_date')}: {detailLoan.dueDate ? formatJalaliDate(detailLoan.dueDate, i18n.resolvedLanguage) : '—'}
            </p>
            <p>
              {t('loans.loan_status')}: {t(statusKey(detailLoan.status), { defaultValue: detailLoan.status })}
            </p>
          </div>
          <div>
            <h4 className="mb-2 font-medium">{t('loans.repayment_history')}</h4>
            <div className="space-y-2">
              {repayments.length ? (
                repayments.map((item: any) => (
                  <div key={item._id} className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex flex-wrap justify-between gap-2">
                      <span>{item.repaymentNumber || item.receiptNumber}</span>
                      <span>{formatCurrency(item.amount || 0, i18n.resolvedLanguage)}</span>
                      <span>{formatJalaliDate(item.repaymentDate, i18n.resolvedLanguage)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--color-text-muted)]">{t('loans.no_records')}</p>
              )}
            </div>
          </div>
        </Card>
      ) : null}

      {repayLoan ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <Card className="w-full max-w-lg space-y-4 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{t('loans.record_repayment')}</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => setRepayLoan(null)}>
                {t('loans.close')}
              </Button>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p>
                {t('loans.loan_number')}: {repayLoan.loanNumber}
              </p>
              <p>
                {t('loans.borrower')}: {repayLoan.personName || '—'}
              </p>
              <p>
                {t('loans.loan_amount')}: {formatCurrency(repayLoan.originalAmount || 0, i18n.resolvedLanguage)}
              </p>
              <p>
                {t('loans.remaining_amount')}: {formatCurrency(repayLoan.remainingAmount || 0, i18n.resolvedLanguage)}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm">{t('loans.current_repayment')}</label>
                <Input
                  type="number"
                  min={0}
                  value={repayForm.amount}
                  onChange={(event) => setRepayForm((current) => ({ ...current, amount: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm">{t('filters.payment_method')}</label>
                <Select
                  value={repayForm.repaymentMethod}
                  onChange={(value) => setRepayForm((current) => ({ ...current, repaymentMethod: String(value) }))}
                  options={[
                    { value: 'cash', label: t('payments.method_cash') },
                    { value: 'bank_transfer', label: t('payments.method_bank') },
                    { value: 'mobile_money', label: t('payments.method_mobile') },
                    { value: 'card', label: t('payments.method_card') },
                    { value: 'other', label: t('loans.type_OTHER') }
                  ]}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm">{t('payments.payment_date')}</label>
                <JalaliDateInput
                  value={repayForm.repaymentDate}
                  onChange={(repaymentDate) => setRepayForm((current) => ({ ...current, repaymentDate }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm">{t('loans.notes')}</label>
                <Input
                  value={repayForm.note}
                  onChange={(event) => setRepayForm((current) => ({ ...current, note: event.target.value }))}
                />
              </div>
            </div>
            <Button type="button" onClick={() => repayMutation.mutate()} disabled={repayMutation.isPending}>
              {repayMutation.isPending ? t('loans.processing') : t('loans.confirm_repayment')}
            </Button>
          </Card>
        </div>
      ) : null}

      <MakeLoanWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSuccess={({ message: successMessage }) => {
          setMessage(successMessage);
          invalidate();
        }}
      />
    </div>
  );
}
