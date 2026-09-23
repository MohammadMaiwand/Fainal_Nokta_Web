import { Router } from 'express';
import Joi from 'joi';
import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { createResponse } from '../../helpers/response';
import { Student } from '../../models/Student';
import { Payment } from '../../models/Payment';
import { Expense } from '../../models/Expense';
import { Branch } from '../../models/Branch';
import { StationerySale } from '../../models/StationerySale';
import { SalaryRecord } from '../../models/SalaryRecord';
import { Loan } from '../../models/Loan';
import { getHijriYearMonth } from '../../services/afghanistanSalaryTaxService';
import { ensureSalaryRecordsForPeriod } from '../../services/payrollCalculation.service';
import { resolveAcademyTaxSetting, calculateNonprofitEducationAcademyTax } from '../../services/afghanistanAcademyTaxService';
import { formatMoneyWordsAndNumber, formatTaxRateAndAmountDisplay } from '../../utils/dariNumberWords';

const router = Router();

function formatAccounting(value: number) {
  const amount = Number(value || 0);
  const abs = Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return amount < 0 ? `(${abs})` : abs;
}

function buildDocumentNumber(filters: { reportType: string; hijriYear: number; hijriMonth?: number | null; quarter?: number | null }) {
  const type = filters.reportType === 'monthly' ? 'M' : filters.reportType === 'quarterly' ? 'Q' : 'Y';
  const period = filters.reportType === 'monthly'
    ? `${filters.hijriYear}-${String(filters.hijriMonth || 0).padStart(2, '0')}`
    : filters.reportType === 'quarterly'
      ? `${filters.hijriYear}-Q${filters.quarter || 0}`
      : `${filters.hijriYear}`;
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AFR-${type}-${period}-${random}`;
}

function resolveAcademyLogoPath() {
  const publicDir = path.resolve(process.cwd(), '../frontend/public');
  const candidates = ['academy-logo.png', 'academy-logo.jpg', 'academy-logo.jpeg'];
  for (const fileName of candidates) {
    const fullPath = path.join(publicDir, fileName);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

const querySchema = Joi.object({
  query: Joi.object({
    reportType: Joi.string().valid('monthly', 'quarterly', 'yearly').required(),
    hijriYear: Joi.number().required(),
    hijriMonth: Joi.number().min(1).max(12).optional(),
    quarter: Joi.number().min(1).max(4).optional(),
    branchId: Joi.string().hex().length(24).optional(),
    paymentStatus: Joi.string().valid('all', 'paid', 'due').optional(),
    format: Joi.string().valid('excel', 'pdf').optional()
  })
});

function quarterMonths(quarter: number) {
  if (quarter === 1) return [1, 2, 3];
  if (quarter === 2) return [4, 5, 6];
  if (quarter === 3) return [7, 8, 9];
  return [10, 11, 12];
}

function includeByPeriod(reportType: string, year: number, month: number, targetMonth?: number, quarter?: number) {
  if (reportType === 'yearly') return year === Number(year);
  if (reportType === 'monthly') return year === Number(year) && month === Number(targetMonth);
  const months = quarterMonths(Number(quarter || 1));
  return year === Number(year) && months.includes(month);
}

function normalizeCategory(input: string) {
  return String(input || '').trim().toLowerCase();
}

function isLegacySalaryExpense(item: { category?: string; title?: string }) {
  const category = normalizeCategory(item.category || '');
  const title = normalizeCategory(item.title || '');
  return category === 'salary' || category === 'معاش' || title === 'salary' || title === 'معاش';
}

function isLoanCashFlow(item: { category?: string }) {
  const category = normalizeCategory(item.category || '');
  return category === 'loan_disbursement' || category === 'loan_repayment';
}

export async function buildAcademyFinancialReport(query: any, user: any) {
  const reportType = String(query.reportType);
  const hijriYear = Number(query.hijriYear);
  const hijriMonth = query.hijriMonth ? Number(query.hijriMonth) : undefined;
  const quarter = query.quarter ? Number(query.quarter) : undefined;
  const paymentStatus = String(query.paymentStatus || 'paid');
  const branchId = user?.canonicalRole === 'admin' || user?.canonicalRole === 'branch_manager'
    ? (user?.branchId ?? null)
    : (query.branchId ? String(query.branchId) : null);

  // Recalculate payroll before reporting so a newly enrolled student immediately
  // affects the assigned teacher's accrued salary for the same Hijri period.
  const reportMonths = reportType === 'monthly'
    ? [Number(hijriMonth)]
    : reportType === 'quarterly'
      ? quarterMonths(Number(quarter || 1))
      : Array.from({ length: 12 }, (_, index) => index + 1);
  await Promise.all(
    reportMonths.map((month) =>
      ensureSalaryRecordsForPeriod({
        hijriYear,
        hijriMonth: month,
        branchId: branchId ? String(branchId) : undefined,
        actorId: user?.userId ?? null,
        allowAllSystemScope: user?.canonicalRole === 'super_admin'
      })
    )
  );

  const [students, payments, expenses, stationerySales, salaryRecords, loans, branch, taxSetting] = await Promise.all([
    Student.find({ isDeleted: false, status: 'active', ...(branchId ? { branchId } : {}) })
      .select('_id branchId registrationDate feeAmount')
      .lean<any[]>(),
    Payment.find({
      isDeleted: false,
      ...(branchId ? { branchId } : {}),
      paymentFor: { $in: ['student_fee', 'teacher_salary', 'manager_salary'] },
      status: paymentStatus === 'due' ? { $in: ['pending'] } : paymentStatus === 'all' ? { $nin: ['cancelled', 'refunded', 'reversed'] } : { $in: ['paid', 'completed', 'partially_paid'] }
    }).select('studentId amount netAmount paymentDate status paymentFor taxAmount').lean<any[]>(),
    Expense.find({ isDeleted: false, ...(branchId ? { branchId } : {}) }).select('amount date category title').lean<any[]>(),
    StationerySale.find({
      isDeleted: false,
      paymentStatus: { $in: ['paid', 'partial'] },
      ...(branchId ? { branchId } : {})
    }).select('totalAmount paidAmount saleDate paymentStatus').lean<any[]>(),
    SalaryRecord.find({ isDeleted: false, ...(branchId ? { branchId } : {}) })
      .select('hijriYear hijriMonth grossSalary netSalary taxAmount paidAmount')
      .lean<any[]>(),
    Loan.find({
      isDeleted: false,
      status: { $in: ['active', 'partially_repaid', 'overdue', 'approved'] },
      ...(branchId ? { branchId } : {})
    }).select('remainingAmount originalAmount repaidAmount status loanDate').lean<any[]>(),
    branchId ? Branch.findById(branchId).select('name code').lean<any>() : Promise.resolve(null),
    resolveAcademyTaxSetting(branchId)
  ]);

  const filteredStudents = students.filter((student) => {
    const { year, month } = getHijriYearMonth(student.registrationDate);
    if (reportType === 'yearly') return year === hijriYear;
    if (reportType === 'monthly') return year === hijriYear && month === hijriMonth;
    return year === hijriYear && quarterMonths(Number(quarter || 1)).includes(month);
  });

  const paymentIsInPeriod = (payment: any) => {
    const { year, month } = getHijriYearMonth(payment.paymentDate);
    if (reportType === 'yearly') return year === hijriYear;
    if (reportType === 'monthly') return year === hijriYear && month === hijriMonth;
    return year === hijriYear && quarterMonths(Number(quarter || 1)).includes(month);
  };

  const filteredStudentPayments = payments.filter((payment) => payment.paymentFor === 'student_fee' && payment.studentId && paymentIsInPeriod(payment));
  const filteredSalaryPayments = payments.filter(
    (payment) => (payment.paymentFor === 'teacher_salary' || payment.paymentFor === 'manager_salary') && paymentIsInPeriod(payment)
  );
  const filteredSalaryRecords = salaryRecords.filter((record) => {
    if (reportType === 'yearly') return Number(record.hijriYear) === hijriYear;
    if (reportType === 'monthly') return Number(record.hijriYear) === hijriYear && Number(record.hijriMonth) === hijriMonth;
    return Number(record.hijriYear) === hijriYear && quarterMonths(Number(quarter || 1)).includes(Number(record.hijriMonth));
  });
  const filteredBookSales = stationerySales.filter((sale) => {
    const { year, month } = getHijriYearMonth(sale.saleDate);
    if (reportType === 'yearly') return year === hijriYear;
    if (reportType === 'monthly') return year === hijriYear && month === hijriMonth;
    return year === hijriYear && quarterMonths(Number(quarter || 1)).includes(month);
  });

  const filteredExpenses = expenses.filter((expense) => {
    if (normalizeCategory(expense.category) === 'income' || isLoanCashFlow(expense) || isLegacySalaryExpense(expense)) return false;
    const { year, month } = getHijriYearMonth(expense.date);
    if (reportType === 'yearly') return year === hijriYear;
    if (reportType === 'monthly') return year === hijriYear && month === hijriMonth;
    return year === hijriYear && quarterMonths(Number(quarter || 1)).includes(month);
  });

  const totalStudents = students.length;
  const activeStudentsCount = filteredStudents.length;
  const payingStudentSet = new Set(filteredStudentPayments.map((payment) => String(payment.studentId)));
  const payingStudentsCount = payingStudentSet.size;

  // Unified cash formula:
  // Revenue = paid student fees + book sales
  // Deductions = operating expenses (no Salary double-count) + paid salaries + academy small tax
  const studentRevenue = filteredStudentPayments.reduce((sum, payment) => sum + Number(payment.netAmount ?? payment.amount ?? 0), 0);
  const assignedStudentFees = filteredStudents.reduce((sum, student) => sum + Number(student.feeAmount || 0), 0);
  const bookRevenue = filteredBookSales.reduce((sum, sale) => sum + Number(sale.totalAmount ?? sale.paidAmount ?? 0), 0);
  const totalRevenue = studentRevenue + bookRevenue;

  const paidSalaries = filteredSalaryPayments.reduce((sum, payment) => sum + Number(payment.netAmount ?? payment.amount ?? 0), 0);
  const salaryNetPayable = filteredSalaryRecords.reduce((sum, record) => sum + Number(record.netSalary || 0), 0);
  const teacherWageTax = filteredSalaryRecords.reduce((sum, record) => sum + Number(record.taxAmount || 0), 0);
  const accruedSalaries = filteredSalaryRecords.reduce((sum, record) => sum + Number(record.grossSalary || 0), 0);
  const recordPaidSalaries = filteredSalaryRecords.reduce((sum, record) => sum + Number(record.paidAmount || 0), 0);
  // معاش پرداخت‌نشده = خالص قابل پرداخت دوره − مبلغ پرداخت‌شده ثبت‌شده در رکورد معاش
  const pendingSalaries = Math.max(0, Number((salaryNetPayable - recordPaidSalaries).toFixed(2)));

  // قرض‌داران: مجموع باقی‌مانده قرض‌هایی که هنوز جمع‌آوری نشده (به مفاد خالص اضافه/کم نمی‌شود)
  const outstandingLoans = Number(
    loans
      .reduce((sum, loan) => sum + Math.max(0, Number(loan.remainingAmount || 0)), 0)
      .toFixed(2)
  );

  const brtRate = Number(taxSetting.brtRate ?? taxSetting.quarterlyRate);
  const annualIncomeTaxRate = Number(taxSetting.annualIncomeTaxRate ?? taxSetting.annualRate);
  const taxSourceLabel = taxSetting.sourceLabelDari;
  const percentageExplanation = taxSetting.percentageExplanationDari;

  const academyTax = calculateNonprofitEducationAcademyTax({
    studentRevenue,
    brtRate,
    annualIncomeTaxRate
  });
  const quarterlyTax = academyTax.quarterlyTax;
  const annualTax = academyTax.annualTax;
  const quarterlyRate = academyTax.appliedBrtPercent;
  const annualRate = academyTax.appliedAnnualIncomeTaxPercent;

  const rentAmount = filteredExpenses
    .filter((item) => normalizeCategory(item.category) === 'کرایه' || normalizeCategory(item.title) === 'کرایه')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const electricityAmount = filteredExpenses
    .filter((item) => normalizeCategory(item.category) === 'بل برق' || normalizeCategory(item.title) === 'بل برق')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const otherExpenses = filteredExpenses
    .filter((item) => {
      const category = normalizeCategory(item.category);
      const title = normalizeCategory(item.title);
      return category !== 'کرایه' && category !== 'بل برق' && title !== 'کرایه' && title !== 'بل برق';
    })
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totalExpenses = rentAmount + electricityAmount + otherExpenses;
  const totalSmallTaxes = academyTax.totalAcademyTax;
  const totalGovernmentTaxes = totalSmallTaxes + teacherWageTax;
  // مفاد قبل از مالیه، سپس کسر صریح مالیه اکادمی از مفاد خالص
  const profitBeforeTax = Number((totalRevenue - totalExpenses - paidSalaries).toFixed(2));
  const totalDeductions = totalExpenses + paidSalaries + totalSmallTaxes;
  const netProfit = Number((profitBeforeTax - totalSmallTaxes).toFixed(2));

  const formatRate = (value: number) =>
    Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

  const governmentTaxSource =
    'ماده ۱۰ قانون مالیات بر عایدات ۱۳۸۸ + راهنمای BRT وزارت مالیه افغانستان';

  // جدول: فقط عددی — توضیحات: حروفی + عددی
  const quarterlyTaxNumeric = `${formatRate(quarterlyRate)}% — ${formatAccounting(quarterlyTax)}`;
  const annualTaxNumeric = `${formatRate(annualRate)}% — ${formatAccounting(annualTax)}`;
  const quarterlyTaxDisplay = formatTaxRateAndAmountDisplay(quarterlyRate, quarterlyTax);
  const annualTaxDisplay = formatTaxRateAndAmountDisplay(annualRate, annualTax);
  const totalTaxDisplay = formatMoneyWordsAndNumber(totalSmallTaxes);
  const netProfitDisplay = formatMoneyWordsAndNumber(netProfit);

  // ورق دوم: مقادیر به حروف و عدد + توضیحات مالیه و محاسبات
  const explanations = [
    '—— مقادیر به حروف و عدد ——',
    `مجموع عواید شاگردان: ${formatMoneyWordsAndNumber(studentRevenue)}`,
    `فروش کتاب: ${formatMoneyWordsAndNumber(bookRevenue)}`,
    `مجموع عواید: ${formatMoneyWordsAndNumber(totalRevenue)}`,
    `مجموع مصارف: ${formatMoneyWordsAndNumber(totalExpenses)}`,
    `معاش کارمندان: ${formatMoneyWordsAndNumber(paidSalaries)}`,
    `معاش پرداخت‌نشده کارمندان: ${formatMoneyWordsAndNumber(pendingSalaries)}`,
    `قرض‌داران (باقی‌مانده قرض): ${formatMoneyWordsAndNumber(outstandingLoans)}`,
    `مالیه ربع‌وار: ${quarterlyTaxDisplay}`,
    `مالیه سالانه: ${annualTaxDisplay}`,
    `مجموع مالیات: ${totalTaxDisplay}`,
    `مفاد قبل از مالیه: ${formatMoneyWordsAndNumber(profitBeforeTax)}`,
    `مفاد خالص: ${netProfitDisplay}`,
    '—— توضیحات مالیات ——',
    `نوع نهاد: ${taxSetting.entityTypeDari}`,
    `مبنای قانونی کامل: ${taxSetting.legalBasisDari}`,
    percentageExplanation,
    '—— نحوه محاسبه مفاد ——',
    'عواید = پرداخت‌های تاییدشده شاگرد + فروش کتاب',
    'مفاد قبل از مالیه = مجموع عواید − (مجموع مصارف + معاش پرداخت‌شده کارمندان)',
    `مفاد خالص = مفاد قبل از مالیه (${formatMoneyWordsAndNumber(profitBeforeTax)}) − مجموع مالیات (${totalTaxDisplay}) = ${netProfitDisplay}`,
    'معاش پرداخت‌نشده کارمندان و قرض‌داران فقط برای اطلاع است و از مفاد خالص کم نمی‌شود',
    'دسته معاش در مصارف حذف می‌شود تا با پرداخت معاش دوبار شمرده نشود'
  ];

  const tableRows = [
    { key: 'active_students', label: 'تعداد کل شاگردان فعال', value: activeStudentsCount, valueType: 'count', source: 'شاگردان', sourceKey: 'students' },
    { key: 'paying_students', label: 'تعداد شاگردان پرداخت‌کننده', value: payingStudentsCount, valueType: 'count', source: 'پرداخت‌ها', sourceKey: 'payments' },
    { key: 'student_revenue', label: 'مجموع عواید شاگردان', value: studentRevenue, valueType: 'currency', source: 'پرداخت‌ها', sourceKey: 'payments' },
    { key: 'book_revenue', label: 'فروش کتاب', value: bookRevenue, valueType: 'currency', source: 'فروش کتاب', sourceKey: 'book_sales' },
    { key: 'total_revenue', label: 'مجموع عواید', value: totalRevenue, valueType: 'currency', source: 'محاسبه‌شده', sourceKey: 'calculated' },
    { key: 'rent', label: 'کرایه', value: rentAmount, valueType: 'currency', source: 'مصارف', sourceKey: 'expenses' },
    { key: 'electricity', label: 'بل برق', value: electricityAmount, valueType: 'currency', source: 'مصارف', sourceKey: 'expenses' },
    { key: 'other_expenses', label: 'مصارف متفرقه', value: otherExpenses, valueType: 'currency', source: 'مصارف', sourceKey: 'expenses' },
    { key: 'total_expenses', label: 'مجموع مصارف', value: totalExpenses, valueType: 'currency', source: 'محاسبه‌شده', sourceKey: 'calculated' },
    { key: 'paid_salaries', label: 'معاش کارمندان', value: paidSalaries, valueType: 'currency', source: 'پرداخت‌ها', sourceKey: 'payments' },
    { key: 'unpaid_salaries', label: 'معاش پرداخت‌نشده کارمندان', value: pendingSalaries, valueType: 'currency', source: 'رکورد معاش', sourceKey: 'salary_records' },
    { key: 'outstanding_loans', label: 'قرض‌داران (باقی‌مانده قرض)', value: outstandingLoans, valueType: 'currency', source: 'قرض‌ها', sourceKey: 'loans' },
    {
      key: 'quarterly_tax',
      label: 'مالیه ربع‌وار',
      value: quarterlyTax,
      rate: quarterlyRate,
      displayValue: quarterlyTaxNumeric,
      valueType: 'text',
      source: `${formatRate(quarterlyRate)}٪`,
      sourceKey: 'calculated'
    },
    {
      key: 'annual_tax',
      label: 'مالیه سالانه',
      value: annualTax,
      rate: annualRate,
      displayValue: annualTaxNumeric,
      valueType: 'text',
      source: `${formatRate(annualRate)}٪`,
      sourceKey: 'calculated'
    },
    {
      key: 'small_taxes',
      label: 'مجموع مالیات',
      value: totalSmallTaxes,
      valueType: 'currency',
      source: 'محاسبه‌شده',
      sourceKey: 'calculated'
    },
    {
      key: 'net_profit',
      label: 'مفاد خالص (بعد از کسر مالیات)',
      value: netProfit,
      valueType: 'currency',
      source: 'محاسبه‌شده',
      sourceKey: 'calculated'
    }
  ];

  return {
    filters: { reportType, hijriYear, hijriMonth: hijriMonth ?? null, quarter: quarter ?? null, branchId, paymentStatus },
    period: { reportType, hijriYear, hijriMonth: hijriMonth ?? null, quarter: quarter ?? null },
    branch: branch ? { id: String(branch._id), name: branch.name ?? branch.code ?? '' } : null,
    studentCounts: {
      totalActiveStudents: activeStudentsCount,
      totalStudentsAllScope: totalStudents,
      payingStudents: payingStudentsCount
    },
    revenue: {
      totalAssignedStudentFees: assignedStudentFees,
      totalConfirmedStudentPayments: studentRevenue,
      bookSales: bookRevenue,
      totalRevenue
    },
    taxRates: {
      quarterlyRate,
      annualRate,
      brtRate: quarterlyRate,
      annualIncomeTaxRate: annualRate,
      monthlyQuarterlyEnabled: true,
      showAnnualEstimatedShare: true,
      entityTypeDari: taxSetting.entityTypeDari,
      legalBasisDari: taxSetting.legalBasisDari,
      percentageExplanationDari: percentageExplanation
    },
    taxAmounts: {
      quarterlyTax,
      annualTax,
      totalAcademyTax: totalSmallTaxes,
      taxConfigured: true,
      quarterlyTaxApplied: true,
      annualTaxApplied: true,
      governmentTaxSource,
      quarterlyTaxDisplay,
      annualTaxDisplay,
      totalTaxDisplay,
      netProfitDisplay,
      percentageExplanation,
      sourceLabelDari: taxSourceLabel,
      warning: ''
    },
    profitBeforeTax,
    expenses: {
      rent: rentAmount,
      electricity: electricityAmount,
      otherExpenses,
      totalExpenses
    },
    salaries: { accruedSalaries, salaryNetPayable, teacherWageTax, paidSalaries, pendingSalaries },
    loans: { outstandingLoans, debtorCount: loans.length },
    deductions: {
      totalSmallTaxes,
      teacherWageTax,
      totalGovernmentTaxes,
      totalDeductions
    },
    netProfit,
    explanations,
    tableRows,
    totalsFooter: {
      totalRevenue,
      studentRevenue,
      bookSales: bookRevenue,
      totalTaxes: totalSmallTaxes,
      academyTaxes: totalSmallTaxes,
      teacherWageTax,
      totalExpenses,
      paidSalaries,
      pendingSalaries,
      outstandingLoans,
      accruedSalaries,
      profitBeforeTax,
      totalDeductions,
      netProfit
    }
  };
}

router.get('/', validate(querySchema), authenticate, authorize(['super_admin', 'admin', 'branch_manager', 'owner']), async (req, res, next) => {
  try {
    const report = await buildAcademyFinancialReport(req.query, req.user);
    res.json(createResponse(report));
  } catch (error) {
    next(error);
  }
});

router.get('/export', validate(querySchema), authenticate, authorize(['super_admin', 'admin', 'branch_manager', 'owner']), async (req, res, next) => {
  try {
    const format = String(req.query.format || 'excel');
    const report = await buildAcademyFinancialReport(req.query, req.user);

    if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="academy-financial-report.pdf"');
      doc.pipe(res);
      const documentNo = buildDocumentNumber(report.filters);
      const printedAt = new Intl.DateTimeFormat('fa-AF-u-ca-persian', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date());

      // Draw academy logo mark (real logo if available)
      const logoX = 35;
      const logoY = 28;
      const logoPath = resolveAcademyLogoPath();
      if (logoPath) {
        doc.image(logoPath, logoX, logoY, { fit: [32, 32], align: 'center', valign: 'center' });
      } else {
        doc.save();
        doc.circle(logoX + 16, logoY + 14, 14).fill('#0ea5e9');
        doc.fillColor('#ffffff').fontSize(14).text('N', logoX + 11, logoY + 7);
        doc.restore();
      }

      doc.fontSize(16).fillColor('#0f172a').text('ورق گزارش مالی اکادمی', 70, 28, { align: 'right' });
      doc.fontSize(10).fillColor('#334155').text(
        `نوع گزارش: ${report.filters.reportType} | سال: ${report.filters.hijriYear}` +
        `${report.filters.hijriMonth ? ` | ماه: ${report.filters.hijriMonth}` : ''}` +
        `${report.filters.quarter ? ` | ربع: ${report.filters.quarter}` : ''}`,
        70,
        48,
        { align: 'right' }
      );
      doc.fontSize(9).fillColor('#475569').text(`شماره سند: ${documentNo}`, 70, 62, { align: 'right' });
      doc.fontSize(9).fillColor('#475569').text(`تاریخ چاپ: ${printedAt}`, 70, 74, { align: 'right' });
      doc.moveDown(1.2);

      const startX = 35;
      const colTitle = 270;
      const colValue = 150;
      const colSource = 120;
      let y = doc.y;

      const drawCell = (x: number, top: number, width: number, height: number, text: string, fill?: string, align: 'right' | 'center' = 'right', color = '#0f172a') => {
        if (fill) {
          doc.save().rect(x, top, width, height).fill(fill).restore();
        }
        doc.rect(x, top, width, height).stroke('#334155');
        doc.fillColor(color).fontSize(9).text(text, x + 6, top + 6, {
          width: width - 12,
          align
        });
      };

      const rowHeight = 26;
      drawCell(startX, y, colTitle, rowHeight, 'عنوان', '#e2e8f0', 'center');
      drawCell(startX + colTitle, y, colValue, rowHeight, 'مقدار', '#e2e8f0', 'center');
      drawCell(startX + colTitle + colValue, y, colSource, rowHeight, 'منبع', '#e2e8f0', 'center');
      y += rowHeight;

      report.tableRows
        .filter((row: any) => row.key !== 'government_tax')
        .forEach((row: any) => {
        let bg = '';
        if (row.key === 'net_profit') bg = '#dcfce7';
        if (row.key === 'total_expenses' || row.key === 'small_taxes' || row.key === 'paid_salaries' || row.key === 'unpaid_salaries' || row.key === 'outstanding_loans') bg = '#fee2e2';
        if (row.key === 'total_revenue') bg = '#e0f2fe';
        if (row.key === 'quarterly_tax' || row.key === 'annual_tax') bg = '#fef9c3';
        const displayText = row.displayValue != null
          ? String(row.displayValue)
          : row.valueType === 'count'
            ? String(row.value ?? 0)
            : formatAccounting(Number(row.value || 0));
        const isNegative = Number(row.value || 0) < 0 && row.key === 'net_profit';
        const thisRowHeight = displayText.length > 42 ? 40 : rowHeight;
        drawCell(startX, y, colTitle, thisRowHeight, row.label, bg, 'center');
        drawCell(startX + colTitle, y, colValue, thisRowHeight, displayText, bg, 'center', isNegative ? '#b91c1c' : '#0f172a');
        drawCell(startX + colTitle + colValue, y, colSource, thisRowHeight, row.source, bg, 'center');
        y += thisRowHeight;
      });

      y += 12;
      const drawTotalRow = (label: string, value: number | string, color: string) => {
        const text = typeof value === 'string' ? value : formatAccounting(value);
        const height = text.length > 42 ? 40 : rowHeight;
        drawCell(startX, y, colTitle, height, label, color, 'center');
        drawCell(
          startX + colTitle,
          y,
          colValue,
          height,
          text,
          color,
          'center',
          typeof value === 'number' && value < 0 ? '#b91c1c' : '#0f172a'
        );
        drawCell(startX + colTitle + colValue, y, colSource, height, '', color, 'center');
        y += height;
      };

      drawTotalRow('مجموع عواید شاگردان', report.totalsFooter.studentRevenue ?? 0, '#dbeafe');
      drawTotalRow('فروش کتاب', report.totalsFooter.bookSales ?? 0, '#dbeafe');
      drawTotalRow('مجموع عواید', report.totalsFooter.totalRevenue, '#bfdbfe');
      drawTotalRow('مجموع مصارف', report.totalsFooter.totalExpenses, '#fee2e2');
      drawTotalRow('معاش کارمندان', report.totalsFooter.paidSalaries, '#ede9fe');
      drawTotalRow('معاش پرداخت‌نشده کارمندان', report.totalsFooter.pendingSalaries ?? 0, '#fef3c7');
      drawTotalRow('قرض‌داران (باقی‌مانده قرض)', report.totalsFooter.outstandingLoans ?? 0, '#ffedd5');
      drawTotalRow('مجموع مالیات', report.totalsFooter.academyTaxes ?? report.totalsFooter.totalTaxes ?? 0, '#fef3c7');
      drawTotalRow('مفاد خالص (بعد از کسر مالیات)', report.totalsFooter.netProfit ?? 0, '#dcfce7');

      y += 14;
      doc.fontSize(11).fillColor('#0f172a').text('توضیحات محاسبات', startX, y, { align: 'right', width: colTitle + colValue + colSource });
      y += 18;
      report.explanations.forEach((text: string) => {
        doc.fontSize(9).fillColor('#334155').text(`- ${text}`, startX, y, { align: 'right', width: colTitle + colValue + colSource });
        y += 16;
      });

      // Footer (fixed style)
      const footerY = doc.page.height - 32;
      doc.moveTo(35, footerY - 6).lineTo(doc.page.width - 35, footerY - 6).stroke('#cbd5e1');
      doc.fontSize(8).fillColor('#475569').text('Nokta Academy • Financial Worksheet • Confidential', 35, footerY, {
        width: doc.page.width - 70,
        align: 'center'
      });
      doc.end();
      return;
    }

    const rows = report.tableRows
      .filter((row: any) => row.key !== 'government_tax')
      .map((row: any) => [
      row.label,
      row.displayValue != null ? row.displayValue : row.value,
      row.source
    ]);
    const csv = [['عنوان', 'مقدار', 'منبع'], ...rows]
      .map((row) => row.map((col) => `"${String(col ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="academy-financial-report.csv"');
    res.send(`\uFEFF${csv}`);
  } catch (error) {
    next(error);
  }
});

export const academyFinancialReportRouter = router;
