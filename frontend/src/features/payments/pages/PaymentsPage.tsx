import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AfghaniIcon } from '@/components/icons/AfghaniIcon';
import { PageHeader } from '@/shared/components/Common';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { formatCurrency } from '@/utils/formatters';
import { formatJalaliDate } from '@/utils/date';
import { useAuthStore } from '@/store/authStore';
import { useDebounce } from '@/hooks/useDebounce';
import { useListQueryParams } from '@/hooks/useListQueryParams';
import { paymentsService } from '@/features/payments/services/paymentsService';
import { MakePaymentWizard } from '@/features/payments/components/MakePaymentWizard';
import { DataFilterToolbar } from '@/shared/filters/DataFilterToolbar';
import { ActiveFilterChips } from '@/shared/filters/ActiveFilterChips';
import { ListPagination } from '@/shared/filters/ListPagination';
import { periodLabelKey } from '@/utils/datePeriods';
import { PrintButton, PrintableSection, PrintHeader, ExportButtons } from '@/shared/print';
import { api } from '@/services/apiClient';

function statusKey(status: string) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'partially_paid') return 'payments.status_partially_paid';
  if (normalized === 'paid') return 'payments.status_paid';
  if (normalized === 'completed') return 'payments.status_completed';
  if (normalized === 'reversed') return 'payments.status_reversed';
  if (normalized === 'refunded') return 'payments.status_refunded';
  if (normalized === 'cancelled') return 'payments.status_cancelled';
  if (normalized === 'pending') return 'payments.status_pending';
  return 'payments.status_pending';
}

export function PaymentsPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canCreatePayment = ['super_admin', 'admin', 'branch_manager', 'owner'].includes(user?.role ?? '');
  const canReverseRefund = ['super_admin', 'admin', 'owner'].includes(user?.role ?? '');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [receipt, setReceipt] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState('');
  const { state, setMany, clearAll, apiParams, activeCount } = useListQueryParams({
    defaults: { limit: 20, sortBy: 'paymentDate', sortOrder: 'desc', period: 'all' },
    extraKeys: ['paymentFor', 'method']
  });
  const debouncedSearch = useDebounce(String(state.search || ''), 350);

  const { data: branches = [] } = useQuery({
    queryKey: ['payment-branches'],
    queryFn: () => api.get('/branches', { params: { limit: 200 } }).then((res) => res.data.data ?? []),
    enabled: canCreatePayment || ['super_admin', 'admin', 'owner', 'branch_manager'].includes(user?.role ?? '')
  });

  const listParams = useMemo(
    () => ({
      ...apiParams,
      search: debouncedSearch || undefined
    }),
    [apiParams, debouncedSearch]
  );

  const { data, isLoading, isFetching, isError: paymentsError } = useQuery({
    queryKey: ['payments-list', listParams],
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    queryFn: () => paymentsService.listPaged(listParams)
  });

  const payments = data?.items ?? [];
  const pagination = data?.pagination ?? { page: state.page, limit: state.limit, total: 0 };

  const invalidateFinance = () => {
    queryClient.invalidateQueries({ queryKey: ['payments-list'] });
    queryClient.invalidateQueries({ queryKey: ['academy-financial-report'] });
    queryClient.invalidateQueries({ queryKey: ['payment-wizard-salary-preview'] });
    queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
  };

  const reverseMutation = useMutation({
    mutationFn: (id: string) => paymentsService.reverse(id),
    onSuccess: () => {
      setMessage(t('payments.status_reversed'));
      invalidateFinance();
    },
    onError: (error: any) => {
      setMessage(error?.response?.data?.message || t('payments.payment_failed'));
    }
  });

  const refundMutation = useMutation({
    mutationFn: (id: string) => paymentsService.refund(id),
    onSuccess: () => {
      setMessage(t('payments.status_refunded'));
      invalidateFinance();
    },
    onError: (error: any) => {
      setMessage(error?.response?.data?.message || t('payments.payment_failed'));
    }
  });

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
    state.paymentFor
      ? {
          key: 'paymentFor',
          label: `${t('filters.payment_for')}: ${
            state.paymentFor === 'student_fee' ? t('payments.type_student_fee') : t('payments.type_employee_salary')
          }`,
          onRemove: () => setMany({ paymentFor: '' })
        }
      : null,
    state.method
      ? {
          key: 'method',
          label: `${t('filters.payment_method')}: ${t(`payments.method_${String(state.method) === 'bank_transfer' ? 'bank' : String(state.method) === 'mobile_money' ? 'mobile' : String(state.method)}`)}`,
          onRemove: () => setMany({ method: '' })
        }
      : null
  ].filter(Boolean) as Array<{ key: string; label: string; onRemove: () => void }>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="common.payments"
        description={t('payments.page_description')}
        actions={
          <div className="flex flex-wrap gap-2">
            <PrintButton
              targetId="payments-list-print-root"
              title={t('common.payments')}
              orientation="landscape"
              label={t('common.print')}
            />
            <ExportButtons
              targetId="payments-list-print-root"
              title={t('common.payments')}
              fileName="payments-report"
              orientation="landscape"
            />
            {canCreatePayment ? (
              <Button type="button" onClick={() => setWizardOpen(true)}>
                <AfghaniIcon className="h-4 w-4" />
                {t('payments.new_payment')}
              </Button>
            ) : null}
          </div>
        }
      />

      <PrintableSection id="payments-list-print-root" printRoot="payments-list" className="print-report-source space-y-3 bg-white p-4 text-slate-900">
        <PrintHeader title={t('common.payments')} subtitle={t('payments.page_description')} printedBy={user?.name} />
        <div className="overflow-x-auto table-shell">
          <table className="print-table min-w-full text-sm">
            <thead>
              <tr>
                <th>{t('payments.payment_type')}</th>
                <th>{t('common.name')}</th>
                <th>{t('payments.gross_amount')}</th>
                <th>{t('payments.tax_amount')}</th>
                <th>{t('payments.net_payment')}</th>
                <th>{t('payments.status')}</th>
                <th>{t('payments.payment_date')}</th>
                <th>{t('payments.invoice_number')}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment: any) => (
                <tr key={String(payment._id)} data-print-row>
                  <td>
                    {t(`payments.type_${String(payment.paymentFor || 'student_fee')}`, {
                      defaultValue: String(payment.paymentFor || '—')
                    })}
                  </td>
                  <td>{String(payment.expenseTitle || payment.payeeName || payment.studentName || payment.name || '—')}</td>
                  <td>{formatCurrency(Number(payment.grossAmount || payment.amount || 0), i18n.resolvedLanguage)}</td>
                  <td>{formatCurrency(Number(payment.taxAmount || 0), i18n.resolvedLanguage)}</td>
                  <td>{formatCurrency(Number(payment.netAmount || payment.amount || 0), i18n.resolvedLanguage)}</td>
                  <td>{t(statusKey(String(payment.status || '')))}</td>
                  <td>{formatJalaliDate(payment.paymentDate, i18n.resolvedLanguage)}</td>
                  <td>{String(payment.invoiceNumber || '—')}</td>
                </tr>
              ))}
              {!payments.length ? (
                <tr data-print-row>
                  <td colSpan={8}>{t('payments.no_records')}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </PrintableSection>

      {paymentsError && (
        <Card className="border-rose-500/30 bg-rose-500/10 p-4 text-rose-700 dark:text-rose-200">
          {t('errors.unable_load_records')}
        </Card>
      )}

      {message ? (
        <Card className="border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-200">
          {message}
        </Card>
      ) : null}

      {receipt && (
        <Card className="border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 no-print" data-no-print>
            <h3 className="font-semibold text-emerald-800 dark:text-emerald-200">
              {String(receipt.type) === 'salary_slip' || receipt.document === 'salary_slip'
                ? t('payments.salary_slip_title')
                : t('payments.receipt_title')}
            </h3>
            <div className="flex gap-2">
              <PrintButton
                targetId="payment-receipt-print-root"
                title={
                  String(receipt.type) === 'salary_slip' || receipt.document === 'salary_slip'
                    ? t('payments.salary_slip_title')
                    : t('payments.receipt_title')
                }
                label={t('common.print')}
                orientation="portrait"
              />
              <ExportButtons
                targetId="payment-receipt-print-root"
                title={
                  String(receipt.type) === 'salary_slip' || receipt.document === 'salary_slip'
                    ? t('payments.salary_slip_title')
                    : t('payments.receipt_title')
                }
                fileName="payment-receipt"
                orientation="portrait"
              />
              <Button type="button" variant="outline" onClick={() => setReceipt(null)}>
                {t('payments.close')}
              </Button>
            </div>
          </div>
          <PrintableSection id="payment-receipt-print-root" printRoot="payment-receipt" className="rounded-xl bg-white p-4 text-slate-900">
            <h3 className="mb-3 text-lg font-bold">
              {String(receipt.type) === 'salary_slip' || receipt.document === 'salary_slip'
                ? t('payments.salary_slip_title')
                : t('payments.receipt_title')}
            </h3>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p>
                {t('payments.invoice_number')}: {String(receipt.invoiceNumber || '—')}
              </p>
              <p>
                {t('payments.reference')}: {String(receipt.referenceNumber || '—')}
              </p>
              <p>
                {receipt.paymentFor === 'expense' ? t('payments.expense_title') : t('common.name')}:{' '}
                {String(receipt.expenseTitle || receipt.payeeName || receipt.studentName || receipt.name || '—')}
              </p>
              {receipt.paymentFor === 'expense' ? (
                <p>
                  {t('payments.expense_category')}: {String(receipt.expenseCategory || '—')}
                </p>
              ) : null}
              <p>
                {t('payments.payment_type')}:{' '}
                {t(`payments.type_${String(receipt.paymentFor || receipt.type || 'student_fee')}`, {
                  defaultValue: String(receipt.paymentFor || receipt.type || '—')
                })}
              </p>
              <p>
                {t('payments.payment_date')}: {String(receipt.paymentDate || receipt.date || '—')}
              </p>
              <p>
                {t('payments.payment_method')}: {String(receipt.method || '—')}
              </p>
              <p>
                {t('payments.status')}: {t(statusKey(String(receipt.status || '')))}
              </p>
              <p>
                {t('payments.gross_amount', { defaultValue: 'Gross' })}:{' '}
                {formatCurrency(Number(receipt.grossAmount || receipt.amount || 0), i18n.resolvedLanguage)}
              </p>
              <p>
                {t('payments.tax_deduction', { defaultValue: 'Tax' })}:{' '}
                {formatCurrency(Number(receipt.taxAmount || 0), i18n.resolvedLanguage)}
              </p>
              <p className="font-semibold sm:col-span-2">
                {t('payments.net_payment')}: {formatCurrency(Number(receipt.netAmount || receipt.amount || 0), i18n.resolvedLanguage)}
              </p>
              {receipt.notes ? (
                <p className="sm:col-span-2">
                  {t('payments.notes')}: {String(receipt.notes)}
                </p>
              ) : null}
            </div>
          </PrintableSection>
        </Card>
      )}

      <Card className="space-y-4 p-4">
        <DataFilterToolbar
          search={String(state.search || '')}
          onSearchChange={(search) => setMany({ search })}
          searchPlaceholder={t('payments.search_person_placeholder')}
          period={String(state.period || 'all')}
          onPeriodChange={(period) => setMany({ period, ...(period === 'custom' ? {} : { from: '', to: '' }) })}
          from={String(state.from || '')}
          to={String(state.to || '')}
          onFromChange={(from) => setMany({ from, period: 'custom' })}
          onToChange={(to) => setMany({ to, period: 'custom' })}
          status={String(state.status || '')}
          onStatusChange={(status) => setMany({ status })}
          statusOptions={[
            { value: 'pending', label: t('payments.status_pending') },
            { value: 'partially_paid', label: t('payments.status_partially_paid') },
            { value: 'paid', label: t('payments.status_paid') },
            { value: 'completed', label: t('payments.status_completed') },
            { value: 'reversed', label: t('payments.status_reversed') },
            { value: 'refunded', label: t('payments.status_refunded') }
          ]}
          branchId={String(state.branchId || '')}
          onBranchChange={(branchId) => setMany({ branchId })}
          branchOptions={branches.map((branch: any) => ({ value: String(branch._id), label: branch.name }))}
          activeCount={activeCount}
          onClear={clearAll}
          extraFilters={
            <>
              <div>
                <label className="mb-1 block text-sm text-[var(--color-text-muted)]">{t('filters.payment_for')}</label>
                <Select
                  value={String(state.paymentFor || '')}
                  onChange={(value) => setMany({ paymentFor: String(value) })}
                  options={[
                    { value: '', label: t('common.all', { defaultValue: 'All' }) },
                    { value: 'student_fee', label: t('payments.type_student_fee') },
                    { value: 'teacher_salary', label: t('payments.type_employee_salary') },
                    { value: 'manager_salary', label: t('payments.select_manager') }
                  ]}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--color-text-muted)]">{t('filters.payment_method')}</label>
                <Select
                  value={String(state.method || '')}
                  onChange={(value) => setMany({ method: String(value) })}
                  options={[
                    { value: '', label: t('common.all', { defaultValue: 'All' }) },
                    { value: 'cash', label: t('payments.method_cash') },
                    { value: 'bank_transfer', label: t('payments.method_bank') },
                    { value: 'mobile_money', label: t('payments.method_mobile') },
                    { value: 'card', label: t('payments.method_card') }
                  ]}
                />
              </div>
            </>
          }
        />

        <ActiveFilterChips chips={chips} onClearAll={clearAll} resultCount={pagination.total} />

        <div className={`overflow-x-auto transition-opacity ${isFetching ? 'opacity-80' : ''}`}>
          <table className="min-w-full text-right text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[var(--color-text-muted)]">
                <th className="px-3 py-2">{t('payments.payment_type')}</th>
                <th className="px-3 py-2">{t('common.name')}</th>
                <th className="px-3 py-2">{t('payments.gross_amount')}</th>
                <th className="px-3 py-2">{t('payments.tax_amount')}</th>
                <th className="px-3 py-2">{t('payments.net_payment')}</th>
                <th className="px-3 py-2">{t('payments.status')}</th>
                <th className="px-3 py-2">{t('payments.payment_date')}</th>
                <th className="px-3 py-2">{t('payments.invoice_number')}</th>
                <th className="px-3 py-2">{t('payments.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center">
                    {t('payments.loading')}
                  </td>
                </tr>
              ) : payments.length ? (
                payments.map((payment: any) => {
                  const isActive = !['reversed', 'refunded', 'cancelled'].includes(String(payment.status || '').toLowerCase());
                  return (
                    <tr key={payment._id} className="border-b border-white/5">
                      <td className="px-3 py-2">
                        {payment.paymentFor === 'student_fee'
                          ? t('payments.type_student_fee')
                          : payment.paymentFor === 'expense'
                            ? t('payments.type_expense')
                            : t('payments.type_employee_salary')}
                      </td>
                      <td className="px-3 py-2">
                        {payment.paymentFor === 'student_fee'
                          ? payment.studentName ||
                            [payment.studentId?.firstName, payment.studentId?.lastName].filter(Boolean).join(' ')
                          : payment.expenseTitle || payment.payeeName || payment.payeeUserId?.name || '—'}
                      </td>
                      <td className="px-3 py-2">
                        {payment.paymentFor === 'student_fee' ? '—' : formatCurrency(payment.grossAmount || 0, i18n.resolvedLanguage)}
                      </td>
                      <td className="px-3 py-2">
                        {payment.paymentFor === 'student_fee' ? '—' : formatCurrency(payment.taxAmount || 0, i18n.resolvedLanguage)}
                      </td>
                      <td className="px-3 py-2">{formatCurrency(payment.netAmount || payment.amount || 0, i18n.resolvedLanguage)}</td>
                      <td className="px-3 py-2">{t(statusKey(payment.status))}</td>
                      <td className="px-3 py-2">{formatJalaliDate(payment.paymentDate, i18n.resolvedLanguage)}</td>
                      <td className="px-3 py-2">{payment.invoiceNumber}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              setReceipt({
                                type: payment.paymentFor === 'student_fee' ? 'fee_receipt' : 'salary_slip',
                                invoiceNumber: payment.invoiceNumber,
                                referenceNumber: payment.referenceNumber,
                                status: payment.status,
                                amount: payment.amount,
                                grossAmount: payment.grossAmount,
                                taxAmount: payment.taxAmount,
                                netAmount: payment.netAmount
                              })
                            }
                          >
                            {t('payments.view_receipt')}
                          </Button>
                          {canReverseRefund && isActive ? (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                disabled={reverseMutation.isPending}
                                onClick={() => {
                                  if (window.confirm(t('payments.confirm_reverse'))) {
                                    reverseMutation.mutate(String(payment._id));
                                  }
                                }}
                              >
                                {t('payments.reverse')}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                disabled={refundMutation.isPending}
                                onClick={() => {
                                  if (window.confirm(t('payments.confirm_refund'))) {
                                    refundMutation.mutate(String(payment._id));
                                  }
                                }}
                              >
                                {t('payments.refund')}
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center">
                    {activeCount > 0 ? t('filters.no_matching_filters') : t('payments.no_records')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <ListPagination
          meta={pagination}
          disabled={isFetching}
          onPageChange={(page) => setMany({ page }, { resetPage: false })}
          onLimitChange={(limit) => setMany({ limit, page: 1 }, { resetPage: false })}
        />
      </Card>

      <MakePaymentWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSuccess={({ message: successMessage, receipt: nextReceipt }) => {
          setMessage(successMessage);
          setReceipt(nextReceipt);
          invalidateFinance();
        }}
      />
    </div>
  );
}
