import { api } from '@/services/apiClient';

export interface AttendanceFilters {
  classId?: string;
  studentId?: string;
  status?: string;
  session?: string;
  date?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export interface AttendanceRecord {
  _id: string;
  studentId?: string;
  classId?: string;
  teacherId?: string;
  studentName: string;
  className: string;
  teacherName: string;
  attendanceDate: string;
  session: string;
  status: string;
  source: string;
  notes?: string;
}

export interface AttendanceSummary {
  totalRecords: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  onlineAutoMarked: number;
  studentCount: number;
  classCount: number;
  byStatus: Array<{ status: string; total: number }>;
  bySession: Array<{ session: string; total: number }>;
  recentTrend: Array<{ date: string; present: number; absent: number; late: number }>;
}

export interface AttendanceOptions {
  students: Array<{
    _id: string;
    name: string;
    firstName?: string;
    lastName?: string;
    fatherName?: string;
    studentId?: string;
    phone?: string;
    classId?: string;
    className?: string;
  }>;
  classes: Array<{ _id: string; className: string }>;
}

export interface ScheduleStatus {
  isOpen?: boolean;
  opensAt: string;
  startsAt: string;
  endsAt: string;
  closesAt: string;
  status: 'upcoming' | 'active' | 'closed';
  jalaliDate?: string;
}

export interface ScheduledClass {
  _id: string;
  timetableId?: string;
  className: string;
  classId?: string;
  subjectId?: string;
  teacherId?: string;
  title?: string;
  subjectName?: string;
  teacherName?: string;
  room?: string;
  durationMinutes?: number;
  attendanceStatus?: 'upcoming' | 'active' | 'closed';
  isOpen?: boolean;
  status?: 'upcoming' | 'active' | 'closed';
  opensAt?: string;
  startsAt?: string;
  endsAt?: string;
  closesAt?: string;
  startTime?: string;
  endTime?: string;
  message?: string;
  messageCode?: string;
  currentSessionStatus?: ScheduleStatus | null;
  nextSession?: ScheduleStatus | null;
}

export interface AttendanceSessions {
  active: ScheduledClass[];
  upcoming: ScheduledClass[];
  closed: ScheduledClass[];
  items: ScheduledClass[];
}

export interface AttendanceDailyReport {
  date: string;
  autoClosedCount: number;
  sessions: Array<{
    timetableId: string;
    className: string;
    subjectName: string;
    teacherName: string;
    startTime: string;
    endTime: string;
    totalEnrolledStudents: number;
    presentStudentsCount: number;
    absentStudentsCount: number;
    lateStudentsCount: number;
    attendancePercentage?: number;
    date?: string;
    presentStudents: AttendanceRecord[];
    absentStudents: Array<{ _id: string; studentId?: string; studentName: string }>;
    lateStudents: AttendanceRecord[];
  }>;
}

export const attendanceService = {
  list: (params: AttendanceFilters = {}) =>
    api.get('/attendance', { params: { limit: 100, ...params } }).then((res) => res.data.data as AttendanceRecord[]),
  summary: (params: AttendanceFilters = {}) =>
    api.get('/attendance/summary', { params }).then((res) => res.data.data as AttendanceSummary),
  options: () =>
    api.get('/attendance/options').then((res) => res.data.data as AttendanceOptions),
  activeSessions: () =>
    api.get('/attendance/active-sessions').then((res) => res.data.data as AttendanceSessions),
  dailyReport: (params: AttendanceFilters = {}) =>
    api.get('/attendance/daily-report', { params }).then((res) => res.data.data as AttendanceDailyReport),
  checkIn: (payload: { studentId?: string; classId: string; status?: 'present' | 'late'; notes?: string; source?: 'web' | 'mobile' }) =>
    api.post('/attendance/check-in', payload).then((res) => res.data.data as AttendanceRecord),
  mark: (payload: { timetableId: string; studentId?: string; status?: 'present' | 'late' | 'excused'; notes?: string }) =>
    api.post('/attendance/mark', payload).then((res) => res.data.data as AttendanceRecord),
  create: (payload: {
    studentId: string;
    classId: string;
    attendanceDate: string;
    session: string;
    status: string;
    notes?: string;
    source?: string;
  }) => api.post('/attendance', payload).then((res) => res.data.data as AttendanceRecord)
};
