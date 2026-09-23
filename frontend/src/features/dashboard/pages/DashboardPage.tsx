import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Bell, BookOpen, CalendarDays, ExternalLink, GraduationCap, MessageCircle, Receipt, School, Send, Users } from 'lucide-react';
import { AfghaniIcon } from '@/components/icons/AfghaniIcon';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { chartTheme } from '@/constants/chartTheme';
import { dashboardService, type DashboardPeriod, type DashboardSummary } from '@/features/dashboard/services/dashboardService';
import { DashboardPeriodFilters } from '@/features/dashboard/components/DashboardPeriodFilters';
import { attendanceService } from '@/features/attendance/services/attendanceService';
import { messagesService } from '@/features/messages/services/messagesService';
import { useAuthStore } from '@/store/authStore';
import { normalizeRole } from '@/features/resources/config/modules';
import DashboardAnalytics from '@/features/dashboard/components/DashboardAnalytics';
import { SuperAdminDashboardSections } from '@/features/dashboard/components/SuperAdminDashboardSections';
import { api } from '@/services/apiClient';
import { offlineStudentTeacher, offlineTimetable } from '@/services/offlineData';
import { userCanOpenPath } from '@/features/resources/config/modules';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { formatJalaliMonth } from '@/utils/date';
import { AiInsightSummaryCard } from '@/features/results/components/AiInsightSummaryCard';
import { IntelligentSystemAnalysisSection } from '@/features/dashboard/components/IntelligentSystemAnalysisSection';
import { PhoneContactBlock } from '@/components/contact/PhoneContactBlock';

function formatChartMonth(month: number, language: string) {
  return formatJalaliMonth(2026, month, language);
}

function formatTrendLabel(
  item: { year: number; month: number; day?: number; hour?: number },
  language: string,
  period: DashboardPeriod
) {
  if (period === 'day' && item.hour !== undefined) {
    return `${formatNumber(item.hour, language)}:00`;
  }
  if (period === 'month' && item.day !== undefined) {
    return `${formatNumber(item.day, language)}/${formatNumber(item.month, language)}`;
  }
  return formatJalaliMonth(item.year, item.month, language);
}

type SummaryCardDefinition = {
  icon: typeof GraduationCap;
  labelKey: string;
  valueKey: keyof DashboardSummary;
  gradient: string;
  currency?: boolean;
  path?: string;
  labelOnly?: boolean;
};

function getRoleIntro(role?: string) {
  switch (role) {
    case 'branch_manager':
      return { titleKey: 'dashboard.branch_manager_dashboard', descriptionKey: 'common.live_school_metrics' };
    case 'owner':
      return { titleKey: 'dashboard.owner_dashboard', descriptionKey: 'common.view_financial_reports' };
    case 'parent':
      return { titleKey: 'dashboard.parent_dashboard', descriptionKey: 'common.view_results' };
    case 'teacher':
      return { titleKey: 'dashboard.teacher_dashboard', descriptionKey: 'dashboard.teacher_workspace_description' };
    case 'student':
      return { titleKey: 'dashboard.student_dashboard', descriptionKey: 'common.use_menu' };
    case 'admin':
      return { titleKey: 'dashboard.admin_dashboard', descriptionKey: 'common.live_school_metrics' };
    case 'super_admin':
      return { titleKey: 'dashboard.super_admin_dashboard', descriptionKey: 'common.live_school_metrics' };
    default:
      return { titleKey: 'common.dashboard', descriptionKey: 'common.live_school_metrics' };
  }
}

function getSummaryCardDefinitions(role?: string): SummaryCardDefinition[] {
  const baseCards: SummaryCardDefinition[] = [
    { icon: GraduationCap, labelKey: 'dashboard.total_students', valueKey: 'totalStudents', gradient: 'from-primary via-secondary to-accent', path: '/students' },
    { icon: Users, labelKey: 'dashboard.total_teachers', valueKey: 'totalTeachers', gradient: 'from-secondary via-accent to-primary', path: '/teachers' },
    { icon: School, labelKey: 'dashboard.total_classes', valueKey: 'totalClasses', gradient: 'from-accent via-primary to-secondary', path: '/classes' },
    { icon: BookOpen, labelKey: 'dashboard.total_subjects', valueKey: 'totalSubjects', gradient: 'from-warning via-danger to-secondary', path: '/subjects' }
  ];

  if (role === 'student' || role === 'parent') {
    return [
      { icon: GraduationCap, labelKey: 'dashboard.total_students', valueKey: 'totalStudents', gradient: 'from-primary via-secondary to-accent', path: '/students' },
      { icon: Users, labelKey: 'dashboard.total_teachers', valueKey: 'totalTeachers', gradient: 'from-secondary via-accent to-primary', path: '/teachers' },
      { icon: Bell, labelKey: 'dashboard.notifications', valueKey: 'totalNotifications', gradient: 'from-accent via-primary to-secondary', path: '/notifications' },
      { icon: AfghaniIcon, labelKey: 'common.payments', valueKey: 'outstandingBalance', gradient: 'from-warning via-danger to-secondary', currency: true, path: '/payments' }
    ];
  }

  if (role === 'owner' || role === 'branch_manager') {
    return [
      { icon: AfghaniIcon, labelKey: 'dashboard.total_income', valueKey: 'incomeTotal', gradient: 'from-primary via-secondary to-accent', currency: true, path: '/finance' },
      { icon: AfghaniIcon, labelKey: 'finance.total_expenses', valueKey: 'expenseTotal', gradient: 'from-secondary via-accent to-primary', currency: true, path: '/expenses' },
      { icon: Bell, labelKey: 'dashboard.notifications', valueKey: 'totalNotifications', gradient: 'from-accent via-primary to-secondary', path: '/notifications' },
      { icon: Users, labelKey: 'common.students', valueKey: 'totalStudents', gradient: 'from-warning via-danger to-secondary', path: '/students' }
    ];
  }

  if (role === 'teacher') {
    return [
      { icon: GraduationCap, labelKey: 'dashboard.my_students', valueKey: 'totalStudents', gradient: 'from-primary via-secondary to-accent', path: '/students' },
      { icon: School, labelKey: 'dashboard.my_classes', valueKey: 'totalClasses', gradient: 'from-secondary via-accent to-primary', path: '/classes' },
      { icon: BookOpen, labelKey: 'dashboard.my_subjects', valueKey: 'totalSubjects', gradient: 'from-accent via-primary to-secondary', path: '/subjects' },
      { icon: AfghaniIcon, labelKey: 'finance.total_paid_student_amount', valueKey: 'totalStudentFees', gradient: 'from-warning via-danger to-secondary', currency: true, path: '/payroll' }
    ];
  }

  return baseCards;
}

function getExtendedDashboardCards(role?: string): SummaryCardDefinition[] {
  if (!['super_admin', 'admin', 'accountant', 'owner', 'branch_manager'].includes(String(role))) {
    return [];
  }

  return [
    { icon: CalendarDays, labelKey: 'common.attendance', valueKey: 'totalAttendance', gradient: 'from-cyan-500/80 to-sky-600/80', path: '/attendance' },
    { icon: Receipt, labelKey: 'common.exams', valueKey: 'totalExams', gradient: 'from-indigo-500/80 to-violet-600/80', path: '/exams' },
    { icon: GraduationCap, labelKey: 'common.results', valueKey: 'totalResults', gradient: 'from-emerald-500/80 to-teal-600/80', path: '/results' },
    { icon: AfghaniIcon, labelKey: 'common.payments', valueKey: 'totalPayments', gradient: 'from-amber-500/80 to-orange-600/80', path: '/payments' },
    { icon: MessageCircle, labelKey: 'messages.title', valueKey: 'totalMessages', gradient: 'from-pink-500/80 to-rose-600/80', path: '/messages' },
    { icon: BookOpen, labelKey: 'dashboard.total_books', valueKey: 'totalBooks', gradient: 'from-slate-500/80 to-slate-700/80', path: '/books' },
    { icon: School, labelKey: 'common.courses', valueKey: 'totalClasses', gradient: 'from-blue-500/80 to-indigo-600/80', path: '/courses' },
    { icon: Receipt, labelKey: 'common.reports', valueKey: 'totalReports', gradient: 'from-violet-500/80 to-purple-600/80', path: '/reports' },
    { icon: AfghaniIcon, labelKey: 'common.finance', valueKey: 'totalFinanceEntries', gradient: 'from-green-500/80 to-emerald-600/80', path: '/finance' },
    { icon: AfghaniIcon, labelKey: 'common.payroll_tax', valueKey: 'totalPayments', gradient: 'from-yellow-500/80 to-amber-600/80', path: '/payroll', labelOnly: true }
  ];
}

function SummaryCards({ summary, role }: { summary: DashboardSummary; role?: string }) {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const cards = [...getSummaryCardDefinitions(role), ...getExtendedDashboardCards(role)];

  return (
    <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const canNavigate = card.path && userCanOpenPath(user, card.path);
        const content = (
          <Card className={`border-slate-200/80 bg-gradient-to-br ${card.gradient} p-6 text-white transition hover:scale-[1.01] hover:shadow-lg focus-within:ring-2 focus-within:ring-white/40 dark:border-white/10 ${canNavigate ? 'cursor-pointer' : ''}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white/10 text-white shadow-[0_20px_60px_rgba(79,70,229,0.18)]">
                <card.icon className="h-6 w-6" />
              </div>
              <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-slate-200">{t('dashboard.statistics')}</span>
            </div>
            <div className="mt-6">
              {!card.labelOnly ? (
                <p className="text-3xl font-semibold tracking-tight">
                  {card.currency
                    ? formatCurrency(summary[card.valueKey as keyof DashboardSummary] as number, i18n.resolvedLanguage)
                    : formatNumber(summary[card.valueKey as keyof DashboardSummary] as number, i18n.resolvedLanguage)}
                </p>
              ) : null}
              <p className={`${card.labelOnly ? 'text-xl' : 'mt-1 text-sm'} font-semibold text-slate-100`}>{t(card.labelKey)}</p>
            </div>
          </Card>
        );

        return (
          <motion.div key={`${card.labelKey}-${card.path ?? card.valueKey}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            {canNavigate ? (
              <Link to={card.path!} className="block rounded-[inherit] focus:outline-none" aria-label={t(card.labelKey)}>
                {content}
              </Link>
            ) : (
              content
            )}
          </motion.div>
        );
      })}
    </section>
  );
}

function AnalyticsSection({
  chartData,
  summary,
  role,
  period,
  onPeriodChange,
  periodFilterDisabled
}: {
  chartData: Array<{ name: string; students: number; teachers: number }>;
  summary: DashboardSummary;
  role?: string;
  period: DashboardPeriod;
  onPeriodChange?: (period: DashboardPeriod) => void;
  periodFilterDisabled?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const isTeacher = role === 'teacher';
  const user = useAuthStore((state) => state.user);
  const breakdownCards = isTeacher
    ? [
        { labelKey: 'dashboard.my_students', value: summary.totalStudents, path: '/students' },
        { labelKey: 'dashboard.my_classes', value: summary.totalClasses, path: '/classes' },
        { labelKey: 'dashboard.my_subjects', value: summary.totalSubjects, path: '/subjects' }
      ]
    : [
        { labelKey: 'dashboard.total_books', value: summary.totalBooks, path: '/books' },
        { labelKey: 'dashboard.notifications', value: summary.totalNotifications, path: '/notifications' },
        { labelKey: 'finance.total_expenses', value: summary.expenseTotal, currency: true, path: '/expenses' }
      ];

  return (
    <section className="space-y-4">
      {onPeriodChange ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-200">{t('dashboard.section_analytics')}</h2>
          <DashboardPeriodFilters
            id="dashboard-period-role-analytics"
            variant="inline"
            value={period}
            onChange={onPeriodChange}
            disabled={periodFilterDisabled}
          />
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
      <Card className="p-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{t('common.analytics_overview')}</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
              {isTeacher ? t('dashboard.my_enrollment_trend') : t('dashboard.enrollment_trend')}
            </h2>
          </div>
          <span className="rounded-full border border-slate-200/80 bg-slate-100 px-4 py-2 text-sm text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-white">
            {isTeacher ? t('dashboard.my_workspace') : t('common.chart_school_growth')}
          </span>
        </div>
        <div className="h-[320px] rounded-[32px] bg-slate-50 p-4 dark:bg-white/5">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradientStudents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gradientTeachers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={chartTheme.grid} vertical={false} />
              <XAxis dataKey="name" stroke={chartTheme.axis} tickLine={false} axisLine={false} />
              <YAxis stroke={chartTheme.axis} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={chartTheme.tooltip} />
              <Area type="monotone" dataKey="students" stroke="#38bdf8" strokeWidth={3} fill="url(#gradientStudents)" activeDot={{ r: 8, fill: '#38bdf8' }} />
              <Area type="monotone" dataKey="teachers" stroke="#a855f7" strokeWidth={3} fill="url(#gradientTeachers)" activeDot={{ r: 8, fill: '#a855f7' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-6">
        {breakdownCards.map((card) => {
          const canNavigate = card.path && userCanOpenPath(user, card.path);
          const inner = (
            <Card className={`p-6 ${canNavigate ? 'transition hover:bg-slate-50 dark:hover:bg-white/10' : ''}`}>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{t(card.labelKey)}</p>
              <h3 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
                {card.currency ? formatCurrency(card.value, i18n.resolvedLanguage) : formatNumber(card.value, i18n.resolvedLanguage)}
              </h3>
            </Card>
          );
          return canNavigate ? (
            <Link key={card.labelKey} to={card.path!} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-3xl">
              {inner}
            </Link>
          ) : (
            <div key={card.labelKey}>{inner}</div>
          );
        })}
      </div>
      </div>
    </section>
  );
}

interface TeacherContact {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  whatsappLink?: string;
}

interface TimetableItem {
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
}

const dashboardDayLabels: Record<string, string> = {
  '0': 'common.sunday',
  '1': 'common.monday',
  '2': 'common.tuesday',
  '3': 'common.wednesday',
  '4': 'common.thursday',
  '5': 'common.friday',
  '6': 'common.saturday',
  saturday: 'common.saturday',
  sunday: 'common.sunday',
  monday: 'common.monday',
  tuesday: 'common.tuesday',
  wednesday: 'common.wednesday',
  thursday: 'common.thursday',
  friday: 'common.friday'
};

function getTimetableState(item: TimetableItem) {
  const now = new Date();
  const day = Number(item.dayOfWeek);
  if (!Number.isNaN(day) && day !== now.getDay()) return 'upcoming';
  const [startHour = 0, startMinute = 0] = String(item.startTime ?? '00:00').split(':').map(Number);
  const [endHour = 0, endMinute = 0] = String(item.endTime ?? '00:00').split(':').map(Number);
  const current = now.getHours() * 60 + now.getMinutes();
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  if (current >= start && current < end) return 'active';
  if (current >= end) return 'completed';
  return 'upcoming';
}

function translateAttendanceMessage(t: ReturnType<typeof useTranslation>['t'], message?: string, messageCode?: string) {
  if (messageCode === 'not_started') return t('attendance.session_not_started');
  if (messageCode === 'expired') return t('attendance.session_expired');
  if (messageCode === 'not_active') return t('attendance.session_not_active');
  return message || t('attendance.session_not_active');
}

function StudentSupportSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [teacherSubject, setTeacherSubject] = useState('');
  const [teacherMessage, setTeacherMessage] = useState('');
  const [adminSubject, setAdminSubject] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [status, setStatus] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState('');

  const { data: teacher } = useQuery<TeacherContact | null>({
    queryKey: ['studentTeacherContact'],
    queryFn: () => api.get('/student-messages/my-teacher').then((res) => res.data.data ?? offlineStudentTeacher).catch(() => offlineStudentTeacher)
  });

  const { data: timetable = offlineTimetable } = useQuery<TimetableItem[]>({
    queryKey: ['studentDashboardTimetable'],
    queryFn: () => api.get('/timetable', { params: { limit: 6 } }).then((res) => {
      const data = res.data.data;
      return Array.isArray(data) && data.length ? data : offlineTimetable;
    }).catch(() => offlineTimetable)
  });

  const { data: sessions } = useQuery({
    queryKey: ['student-dashboard-attendance-sessions'],
    queryFn: attendanceService.activeSessions,
    staleTime: 45_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false
  });
  const { data: aiInsightSummary } = useQuery({
    queryKey: ['student-ai-insight-summary'],
    queryFn: () => api.get('/ai-results/me').then((res) => res.data.data ?? null).catch(() => null)
  });

  const checkInMutation = useMutation({
    mutationFn: attendanceService.mark,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-dashboard-attendance-sessions'] });
      setAttendanceStatus(t('attendance.present'));
    },
    onError: (error: any) => {
      const payload = error?.response?.data;
      setAttendanceStatus(translateAttendanceMessage(t, payload?.message, payload?.messageCode));
    }
  });

  const sendTeacherMessage = async () => {
    if (!teacherMessage.trim()) return;
    try {
      // teacherId را نفرستید تا ownership و استاد تعیین‌شده درست اعمال شود
      await api.post('/student-messages', { subject: teacherSubject, message: teacherMessage });
      setStatus(t('common.message_sent'));
      setTeacherSubject('');
      setTeacherMessage('');
    } catch {
      setStatus(t('errors.unable_save'));
    }
  };

  const sendAdminMessage = async () => {
    if (!adminMessage.trim()) return;
    try {
      await messagesService.create({ targetGroup: 'admin', subject: adminSubject, message: adminMessage, category: 'student' });
      setStatus(t('common.message_sent'));
      setAdminSubject('');
      setAdminMessage('');
    } catch {
      setStatus(t('errors.unable_save'));
    }
  };

  const activeSessions = sessions?.active ?? [];
  const upcomingSessions = sessions?.upcoming ?? [];
  const closedSessions = sessions?.closed ?? [];

  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_1.15fr]">
      <div className="space-y-6">
        <Card className="p-6">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">{t('attendance.active_now')}</p>
          <div className="mt-4 space-y-3">
            {activeSessions.length ? activeSessions.map((session) => (
              <div key={session.timetableId ?? session._id} className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4">
                <p className="font-semibold text-slate-100">{session.className}</p>
                <p className="mt-1 text-sm text-slate-300">{session.subjectName} - {session.startTime} - {session.endTime}</p>
                <button
                  type="button"
                  onClick={() => checkInMutation.mutate({ timetableId: session.timetableId ?? session._id, status: 'present' })}
                  disabled={checkInMutation.isPending}
                  className="mt-3 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-slate-950"
                >
                  {t('attendance.check_in')}
                </button>
              </div>
            )) : (
              <p className="text-sm text-slate-400">
                {upcomingSessions[0]
                  ? translateAttendanceMessage(t, upcomingSessions[0].message, upcomingSessions[0].messageCode)
                  : closedSessions[0]
                    ? translateAttendanceMessage(t, closedSessions[0].message, closedSessions[0].messageCode)
                    : t('attendance.session_not_active')}
              </p>
            )}
            {attendanceStatus && <p className="text-sm text-emerald-300">{attendanceStatus}</p>}
          </div>
        </Card>

        <AiInsightSummaryCard summary={aiInsightSummary} variant="student" />

        <Card className="p-6">
          <div className="mb-5 flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-slate-100">{t('common.messages_to_teacher')}</h2>
          </div>
          <p className="text-sm text-slate-400">{teacher?.name || t('common.teacher_contact')}</p>
          {teacher?.phone || teacher?.whatsapp ? (
            <div className="mt-3">
              <PhoneContactBlock phone={teacher.phone} whatsapp={teacher.whatsapp} variant="card" />
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">{teacher?.email || t('common.not_available', { defaultValue: 'Not available' })}</p>
          )}
          <div className="mt-4 grid gap-3">
            <input value={teacherSubject} onChange={(event) => setTeacherSubject(event.target.value)} placeholder={t('common.message_subject')} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100" />
            <textarea value={teacherMessage} onChange={(event) => setTeacherMessage(event.target.value)} placeholder={t('common.message_body')} rows={3} className="resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100" />
            <button type="button" onClick={sendTeacherMessage} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-slate-950">
              <Send className="h-4 w-4" />
              {t('common.send_message')}
            </button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold text-slate-100">{t('common.reach_admin')}</h2>
          <div className="mt-4 grid gap-3">
            <input value={adminSubject} onChange={(event) => setAdminSubject(event.target.value)} placeholder={t('common.message_subject')} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100" />
            <textarea value={adminMessage} onChange={(event) => setAdminMessage(event.target.value)} placeholder={t('common.message_body')} rows={3} className="resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100" />
            <button type="button" onClick={sendAdminMessage} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-slate-100">
              <Send className="h-4 w-4" />
              {t('common.send_message')}
            </button>
            {status && <p className="text-sm text-emerald-300">{status}</p>}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-5 flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-accent" />
          <h2 className="text-xl font-semibold text-slate-100">{t('common.class_timetable')}</h2>
        </div>
        <div className="grid gap-3">
          {timetable.map((item) => (
            <div key={item._id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-slate-100">{item.subjectName || item.className || t('common.subject')}</p>
              <p className="mt-1 text-sm text-slate-400">{t(dashboardDayLabels[String(item.dayOfWeek ?? 'saturday')] ?? 'common.saturday')} | {item.startTime} - {item.endTime}</p>
              {getTimetableState(item) === 'active' && <p className="mt-2 text-xs text-emerald-200">{t('common.current_active_session', { defaultValue: 'Current Active Session' })}</p>}
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

function ParentSupportSection() {
  const { t } = useTranslation();
  const { data: timetable = offlineTimetable } = useQuery<TimetableItem[]>({
    queryKey: ['parentDashboardTimetable'],
    queryFn: () => api.get('/timetable', { params: { limit: 6 } }).then((res) => {
      const data = res.data.data;
      return Array.isArray(data) && data.length ? data : offlineTimetable;
    }).catch(() => offlineTimetable)
  });
  const { data: sessions } = useQuery({
    queryKey: ['parent-dashboard-attendance-sessions'],
    queryFn: attendanceService.activeSessions,
    staleTime: 45_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false
  });
  const { data: aiInsightSummary } = useQuery({
    queryKey: ['parent-ai-insight-summary'],
    queryFn: () => api.get('/ai-results/me').then((res) => res.data.data ?? null).catch(() => null)
  });

  return (
    <section className="grid gap-6 xl:grid-cols-2">
      <AiInsightSummaryCard summary={aiInsightSummary} variant="parent" />

      <Card className="p-6">
        <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">{t('attendance.attendance_summary')}</p>
        <div className="mt-4 space-y-3">
          {(sessions?.active ?? []).map((session) => (
            <div key={session.timetableId ?? session._id} className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4">
              <p className="font-semibold text-slate-100">{session.className}</p>
              <p className="mt-1 text-sm text-slate-300">{session.subjectName} - {t('attendance.active_now')}</p>
            </div>
          ))}
          {!(sessions?.active ?? []).length && (
            <p className="text-sm text-slate-400">{t('attendance.no_active_classes')}</p>
          )}
        </div>
      </Card>
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-slate-100">{t('common.class_timetable')}</h2>
        <div className="mt-4 grid gap-3">
          {timetable.map((item) => (
            <div key={item._id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-slate-100">{item.subjectName || item.className}</p>
              <p className="mt-1 text-sm text-slate-400">{item.startTime} - {item.endTime}</p>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const role = normalizeRole((user?.role as any) ?? null);
  const [period, setPeriod] = useState<DashboardPeriod>('year');

  const { data: summary, isLoading, isError } = useQuery<DashboardSummary>({
    queryKey: ['dashboardSummary', period],
    queryFn: () => dashboardService.summary(period)
  });

  const roleIntro = useMemo(() => getRoleIntro(user?.role), [user?.role]);
  const chartData = useMemo(() => {
    if (summary?.enrollmentTrend?.length) {
      return summary.enrollmentTrend.map((item) => ({
        name: formatTrendLabel(item, i18n.language, period),
        students: item.students || 0,
        teachers: item.teachers || 0
      }));
    }

    return [];
  }, [summary, i18n.language, period]);

  const safeSummary = summary ?? {
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalSubjects: 0,
    totalUsers: 0,
    totalFamilies: 0,
    totalBooks: 0,
    totalAuditLogs: 0,
    totalNotifications: 0,
    expenseTotal: 0,
    incomeTotal: 0,
    paymentIncomeTotal: 0,
    outstandingBalance: 0,
    totalStudentFees: 0,
    totalBranches: 0,
    totalAttendance: 0,
    totalExams: 0,
    totalResults: 0,
    totalPayments: 0,
    totalFinanceEntries: 0,
    totalReports: 0,
    totalMessages: 0,
    payrollNetTotal: 0,
    payrollTaxTotal: 0,
    payrollGrossTotal: 0,
    academyNetTotal: 0,
    enrollmentTrend: [],
    monthlyFinances: [],
    expenseCategoryBreakdown: []
  };

  return (
    <div className="grid gap-6">
      {isError && (
        <Card className="border border-rose-500/40 bg-rose-500/5 p-6 text-rose-200">
          <p>{t('errors.unable_load_records')}</p>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{t('common.dashboard')}</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{t(roleIntro.titleKey)}</h1>
            <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">{t(roleIntro.descriptionKey, { name: user?.name ?? t('common.guest') })}</p>
          </div>
          <DashboardPeriodFilters value={period} onChange={setPeriod} disabled={isLoading} />
          {userCanOpenPath(user, '/dashboard/manage-users') && (
            <button
              type="button"
              onClick={() => navigate('/dashboard/manage-users')}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-primary/90"
            >
              {t('dashboard.manage_users')}
            </button>
          )}
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="h-40 animate-pulse bg-slate-900/70">
                <div className="h-full" />
              </Card>
            ))}
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
            <Card className="h-[360px] animate-pulse bg-slate-900/70">
              <div className="h-full" />
            </Card>
            <Card className="h-[360px] animate-pulse bg-slate-900/70">
              <div className="h-full" />
            </Card>
          </div>
        </div>
      ) : (
        <>
          {role === 'student' && <StudentSupportSection />}
          {role === 'parent' && <ParentSupportSection />}
          {role === 'super_admin' || role === 'admin' ? (
            <>
              <SuperAdminDashboardSections
                summary={safeSummary}
                period={period}
                onPeriodChange={setPeriod}
                disabled={isLoading}
              />
              <DashboardAnalytics
                summary={safeSummary}
                period={period}
                onPeriodChange={setPeriod}
                periodFilterDisabled={isLoading}
                showPeriodFilter
              />
              <IntelligentSystemAnalysisSection
                period={period}
                enabled={['super_admin', 'admin', 'owner', 'branch_manager', 'teacher', 'accountant'].includes(String(role))}
              />
            </>
          ) : (
            <>
              <SummaryCards summary={safeSummary} role={role ?? user?.role} />
              {user?.role === 'owner' || user?.role === 'branch_manager' ? (
                <DashboardAnalytics
                  summary={safeSummary}
                  period={period}
                  onPeriodChange={setPeriod}
                  periodFilterDisabled={isLoading}
                  showPeriodFilter
                />
              ) : (
                <AnalyticsSection
                  chartData={chartData}
                  summary={safeSummary}
                  role={role ?? user?.role}
                  period={period}
                  onPeriodChange={setPeriod}
                  periodFilterDisabled={isLoading}
                />
              )}
              <IntelligentSystemAnalysisSection
                period={period}
                enabled={['super_admin', 'admin', 'owner', 'branch_manager', 'teacher', 'accountant'].includes(String(role))}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
