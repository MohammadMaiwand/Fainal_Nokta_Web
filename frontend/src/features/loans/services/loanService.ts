import { api } from '@/services/apiClient';

export type LoanPersonType = 'student' | 'teacher' | 'manager' | 'employee';

export type CreateLoanPayload = {
  personType: LoanPersonType;
  personId: string;
  loanType: 'CASH_LOAN' | 'SALARY_ADVANCE' | 'STUDENT_FEE_DEBT' | 'EMERGENCY_LOAN' | 'OTHER';
  purpose?: string;
  originalAmount: number;
  loanDate?: string;
  dueDate?: string | null;
  notes?: string;
  branchId?: string;
  payrollDeductionEnabled?: boolean;
  payrollDeductionAmount?: number;
  installmentEnabled?: boolean;
  installmentAmount?: number;
  repaymentMethodDefault?: string;
  classId?: string;
  subjectId?: string;
  idempotencyKey?: string;
};

function createIdempotencyKey(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const loanService = {
  summary: (params?: Record<string, unknown>) => api.get('/loans/summary', { params }).then((res) => res.data.data),
  listPaged: (params?: Record<string, unknown>) =>
    api.get('/loans', { params }).then((res) => ({
      items: res.data.data ?? [],
      pagination: res.data.pagination ?? { page: 1, limit: 20, total: 0 }
    })),
  get: (id: string) => api.get(`/loans/${id}`).then((res) => res.data.data),
  personOptions: (params: { personType: LoanPersonType; search?: string; branchId?: string }) =>
    api.get('/loans/person-options', { params }).then((res) => res.data.data ?? []),
  personContext: (personType: LoanPersonType, personId: string) =>
    api.get(`/loans/persons/${personType}/${personId}/context`).then((res) => res.data.data),
  create: (payload: CreateLoanPayload) => {
    const idempotencyKey = payload.idempotencyKey || createIdempotencyKey('loan');
    return api
      .post('/loans', { ...payload, idempotencyKey }, { headers: { 'Idempotency-Key': idempotencyKey } })
      .then((res) => res.data);
  },
  repay: (id: string, payload: { amount: number; repaymentMethod?: string; repaymentDate?: string; note?: string; idempotencyKey?: string }) => {
    const idempotencyKey = payload.idempotencyKey || createIdempotencyKey('loan-repay');
    return api
      .post(`/loans/${id}/repayments`, { ...payload, idempotencyKey }, { headers: { 'Idempotency-Key': idempotencyKey } })
      .then((res) => res.data);
  },
  approve: (id: string) => api.post(`/loans/${id}/approve`).then((res) => res.data.data),
  cancel: (id: string, reason?: string) => api.post(`/loans/${id}/cancel`, { reason }).then((res) => res.data.data),
  createIdempotencyKey
};
