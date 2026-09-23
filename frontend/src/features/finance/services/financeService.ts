import { api } from '@/services/apiClient';

export interface TeacherFinanceOverview {
  teacherId: string;
  teacherName: string;
  email: string;
  branchId: string | null;
  salaryMode: 'fixed_salary' | 'percentage' | 'fixed_plus_percentage' | string;
  fixedSalaryAmount: number;
  commissionPercentage: number;
  totalPaidStudentAmount?: number;
  commissionEarned?: number;
  totalEarningFromPayments: number;
  totalSalaryPayable: number;
  paidSalaryAmount: number;
  unpaidSalaryAmount: number;
  studentCount: number;
  paymentStatus: 'paid' | 'unpaid' | 'pending' | string;
  payrollGrossSalary?: number;
  payrollTaxAmount?: number;
  payrollNetSalary?: number;
  payrollPercentageUsed?: number;
  payrollStudentFeeTotal?: number;
}

export interface FinanceSummary {
  totalIncome: number;
  studentPayments: number;
  bookSales?: number;
  manualIncome?: number;
  pendingPayments: number;
  paidInvoices: number;
  totalExpenses: number;
  totalTeacherPaidSalary: number;
  totalTeacherPendingSalary: number;
  totalTeacherPayableSalary: number;
  teacherCommissionEarned?: number;
  teacherSalaryPayments: number;
  fixedTeacherSalaries?: number;
  percentageTeacherSalaries?: number;
  academySmallTax?: number;
  netProfit: number;
  monthlyIncome: Array<{ year: number; month: number; total: number }>;
  monthlyExpense: Array<{ year: number; month: number; total: number }>;
  monthlyTeacherSalary: Array<{ year: number; month: number; total: number }>;
  monthlyNetProfit: Array<{ year: number; month: number; total: number }>;
  monthlyRevenue: Array<{ year: number; month: number; revenue?: number; total?: number }>;
  monthlyExpenses: Array<{ year: number; month: number; total: number }>;
  monthlyPendingBalances: Array<{ year: number; month: number; total: number }>;
  salaryPayoutTrend: Array<{ year: number; month: number; total: number }>;
  branchIncome: Array<{ branchId?: string; branch: string; code?: string; total: number }>;
  teachers?: TeacherFinanceOverview[];
}

export interface FinanceRecord {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  source: string;
  notes?: string;
  status?: string;
}

export interface TeacherPayrollSnapshot {
  hijriYear: number;
  hijriMonth: number;
  grossSalary: number;
  fixedAmount: number;
  commissionAmount: number;
  totalStudentPaymentsUsed: number;
  percentageUsed: number;
  taxAmount: number;
  netSalary: number;
  taxCategory: string;
  taxExplanation: string;
  paymentStatus: 'paid' | 'unpaid' | 'pending' | string;
}

export interface TeacherFinanceDetail {
  teacher: {
    teacherId: string;
    teacherName: string;
    email: string;
    salaryMode: string;
    fixedSalaryAmount: number;
    commissionPercentage: number;
  };
  overview?: TeacherFinanceOverview;
  payroll?: TeacherPayrollSnapshot | null;
  assignedClasses: Array<{ id: string; name: string }>;
  assignedSubjects: Array<{ id: string; title: string; code: string }>;
  students: Array<{
    id: string;
    name: string;
    studentCode: string;
    paidAmount: number;
    remainingBalance: number;
    feeAmount?: number;
    commissionPercentage?: number;
    commissionFromStudent?: number;
  }>;
  commissionTransactions: Array<Record<string, unknown>>;
  salaryRecords: Array<Record<string, unknown>>;
  linkedPayments: Array<{
    id: string;
    amount: number;
    paymentDate: string;
    studentName: string;
    referenceNumber: string;
    status: string;
  }>;
}

export type FinanceQuery = {
  startDate?: string;
  endDate?: string;
  branchId?: string;
  teacherId?: string;
  classId?: string;
  subjectId?: string;
  status?: string;
};

export const financeService = {
  summary: (params?: FinanceQuery) =>
    api.get('/finance/summary', { params }).then((res) => res.data.data as FinanceSummary),
  teachers: (params?: FinanceQuery) =>
    api.get('/finance/teachers', { params }).then((res) => res.data.data as TeacherFinanceOverview[]),
  teacherDetail: (teacherId: string, params?: FinanceQuery) =>
    api.get(`/finance/teachers/${teacherId}`, { params }).then((res) => res.data.data as TeacherFinanceDetail),
  myEarnings: (params?: FinanceQuery) =>
    api.get('/finance/me/earnings', { params }).then((res) => res.data.data as TeacherFinanceDetail),
  list: () => api.get('/finance', { params: { limit: 100 } }).then((res) => res.data.data as FinanceRecord[]),
  /**
   * Legacy Finance page payout — still hits /salaries/payout which now delegates
   * to the unified makePayment engine (SalaryRecord + Payment + tax).
   */
  payoutSalary: (payload: { teacherId: string; monthKey: string; amount: number; notes?: string }) =>
    api.post('/salaries/payout', payload).then((res) => res.data)
};
