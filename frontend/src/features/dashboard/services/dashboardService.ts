import { api } from '@/services/apiClient';

export type DashboardPeriod = 'day' | 'month' | 'quarter' | 'year';

export interface DashboardSummary {
  period?: DashboardPeriod;
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalSubjects: number;
  totalUsers: number;
  totalFamilies: number;
  totalBooks: number;
  totalAuditLogs: number;
  totalNotifications: number;
  totalBranches: number;
  totalAttendance: number;
  totalExams: number;
  totalResults: number;
  totalPayments: number;
  totalFinanceEntries: number;
  totalReports: number;
  totalMessages: number;
  expenseTotal: number;
  incomeTotal: number;
  paymentIncomeTotal: number;
  studentFeeAccrualTotal?: number;
  bookSalesTotal?: number;
  outstandingBalance: number;
  totalStudentFees?: number;
  payrollNetTotal: number;
  payrollTaxTotal: number;
  payrollGrossTotal: number;
  academyNetTotal: number;
  enrollmentTrend: Array<{ year: number; month: number; day?: number; hour?: number; students: number; teachers: number }>;
  monthlyFinances: Array<{ year: number; month: number; day?: number; hour?: number; income: number; expenses: number }>;
  expenseCategoryBreakdown: Array<{ category: string; total: number }>;
}

export interface MasterDashboardSummary {
  users: number;
  students: number;
  teachers: number;
  classes: number;
  subjects: number;
  attendance: number;
  exams: number;
  results: number;
  payments: number;
  finance: number;
  expenses: number;
  reports: number;
  branches: number;
  notifications: number;
  audit: number;
  roles: number;
  courses?: number;
  books?: number;
  messages?: number;
  curriculum?: number;
}

export const dashboardService = {
  summary: (period: DashboardPeriod = 'month') =>
    api.get('/dashboard/summary', { params: { period } }).then((res) => {
      const data = res.data.data ?? {};
      return {
        period: (data.period as DashboardPeriod) ?? period,
        totalStudents: data.totalStudents ?? 0,
        totalTeachers: data.totalTeachers ?? 0,
        totalClasses: data.totalClasses ?? 0,
        totalSubjects: data.totalSubjects ?? 0,
        totalUsers: data.totalUsers ?? 0,
        totalFamilies: data.totalFamilies ?? 0,
        totalBooks: data.totalBooks ?? 0,
        totalAuditLogs: data.totalAuditLogs ?? 0,
        totalNotifications: data.totalNotifications ?? 0,
        totalBranches: data.totalBranches ?? 0,
        totalAttendance: data.totalAttendance ?? 0,
        totalExams: data.totalExams ?? 0,
        totalResults: data.totalResults ?? 0,
        totalPayments: data.totalPayments ?? 0,
        totalFinanceEntries: data.totalFinanceEntries ?? 0,
        totalReports: data.totalReports ?? 0,
        totalMessages: data.totalMessages ?? 0,
        expenseTotal: Math.round(Number(data.expenseTotal ?? 0)),
        incomeTotal: Math.round(Number(data.incomeTotal ?? 0)),
        paymentIncomeTotal: Math.round(Number(data.paymentIncomeTotal ?? data.totalStudentFees ?? 0)),
        studentFeeAccrualTotal: Math.round(Number(data.studentFeeAccrualTotal ?? data.totalStudentFees ?? 0)),
        bookSalesTotal: Math.round(Number(data.bookSalesTotal ?? 0)),
        outstandingBalance: Math.round(Number(data.outstandingBalance ?? 0)),
        totalStudentFees: Math.round(Number(data.totalStudentFees ?? data.paymentIncomeTotal ?? 0)),
        payrollNetTotal: Math.round(Number(data.payrollNetTotal ?? 0)),
        payrollTaxTotal: Math.round(Number(data.payrollTaxTotal ?? 0)),
        payrollGrossTotal: Math.round(Number(data.payrollGrossTotal ?? 0)),
        academyNetTotal: Math.round(Number(data.academyNetTotal ?? (Number(data.incomeTotal ?? 0) - Number(data.expenseTotal ?? 0)))),
        enrollmentTrend: Array.isArray(data.enrollmentTrend) ? data.enrollmentTrend : [],
        monthlyFinances: Array.isArray(data.monthlyFinances)
          ? data.monthlyFinances.map((item: { year: number; month: number; day?: number; hour?: number; income: number; expenses: number }) => ({
              ...item,
              income: Math.round(Number(item.income ?? 0)),
              expenses: Math.round(Number(item.expenses ?? 0))
            }))
          : [],
        expenseCategoryBreakdown: Array.isArray(data.expenseCategoryBreakdown)
          ? data.expenseCategoryBreakdown.map((item: { category: string; total: number }) => ({
              category: item.category,
              total: Math.round(Number(item.total ?? 0))
            }))
          : []
      } satisfies DashboardSummary;
    }),
  masterSummary: () =>
    api.get('/dashboard/master-summary').then((res) => {
      const data = res.data.data ?? {};
      return {
        users: data.users ?? 0,
        students: data.students ?? 0,
        teachers: data.teachers ?? 0,
        classes: data.classes ?? 0,
        subjects: data.subjects ?? 0,
        attendance: data.attendance ?? 0,
        exams: data.exams ?? 0,
        results: data.results ?? 0,
        payments: data.payments ?? 0,
        finance: data.finance ?? 0,
        expenses: data.expenses ?? 0,
        reports: data.reports ?? 0,
        branches: data.branches ?? 0,
        notifications: data.notifications ?? 0,
        audit: data.audit ?? 0,
        roles: data.roles ?? 0
      } satisfies MasterDashboardSummary;
    })
};
