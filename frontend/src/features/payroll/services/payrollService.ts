import { api } from '@/services/apiClient';

export const payrollService = {
  getMeta: () => api.get('/payroll/meta').then((res) => res.data.data),
  getSummary: (params: Record<string, any>) => api.get('/payroll/summary', { params }).then((res) => res.data.data),
  getSettings: () => api.get('/payroll/settings').then((res) => res.data.data),
  saveSetting: (payload: Record<string, any>) => api.post('/payroll/settings', payload).then((res) => res.data.data),
  calculateSalary: (payload: Record<string, any>) => api.post('/payroll/calculate', payload).then((res) => res.data.data),
  getMyPayroll: (params?: Record<string, any>) => api.get('/payroll/me', { params }).then((res) => res.data.data),
  calculateMySalary: (payload: { hijriYear: number; hijriMonth: number }) =>
    api.post('/payroll/me/calculate', payload).then((res) => res.data.data),
  getRecords: (params: Record<string, any>) => api.get('/payroll/records', { params }).then((res) => res.data.data),
  updatePaymentStatus: (id: string, paymentStatus: 'unpaid' | 'paid') => api.patch(`/payroll/records/${id}/payment-status`, { paymentStatus }).then((res) => res.data.data),
  updateTaxStatus: (id: string, taxStatus: 'pending' | 'submitted' | 'paid') => api.patch(`/payroll/records/${id}/tax-status`, { taxStatus }).then((res) => res.data.data),
  getTaxRules: () => api.get('/payroll/tax-rules').then((res) => res.data.data),
  createTaxRule: (payload: Record<string, any>) => api.post('/payroll/tax-rules', payload).then((res) => res.data.data),
  updateTaxRule: (id: string, payload: Record<string, any>) => api.patch(`/payroll/tax-rules/${id}`, payload).then((res) => res.data.data),
  calculateTax: (grossSalary: number) => api.post('/payroll/tax-calculator', { grossSalary }).then((res) => res.data.data),
  exportReport: (params: Record<string, any>, format: 'excel' | 'pdf') => `/api/payroll/reports/export?${new URLSearchParams({ ...params, format } as any).toString()}`
};
