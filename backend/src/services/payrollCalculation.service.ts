import { Payment } from '../models/Payment';
import { SalaryRecord } from '../models/SalaryRecord';
import { SalarySetting } from '../models/SalarySetting';
import { Student } from '../models/Student';
import { User } from '../models/User';
import { calculateAfghanistanSalaryTax, getHijriYearMonth } from './afghanistanSalaryTaxService';
import {
  calculatePayrollGross,
  roundMoney
} from './financialCalculationEngine';

export type CommissionScopeKind = 'teacher_assigned_students' | 'branch_all_students' | 'system_all_students';

type EmployeeSalarySource = {
  _id: any;
  role?: string;
  branchId?: any;
  salaryType?: string | null;
  fixedSalary?: number | null;
  percentageRate?: number | null;
  customPercentage?: number | null;
};

export function resolveSalarySettingRole(userRole?: string | null): 'teacher' | 'admin' | 'manager' {
  if (userRole === 'teacher') return 'teacher';
  if (userRole === 'admin') return 'admin';
  return 'manager';
}

/**
 * Keep payroll SalarySetting in sync with the salary fields stored on User
 * (set when creating/editing a teacher or employee account).
 */
export async function syncSalarySettingFromEmployee(args: {
  user: EmployeeSalarySource;
  actorId?: string | null;
}) {
  const role = resolveSalarySettingRole(args.user.role);
  const salaryType =
    args.user.salaryType === 'percentage' || args.user.salaryType === 'fixed_plus_percentage' || args.user.salaryType === 'fixed'
      ? args.user.salaryType
      : 'fixed';
  const percentage = Number(args.user.customPercentage || args.user.percentageRate || 0);
  const fixedAmount = Number(args.user.fixedSalary || 0);

  const payload: Record<string, unknown> = {
    userId: args.user._id,
    role,
    branchId: args.user.branchId ?? null,
    salaryType,
    fixedAmount: salaryType === 'percentage' ? 0 : Math.max(0, fixedAmount),
    percentage: salaryType === 'fixed' ? 0 : Math.max(0, Math.min(100, percentage)),
    percentageScope: 'branch',
    isActive: true,
    isDeleted: false,
    deletedAt: null,
    updatedBy: args.actorId ?? null
  };

  return SalarySetting.findOneAndUpdate(
    { userId: args.user._id, role },
    {
      $set: payload,
      $setOnInsert: { createdBy: args.actorId ?? null }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean<any>();
}

export async function ensureSalarySettingForUser(user: EmployeeSalarySource, actorId?: string | null) {
  const role = resolveSalarySettingRole(user.role);
  const existing = await SalarySetting.findOne({
    userId: user._id,
    isActive: true,
    isDeleted: false
  })
    .sort({ updatedAt: -1 })
    .lean<any>();

  if (existing) return existing;

  const hasSalaryConfig =
    Boolean(user.salaryType) ||
    Number(user.fixedSalary || 0) > 0 ||
    Number(user.customPercentage || 0) > 0 ||
    Number(user.percentageRate || 0) > 0;

  if (!hasSalaryConfig && role !== 'teacher') {
    return null;
  }

  return syncSalarySettingFromEmployee({ user, actorId });
}

/** Create missing SalarySetting rows for all active teachers from their User salary fields. */
export async function backfillTeacherSalarySettings(actorId?: string | null) {
  const teachers = await User.find({
    role: 'teacher',
    isDeleted: false,
    active: { $ne: false }
  })
    .select('_id role branchId salaryType fixedSalary percentageRate customPercentage')
    .lean<any[]>();

  if (!teachers.length) return { created: 0, total: 0 };

  const existing = await SalarySetting.find({
    userId: { $in: teachers.map((teacher) => teacher._id) },
    role: 'teacher',
    isDeleted: false
  })
    .select('userId')
    .lean<any[]>();

  const existingIds = new Set(existing.map((item) => String(item.userId)));
  let created = 0;

  for (const teacher of teachers) {
    if (existingIds.has(String(teacher._id))) continue;
    await syncSalarySettingFromEmployee({ user: teacher, actorId });
    created += 1;
  }

  return { created, total: teachers.length };
}

function sumPaymentsInHijriMonth(payments: Array<{ amount?: number; paymentDate?: Date }>, hijriYear: number, hijriMonth: number) {
  return payments.reduce((sum, payment) => {
    const { year, month } = getHijriYearMonth(payment.paymentDate);
    if (year === hijriYear && month === hijriMonth) {
      return sum + Number(payment.amount || 0);
    }
    return sum;
  }, 0);
}

export function buildCommissionScopeNote(scope: CommissionScopeKind, studentCount: number, percentage: number, baseTotal: number, commissionAmount: number) {
  if (scope === 'teacher_assigned_students') {
    return `فیصدی ${percentage}% از فیس ${studentCount} شاگرد اختصاصی این استاد (مجموع فیس ماه: ${baseTotal.toFixed(2)} افغانی → سهم معاش: ${commissionAmount.toFixed(2)} افغانی).`;
  }
  if (scope === 'branch_all_students') {
    return `فیصدی ${percentage}% از مجموع فیس تمام شاگردان این نماینده‌گی در این ماه (مجموع فیس: ${baseTotal.toFixed(2)} → سهم معاش مدیر: ${commissionAmount.toFixed(2)} افغانی).`;
  }
  return `فیصدی ${percentage}% از مجموع فیس تمام شاگردان سیستم در این ماه (مجموع فیس: ${baseTotal.toFixed(2)} → سهم معاش: ${commissionAmount.toFixed(2)} افغانی).`;
}

export async function sumCommissionBaseForEmployee(args: {
  user: { _id: any; role?: string; branchId?: any };
  setting: { role: string; percentageScope?: string; branchId?: any };
  hijriYear: number;
  hijriMonth: number;
}): Promise<{ total: number; scope: CommissionScopeKind; assignedStudentCount: number }> {
  const paymentFilter: Record<string, unknown> = {
    isDeleted: false,
    paymentFor: 'student_fee',
    status: { $in: ['completed', 'paid', 'partially_paid'] }
  };

  const isTeacher = args.setting.role === 'teacher' || args.user.role === 'teacher';

  if (isTeacher) {
    // Commission is earned from the agreed fee at student registration. A later
    // installment only settles that receivable and must not inflate the salary.
    const students = await Student.find({
      teacherId: args.user._id,
      isDeleted: false
    })
      .select('_id feeAmount registrationDate')
      .lean<any[]>();

    const registeredThisMonth = students.filter((student) => {
      const { year, month } = getHijriYearMonth(student.registrationDate);
      return year === args.hijriYear && month === args.hijriMonth;
    });
    if (!registeredThisMonth.length) {
      return { total: 0, scope: 'teacher_assigned_students', assignedStudentCount: 0 };
    }

    return {
      total: registeredThisMonth.reduce((sum, student) => sum + Number(student.feeAmount || 0), 0),
      scope: 'teacher_assigned_students',
      assignedStudentCount: registeredThisMonth.length
    };
  }

  const allSystem = args.setting.percentageScope === 'all_system';
  if (!allSystem) {
    const branchId = args.setting.branchId ?? args.user.branchId ?? null;
    if (branchId) paymentFilter.branchId = branchId;
  }

  const payments = await Payment.find(paymentFilter).select('amount paymentDate').lean<any[]>();
  return {
    total: sumPaymentsInHijriMonth(payments, args.hijriYear, args.hijriMonth),
    scope: allSystem ? 'system_all_students' : 'branch_all_students',
    assignedStudentCount: 0
  };
}

/** @deprecated Use sumCommissionBaseForEmployee — kept for compatibility */
export async function sumPaymentsForScope(args: {
  hijriYear: number;
  hijriMonth: number;
  branchId?: string | null;
  includeAllSystem?: boolean;
}) {
  const paymentFilter: Record<string, unknown> = {
    isDeleted: false,
    paymentFor: 'student_fee',
    status: { $in: ['completed', 'paid', 'partially_paid'] },
    ...(args.includeAllSystem ? {} : { branchId: args.branchId ?? null })
  };
  const payments = await Payment.find(paymentFilter).select('amount paymentDate').lean<any[]>();
  return sumPaymentsInHijriMonth(payments, args.hijriYear, args.hijriMonth);
}

export async function calculateSalaryRecord(args: {
  userId: string;
  hijriYear: number;
  hijriMonth: number;
  actorId?: string | null;
  allowAllSystemScope?: boolean;
  forceRecalculate?: boolean;
  settingOverride?: any;
}) {
  const user = await User.findOne({ _id: args.userId, isDeleted: false }).lean<any>();
  if (!user) throw new Error('کاربر پیدا نشد');

  let setting = args.settingOverride
    ?? await SalarySetting.findOne({ userId: user._id, isActive: true, isDeleted: false }).sort({ updatedAt: -1 }).lean<any>();

  // Auto-heal: teacher/employee salary fields on User were historically saved without
  // creating the SalarySetting row that payroll preview/payment requires.
  if (!setting) {
    setting = await ensureSalarySettingForUser(user, args.actorId ?? null);
  }
  if (!setting) throw new Error('تنظیمات معاش برای این کاربر ثبت نشده است');

  const isManagerRole = setting.role === 'manager' || setting.role === 'admin'
    || ['admin', 'branch_manager', 'owner'].includes(String(user.role));

  if (isManagerRole && setting.percentageScope === 'all_system' && !args.allowAllSystemScope) {
    throw new Error('محاسبه فیصدی کل سیستم فقط با اجازه سوپر ادمین ممکن است');
  }

  const existing = await SalaryRecord.findOne({
    userId: user._id,
    hijriYear: args.hijriYear,
    hijriMonth: args.hijriMonth,
    isDeleted: false
  });

  if (existing && !args.forceRecalculate) {
    return existing.toObject();
  }

  const commissionBase = setting.salaryType === 'fixed'
    ? { total: 0, scope: 'teacher_assigned_students' as CommissionScopeKind, assignedStudentCount: 0 }
    : await sumCommissionBaseForEmployee({
      user,
      setting,
      hijriYear: args.hijriYear,
      hijriMonth: args.hijriMonth
    });

  const totalPayments = commissionBase.total;
  const fixedAmount = roundMoney(Number(setting.fixedAmount || 0));
  const percentage = Math.max(0, Math.min(100, Math.round(Number(setting.percentage || 0) * 100) / 100));
  const salaryMode =
    setting.salaryType === 'fixed'
      ? 'fixed_salary'
      : setting.salaryType === 'percentage'
        ? 'percentage'
        : 'fixed_plus_percentage';
  const gross = calculatePayrollGross({
    salaryMode,
    fixedAmount,
    commissionBase: totalPayments,
    commissionPercentage: percentage
  });
  const commissionAmount = gross.commissionAmount;
  const grossSalary = gross.grossSalary;

  const tax = await calculateAfghanistanSalaryTax(grossSalary);
  const commissionNote = setting.salaryType === 'fixed'
    ? ''
  : buildCommissionScopeNote(commissionBase.scope, commissionBase.assignedStudentCount, percentage, totalPayments, commissionAmount);

  const payload = {
    userId: user._id,
    role: setting.role,
    branchId: setting.branchId ?? user.branchId ?? null,
    hijriYear: args.hijriYear,
    hijriMonth: args.hijriMonth,
    quarter: Math.ceil(Number(args.hijriMonth) / 3),
    grossSalary: tax.grossSalary,
    fixedAmount,
    commissionAmount,
    totalStudentPaymentsUsed: Number(totalPayments.toFixed(2)),
    percentageUsed: percentage,
    taxAmount: tax.taxAmount,
    netSalary: tax.netSalary,
    taxCategory: tax.taxCategory,
    taxExplanation: [tax.explanation, commissionNote].filter(Boolean).join(' '),
    taxFormula: tax.formula,
    isTaxExempt: tax.isTaxExempt,
    paymentStatus: existing?.paymentStatus ?? 'unpaid',
    taxStatus: existing?.taxStatus ?? 'pending',
    paidAmount: Number(existing?.paidAmount || 0),
    calculatedAt: new Date(),
    paidAt: existing?.paidAt ?? null,
    createdBy: args.actorId ?? null
  };

  const record = await SalaryRecord.findOneAndUpdate(
    {
      userId: user._id,
      hijriYear: args.hijriYear,
      hijriMonth: args.hijriMonth,
      isDeleted: false
    },
    { $set: payload },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );

  return record?.toObject?.() ?? record;
}

export async function ensureSalaryRecordsForPeriod(args: {
  hijriYear: number;
  hijriMonth: number;
  branchId?: string;
  role?: string;
  actorId?: string | null;
  allowAllSystemScope?: boolean;
}) {
  // Heal teachers who were created before SalarySetting sync existed.
  await backfillTeacherSalarySettings(args.actorId ?? null);

  const settingsFilter: Record<string, any> = { isDeleted: false, isActive: true };
  if (args.branchId) settingsFilter.branchId = args.branchId;
  if (args.role && args.role !== 'all') settingsFilter.role = args.role;

  const activeSettings = await SalarySetting.find(settingsFilter).select('userId').lean<any[]>();
  if (!activeSettings.length) return;

  // Sequential batches avoid connection storms / duplicate-key races that crash under load.
  const batchSize = 5;
  for (let index = 0; index < activeSettings.length; index += batchSize) {
    const batch = activeSettings.slice(index, index + batchSize);
    await Promise.all(batch.map(async (setting) => {
      try {
        await calculateSalaryRecord({
          userId: String(setting.userId),
          hijriYear: args.hijriYear,
          hijriMonth: args.hijriMonth,
          actorId: args.actorId ?? null,
          allowAllSystemScope: Boolean(args.allowAllSystemScope),
          forceRecalculate: true
        });
      } catch (error) {
        console.warn('[payroll] Skipped salary calculation for user', setting.userId, error);
      }
    }));
  }
}
