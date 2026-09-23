import { api } from '@/services/apiClient';

export type PrintDocumentType = 'academy_financial_report' | 'attendance_sheet' | 'timetable_sheet';
export type PrintOutputType = 'print' | 'pdf' | 'excel';

export type PrintRecord = {
  serialNumber: string;
  documentType: PrintDocumentType;
  outputType: PrintOutputType;
  title: string;
  createdAt: string;
};

export async function registerPrintRecord(input: {
  documentType: PrintDocumentType;
  outputType: PrintOutputType;
  title: string;
  branchId?: string;
  metadata?: Record<string, unknown>;
}) {
  const response = await api.post('/reports/print-records', input);
  return response.data.data as PrintRecord;
}

export async function searchPrintRecords(search?: string, branchId?: string) {
  const response = await api.get('/reports/print-records', { params: { search, branchId } });
  return response.data.data as PrintRecord[];
}
