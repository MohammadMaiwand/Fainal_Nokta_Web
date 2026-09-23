export const offlineHomeCourses: Array<Record<string, unknown>> = [];

export const offlineHomeAnnouncements: Array<Record<string, unknown>> = [];

export const offlineRegistrationOptions = {
  classes: [] as Array<Record<string, unknown>>,
  subjects: [] as Array<Record<string, unknown>>,
  teachers: [] as Array<Record<string, unknown>>
};

export const offlineStudentTeacher = {
  _id: '',
  name: '',
  email: '',
  phone: '',
  whatsapp: '',
  whatsappLink: ''
};

export const offlineTimetable: Array<{
  _id: string;
  className?: string;
  subjectName?: string;
  teacherName?: string;
  dayOfWeek?: string | number;
  startTime?: string;
  endTime?: string;
  room?: string;
  deliveryMode?: string;
  onlineLink?: string;
}> = [];

export const offlineIntelligenceFallback = {
  syncedAt: null as string | null,
  insights: [] as unknown[],
  recommendations: [] as unknown[],
  dashboardInsights: [] as unknown[],
  escalations: [] as unknown[],
  offlineReady: true,
  noticeKey: 'intelligence.offline_cached'
};
