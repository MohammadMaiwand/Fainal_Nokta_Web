import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';
import { ArrowUpDown } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { PageHeader, SearchFilterBar } from '@/shared/components/Common';
import { expenseService } from '@/features/finance/services/expenseService';
import { useDebounce } from '@/hooks/useDebounce';
import { matchesSearch, sortCollection, type ListSortDirection, type ListSortField } from '@/utils/listSearchSort';
import { formatCurrency, formatDate, formatNumber } from '@/utils/formatters';
import { JalaliDateInput } from '@/components/forms/JalaliDateInput';
import { formatIsoToJalaliInput, isValidJalaliDateInput, jalaliInputToIsoDate } from '@/utils/jalaliDateInput';

const COLORS = ['#f97316', '#ef4444', '#eab308', '#14b8a6', '#38bdf8', '#a855f7'];

export function ExpensesPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ title: '', amount: '', category: '', date: formatIsoToJalaliInput(new Date()), notes: '' });
  const [formError, setFormError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [sortField, setSortField] = useState<ListSortField>('date');
  const [sortDirection, setSortDirection] = useState<ListSortDirection>('desc');
  const [period, setPeriod] = useState('this_month');
  const { data: summary, isError } = useQuery({
    queryKey: ['expense-summary', period],
    queryFn: () => expenseService.summary({ period })
  });

  const { data: records, isLoading: recordsLoading } = useQuery({
    queryKey: ['expense-records', period],
    queryFn: () => expenseService.list({ period })
  });
  const createMutation = useMutation({
    mutationFn: () => {
      if (!isValidJalaliDateInput(form.date)) {
        throw new Error(t('errors.invalid_jalali_date', { defaultValue: 'Date must be in Hijri Shamsi format, for example 1405/2/1.' }));
      }
      const isoDate = jalaliInputToIsoDate(form.date);
      if (!isoDate) {
        throw new Error(t('errors.invalid_jalali_date', { defaultValue: 'Date must be in Hijri Shamsi format, for example 1405/2/1.' }));
      }
      return expenseService.create({
        title: form.title.trim(),
        amount: Number(form.amount || 0),
        category: form.category.trim(),
        date: isoDate,
        notes: form.notes.trim()
      });
    },
    onSuccess: () => {
      setForm({ title: '', amount: '', category: '', date: formatIsoToJalaliInput(new Date()), notes: '' });
      setFormError('');
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['expense-records'] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary'] });
    }
  });
  const debouncedSearch = useDebounce(search, 300);
  const recordSortOptions = useMemo(
    () => [
      { value: 'name', label: t('common.sort_name', { defaultValue: 'Sort by Name' }) },
      { value: 'date', label: t('common.sort_date', { defaultValue: 'Sort by Date' }) }
    ],
    [t]
  );
  const visibleRecords = useMemo(() => {
    const filtered = (records ?? []).filter((record) => matchesSearch(record, debouncedSearch));
    return sortCollection(filtered, sortField, sortDirection);
  }, [debouncedSearch, records, sortDirection, sortField]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="common.expenses"
        description="common.live_school_metrics"
        actions={(
          <Button type="button" onClick={() => setShowCreate((current) => !current)}>
            {t('common.add_entity', { entity: t('common.expense') })}
          </Button>
        )}
      />

      {showCreate && (
        <Card className="space-y-3 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Input value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} placeholder={t('finance.title')} />
            <Input type="number" value={form.amount} onChange={(e) => setForm((c) => ({ ...c, amount: e.target.value }))} placeholder={t('finance.amount')} />
            <Input value={form.category} onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))} placeholder={t('finance.category')} />
            <JalaliDateInput value={form.date} required onChange={(date) => setForm((c) => ({ ...c, date }))} />
          </div>
          {formError && <p className="text-sm text-rose-400">{formError}</p>}
          <textarea
            value={form.notes}
            onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))}
            placeholder={t('finance.notes')}
            className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => {
                setFormError('');
                createMutation.mutate(undefined, {
                  onError: (error: any) => setFormError(error?.message ?? t('errors.unable_save', { defaultValue: 'Unable to save.' }))
                });
              }}
              disabled={createMutation.isPending || !form.title.trim() || !form.category.trim() || Number(form.amount) <= 0}
            >
              {t('common.create')}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </Card>
      )}

      {isError && <Card className="p-6 text-rose-200">{t('errors.unable_load_records', { defaultValue: 'Unable to load expense data.' })}</Card>}

      <Card className="p-4">
        <div className="max-w-xs">
          <label className="mb-2 block text-sm text-slate-300">دوره گزارش مصارف</label>
          <Select
            value={period}
            options={[
              { value: 'today', label: 'روزانه' },
              { value: 'this_week', label: 'هفته‌وار' },
              { value: 'this_month', label: 'ماهانه' },
              { value: 'this_year', label: 'سالانه' }
            ]}
            onChange={(value) => setPeriod(String(value))}
          />
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="p-6"><p className="text-sm text-slate-400">{t('finance.operating_expenses', { defaultValue: 'Operating Expenses' })}</p><p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(summary?.totalExpenses, i18n.resolvedLanguage)}</p></Card>
        <Card className="p-6"><p className="text-sm text-slate-400">{t('finance.teacher_salaries', { defaultValue: 'Teacher Salaries' })}</p><p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(summary?.teacherSalaries, i18n.resolvedLanguage)}</p></Card>
        <Card className="p-6"><p className="text-sm text-slate-400">{t('finance.expense_categories', { defaultValue: 'Expense Categories' })}</p><p className="mt-3 text-3xl font-semibold text-white">{formatNumber(summary?.categories?.length, i18n.resolvedLanguage)}</p></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{t('finance.expense_breakdown', { defaultValue: 'Expense Breakdown' })}</p>
          <div className="mt-6 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={summary?.categories ?? []} dataKey="total" nameKey="category" outerRadius={110}>
                  {(summary?.categories ?? []).map((entry, index) => (
                    <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{t('finance.monthly_expense_trend', { defaultValue: 'Monthly Expense Trend' })}</p>
          <div className="mt-6 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.monthlyExpenses ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="total" fill="#f97316" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{t('finance.recent_expenses', { defaultValue: 'Recent Expenses' })}</p>
          <div className="mt-4 space-y-4">
            <SearchFilterBar
              value={search}
              onChange={setSearch}
              placeholder={t('common.search_placeholder', { entity: t('finance.recent_expenses', { defaultValue: 'Recent Expenses' }) })}
              createVisible={false}
              extraActions={
                <>
                  <div className="w-full sm:w-56">
                    <Select
                      value={sortField}
                      options={recordSortOptions}
                      placeholder={t('common.sort', { defaultValue: 'Sort' })}
                      onChange={(value) => setSortField(String(value) as ListSortField)}
                    />
                  </div>
                  <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))}>
                    <ArrowUpDown className="h-4 w-4" />
                    {t(sortDirection === 'asc' ? 'common.ascending' : 'common.descending', {
                      defaultValue: sortDirection === 'asc' ? 'ASC' : 'DESC'
                    })}
                  </Button>
                </>
              }
            />
            <div className="space-y-3">
              {visibleRecords.slice(0, 12).map((record) => (
              <div key={record._id} className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4">
                <div className="font-medium text-white">{record.title}</div>
                <div className="mt-1 text-sm text-slate-400">{record.category}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-slate-300">{formatDate(record.date, i18n.resolvedLanguage)}</span>
                  <span className="font-semibold text-rose-400">{formatCurrency(record.amount, i18n.resolvedLanguage)}</span>
                </div>
              </div>
              ))}
              {recordsLoading && <div className="text-slate-400">{t('common.loading', { defaultValue: 'Loading...' })}</div>}
              {!recordsLoading && !visibleRecords.length && <div className="text-slate-400">{t('common.no_records_found', { defaultValue: 'No expense records found.' })}</div>}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
