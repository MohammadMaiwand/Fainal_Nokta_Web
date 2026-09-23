import { api } from '@/services/apiClient';

export type PaymentFor = 'student_fee' | 'teacher_salary' | 'manager_salary' | 'expense';

export type MakePaymentPayload = {
  paymentType?: 'student_fee' | 'employee_salary' | 'expense';
  paymentFor?: PaymentFor;
  studentId?: string;
  employeeId?: string;
  payeeUserId?: string;
  employeeRole?: 'teacher' | 'manager';
  payeeRole?: 'teacher' | 'manager';
  amount: number;
  discount?: number;
  grossSalary?: number;
  salaryMonth?: number;
  salaryYear?: number;
  branchId?: string;
  paymentDate?: string;
  method?: string;
  referenceNumber?: string;
  notes?: string;
  expenseTitle?: string;
  expenseCategory?: string;
  idempotencyKey?: string;
};

function createIdempotencyKey(prefix: string) {
  // HTTP request headers only allow ISO-8859-1 characters. Expense categories
  // can be Dari/Pashto, so never place raw user-visible text in this header.
  const safePrefix = String(prefix || 'pay')
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'pay';
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${safePrefix}-${crypto.randomUUID()}`;
  }
  return `${safePrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const paymentsService = {
  list: (params?: Record<string, unknown>) =>
    api.get('/payments', { params: { limit: 100, ...params } }).then((res) => res.data.data ?? []),
  listPaged: (params?: Record<string, unknown>) =>
    api.get('/payments', { params: { limit: 20, ...params } }).then((res) => ({
      items: res.data.data ?? [],
      pagination: res.data.pagination ?? { page: 1, limit: 20, total: 0 }
    })),
  payees: (params?: { role?: string; branchId?: string; search?: string }) =>
    api.get('/payments/payees', { params }).then((res) => res.data.data ?? []),
  searchStudents: (params?: { branchId?: string; search?: string; limit?: number; status?: string }) =>
    api
      .get('/students', {
        params: {
          // Load the full student roster for payment selection (backend maxLimit is 5000).
          limit: params?.limit ?? 5000,
          ...(params?.status ? { status: params.status } : {}),
          ...(params?.branchId ? { branchId: params.branchId } : {}),
          ...(params?.search ? { search: params.search } : {})
        }
      })
      .then((res) => res.data.data ?? []),
  salaryPreview: (params: {
    payeeUserId: string;
    payeeRole: 'teacher' | 'manager';
    salaryMonth: number;
    salaryYear: number;
    grossSalary?: number;
  }) => api.get('/payments/salary-preview', { params }).then((res) => res.data.data),
  makePayment: (payload: MakePaymentPayload) => {
    const idempotencyKey = payload.idempotencyKey || createIdempotencyKey('pay');
    return api
      .post(
        '/payments',
        { ...payload, idempotencyKey },
        { headers: { 'Idempotency-Key': idempotencyKey } }
      )
      .then((res) => res.data);
  },
  reverse: (id: string, reason?: string) =>
    api.post(`/payments/${id}/reverse`, { reason: reason || 'ui_reverse' }).then((res) => res.data),
  refund: (id: string, reason?: string) =>
    api.post(`/payments/${id}/refund`, { reason: reason || 'ui_refund' }).then((res) => res.data),
  invoice: (id: string) => api.get(`/payments/${id}/invoice`).then((res) => res.data.data),
  createIdempotencyKey
};
