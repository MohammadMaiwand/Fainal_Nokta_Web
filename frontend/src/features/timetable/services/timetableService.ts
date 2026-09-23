import { api } from '@/services/apiClient';

export interface TimetableEntry {
  _id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  branchId?: string | null;
  className: string;
  subjectName: string;
  teacherName: string;
  room: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  academicYear?: string;
  semester?: string;
  isActive: boolean;
}

export interface TimetableConflict {
  sourceId: string;
  targetId: string;
  type: 'teacher' | 'room' | 'class' | string;
  message: string;
  target?: Record<string, unknown>;
}

export interface TimetablePayload {
  classId: string;
  subjectId: string;
  teacherId: string;
  room: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  academicYear?: string;
  semester?: string;
  isActive?: boolean;
}

export interface AutoGeneratePayload {
  classIds?: string[];
  dayOfWeek?: number[];
  startTime?: string;
  endTime?: string;
  lessonDurationMinutes?: number;
  breakMinutes?: number;
  teacherIds?: string[];
}

export interface AutoGenerateResult {
  createdCount: number;
  skippedCount: number;
  conflicts: Array<{ classId?: string; subjectId?: string; reason: string }>;
  entries: TimetableEntry[];
}

export interface SelectEntity {
  _id: string;
  name?: string;
  className?: string;
  title?: string;
  classId?: string;
  code?: string;
}

export interface TimetablePrintEntry {
  _id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string;
  academicYear?: string;
  semester?: string;
  classId: string;
  className: string;
  classCode?: string;
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  teacherId: string;
  teacherName: string;
  teacherPhone?: string;
}

export interface TimetablePrintSheet {
  classInfo: {
    _id: string;
    name: string;
    code?: string;
    level?: string;
    room?: string;
    capacity?: number | null;
    semester?: string;
    academicYear?: string;
    branchId?: string | null;
  };
  branchInfo?: {
    _id: string;
    name: string;
    code?: string;
    city?: string;
    address?: string;
    phone?: string;
  } | null;
  academicYear?: string;
  semester?: string;
  timeSlots: string[];
  days: number[];
  entries: TimetablePrintEntry[];
  cells: Record<string, Record<string, TimetablePrintEntry[]>>;
}

function unwrapData(payload: any) {
  return payload?.data?.data ?? payload?.data ?? payload;
}

function normalizeTimetableItems(payload: any): TimetableEntry[] {
  const data = unwrapData(payload);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.docs)) return data.docs;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function normalizeWeek(payload: any): { items: TimetableEntry[]; conflicts: TimetableConflict[] } {
  const data = unwrapData(payload);
  return {
    items: normalizeTimetableItems(payload),
    conflicts: Array.isArray(data?.conflicts) ? data.conflicts : []
  };
}

function withCacheBust(params: Record<string, string> = {}) {
  return { ...params, _t: String(Date.now()) };
}

export const timetableService = {
  week: (params: Record<string, string> = {}) =>
    api.get('/timetable/week', { params: withCacheBust(params) }).then((res) => normalizeWeek(res)),
  list: (params: Record<string, string> = {}) =>
    api.get('/timetable', { params: withCacheBust({ limit: '500', ...params }) }).then((res) => normalizeTimetableItems(res)),
  create: (payload: TimetablePayload) => api.post('/timetable', payload).then((res) => res.data.data as TimetableEntry),
  update: (id: string, payload: Partial<TimetablePayload>) => api.put(`/timetable/${id}`, payload).then((res) => res.data.data as TimetableEntry),
  remove: (id: string) => api.delete(`/timetable/${id}`).then((res) => res.data.data),
  analytics: () => api.get('/timetable/analytics').then((res) => res.data.data as { totalEntries: number; teacherLoad: Record<string, number>; roomUtilization: Record<string, number>; conflicts: TimetableConflict[] }),
  classes: () => api.get('/classes', { params: { limit: 200 } }).then((res) => res.data.data as SelectEntity[]),
  teachers: (params: Record<string, string> = {}) => api.get('/teachers', { params: { limit: 200, ...params } }).then((res) => res.data.data as SelectEntity[]),
  subjects: (classId?: string) => api.get('/subjects', { params: { limit: 200, classId } }).then((res) => res.data.data as SelectEntity[]),
  branches: () => api.get('/branches', { params: { limit: 200 } }).then((res) => res.data.data as SelectEntity[]),
  printView: (params: Record<string, string> = {}) => api.get('/timetable/print-view', { params }).then((res) => res.data.data as TimetablePrintSheet),
  printViewAll: (params: Record<string, string> = {}) => api.get('/timetable/print-view/all', { params }).then((res) => res.data.data as { sheets: TimetablePrintSheet[] }),
  checkConflicts: (payload: TimetablePayload) =>
    api.post('/timetable/check-conflicts', payload).then((res) => res.data.data as { hasConflict: boolean; conflicts: TimetableConflict[]; durationMinutes: number; branchId?: string | null }),
  generateAuto: (payload: AutoGeneratePayload = {}) => api.post('/timetable/generate-auto', payload).then((res) => res.data.data as AutoGenerateResult)
};
