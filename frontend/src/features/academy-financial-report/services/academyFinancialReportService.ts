export function buildAcademyFinancialReportExportUrl(params: Record<string, any>, format: 'excel' | 'pdf') {
  const query = new URLSearchParams({ ...params, format } as any).toString();
  return `/api/academy-financial-report/export?${query}`;
}
