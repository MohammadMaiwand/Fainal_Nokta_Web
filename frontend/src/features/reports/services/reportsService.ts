import { api } from '@/services/apiClient';

export interface ReportsAnalytics {
  cards: {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    totalExams: number;
    totalResults: number;
    totalBranches: number;
    totalIncome: number;
    monthlyRevenue: number;
    monthlyExpenses: number;
    attendanceSummary: Record<string, number>;
    paymentSummary: {
      totalCollected: number;
      pending: number;
    };
  };
  charts: {
    studentGrowth: Array<{ label: string; total: number }>;
    paymentGrowth: Array<{ label: string; total: number }>;
    expenseComparison: Array<{ label: string; total: number }>;
    attendanceTrend: Array<{ label: string; present: number; absent: number; late: number }>;
    expenseBreakdown: Array<{ category: string; total: number }>;
  };
}

export const reportsService = {
  analytics: () => api.get('/reports/analytics').then((res) => res.data.data as ReportsAnalytics),
  list: () => api.get('/reports').then((res) => (Array.isArray(res.data.data) ? res.data.data : [])),
  generate: (payload: { type: string; periodKey?: string; branchId?: string }) =>
    api.post('/reports/generate', payload).then((res) => res.data.data)
};
