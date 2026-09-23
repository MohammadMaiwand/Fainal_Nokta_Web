import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/shared/components/Common';
import { PrintButton, PrintableSection, ExportButtons } from '@/shared/print';
import { api } from '@/services/apiClient';
import { formatCurrency, toLocaleDigits } from '@/utils/formatters';
import { formatJalaliDate, getCurrentJalaliYearMonth } from '@/utils/date';
import { useAuthStore } from '@/store/authStore';
import { registerPrintRecord, searchPrintRecords, type PrintRecord } from '@/shared/print/printRegistry';
import { getLanguageDirection } from '@/locales/i18n';
import {
  formatMoneyWordsAndNumber,
  formatTaxRateAndAmountDisplay
} from '@/utils/numberWords';

function formatAccountingCurrency(value: number, language?: string) {
  const amount = Number(value || 0);
  const absText = formatCurrency(Math.abs(amount), language);
  return amount < 0 ? `(${absText})` : absText;
}

function formatNetProfitCurrency(value: number, language?: string) {
  const amount = Number(value || 0);
  const text = formatCurrency(Math.abs(amount), language);
  if (amount < 0) return `−${text}`;
  if (amount > 0) return `+${text}`;
  return text;
}

function getReportRowToneClass(key: string) {
  if (key === 'net_profit') return 'bg-emerald-500/10 dark:bg-emerald-500/15';
  if (key === 'total_expenses' || key === 'small_taxes' || key === 'paid_salaries' || key === 'unpaid_salaries' || key === 'outstanding_loans') {
    return 'bg-rose-500/10 dark:bg-rose-500/15';
  }
  if (key === 'quarterly_tax' || key === 'annual_tax') {
    return 'bg-amber-500/10 dark:bg-amber-500/15';
  }
  if (key === 'total_revenue' || key === 'student_revenue' || key === 'book_revenue') {
    return 'bg-sky-500/10 dark:bg-sky-500/15';
  }
  return '';
}

function translateReportRowLabel(t: (key: string, opts?: any) => string, row: any) {
  return t(`finance.row_${row.key}`, { defaultValue: row.label });
}

function translateReportRowSource(t: (key: string, opts?: any) => string, row: any, _language?: string) {
  if (row.key === 'quarterly_tax' || row.key === 'annual_tax') {
    return t('finance.source_calculated', { defaultValue: row.source });
  }
  const sourceKey = row.sourceKey || 'calculated';
  return t(`finance.source_${sourceKey}`, { defaultValue: row.source });
}

function formatLocalizedReportRowValue(
  row: any,
  language: string | undefined,
  t: (key: string, opts?: any) => string,
  taxRates?: any
) {
  // در جدول فقط عدد؛ حروفی+عددی در بخش توضیحات
  if (row.key === 'quarterly_tax') {
    const rate = Number(row.rate ?? taxRates?.quarterlyRate ?? taxRates?.brtRate ?? 0);
    const amount = formatAccountingCurrency(Number(row.value || 0), language);
    return `${toLocaleDigits(String(rate), language)}% — ${amount}`;
  }
  if (row.key === 'annual_tax') {
    const rate = Number(row.rate ?? taxRates?.annualRate ?? taxRates?.annualIncomeTaxRate ?? 0);
    const amount = formatAccountingCurrency(Number(row.value || 0), language);
    return `${toLocaleDigits(String(rate), language)}% — ${amount}`;
  }
  if (row.valueType === 'count' || row.key?.includes('students') || row.key?.includes('count')) {
    return toLocaleDigits(String(row.value ?? 0), language);
  }
  if (row.valueType === 'percent') {
    return `${toLocaleDigits(String(Number(row.value || 0)), language)}%`;
  }
  return formatAccountingCurrency(Number(row.value || 0), language);
}

const tableBorderClass = 'border border-slate-300 px-3 py-2 text-center dark:border-slate-700';
const tableHeadClass = 'bg-slate-100/90 text-center text-slate-700 dark:bg-slate-900/80 dark:text-slate-300 print:bg-slate-100 print:text-slate-900';
const tableCellClass = `${tableBorderClass} text-center text-slate-800 dark:text-slate-200 print:text-slate-900`;

const CODE_39: Record<string, string> = {
  '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn', '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw', '8': 'wnnwnnwnn', '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw', B: 'nnwnnwnnw', C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn',
  F: 'nnwnwwnnn', G: 'nnnnnwwnw', H: 'wnnnnwwnn', I: 'nnwnnwwnn', J: 'nnnnwwwnn',
  K: 'wnnnnnnww', L: 'nnwnnnnww', M: 'wnwnnnnwn', N: 'nnnnwnnww', O: 'wnnnwnnwn',
  P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn', S: 'nnwnnnwwn', T: 'nnnnwnwwn',
  U: 'wwnnnnnnw', V: 'nwwnnnnnw', W: 'wwwnnnnnn', X: 'nwnnwnnnw', Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn', '-': 'nwnnnnwnw', '*': 'nwnnwnwnn'
};

function LinearBarcode({ value }: { value: string }) {
  const encoded = `*${String(value || 'PENDING').toUpperCase().replace(/[^0-9A-Z-]/g, '-') }*`;
  const bars: Array<{ x: number; width: number }> = [];
  let x = 8;
  for (const char of encoded) {
    for (const [index, widthCode] of [...(CODE_39[char] || CODE_39['-'])].entries()) {
      const width = widthCode === 'w' ? 3 : 1;
      if (index % 2 === 0) bars.push({ x, width });
      x += width;
    }
    x += 1;
  }
  return (
    <svg className="academy-linear-barcode" viewBox={`0 0 ${x + 8} 38`} role="img" aria-label={`Barcode ${value}`}>
      {bars.map((bar, index) => <rect key={`${bar.x}-${index}`} x={bar.x} y="1" width={bar.width} height="29" fill="#000" />)}
      <text x={(x + 8) / 2} y="37" textAnchor="middle" fontSize="7" direction="ltr">{value}</text>
    </svg>
  );
}

function FinancialPrintChart({
  totals,
  language,
  labels
}: {
  totals: any;
  language?: string;
  labels: { revenue: string; expenses: string; salaries: string; tax: string; net: string; title: string };
}) {
  const series = [
    { label: labels.revenue, value: Number(totals?.totalRevenue || 0), color: '#2563eb' },
    { label: labels.expenses, value: Number(totals?.totalExpenses || 0), color: '#dc2626' },
    { label: labels.salaries, value: Number(totals?.paidSalaries || 0), color: '#7c3aed' },
    { label: labels.tax, value: Number(totals?.academyTaxes ?? totals?.totalTaxes ?? 0), color: '#d97706' },
    { label: labels.net, value: Number(totals?.netProfit || 0), color: Number(totals?.netProfit || 0) < 0 ? '#dc2626' : '#15803d' }
  ];
  const maxValue = Math.max(1, ...series.map((item) => Math.abs(item.value)));
  const dir = getLanguageDirection(language);

  return (
    <div className="academy-financial-print-chart" dir={dir}>
      <p className="mb-3 text-start text-sm font-bold">{labels.title}</p>
      <svg viewBox="0 0 700 300" role="img" aria-label={labels.title} className="h-auto w-full">
        <line x1="50" y1="245" x2="680" y2="245" stroke="#64748b" strokeWidth="1" />
        {series.map((item, index) => {
          const height = Math.max(3, (Math.abs(item.value) / maxValue) * 175);
          const x = 75 + index * 122;
          const y = 245 - height;
          return (
            <g key={item.label}>
              <rect x={x} y={y} width="72" height={height} fill={item.color} rx="4" />
              <text
                x={x + 36}
                y={y - 8}
                textAnchor="middle"
                fontSize="13"
                fill={item.color}
                fontWeight="700"
                direction="ltr"
                unicodeBidi="plaintext"
              >
                {formatNetProfitCurrency(item.value, language)}
              </text>
              <text x={x + 36} y="268" textAnchor="middle" fontSize="13" fill="#0f172a">
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function AcademyFinancialReportPage() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const currentJalali = getCurrentJalaliYearMonth();
  const fallbackNow = new Date();
  const initialHijriYear = currentJalali.year > 0 ? currentJalali.year : fallbackNow.getFullYear();
  const initialHijriMonth = currentJalali.month >= 1 && currentJalali.month <= 12 ? currentJalali.month : fallbackNow.getMonth() + 1;
  // Dashboard financial cards use the current Hijri year by default; keep this
  // report on the same period so their totals are directly comparable.
  const [reportType, setReportType] = useState<'monthly' | 'quarterly' | 'yearly'>('yearly');
  const [hijriYear, setHijriYear] = useState(String(initialHijriYear));
  const [hijriMonth, setHijriMonth] = useState(String(initialHijriMonth));
  const [quarter, setQuarter] = useState('1');
  const [branchId, setBranchId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [printRecord, setPrintRecord] = useState<PrintRecord | null>(null);
  const [printSearch, setPrintSearch] = useState('');
  const [printHistory, setPrintHistory] = useState<PrintRecord[]>([]);

  const quarterOptions = useMemo(
    () => [
      { value: '1', label: t('finance.quarter_1_months') },
      { value: '2', label: t('finance.quarter_2_months') },
      { value: '3', label: t('finance.quarter_3_months') },
      { value: '4', label: t('finance.quarter_4_months') }
    ],
    [t]
  );

  const queryParams = useMemo(
    () => ({
      reportType,
      hijriYear,
      ...(reportType === 'monthly' ? { hijriMonth } : {}),
      ...(reportType === 'quarterly' ? { quarter } : {}),
      ...(branchId ? { branchId } : {}),
      paymentStatus
    }),
    [branchId, hijriMonth, hijriYear, paymentStatus, quarter, reportType]
  );

  const { data: branches } = useQuery({
    queryKey: ['academy-financial-report-branches'],
    queryFn: () => api.get('/branches', { params: { limit: 200 } }).then((res) => res.data.data)
  });

  const { data, isLoading } = useQuery({
    queryKey: ['academy-financial-report', queryParams],
    queryFn: () => api.get('/academy-financial-report', { params: queryParams }).then((res) => res.data.data)
  });
  const reportTypeLabel =
    reportType === 'monthly'
      ? t('finance.report_monthly')
      : reportType === 'quarterly'
        ? t('finance.report_quarterly')
        : t('finance.report_yearly');

  const pageDir = getLanguageDirection(i18n.resolvedLanguage);
  const lang = i18n.resolvedLanguage;

  const localizedExplanations = useMemo(() => {
    if (!data) return [];
    const brt = Number(data.taxRates?.brtRate ?? data.taxRates?.quarterlyRate ?? 0);
    const annual = Number(data.taxRates?.annualIncomeTaxRate ?? data.taxRates?.annualRate ?? 0);
    const quarterlyTax = Number(data.taxAmounts?.quarterlyTax ?? 0);
    const annualTax = Number(data.taxAmounts?.annualTax ?? 0);
    const totalTax = Number(data.totalsFooter?.academyTaxes ?? data.taxAmounts?.totalAcademyTax ?? 0);
    const before = Number(data.totalsFooter?.profitBeforeTax ?? 0);
    const net = Number(data.totalsFooter?.netProfit ?? 0);
    const studentRevenue = Number(data.totalsFooter?.studentRevenue ?? 0);
    const bookSales = Number(data.totalsFooter?.bookSales ?? 0);
    const totalRevenue = Number(data.totalsFooter?.totalRevenue ?? 0);
    const totalExpenses = Number(data.totalsFooter?.totalExpenses ?? 0);
    const paidSalaries = Number(data.totalsFooter?.paidSalaries ?? 0);
    const pendingSalaries = Number(data.totalsFooter?.pendingSalaries ?? 0);
    const outstandingLoans = Number(data.totalsFooter?.outstandingLoans ?? 0);
    return [
      { heading: true, text: t('finance.explain_amounts_section') },
      { text: `${t('finance.row_student_revenue')}: ${formatMoneyWordsAndNumber(studentRevenue, lang)}` },
      { text: `${t('finance.row_book_revenue')}: ${formatMoneyWordsAndNumber(bookSales, lang)}` },
      { text: `${t('finance.row_total_revenue')}: ${formatMoneyWordsAndNumber(totalRevenue, lang)}` },
      { text: `${t('finance.row_total_expenses')}: ${formatMoneyWordsAndNumber(totalExpenses, lang)}` },
      { text: `${t('finance.row_paid_salaries')}: ${formatMoneyWordsAndNumber(paidSalaries, lang)}` },
      { text: `${t('finance.row_unpaid_salaries')}: ${formatMoneyWordsAndNumber(pendingSalaries, lang)}` },
      { text: `${t('finance.row_outstanding_loans')}: ${formatMoneyWordsAndNumber(outstandingLoans, lang)}` },
      { text: `${t('finance.row_quarterly_tax')}: ${formatTaxRateAndAmountDisplay(brt, quarterlyTax, lang)}` },
      { text: `${t('finance.row_annual_tax')}: ${formatTaxRateAndAmountDisplay(annual, annualTax, lang)}` },
      { text: `${t('finance.row_small_taxes')}: ${formatMoneyWordsAndNumber(totalTax, lang)}` },
      { text: `${t('finance.profit_before_tax')}: ${formatMoneyWordsAndNumber(before, lang)}` },
      { text: `${t('finance.row_net_profit')}: ${formatMoneyWordsAndNumber(net, lang)}` },
      { heading: true, text: t('finance.explain_tax_section') },
      { text: t('finance.explain_entity', { entity: t('finance.entity_nonprofit_education') }) },
      { text: t('finance.explain_legal', { legal: t('finance.legal_nonprofit_education') }) },
      {
        text: t('finance.percent_explanation', {
          brt: toLocaleDigits(String(brt), lang),
          annual: toLocaleDigits(String(annual), lang),
          entity: t('finance.entity_nonprofit_education')
        })
      },
      { heading: true, text: t('finance.explain_profit_section') },
      { text: t('finance.explain_revenue') },
      { text: t('finance.explain_profit_before') },
      {
        text: t('finance.explain_net_profit', {
          before: formatMoneyWordsAndNumber(before, lang),
          tax: formatMoneyWordsAndNumber(totalTax, lang),
          net: formatMoneyWordsAndNumber(net, lang)
        })
      },
      { text: t('finance.explain_unpaid_note') },
      { text: t('finance.explain_salary_dedupe') }
    ];
  }, [data, lang, t]);

  const prepareOutput = async (outputType: 'print' | 'pdf' | 'excel') => {
    const record = await registerPrintRecord({
      documentType: 'academy_financial_report',
      outputType,
      title: t('finance.worksheet_title'),
      branchId: branchId || undefined,
      metadata: { reportType, hijriYear, hijriMonth, quarter, paymentStatus }
    });
    setPrintRecord(record);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    return true;
  };

  const runPrintSearch = async () => {
    setPrintHistory(await searchPrintRecords(printSearch, branchId || undefined));
  };

  return (
    <div className="space-y-6">
      <div className="no-print" data-no-print>
        <PageHeader title="common.academy_financial_report" description="finance.academy_financial_report_desc" />
      </div>

      <Card className="p-4 no-print" data-no-print>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Select
            value={reportType}
            onChange={(value) => setReportType(String(value) as any)}
            options={[
              { value: 'monthly', label: t('finance.report_monthly') },
              { value: 'quarterly', label: t('finance.report_quarterly') },
              { value: 'yearly', label: t('finance.report_yearly') }
            ]}
          />
          <Input value={hijriYear} onChange={(event) => setHijriYear(event.target.value)} placeholder={t('finance.hijri_year')} />
          {reportType === 'monthly' && (
            <Input value={hijriMonth} onChange={(event) => setHijriMonth(event.target.value)} placeholder={t('finance.hijri_month')} />
          )}
          {reportType === 'quarterly' && <Select value={quarter} onChange={(value) => setQuarter(String(value))} options={quarterOptions} />}
          <Select
            value={branchId}
            onChange={(value) => setBranchId(String(value))}
            options={[{ value: '', label: t('common.all_branches') }, ...(branches ?? []).map((b: any) => ({ value: String(b._id), label: b.name }))]}
          />
          <Select
            value={paymentStatus}
            onChange={(value) => setPaymentStatus(String(value))}
            options={[
              { value: 'all', label: t('finance.payment_status_all') },
              { value: 'paid', label: t('finance.payment_status_paid') },
              { value: 'due', label: t('finance.payment_status_due') }
            ]}
          />
        </div>
      </Card>

      <PrintableSection id="academy-financial-print-root" printRoot="academy-financial-report" className="academy-financial-print-sheet space-y-4" dir={pageDir}>
        <Card className="academy-financial-print-header border border-slate-300 bg-white p-3 text-slate-900">
          <div className="academy-financial-header-grid">
            <div className="academy-financial-header-title flex items-center gap-2">
              <div className="academy-financial-print-logo" aria-label="Nokta Academy">N</div>
              <div>
                <h1 className="text-base font-bold text-slate-900">{t('finance.worksheet_title')}</h1>
                <p className="text-[11px] text-slate-600">
                  {reportTypeLabel} | {toLocaleDigits(hijriYear, lang)}
                  {reportType === 'monthly' ? `/${toLocaleDigits(hijriMonth, lang)}` : ''}
                  {reportType === 'quarterly' ? ` | ${t(`common.quarter_${quarter}`)}` : ''}
                </p>
              </div>
            </div>
            <div className="academy-financial-header-serial text-[11px] text-slate-700">
              <LinearBarcode value={printRecord?.serialNumber || 'FIN-PENDING'} />
              <div className="academy-financial-serial-text">
                <p>{t('finance.document_number')}</p>
                <p>{printRecord?.serialNumber || t('finance.serial_pending')}</p>
              </div>
            </div>
            <div className="academy-financial-header-meta text-[11px] text-slate-700">
              <span>{t('finance.print_date')}: {formatJalaliDate(new Date(), i18n.resolvedLanguage)}</span>
              <span>{t('print.printed_by')}: {user?.name || '—'}</span>
            </div>
          </div>
        </Card>

        <Card className="worksheet-print-shell overflow-x-auto border-slate-300 p-4 print:rounded-none print:border print:bg-white print:p-3 print:text-slate-900">
          <h2 className="mb-4 text-start text-lg font-bold text-slate-900 dark:text-slate-100 print:text-slate-900">
            {t('finance.worksheet_title')}
          </h2>
          <table className="print-table academy-financial-data-table min-w-full border border-slate-300 text-center text-sm dark:border-slate-700 print:border-slate-300">
            <thead>
              <tr className={tableHeadClass}>
                <th className={tableBorderClass}>{t('finance.column_title')}</th>
                <th className={tableBorderClass}>{t('finance.column_amount')}</th>
                <th className={tableBorderClass}>{t('finance.column_source')}</th>
              </tr>
            </thead>
            <tbody>
              {(data?.tableRows ?? [])
                .filter((row: any) => row.key !== 'government_tax')
                .map((row: any) => (
                <tr key={row.key} className={getReportRowToneClass(row.key)} data-print-row data-financial-tone={row.key}>
                  <td className={`${tableCellClass} font-medium`}>{translateReportRowLabel(t, row)}</td>
                  <td className={tableCellClass}>
                    <span
                      dir={['quarterly_tax', 'annual_tax', 'small_taxes', 'net_profit'].includes(row.key) ? pageDir : 'ltr'}
                      style={row.key === 'net_profit' ? { color: Number(row.value || 0) < 0 ? '#b91c1c' : '#15803d' } : undefined}
                      className={`inline-block text-center tabular-nums ${
                        Number(row.value || 0) < 0 && row.key === 'net_profit'
                          ? 'text-rose-700 dark:text-rose-300'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {formatLocalizedReportRowValue(row, lang, t, data?.taxRates)}
                    </span>
                  </td>
                  <td className={tableCellClass}>{translateReportRowSource(t, row, lang)}</td>
                </tr>
              ))}
              {isLoading && (
                <tr>
                  <td colSpan={3} className={`${tableBorderClass} py-4 text-center text-slate-500 dark:text-slate-400`}>
                    {t('common.loading')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {data?.totalsFooter && (
            <div className="mt-4 grid gap-2 rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-900/40 print:bg-white">
              <p className="text-start font-bold text-slate-900 dark:text-slate-100">{t('finance.summary_footer')}</p>
              <div className="grid gap-1 md:grid-cols-2">
                <p className="text-start text-slate-700 dark:text-slate-300">
                  {t('finance.student_payment_revenue')}:{' '}
                  <span dir="ltr">{formatAccountingCurrency(Number(data.totalsFooter.studentRevenue || 0), lang)}</span>
                </p>
                <p className="text-start text-slate-700 dark:text-slate-300">
                  {t('finance.book_sales_revenue')}:{' '}
                  <span dir="ltr">{formatAccountingCurrency(Number(data.totalsFooter.bookSales || 0), lang)}</span>
                </p>
                <p className="text-start font-semibold text-sky-800 dark:text-sky-300">
                  {t('finance.total_revenue')}:{' '}
                  <span dir="ltr">{formatAccountingCurrency(Number(data.totalsFooter.totalRevenue || 0), lang)}</span>
                </p>
                <p className="text-start text-slate-700 dark:text-slate-300">
                  {t('finance.total_expenses')}:{' '}
                  <span dir="ltr">{formatAccountingCurrency(Number(data.totalsFooter.totalExpenses || 0), lang)}</span>
                </p>
                <p className="text-start text-slate-700 dark:text-slate-300">
                  {t('finance.employee_salaries')}:{' '}
                  <span dir="ltr">{formatAccountingCurrency(Number(data.totalsFooter.paidSalaries || 0), lang)}</span>
                </p>
                <p className="text-start text-slate-700 dark:text-slate-300">
                  {t('finance.unpaid_employee_salaries')}:{' '}
                  <span dir="ltr">{formatAccountingCurrency(Number(data.totalsFooter.pendingSalaries || 0), lang)}</span>
                </p>
                <p className="text-start text-slate-700 dark:text-slate-300">
                  {t('finance.loan_outstanding')}:{' '}
                  <span dir="ltr">{formatAccountingCurrency(Number(data.totalsFooter.outstandingLoans || 0), lang)}</span>
                </p>
                <p className="text-start text-slate-700 dark:text-slate-300">
                  {t('finance.academy_small_tax')}:{' '}
                  <span dir="ltr" className="font-medium">{formatAccountingCurrency(Number(data.totalsFooter.academyTaxes || 0), lang)}</span>
                </p>
                <p className="text-start font-bold text-emerald-800 dark:text-emerald-300">
                  {t('finance.net_profit')}:{' '}
                  <span dir="ltr">{formatAccountingCurrency(Number(data.totalsFooter.netProfit || 0), lang)}</span>
                </p>
              </div>
            </div>
          )}
          <p className="academy-financial-page-footer academy-financial-page-one-footer mt-2 border-t border-slate-300 pt-1 text-center text-[10px] font-semibold text-slate-700">{toLocaleDigits('1', lang)}</p>
        </Card>

        <Card className="academy-financial-print-page-two space-y-2 border-slate-300 p-4 print:border print:bg-white print:p-3 print:text-slate-900">
          <div className="flex items-center justify-between border-b border-slate-300 pb-2 text-xs text-slate-700">
            <LinearBarcode value={printRecord?.serialNumber || 'FIN-PENDING'} />
            <span className="text-start">
              {t('finance.print_serial_line', {
                serial: printRecord?.serialNumber || t('finance.serial_pending'),
                printer: user?.name || '—'
              })}
              <br />
              {t('finance.print_date_line', {
                date: formatJalaliDate(new Date(), lang),
                type: reportTypeLabel,
                period: reportType === 'monthly'
                  ? `${toLocaleDigits(hijriYear, lang)}/${toLocaleDigits(hijriMonth, lang)}`
                  : toLocaleDigits(hijriYear, lang)
              })}
            </span>
          </div>
          <p className="text-start text-sm font-bold text-slate-900 dark:text-slate-100 print:text-slate-900">
            {t('finance.calculation_notes')}
          </p>
          <p className="text-start text-xs text-slate-500 dark:text-slate-400 print:text-slate-600">
            {t('finance.page2_tax_hint')}
          </p>
          {localizedExplanations.map((item) => (
            <p
              key={item.text}
              className={`text-start text-sm print:text-slate-700 ${
                item.heading
                  ? 'mt-3 font-bold text-slate-900 dark:text-slate-100'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {item.heading ? item.text : `- ${item.text}`}
            </p>
          ))}
          <div className="mt-8 border-t border-slate-300 pt-5">
            <FinancialPrintChart
              totals={data?.totalsFooter}
              language={lang}
              labels={{
                revenue: t('finance.chart_revenue'),
                expenses: t('finance.chart_expenses'),
                salaries: t('finance.chart_salaries'),
                tax: t('finance.chart_tax'),
                net: t('finance.chart_net_profit'),
                title: t('finance.chart_title')
              }}
            />
          </div>
          <p className="academy-financial-page-footer academy-financial-page-two-footer mt-3 border-t border-slate-300 pt-1 text-center text-[10px] font-semibold text-slate-700">{toLocaleDigits('2', lang)}</p>
        </Card>

        <Card className="border-slate-300 bg-white p-2">
          <p className="text-center text-[11px] text-slate-700">Nokta Academy • Financial Worksheet • A4 Print Layout</p>
        </Card>
      </PrintableSection>

      <div className="flex flex-wrap gap-2 no-print" data-no-print>
        <ExportButtons
          targetId="academy-financial-print-root"
          title={t('finance.worksheet_title')}
          fileName="academy-financial-report"
          orientation="portrait"
          disabled={isLoading || !(data?.tableRows?.length)}
          beforeExport={(format) => prepareOutput(format)}
        />
        <PrintButton
          targetId="academy-financial-print-root"
          title={t('finance.worksheet_title')}
          label={t('finance.print_report')}
          orientation="portrait"
          disabled={isLoading || !(data?.tableRows?.length)}
          beforePrint={() => prepareOutput('print')}
        />
      </div>
      <Card className="space-y-3 p-4 no-print" data-no-print>
        <p className="font-semibold text-slate-900 dark:text-slate-100">{t('finance.print_search_title')}</p>
        <div className="flex flex-wrap gap-2">
          <Input value={printSearch} onChange={(event) => setPrintSearch(event.target.value)} placeholder={t('finance.print_search_placeholder')} />
          <button type="button" className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => void runPrintSearch()}>
            {t('finance.search')}
          </button>
        </div>
        {printHistory.map((record) => (
          <p key={record.serialNumber} className="text-sm text-slate-700 dark:text-slate-300">
            {record.serialNumber} — {record.title} — {record.outputType}
          </p>
        ))}
      </Card>
    </div>
  );
}
