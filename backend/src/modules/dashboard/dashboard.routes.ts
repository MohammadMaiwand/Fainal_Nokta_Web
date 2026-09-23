import { Router } from 'express';
import mongoose from 'mongoose';
import { authenticate, authorize } from '../../middlewares/auth';
import { createResponse } from '../../helpers/response';
import { AuditLog } from '../../models/AuditLog';
import { buildSecurityAuditFilter } from '../../services/auditService';
import { Book } from '../../models/Book';
import { Branch } from '../../models/Branch';
import { ClassModel } from '../../models/Class';
import { Attendance } from '../../models/Attendance';
import { Expense } from '../../models/Expense';
import { Family } from '../../models/Family';
import { FinanceEntry } from '../../models/FinanceEntry';
import { Notification } from '../../models/Notification';
import { Payment } from '../../models/Payment';
import { Report } from '../../models/Report';
import { Result } from '../../models/Result';
import { Role } from '../../models/Role';
import { Subject } from '../../models/Subject';
import { Student } from '../../models/Student';
import { User } from '../../models/User';
import { Exam } from '../../models/Exam';
import { Message } from '../../models/Message';
import { Curriculum } from '../../models/Curriculum';
import { Course } from '../../models/Course';
import { SalaryRecord } from '../../models/SalaryRecord';
import { StationerySale } from '../../models/StationerySale';
import { getHijriYearMonth } from '../../services/afghanistanSalaryTaxService';
import { ensureSalaryRecordsForPeriod } from '../../services/payrollCalculation.service';
import { buildAcademyFinancialReport } from '../academy-financial-report/academy-financial-report.routes';
import {
  buildTrendBuckets,
  dateRangeFilter,
  getDashboardDateRange,
  matchTrendBucket,
  parseDashboardPeriod,
  type DashboardPeriod
} from './dashboardPeriod';

const router = Router();
const ACTIVE_PAYMENT_STATUSES = ['completed', 'paid', 'partially_paid'];

router.use(authenticate, authorize(['super_admin', 'admin', 'branch_manager', 'teacher', 'accountant', 'librarian', 'student', 'family_student', 'parent', 'owner']));

/** Student-fee income only — excludes salary payouts and cancelled/refunded rows. */
function buildStudentFeeIncomeMatch(baseFilter: Record<string, any>, startDate: Date, endDate: Date) {
  return {
    ...baseFilter,
    isDeleted: false,
    paymentFor: { $in: [null, 'student_fee'] },
    $and: [
      {
        $or: [
          { status: { $exists: false } },
          { status: { $in: ACTIVE_PAYMENT_STATUSES } }
        ]
      },
      {
        $or: [
          { paymentDate: { $gte: startDate, $lte: endDate } },
          {
            $and: [
              {
                $or: [
                  { paymentDate: null },
                  { paymentDate: { $exists: false } }
                ]
              },
              { createdAt: { $gte: startDate, $lte: endDate } }
            ]
          }
        ]
      }
    ]
  };
}

function buildAllPaymentsMatch(baseFilter: Record<string, any>, startDate: Date, endDate: Date) {
  return {
    ...baseFilter,
    isDeleted: false,
    $and: [
      {
        $or: [
          { status: { $exists: false } },
          { status: { $nin: ['cancelled', 'refunded', 'reversed'] } }
        ]
      },
      {
        $or: [
          { paymentDate: { $gte: startDate, $lte: endDate } },
          {
            $and: [
              {
                $or: [
                  { paymentDate: null },
                  { paymentDate: { $exists: false } }
                ]
              },
              { createdAt: { $gte: startDate, $lte: endDate } }
            ]
          }
        ]
      }
    ]
  };
}

function buildPayrollMatch(period: DashboardPeriod, branchFilter: Record<string, any>, now: Date) {
  const { year, month } = getHijriYearMonth(now);
  const match: Record<string, any> = { isDeleted: false, ...branchFilter };
  if (period === 'year') {
    match.hijriYear = year;
  } else {
    match.hijriYear = year;
    match.hijriMonth = month;
  }
  return match;
}

function enrollmentGroupId(period: DashboardPeriod) {
  if (period === 'day') {
    return {
      year: { $year: '$createdAt' },
      month: { $month: '$createdAt' },
      day: { $dayOfMonth: '$createdAt' },
      hour: { $hour: '$createdAt' }
    };
  }
  if (period === 'month') {
    return {
      year: { $year: '$createdAt' },
      month: { $month: '$createdAt' },
      day: { $dayOfMonth: '$createdAt' }
    };
  }
  return {
    year: { $year: '$createdAt' },
    month: { $month: '$createdAt' }
  };
}

function financeGroupId(period: DashboardPeriod, dateField: string) {
  const field = `$${dateField}`;
  if (period === 'day') {
    return {
      year: { $year: field },
      month: { $month: field },
      day: { $dayOfMonth: field },
      hour: { $hour: field }
    };
  }
  if (period === 'month') {
    return {
      year: { $year: field },
      month: { $month: field },
      day: { $dayOfMonth: field }
    };
  }
  return {
    year: { $year: field },
    month: { $month: field }
  };
}

function findTrendTotal(
  period: DashboardPeriod,
  bucket: { year: number; month: number; day?: number; hour?: number },
  entries: Array<{ _id: Record<string, number>; total: number }>
) {
  return (
    entries.find((entry) =>
      matchTrendBucket(period, bucket, {
        year: entry._id.year,
        month: entry._id.month,
        day: entry._id.day,
        hour: entry._id.hour
      })
    )?.total ?? 0
  );
}

async function buildDashboardSummary(req: any, res: any, next: any) {
  try {
    const period = parseDashboardPeriod(req.query?.period);
    const now = new Date();
    const { start: startDate, end: endDate } = getDashboardDateRange(period, now);
    const rangeFilter = dateRangeFilter(startDate, endDate);
    const buckets = buildTrendBuckets(period, { start: startDate, end: endDate });
    const role = req.user?.canonicalRole ?? req.user?.role;
    const userId = req.user?.userId;
    const branchId = req.user?.branchId;
    const isTeacher = role === 'teacher';
    const isStudent = role === 'student';
    const isFamily = role === 'parent' || role === 'family_student' || role === 'family';
    const isBranchScoped = role === 'branch_manager' && branchId;
    const canViewFinance = ['super_admin', 'admin', 'owner', 'branch_manager', 'accountant'].includes(String(role));

    // Student accounts need a small, strictly scoped dashboard. Running the
    // administrator aggregation for them can touch inaccessible finance/AI data
    // and make the whole dashboard fail with a generic 403.
    if (isStudent && userId) {
      const currentUser = await User.findById(userId).select('studentId').lean<any>();
      const student = currentUser?.studentId
        ? await Student.findOne({ studentId: currentUser.studentId, isDeleted: false }).select('_id classId subjectId').lean<any>()
        : null;
      const [examCount, attendanceCount, resultCount] = student
        ? await Promise.all([
            Exam.countDocuments({ isDeleted: false, class: student.classId, subject: student.subjectId }),
            Attendance.countDocuments({ isDeleted: false, studentId: student._id }),
            Result.countDocuments({ isDeleted: false, studentId: student._id })
          ])
        : [0, 0, 0];

      return res.json(createResponse({
        period,
        rangeStart: startDate.toISOString(),
        rangeEnd: endDate.toISOString(),
        totalStudents: student ? 1 : 0,
        totalTeachers: 0,
        totalClasses: student?.classId ? 1 : 0,
        totalSubjects: student?.subjectId ? 1 : 0,
        totalBranches: 0,
        totalBooks: 0,
        totalNotifications: 0,
        totalUsers: 1,
        totalFamilies: 0,
        incomeTotal: 0,
        paymentIncomeTotal: 0,
        studentFeeAccrualTotal: 0,
        bookSalesTotal: 0,
        expenseTotal: 0,
        outstandingBalance: 0,
        totalStudentFees: 0,
        totalAuditLogs: 0,
        totalAttendance: attendanceCount,
        totalExams: examCount,
        totalResults: resultCount,
        totalPayments: 0,
        totalFinanceEntries: 0,
        totalReports: 0,
        totalMessages: 0,
        payrollNetTotal: 0,
        payrollTaxTotal: 0,
        payrollGrossTotal: 0,
        academyNetTotal: 0,
        enrollmentTrend: [],
        monthlyFinances: [],
        expenseCategoryBreakdown: []
      }));
    }

    const branchObjectId = branchId && mongoose.Types.ObjectId.isValid(branchId)
      ? new mongoose.Types.ObjectId(branchId)
      : null;
    const branchFilter = isBranchScoped && branchObjectId ? { branchId: branchObjectId } : {};
    const studentFilter: Record<string, any> = { isDeleted: false, ...branchFilter };
    const teacherFilter: Record<string, any> = { role: 'teacher', isDeleted: false, ...branchFilter };
    const classFilter: Record<string, any> = { isDeleted: false, ...branchFilter };
    const subjectFilter: Record<string, any> = { isDeleted: false, ...branchFilter };
    const notificationFilter: Record<string, any> = { isDeleted: false, ...branchFilter, createdAt: rangeFilter };
    const paymentBaseFilter: Record<string, any> = { ...branchFilter };
    const financeEntryFilter: Record<string, any> = { isDeleted: false, ...branchFilter, date: rangeFilter };
    const expenseFilter: Record<string, any> = {
      isDeleted: false,
      $nor: [
        { category: /^income$/i },
        { category: /^salary$/i },
        { category: /^معاش$/i },
        { category: /^loan_disbursement$/i },
        { category: /^loan_repayment$/i }
      ],
      ...branchFilter,
      date: rangeFilter
    };
    const payrollFilter = buildPayrollMatch(period, branchFilter, now);
    const resultFilter: Record<string, any> = { isDeleted: false };
    const bookFilter: Record<string, any> = { isDeleted: false, ...branchFilter, createdAt: rangeFilter };
    const attendanceFilter: Record<string, any> = { isDeleted: false, ...branchFilter, attendanceDate: rangeFilter };
    const examFilter: Record<string, any> = { isDeleted: false, ...branchFilter, createdAt: rangeFilter };
    const reportFilter: Record<string, any> = { isDeleted: false, ...branchFilter, createdAt: rangeFilter };
    const messageFilter: Record<string, any> = { isDeleted: false, ...branchFilter, createdAt: rangeFilter };
    const periodCreatedAt = { createdAt: rangeFilter };
    const branchPeriodFilter: Record<string, any> = isBranchScoped && branchObjectId
      ? { _id: branchObjectId, isDeleted: false, ...periodCreatedAt }
      : { isDeleted: false, ...periodCreatedAt };

    if (isTeacher && userId) {
      studentFilter.teacherId = userId;
      teacherFilter._id = userId;
      classFilter.assignedTeachers = userId;
      subjectFilter.teacher = userId;
      resultFilter.gradedBy = userId;
      notificationFilter.recipientRoles = { $in: ['teacher', 'all'] };
      const teacherProfile = await User.findById(userId).select('branchId').lean<Record<string, any>>();
      if (teacherProfile?.branchId) {
        bookFilter.branchId = teacherProfile.branchId;
      }
    }

    if (isStudent && userId) {
      const currentUser = await User.findById(userId).select('studentId classId subjectId assignedTeacherId').lean<Record<string, any>>();
      const studentRecord = currentUser?.studentId
        ? await Student.findOne({ studentId: currentUser.studentId, isDeleted: false }).select('_id classId subjectId teacherId remainingBalance').lean<Record<string, any>>()
        : null;
      studentFilter._id = studentRecord?._id ? studentRecord._id : { $in: [] };
      classFilter._id = studentRecord?.classId ?? currentUser?.classId ?? { $in: [] };
      subjectFilter._id = studentRecord?.subjectId ?? currentUser?.subjectId ?? { $in: [] };
      teacherFilter._id = studentRecord?.teacherId ?? currentUser?.assignedTeacherId ?? { $in: [] };
      resultFilter.student = userId;
      paymentBaseFilter.studentId = studentRecord?._id ? studentRecord._id : { $in: [] };
    }

    if (isFamily && userId) {
      const familyUser = await User.findById(userId).select('familyId parentProfileId').lean<Record<string, any>>();
      const familyStudents = await Student.find({
        isDeleted: false,
        ...(familyUser?.familyId ? { familyId: familyUser.familyId } : {}),
        ...(!familyUser?.familyId && familyUser?.parentProfileId ? { parentProfileId: familyUser.parentProfileId } : {})
      }).select('_id studentId classId subjectId teacherId').lean<Record<string, any>[]>();
      const studentIds = familyStudents.map((student) => student._id);
      studentFilter._id = { $in: studentIds };
      classFilter._id = { $in: familyStudents.map((student) => student.classId).filter(Boolean) };
      subjectFilter._id = { $in: familyStudents.map((student) => student.subjectId).filter(Boolean) };
      teacherFilter._id = { $in: familyStudents.map((student) => student.teacherId).filter(Boolean) };
      const studentUsers = await User.find({
        role: 'student',
        isDeleted: false,
        studentId: { $in: familyStudents.map((student: any) => student.studentId).filter(Boolean) }
      }).select('_id').lean<Record<string, any>[]>();
      resultFilter.student = { $in: studentUsers.map((student) => student._id) };
      paymentBaseFilter.studentId = { $in: studentIds };
    }

    // Rebuild payment matches after role-specific student scoping.
    const scopedStudentFeeIncomeFilter = buildStudentFeeIncomeMatch(paymentBaseFilter, startDate, endDate);
    const scopedAllPaymentsFilter = buildAllPaymentsMatch(paymentBaseFilter, startDate, endDate);

    if (canViewFinance) {
      const { year: hijriYear, month: hijriMonth } = getHijriYearMonth(now);
      try {
        await ensureSalaryRecordsForPeriod({
          hijriYear,
          hijriMonth,
          branchId: isBranchScoped && branchId ? String(branchId) : undefined,
          actorId: userId ?? null,
          allowAllSystemScope: role === 'super_admin'
        });
      } catch (error) {
        console.warn('[dashboard] payroll ensure skipped', error);
      }
    }

    const studentPeriodFilter = { ...studentFilter, ...periodCreatedAt };
    const teacherPeriodFilter = { ...teacherFilter, ...periodCreatedAt };
    const classPeriodFilter = { ...classFilter, ...periodCreatedAt };
    const subjectPeriodFilter = { ...subjectFilter, ...periodCreatedAt };

    const [
      totalStudents,
      totalTeachers,
      totalClasses,
      totalSubjects,
      totalBranches,
      totalBooks,
      totalNotifications,
      totalUsers,
      totalFamilies,
      paymentTotals,
      studentFeeAccrualTotals,
      bookSalesTotals,
      manualIncomeTotals,
      expenseTotals,
      studentBalance,
      totalAuditLogs,
      studentTrend,
      teacherTrend,
      monthlyPayments,
      monthlyManualIncome,
      monthlyExpenses,
      expenseCategoryBreakdown,
      totalAttendance,
      totalExams,
      totalResultsCount,
      totalPayments,
      totalFinanceEntries,
      totalReports,
      totalMessages,
      payrollTotals
    ] = await Promise.all([
      Student.countDocuments(studentPeriodFilter),
      User.countDocuments(teacherPeriodFilter),
      ClassModel.countDocuments(classPeriodFilter),
      Subject.countDocuments(subjectPeriodFilter),
      Branch.countDocuments(branchPeriodFilter),
      isTeacher ? Promise.resolve(0) : Book.countDocuments(bookFilter),
      Notification.countDocuments(notificationFilter),
      isTeacher || isStudent || isFamily ? 1 : User.countDocuments({ isDeleted: false, ...branchFilter, ...periodCreatedAt }),
      Family.countDocuments({ isDeleted: false, ...periodCreatedAt }),
      canViewFinance
        ? Payment.aggregate([
            { $match: scopedStudentFeeIncomeFilter },
            { $group: { _id: null, total: { $sum: { $ifNull: ['$netAmount', '$amount'] } } } }
          ])
        : Promise.resolve([]),
      canViewFinance
        ? Student.aggregate([
            { $match: { ...studentFilter, registrationDate: rangeFilter } },
            { $group: { _id: null, total: { $sum: '$feeAmount' } } }
          ])
        : Promise.resolve([]),
      canViewFinance
        ? StationerySale.aggregate([
            {
              $match: {
                isDeleted: false,
                paymentStatus: { $in: ['paid', 'partial'] },
                ...branchFilter,
                saleDate: rangeFilter
              }
            },
            { $group: { _id: null, total: { $sum: { $ifNull: ['$paidAmount', '$totalAmount'] } } } }
          ])
        : Promise.resolve([]),
      canViewFinance ? FinanceEntry.aggregate([{ $match: financeEntryFilter }, { $group: { _id: null, total: { $sum: '$amount' } } }]) : Promise.resolve([]),
      canViewFinance ? Expense.aggregate([{ $match: expenseFilter }, { $group: { _id: null, total: { $sum: '$amount' } } }]) : Promise.resolve([]),
      // Outstanding balances are stock metrics — do not limit by student createdAt period.
      Student.aggregate([
        { $match: { ...studentFilter, remainingBalance: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$remainingBalance' }, totalFees: { $sum: '$feeAmount' } } }
      ]),
      isTeacher || isStudent || isFamily
        ? Promise.resolve(0)
        : AuditLog.countDocuments(buildSecurityAuditFilter({ ...branchFilter, createdAt: rangeFilter })),
      Student.aggregate([
        { $match: { ...studentFilter, createdAt: rangeFilter } },
        { $group: { _id: enrollmentGroupId(period), total: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
      ]),
      User.aggregate([
        { $match: { ...teacherFilter, createdAt: rangeFilter } },
        { $group: { _id: enrollmentGroupId(period), total: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
      ]),
      canViewFinance ? Payment.aggregate([
        { $match: scopedStudentFeeIncomeFilter },
        { $group: { _id: financeGroupId(period, 'paymentDate'), total: { $sum: { $ifNull: ['$netAmount', '$amount'] } } } },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
      ]) : Promise.resolve([]),
      canViewFinance ? FinanceEntry.aggregate([
        { $match: financeEntryFilter },
        { $group: { _id: financeGroupId(period, 'date'), total: { $sum: '$amount' } } },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
      ]) : Promise.resolve([]),
      canViewFinance ? Expense.aggregate([
        { $match: expenseFilter },
        { $group: { _id: financeGroupId(period, 'date'), total: { $sum: '$amount' } } },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
      ]) : Promise.resolve([]),
      canViewFinance ? Expense.aggregate([
        { $match: expenseFilter },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
        { $limit: 6 }
      ]) : Promise.resolve([]),
      isTeacher || isStudent || isFamily ? Promise.resolve(0) : Attendance.countDocuments(attendanceFilter),
      isTeacher || isStudent || isFamily ? Promise.resolve(0) : Exam.countDocuments(examFilter),
      isTeacher || isStudent || isFamily ? Promise.resolve(0) : Result.countDocuments({ ...resultFilter, ...periodCreatedAt }),
      canViewFinance ? Payment.countDocuments(scopedAllPaymentsFilter) : Promise.resolve(0),
      canViewFinance ? FinanceEntry.countDocuments(financeEntryFilter) : Promise.resolve(0),
      isTeacher || isStudent || isFamily ? Promise.resolve(0) : Report.countDocuments(reportFilter),
      isTeacher || isStudent || isFamily ? Promise.resolve(0) : Message.countDocuments(messageFilter),
      canViewFinance
        ? SalaryRecord.aggregate([
            { $match: payrollFilter },
            {
              $group: {
                _id: null,
                net: { $sum: '$netSalary' },
                tax: { $sum: '$taxAmount' },
                gross: { $sum: '$grossSalary' }
              }
            }
          ])
        : Promise.resolve([])
    ]);

    const enrollmentTrend = buckets.map((bucket) => ({
      year: bucket.year,
      month: bucket.month,
      day: bucket.day,
      hour: bucket.hour,
      students: findTrendTotal(period, bucket, studentTrend),
      teachers: findTrendTotal(period, bucket, teacherTrend)
    }));

    const monthlyFinances = buckets.map((bucket) => {
      const paymentTotal = findTrendTotal(period, bucket, monthlyPayments);
      const manualIncomeTotal = findTrendTotal(period, bucket, monthlyManualIncome);
      return {
        year: bucket.year,
        month: bucket.month,
        day: bucket.day,
        hour: bucket.hour,
        income: Math.round(paymentTotal + manualIncomeTotal),
        expenses: Math.round(findTrendTotal(period, bucket, monthlyExpenses))
      };
    });

    const { year: currentHijriYear, month: currentHijriMonth } = getHijriYearMonth(now);
    const dashboardReportType = period === 'year' ? 'yearly' : period === 'quarter' ? 'quarterly' : 'monthly';
    let academyFinancialSnapshot: any = null;
    if (canViewFinance) {
      try {
        academyFinancialSnapshot = await buildAcademyFinancialReport(
          {
            reportType: dashboardReportType,
            hijriYear: currentHijriYear,
            ...(dashboardReportType === 'monthly' ? { hijriMonth: currentHijriMonth } : {}),
            ...(dashboardReportType === 'quarterly' ? { quarter: Math.ceil(currentHijriMonth / 3) } : {}),
            paymentStatus: 'paid',
            ...(isBranchScoped && branchId ? { branchId } : {})
          },
          req.user
        );
      } catch (error) {
        // A malformed legacy payroll/tax record must not prevent dashboard use.
        console.warn('[dashboard] academy financial snapshot fallback', error);
      }
    }

    const paymentIncomeTotal = Math.round(paymentTotals[0]?.total ?? 0);
    const studentFeeAccrualTotal = Math.round(studentFeeAccrualTotals[0]?.total ?? 0);
    const bookSalesTotal = Math.round(bookSalesTotals[0]?.total ?? 0);
    const manualIncomeTotal = Math.round(manualIncomeTotals[0]?.total ?? 0);
    // One revenue source for the main dashboard: assigned student fees plus
    // completed book/stationery sales. Cash collection is shown separately.
    const incomeTotal = Math.round(academyFinancialSnapshot?.totalsFooter?.totalRevenue ?? (studentFeeAccrualTotal + bookSalesTotal));
    const expenseTotal = Math.round(academyFinancialSnapshot?.totalsFooter?.totalExpenses ?? (expenseTotals[0]?.total ?? 0));
    const outstandingBalance = Math.round(Math.max(0, studentBalance[0]?.total ?? 0));
    const payrollNetTotal = Math.round(academyFinancialSnapshot?.salaries?.salaryNetPayable ?? (payrollTotals[0]?.net ?? 0));
    const payrollTaxTotal = Math.round(academyFinancialSnapshot?.totalsFooter?.totalTaxes ?? (payrollTotals[0]?.tax ?? 0));
    const payrollGrossTotal = Math.round(academyFinancialSnapshot?.totalsFooter?.accruedSalaries ?? (payrollTotals[0]?.gross ?? 0));
    // Accrual basis: payroll created for this period is an expense whether it has
    // already been paid or remains payable. Loans are excluded from expenseFilter.
    const academyNetTotal = Math.round(academyFinancialSnapshot?.totalsFooter?.netProfit ?? (incomeTotal - expenseTotal - payrollGrossTotal));

    res.json(createResponse({
      period,
      rangeStart: startDate.toISOString(),
      rangeEnd: endDate.toISOString(),
      totalStudents,
      totalTeachers,
      totalClasses,
      totalSubjects,
      totalBranches,
      totalBooks,
      totalNotifications,
      totalUsers,
      totalFamilies,
      incomeTotal,
      paymentIncomeTotal,
      studentFeeAccrualTotal,
      bookSalesTotal,
      expenseTotal,
      outstandingBalance,
      totalStudentFees: studentFeeAccrualTotal,
      totalRegisteredStudentFees: Math.round(studentBalance[0]?.totalFees ?? 0),
      totalAuditLogs,
      totalAttendance,
      totalExams,
      totalResults: totalResultsCount,
      totalPayments,
      totalFinanceEntries,
      totalReports,
      totalMessages,
      payrollNetTotal,
      payrollTaxTotal,
      payrollGrossTotal,
      academyNetTotal,
      enrollmentTrend,
      monthlyFinances,
      expenseCategoryBreakdown: expenseCategoryBreakdown.map((entry: { _id: string; total: number }) => ({
        category: entry._id,
        total: entry.total
      }))
    }));
  } catch (error) {
    next(error);
  }
}

router.get('/', buildDashboardSummary);
router.get('/summary', buildDashboardSummary);

router.get('/master-summary', authorize(['super_admin']), async (_req, res, next) => {
  try {
    const [
      users,
      students,
      teachers,
      classes,
      subjects,
      attendance,
      exams,
      results,
      payments,
      financeEntries,
      expenses,
      reports,
      branches,
      notifications,
      auditLogs,
      roles,
      courses,
      books,
      messages,
      curriculum
    ] = await Promise.all([
      User.countDocuments({}),
      Student.countDocuments({}),
      User.countDocuments({ role: 'teacher' }),
      ClassModel.countDocuments({}),
      Subject.countDocuments({}),
      Attendance.countDocuments({}),
      Exam.countDocuments({}),
      Result.countDocuments({}),
      Payment.countDocuments({}),
      FinanceEntry.countDocuments({}),
      Expense.countDocuments({ category: { $ne: 'income' } }),
      Report.countDocuments({}),
      Branch.countDocuments({}),
      Notification.countDocuments({}),
      AuditLog.countDocuments(buildSecurityAuditFilter()),
      Role.countDocuments({}),
      Course.countDocuments({}),
      Book.countDocuments({}),
      Message.countDocuments({}),
      Curriculum.countDocuments({})
    ]);

    res.json(createResponse({
      users,
      students,
      teachers,
      classes,
      subjects,
      attendance,
      exams,
      results,
      payments,
      finance: financeEntries,
      expenses,
      reports,
      branches,
      notifications,
      audit: auditLogs,
      roles,
      courses,
      books,
      messages,
      curriculum
    }));
  } catch (error) {
    next(error);
  }
});

export const dashboardRouter = router;
