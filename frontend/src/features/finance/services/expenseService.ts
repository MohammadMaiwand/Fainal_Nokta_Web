import { api } from '@/services/apiClient';

export interface ExpenseSummary {
  totalExpenses: number;
  teacherSalaries: number;
  monthlyExpenses: Array<{ year: number; month: number; total: number }>;
  categories: Array<{ category: string; total: number }>;
}

export interface ExpenseRecord {
  _id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
}

export const expenseService = {
  summary: (params?: Record<string, unknown>) => api.get('/expenses/summary', { params }).then((res) => res.data.data as ExpenseSummary),
  list: (params?: Record<string, unknown>) =>
    api.get('/expenses', { params: { limit: 100, ...params } }).then((res) => res.data.data as ExpenseRecord[]),
  listPaged: (params?: Record<string, unknown>) =>
    api.get('/expenses', { params: { limit: 20, ...params } }).then((res) => ({
      items: (res.data.data ?? []) as ExpenseRecord[],
      pagination: res.data.pagination ?? { page: 1, limit: 20, total: 0 }
    })),
  create: (payload: Omit<ExpenseRecord, '_id'>) => api.post('/expenses', payload).then((res) => res.data.data as ExpenseRecord)
};
