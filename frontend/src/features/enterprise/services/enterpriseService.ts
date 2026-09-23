import { api } from '@/services/apiClient';

export interface EnterpriseHealth {
  status: string;
  jalaliDate: string;
  modules: number;
}

export interface EnterpriseAnalytics {
  attendanceByStatus: Array<{ _id: string; total: number }>;
  teacherLoad: Array<{ _id: string; minutes: number }>;
  classUtilization: Array<{ _id: string; sessions: number }>;
  jalaliDate: string;
}

export interface EnterpriseReadinessDomain {
  key: string;
  score: number;
  status: 'global_ready' | 'strong' | 'needs_work' | 'critical';
  completed: number;
  total: number;
  issues: number;
  recommendations: string[];
}

export interface EnterpriseReadiness {
  overallScore: number;
  status: 'global_ready' | 'strong' | 'needs_work' | 'critical';
  jalaliDate: string;
  domains: EnterpriseReadinessDomain[];
  counts: Record<string, number>;
  conflicts: Array<{ type: string; sourceId: string; targetId: string; message: string }>;
}

export const enterpriseService = {
  health: () => api.get('/enterprise/health').then((res) => res.data.data as EnterpriseHealth),
  readiness: () => api.get('/enterprise/readiness').then((res) => res.data.data as EnterpriseReadiness),
  activeSessions: () => api.get('/enterprise/attendance/active-sessions').then((res) => res.data.data as any[]),
  analytics: () => api.get('/enterprise/analytics/advanced').then((res) => res.data.data as EnterpriseAnalytics),
  validateSubject: (payload: { classId: string; subjectId: string }) =>
    api.post('/enterprise/subjects/validate', payload).then((res) => res.data.data as { valid: boolean }),
  validateTimetable: (payload: Record<string, unknown>) =>
    api.post('/enterprise/timetable/validate', payload).then((res) => res.data.data),
  createTranscript: (payload: Record<string, unknown>) =>
    api.post('/enterprise/transcripts', payload).then((res) => res.data.data),
  createCertificate: (payload: Record<string, unknown>) =>
    api.post('/enterprise/certificates', payload).then((res) => res.data.data),
  manualBackup: () => api.post('/enterprise/backups/manual').then((res) => res.data.data),
  securityEvents: () => api.get('/enterprise/security/events').then((res) => res.data.data as any[])
};
