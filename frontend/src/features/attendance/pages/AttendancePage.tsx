import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';
import { ArrowUpDown, Clock, Table2, TimerReset } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PageHeader, DataTable, FormModal, SearchFilterBar } from '@/shared/components/Common';
import { PrintButton, PrintableSection, PrintHeader, ExportButtons } from '@/shared/print';
import { attendanceService } from '@/features/attendance/services/attendanceService';
import { MonthlyAttendanceSheet } from '@/features/attendance/components/MonthlyAttendanceSheet';
import { getJalaliMonthName } from '@/features/attendance/utils/jalaliSchoolDays';
import { timetableService, type TimetablePayload } from '@/features/timetable/services/timetableService';
import { normalizeRole } from '@/features/resources/config/modules';
import { useAuthStore } from '@/store/authStore';
import { useDebounce } from '@/hooks/useDebounce';
import { matchesSearch, sortCollection, type ListSortDirection, type ListSortField } from '@/utils/listSearchSort';
import { formatJalaliDate, formatJalaliTime } from '@/utils/date';
import { JalaliDateInput } from '@/components/forms/JalaliDateInput';
import { formatIsoToJalaliInput, isValidJalaliDateInput, jalaliInputToIsoDate } from '@/utils/jalaliDateInput';
import { registerPrintRecord, searchPrintRecords, type PrintRecord } from '@/shared/print/printRegistry';

function currentJalaliYearMonth() {
  const parts = formatIsoToJalaliInput(new Date()).split('/');
  return {
    year: Number(parts[0]) || 1405,
    month: Number(parts[1]) || 1
  };
}

function translateAttendanceMessage(t: ReturnType<typeof useTranslation>['t'], message?: string, messageCode?: string) {
  if (messageCode === 'not_started') return t('attendance.session_not_started');
  if (messageCode === 'expired') return t('attendance.session_expired');
  if (messageCode === 'not_active') return t('attendance.session_not_active');
  return message || t('attendance.session_not_active');
}

function getStatusBadge(status: string) {
  if (status === 'present' || status === 'online_auto_marked') {
    return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200';
  }
  if (status === 'absent') {
    return 'border-rose-400/30 bg-rose-500/10 text-rose-200';
  }
  if (status === 'late') {
    return 'border-amber-400/30 bg-amber-500/10 text-amber-100';
  }
  return 'border-slate-700 bg-slate-900/70 text-slate-300';
}

export function AttendancePage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const role = normalizeRole((user?.role as any) ?? null);
  const canManage = ['super_admin', 'admin', 'branch_manager', 'teacher'].includes(role ?? '');
  const canCreateSession = ['super_admin', 'admin'].includes(role ?? '');
  const canSelfCheckIn = role === 'student';

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const [filters, setFilters] = useState({
    classId: '',
    status: '',
    session: '',
    date: ''
  });
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<ListSortField>('date');
  const [sortDirection, setSortDirection] = useState<ListSortDirection>('desc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [showMonthlySheet, setShowMonthlySheet] = useState(false);
  const initialJalali = currentJalaliYearMonth();
  const [sheetClassId, setSheetClassId] = useState('');
  const [sheetYear, setSheetYear] = useState(initialJalali.year);
  const [sheetMonth, setSheetMonth] = useState(initialJalali.month);
  const [sheetMode, setSheetMode] = useState<'students' | 'blank'>('blank');
  const [attendancePrintRecord, setAttendancePrintRecord] = useState<PrintRecord | null>(null);
  const [attendancePrintSearch, setAttendancePrintSearch] = useState('');
  const [attendancePrintHistory, setAttendancePrintHistory] = useState<PrintRecord[]>([]);
  const [formError, setFormError] = useState('');
  const [sessionError, setSessionError] = useState('');
  const [sessionForm, setSessionForm] = useState<TimetablePayload>({
    classId: '',
    subjectId: '',
    teacherId: '',
    room: '',
    dayOfWeek: new Date().getDay(),
    startTime: `${String(new Date().getHours()).padStart(2, '0')}:00`,
    endTime: `${String(Math.min(new Date().getHours() + 1, 23)).padStart(2, '0')}:00`,
    academicYear: '1405',
    semester: 'semester_1',
    isActive: true
  });
  const [formData, setFormData] = useState({
    studentId: '',
    classId: '',
    attendanceDate: formatIsoToJalaliInput(new Date()),
    session: 'morning',
    status: 'present',
    notes: ''
  });
  const debouncedSearch = useDebounce(search, 300);

  const queryFilters = useMemo(() => {
    return Object.entries(filters).reduce((acc, [key, value]) => {
      if (!value) return acc;
      if (key === 'date') {
        const isoDate = jalaliInputToIsoDate(value);
        if (isoDate) acc.date = isoDate;
        return acc;
      }
      acc[key as keyof typeof filters] = value;
      return acc;
    }, {} as Record<string, string>);
  }, [filters]);

  const { data: summary, isLoading: summaryLoading, isError } = useQuery({
    queryKey: ['attendance-summary', queryFilters],
    queryFn: () => attendanceService.summary(queryFilters)
  });

  const { data: records, isLoading: recordsLoading } = useQuery({
    queryKey: ['attendance-records', queryFilters],
    queryFn: () => attendanceService.list(queryFilters)
  });

  const { data: options, isLoading: optionsLoading } = useQuery({
    queryKey: ['attendance-options', role],
    queryFn: attendanceService.options
  });
  const { data: timetableClasses = [] } = useQuery({
    queryKey: ['attendance-session-classes'],
    queryFn: timetableService.classes,
    enabled: canCreateSession
  });
  const { data: sessionSubjects = [] } = useQuery({
    queryKey: ['attendance-session-subjects', sessionForm.classId],
    queryFn: () => timetableService.subjects(sessionForm.classId),
    enabled: canCreateSession && Boolean(sessionForm.classId)
  });
  const { data: sessionTeachers = [] } = useQuery({
    queryKey: ['attendance-session-teachers', sessionForm.classId, sessionForm.subjectId],
    queryFn: () => timetableService.teachers(sessionForm.classId && sessionForm.subjectId ? { classId: sessionForm.classId, subjectId: sessionForm.subjectId } : {}),
    enabled: canCreateSession && Boolean(sessionForm.classId && sessionForm.subjectId)
  });

  const { data: sessions } = useQuery({
    queryKey: ['attendance-active-sessions'],
    queryFn: attendanceService.activeSessions,
    staleTime: 45_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false
  });
  const { data: dailyReport } = useQuery({
    queryKey: ['attendance-daily-report', queryFilters],
    queryFn: () => attendanceService.dailyReport(queryFilters),
    enabled: canManage
  });
  const activeClasses = sessions?.active ?? [];
  const upcomingClasses = sessions?.upcoming ?? [];
  const closedClasses = sessions?.closed ?? [];

  const statusOptions = useMemo(
    () => [
      { value: '', label: t('attendance.all_statuses', { defaultValue: 'All statuses' }) },
      { value: 'present', label: t('attendance.present', { defaultValue: 'Present' }) },
      { value: 'absent', label: t('attendance.absent', { defaultValue: 'Absent' }) },
      { value: 'late', label: t('attendance.late', { defaultValue: 'Late' }) },
      { value: 'excused', label: t('attendance.excused', { defaultValue: 'Excused' }) },
      { value: 'online_auto_marked', label: t('attendance.online_auto_marked', { defaultValue: 'Online auto marked' }) }
    ],
    [t]
  );

  const sessionOptions = useMemo(
    () => [
      { value: '', label: t('attendance.all_sessions', { defaultValue: 'All sessions' }) },
      { value: 'morning', label: t('attendance.session_morning', { defaultValue: 'Morning' }) },
      { value: 'afternoon', label: t('attendance.session_afternoon', { defaultValue: 'Afternoon' }) },
      { value: 'evening', label: t('attendance.session_evening', { defaultValue: 'Evening' }) },
      { value: 'online', label: t('attendance.session_online', { defaultValue: 'Online' }) }
    ],
    [t]
  );

  const formStatusOptions = useMemo(() => statusOptions.filter((item) => item.value), [statusOptions]);
  const formSessionOptions = useMemo(() => sessionOptions.filter((item) => item.value), [sessionOptions]);
  const recordSortOptions = useMemo(
    () => [
      { value: 'name', label: t('common.sort_name', { defaultValue: 'Sort by Name' }) },
      { value: 'date', label: t('common.sort_date', { defaultValue: 'Sort by Date' }) }
    ],
    [t]
  );

  const createMutation = useMutation({
    mutationFn: attendanceService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      setIsModalOpen(false);
      setFormError('');
      setFormData({
        studentId: '',
        classId: '',
        attendanceDate: formatIsoToJalaliInput(new Date()),
        session: 'morning',
        status: 'present',
        notes: ''
      });
    },
    onError: (error: any) => {
      setFormError(error?.response?.data?.message ?? error?.message ?? t('attendance.record_error', { defaultValue: 'Unable to record attendance.' }));
    }
  });

  const checkInMutation = useMutation({
    mutationFn: attendanceService.mark,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-active-sessions'] });
    },
    onError: (error: any) => {
      const payload = error?.response?.data;
      setFormError(translateAttendanceMessage(t, payload?.message, payload?.messageCode) || t('attendance.record_error', { defaultValue: 'Unable to record attendance.' }));
    }
  });

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const conflict = await timetableService.checkConflicts(sessionForm);
      if (conflict.hasConflict) {
        throw new Error(conflict.conflicts.map((item) => item.message).join(' '));
      }
      return timetableService.create(sessionForm);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-active-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-daily-report'] });
      setIsSessionModalOpen(false);
      setSessionError('');
    },
    onError: (error: any) => {
      setSessionError(error?.response?.data?.message ?? error?.message ?? t('attendance.session_create_error', { defaultValue: 'Unable to create attendance session.' }));
    }
  });

  const classOptions = useMemo(() => {
    return [
      { value: '', label: t('attendance.all_classes', { defaultValue: 'All classes' }) },
      ...((options?.classes ?? []).map((item) => ({ value: item._id, label: item.className })))
    ];
  }, [options, t]);

  const sheetClassOptions = useMemo(
    () => (options?.classes ?? []).map((item) => ({ value: item._id, label: item.className })),
    [options]
  );

  const sheetMonthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const month = index + 1;
        return { value: String(month), label: `${month} - ${getJalaliMonthName(month)}` };
      }),
    []
  );

  const sheetYearOptions = useMemo(() => {
    const base = initialJalali.year;
    return [base - 1, base, base + 1].map((year) => ({ value: String(year), label: String(year) }));
  }, [initialJalali.year]);

  const sheetClassName = useMemo(
    () => (options?.classes ?? []).find((item) => item._id === sheetClassId)?.className ?? '',
    [options, sheetClassId]
  );

  const sheetStudents = useMemo(() => {
    if (!sheetClassId) return [];
    return (options?.students ?? []).filter((student) => String(student.classId ?? '') === sheetClassId);
  }, [options, sheetClassId]);

  const prepareAttendanceOutput = async (outputType: 'print' | 'pdf' | 'excel') => {
    const record = await registerPrintRecord({
      documentType: 'attendance_sheet',
      outputType,
      title: `${t('attendance.monthly_sheet')} - ${sheetMode === 'blank' ? t('attendance.sheet_blank', { defaultValue: 'ورق سفید' }) : sheetClassName}`,
      metadata: { classId: sheetClassId, className: sheetClassName, year: sheetYear, month: sheetMonth, mode: sheetMode }
    });
    setAttendancePrintRecord(record);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    return true;
  };

  const runAttendancePrintSearch = async () => {
    setAttendancePrintHistory(await searchPrintRecords(attendancePrintSearch));
  };

  const studentOptions = useMemo(() => {
    return (options?.students ?? []).map((student) => ({
      value: student._id,
      label: student.className ? `${student.name} - ${student.className}` : student.name
    }));
  }, [options]);

  const columns = [
    {
      key: 'studentName',
      label: t('results.student', { defaultValue: 'Student' })
    },
    {
      key: 'className',
      label: t('students.class', { defaultValue: 'Class' })
    },
    {
      key: 'teacherName',
      label: t('students.teacher', { defaultValue: 'Teacher' })
    },
    {
      key: 'attendanceDate',
      label: t('common.date', { defaultValue: 'Date' }),
      render: (item: any) => formatJalaliDate(item.attendanceDate, i18n.resolvedLanguage)
    },
    {
      key: 'session',
      label: t('attendance.session', { defaultValue: 'Session' }),
      render: (item: any) => t(`attendance.session_${item.session}`, { defaultValue: String(item.session) })
    },
    {
      key: 'status',
      label: t('attendance.status', { defaultValue: 'Status' }),
      render: (item: any) => (
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs capitalize ${getStatusBadge(item.status)}`}>
          {t(`attendance.${item.status}`, { defaultValue: String(item.status).replace(/_/g, ' ') })}
        </span>
      )
    },
    {
      key: 'source',
      label: t('attendance.source', { defaultValue: 'Source' }),
      render: (item: any) => t(`attendance.source_${item.source}`, { defaultValue: String(item.source).replace(/_/g, ' ') })
    }
  ];

  const visibleRecords = useMemo(() => {
    const filtered = (records ?? []).filter((record) => matchesSearch(record, debouncedSearch));
    return sortCollection(filtered, sortField, sortDirection);
  }, [debouncedSearch, records, sortDirection, sortField]);

  const formatDuration = (target?: string) => {
    if (!target) return '';
    const remaining = new Date(target).getTime() - now.getTime();
    if (remaining <= 0) return '00:00';
    const totalSeconds = Math.floor(remaining / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="common.attendance"
        description={t('attendance.page_description', {
          defaultValue: 'Track daily attendance, filter by class or session, and review role-scoped attendance health.'
        })}
        actions={
          <div className="flex flex-wrap gap-3">
            <PrintButton
              targetId="attendance-print-root"
              title={t('common.attendance')}
              orientation="portrait"
              label={t('common.print')}
            />
            <ExportButtons
              targetId="attendance-print-root"
              title={t('common.attendance')}
              fileName="attendance-report"
              orientation="portrait"
            />
            {canManage && (
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => {
                  setShowMonthlySheet(true);
                  setSheetClassId((current) => current || filters.classId || '');
                }}
              >
                <Table2 className="h-4 w-4" />
                {t('attendance.monthly_sheet', { defaultValue: 'ورق حاضری ماهانه' })}
              </Button>
            )}
            {canManage && (
              <Button type="button" onClick={() => setIsModalOpen(true)}>
                {t('common.add_entity', { entity: t('common.attendance_record', { defaultValue: 'Attendance Record' }) })}
              </Button>
            )}
            {canCreateSession && (
              <Button type="button" variant="outline" onClick={() => setIsSessionModalOpen(true)}>
                {t('attendance.create_class_session', { defaultValue: 'فعال‌سازی حاضری صنف' })}
              </Button>
            )}
          </div>
        }
      />

      {showMonthlySheet && canManage ? (
        <Card className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 no-print" data-no-print>
            <div>
              <p className="text-lg font-semibold text-white">
                {t('attendance.monthly_sheet', { defaultValue: 'ورق حاضری ماهانه' })}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {t('attendance.monthly_sheet_hint', {
                  defaultValue:
                    'صنف را انتخاب کنید. اسم، ولد، ثبت نام و تلیفون شاگردان همان صنف در جدول پر می‌شود؛ ستون روزها خالی می‌ماند برای علامت دستی. چاپ و خروجی PDF/Excel فعال است.'
                })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <PrintButton
                targetId="attendance-month-sheet-print-root"
                orientation="landscape"
                label={t('attendance.sheet_print', { defaultValue: 'چاپ ورق حاضری' })}
                getOptions={() => ({
                  direction: i18n.resolvedLanguage === 'en' ? 'ltr' : 'rtl',
                  title: undefined
                })}
                beforePrint={() => prepareAttendanceOutput('print')}
              />
              <ExportButtons
                targetId="attendance-month-sheet-print-root"
                fileName={`attendance-sheet-${sheetClassName || 'class'}-${sheetYear}-${sheetMonth}`}
                orientation="landscape"
                beforeExport={(format) => prepareAttendanceOutput(format)}
              />
              <Button type="button" variant="ghost" onClick={() => setShowMonthlySheet(false)}>
                {t('attendance.close_sheet', { defaultValue: 'بستن ورق' })}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4 no-print" data-no-print>
            <div>
              <label className="mb-2 block text-sm text-slate-300">نوع ورق</label>
              <Select
                value={sheetMode}
                options={[
                  { value: 'students', label: t('attendance.sheet_with_students', { defaultValue: 'با اسم شاگردان صنف' }) },
                  { value: 'blank', label: t('attendance.sheet_blank', { defaultValue: 'ورق سفید برای نام‌نویسی دستی' }) }
                ]}
                onChange={(value) => setSheetMode(value === 'blank' ? 'blank' : 'students')}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">{t('common.class', { defaultValue: 'Class' })}</label>
              <Select
                value={sheetClassId}
                options={sheetClassOptions}
                placeholder={t('attendance.select_class', { defaultValue: 'Select class' })}
                onChange={(value) => {
                  const classId = String(value);
                  setSheetClassId(classId);
                  if (classId) setSheetMode('students');
                }}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">{t('attendance.sheet_year', { defaultValue: 'سال' })}</label>
              <Select
                value={String(sheetYear)}
                options={sheetYearOptions}
                onChange={(value) => setSheetYear(Number(value))}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">{t('attendance.sheet_month', { defaultValue: 'ماه' })}</label>
              <Select
                value={String(sheetMonth)}
                options={sheetMonthOptions}
                onChange={(value) => setSheetMonth(Number(value))}
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
            <PrintableSection id="attendance-month-sheet-print-root" printRoot="attendance-month-sheet">
              <MonthlyAttendanceSheet
                className={sheetClassName}
                year={sheetYear}
                month={sheetMonth}
                students={sheetStudents}
                serialNumber={attendancePrintRecord?.serialNumber}
                blankOnly={sheetMode === 'blank' || !sheetClassId}
              />
            </PrintableSection>
          </div>
        </Card>
      ) : null}

      {showMonthlySheet && canManage ? (
        <Card className="space-y-3 p-4 no-print" data-no-print>
          <p className="font-semibold text-slate-900 dark:text-slate-100">{t('attendance.print_search_title')}</p>
          <div className="flex flex-wrap gap-2">
            <Input value={attendancePrintSearch} onChange={(event) => setAttendancePrintSearch(event.target.value)} placeholder={t('attendance.print_search_placeholder')} />
            <Button type="button" variant="outline" onClick={() => void runAttendancePrintSearch()}>{t('attendance.search')}</Button>
          </div>
          {attendancePrintHistory.map((record) => (
            <p key={record.serialNumber} className="text-sm text-slate-700 dark:text-slate-300">
              {record.serialNumber} — {record.title} — {record.outputType}
            </p>
          ))}
        </Card>
      ) : null}

      <PrintableSection id="attendance-print-root" printRoot="attendance-report" className="print-report-source space-y-4 rounded-2xl border border-slate-200/80 bg-white p-4 text-slate-900">
        <PrintHeader
          title={t('common.attendance')}
          subtitle={t('attendance.page_description', {
            defaultValue: 'Attendance records and summary'
          })}
          printedBy={user?.name}
          filterSummary={[
            filters.classId ? `${t('common.class')}` : '',
            filters.status ? `${t('attendance.status')}: ${t(`attendance.${filters.status}`, { defaultValue: filters.status })}` : '',
            filters.session ? `${t('attendance.session')}: ${filters.session}` : '',
            filters.date ? `${t('common.date')}: ${filters.date}` : ''
          ]
            .filter(Boolean)
            .join(' | ') || t('common.all', { defaultValue: 'All' })}
        />

        <div className="print-summary-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-5 print:grid-cols-5">
          <div className="rounded-xl border border-slate-300 p-3">
            <p className="text-xs text-slate-600">{t('attendance.total_records', { defaultValue: 'Total Records' })}</p>
            <p className="mt-1 text-xl font-bold">{summary?.totalRecords ?? 0}</p>
          </div>
          <div className="rounded-xl border border-slate-300 p-3">
            <p className="text-xs text-slate-600">{t('attendance.present', { defaultValue: 'Present' })}</p>
            <p className="mt-1 text-xl font-bold">{summary?.present ?? 0}</p>
          </div>
          <div className="rounded-xl border border-slate-300 p-3">
            <p className="text-xs text-slate-600">{t('attendance.absent', { defaultValue: 'Absent' })}</p>
            <p className="mt-1 text-xl font-bold">{summary?.absent ?? 0}</p>
          </div>
          <div className="rounded-xl border border-slate-300 p-3">
            <p className="text-xs text-slate-600">{t('attendance.late', { defaultValue: 'Late' })}</p>
            <p className="mt-1 text-xl font-bold">{summary?.late ?? 0}</p>
          </div>
          <div className="rounded-xl border border-slate-300 p-3">
            <p className="text-xs text-slate-600">{t('attendance.students_covered', { defaultValue: 'Students Covered' })}</p>
            <p className="mt-1 text-xl font-bold">{summary?.studentCount ?? 0}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="print-table min-w-full text-sm">
            <thead>
              <tr>
                <th>{t('results.student', { defaultValue: 'Student' })}</th>
                <th>{t('students.class', { defaultValue: 'Class' })}</th>
                <th>{t('students.teacher', { defaultValue: 'Teacher' })}</th>
                <th>{t('common.date', { defaultValue: 'Date' })}</th>
                <th>{t('attendance.session', { defaultValue: 'Session' })}</th>
                <th>{t('attendance.status', { defaultValue: 'Status' })}</th>
                <th>{t('attendance.source', { defaultValue: 'Source' })}</th>
              </tr>
            </thead>
            <tbody>
              {visibleRecords.map((item: any) => (
                <tr key={String(item._id)} data-print-row>
                  <td>{item.studentName || '—'}</td>
                  <td>{item.className || '—'}</td>
                  <td>{item.teacherName || '—'}</td>
                  <td>{formatJalaliDate(item.attendanceDate, i18n.resolvedLanguage)}</td>
                  <td>{t(`attendance.session_${item.session}`, { defaultValue: String(item.session || '—') })}</td>
                  <td>{t(`attendance.${item.status}`, { defaultValue: String(item.status || '—').replace(/_/g, ' ') })}</td>
                  <td>{t(`attendance.source_${item.source}`, { defaultValue: String(item.source || '—').replace(/_/g, ' ') })}</td>
                </tr>
              ))}
              {!visibleRecords.length ? (
                <tr data-print-row>
                  <td colSpan={7}>{t('common.no_records_found')}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </PrintableSection>

      {isError && <Card className="p-6 text-rose-200 no-print" data-no-print>{t('attendance.load_error', { defaultValue: 'Unable to load attendance data.' })}</Card>}
      {formError && <Card className="border border-rose-500/40 bg-rose-500/5 p-4 text-rose-200">{formError}</Card>}
      {sessionError && <Card className="border border-rose-500/40 bg-rose-500/5 p-4 text-rose-200">{sessionError}</Card>}

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">{t('attendance.active_now', { defaultValue: 'Active Now' })}</p>
            <Clock className="h-5 w-5 text-emerald-300" />
          </div>
          <div className="space-y-3">
            {activeClasses.length ? activeClasses.map((klass) => (
              <div key={klass.timetableId ?? klass._id} className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-white">{klass.className}</p>
                    <p className="mt-1 text-sm text-slate-300">{klass.subjectName || t('common.subject')} - {klass.teacherName || t('common.teacher')}</p>
                    <p className="mt-1 text-xs text-emerald-200">{t('attendance.closes_in', { defaultValue: 'Closes in' })}: {formatDuration(klass.closesAt ?? klass.currentSessionStatus?.closesAt)}</p>
                  </div>
                  {canSelfCheckIn ? (
                    <Button size="sm" onClick={() => checkInMutation.mutate({ timetableId: klass.timetableId ?? klass._id, status: 'present' })} disabled={checkInMutation.isPending}>
                      {t('attendance.check_in', { defaultValue: 'Check in' })}
                    </Button>
                  ) : null}
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-emerald-400" style={{ width: '68%' }} />
                </div>
              </div>
            )) : <p className="text-sm text-slate-400">{t('attendance.no_active_classes', { defaultValue: 'No active classes right now.' })}</p>}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm uppercase tracking-[0.25em] text-sky-300">{t('attendance.upcoming', { defaultValue: 'Upcoming' })}</p>
            <TimerReset className="h-5 w-5 text-sky-300" />
          </div>
          <div className="space-y-3">
            {upcomingClasses.length ? upcomingClasses.slice(0, 5).map((klass) => (
              <div key={klass.timetableId ?? klass._id} className="rounded-xl border border-sky-400/20 bg-sky-500/10 p-4">
                <p className="font-semibold text-white">{klass.className}</p>
                <p className="mt-1 text-sm text-slate-300">{klass.subjectName || t('common.subject')} - {klass.teacherName || t('common.teacher')}</p>
                <p className="mt-1 text-sm text-slate-300">{formatJalaliDate(klass.startsAt, i18n.resolvedLanguage)} - {formatJalaliTime(klass.startsAt)}</p>
                <p className="mt-1 text-xs text-sky-200">{translateAttendanceMessage(t, klass.message, klass.messageCode)}</p>
                <Button className="mt-3" size="sm" variant="outline" disabled>{t('attendance.upcoming', { defaultValue: 'Upcoming' })}</Button>
              </div>
            )) : <p className="text-sm text-slate-400">{t('attendance.no_upcoming_classes', { defaultValue: 'No upcoming scheduled classes.' })}</p>}
          </div>
        </Card>

        <Card className="p-5">
          <p className="mb-4 text-sm uppercase tracking-[0.25em] text-slate-400">{t('attendance.closed', { defaultValue: 'Closed' })}</p>
          <div className="space-y-3">
            {closedClasses.length ? closedClasses.slice(0, 6).map((klass) => (
              <div key={klass.timetableId ?? klass._id} className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                <p className="font-semibold text-white">{klass.className}</p>
                <p className="mt-1 text-sm text-slate-400">{klass.subjectName || t('common.subject')} - {klass.startTime}-{klass.endTime}</p>
                <p className="mt-1 text-sm text-slate-400">{translateAttendanceMessage(t, klass.message, klass.messageCode)}</p>
                <Button className="mt-3" size="sm" variant="outline" disabled>{t('attendance.closed', { defaultValue: 'Closed' })}</Button>
              </div>
            )) : <p className="text-sm text-slate-400">{t('attendance.no_closed_classes', { defaultValue: 'No closed classes to show.' })}</p>}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm text-slate-300">{t('common.class', { defaultValue: 'Class' })}</label>
            <Select value={filters.classId} options={classOptions} placeholder={t('attendance.all_classes', { defaultValue: 'All classes' })} onChange={(value) => setFilters((current) => ({ ...current, classId: String(value) }))} />
          </div>
          <div>
            <label className="mb-2 block text-sm text-slate-300">{t('attendance.status', { defaultValue: 'Status' })}</label>
            <Select value={filters.status} options={statusOptions} placeholder={t('attendance.all_statuses', { defaultValue: 'All statuses' })} onChange={(value) => setFilters((current) => ({ ...current, status: String(value) }))} />
          </div>
          <div>
            <label className="mb-2 block text-sm text-slate-300">{t('attendance.session', { defaultValue: 'Session' })}</label>
            <Select value={filters.session} options={sessionOptions} placeholder={t('attendance.all_sessions', { defaultValue: 'All sessions' })} onChange={(value) => setFilters((current) => ({ ...current, session: String(value) }))} />
          </div>
          <div>
            <label className="mb-2 block text-sm text-slate-300">{t('common.date', { defaultValue: 'Date' })}</label>
            <JalaliDateInput value={filters.date} onChange={(date) => setFilters((current) => ({ ...current, date }))} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setFilters({ classId: '', status: '', session: '', date: '' })}
          >
            {t('attendance.clear_filters', { defaultValue: 'Clear Filters' })}
          </Button>
        </div>
      </Card>

      {canManage && (
        <Card className="p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{t('attendance.daily_report', { defaultValue: 'Daily Report' })}</p>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {(dailyReport?.sessions ?? []).slice(0, 6).map((session) => (
              <div key={session.timetableId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{session.className}</p>
                    <p className="mt-1 text-sm text-slate-300">{session.subjectName} - {session.teacherName}</p>
                    <p className="mt-1 text-xs text-slate-400">{session.startTime} - {session.endTime}</p>
                  </div>
                  <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs text-slate-200">{session.totalEnrolledStudents} {t('common.students')}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-center text-sm sm:grid-cols-4">
                  <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-100">{session.presentStudentsCount}<br />{t('attendance.present')}</div>
                  <div className="rounded-xl bg-rose-500/10 p-3 text-rose-100">{session.absentStudentsCount}<br />{t('attendance.absent')}</div>
                  <div className="rounded-xl bg-amber-500/10 p-3 text-amber-100">{session.lateStudentsCount}<br />{t('attendance.late')}</div>
                  <div className="rounded-xl bg-sky-500/10 p-3 text-sky-100">{session.attendancePercentage ?? 0}%<br />{t('attendance.attendance_percentage')}</div>
                </div>
              </div>
            ))}
            {!dailyReport?.sessions?.length && <p className="text-sm text-slate-400">{t('common.no_records_found')}</p>}
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="p-6"><p className="text-sm text-slate-400">{t('attendance.total_records', { defaultValue: 'Total Records' })}</p><p className="mt-3 text-3xl font-semibold text-white">{summaryLoading ? '...' : summary?.totalRecords ?? 0}</p></Card>
        <Card className="p-6"><p className="text-sm text-slate-400">{t('attendance.present', { defaultValue: 'Present' })}</p><p className="mt-3 text-3xl font-semibold text-white">{summaryLoading ? '...' : summary?.present ?? 0}</p></Card>
        <Card className="p-6"><p className="text-sm text-slate-400">{t('attendance.absent', { defaultValue: 'Absent' })}</p><p className="mt-3 text-3xl font-semibold text-white">{summaryLoading ? '...' : summary?.absent ?? 0}</p></Card>
        <Card className="p-6"><p className="text-sm text-slate-400">{t('attendance.late', { defaultValue: 'Late' })}</p><p className="mt-3 text-3xl font-semibold text-white">{summaryLoading ? '...' : summary?.late ?? 0}</p></Card>
        <Card className="p-6"><p className="text-sm text-slate-400">{t('attendance.students_covered', { defaultValue: 'Students Covered' })}</p><p className="mt-3 text-3xl font-semibold text-white">{summaryLoading ? '...' : summary?.studentCount ?? 0}</p></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{t('attendance.attendance_trend', { defaultValue: 'Attendance Trend' })}</p>
          <div className="mt-6 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summary?.recentTrend ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Line type="monotone" dataKey="present" stroke="#22c55e" strokeWidth={3} />
                <Line type="monotone" dataKey="absent" stroke="#fb7185" strokeWidth={3} />
                <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{t('attendance.session_breakdown', { defaultValue: 'Session Breakdown' })}</p>
          <div className="mt-6 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.bySession ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="session" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="total" fill="#38bdf8" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{t('attendance.records_title', { defaultValue: 'Attendance Records' })}</p>
        <div className="mt-4 space-y-4">
          <SearchFilterBar
            value={search}
            onChange={setSearch}
            placeholder={t('common.search_placeholder', { entity: t('attendance.records_title', { defaultValue: 'Attendance Records' }) })}
            createVisible={false}
            extraActions={
              <>
                <div className="w-full sm:w-56">
                  <Select
                    value={sortField}
                    options={recordSortOptions}
                    placeholder={t('common.sort', { defaultValue: 'Sort' })}
                    onChange={(value) => setSortField(String(value) as ListSortField)}
                  />
                </div>
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))}>
                  <ArrowUpDown className="h-4 w-4" />
                  {t(sortDirection === 'asc' ? 'common.ascending' : 'common.descending', {
                    defaultValue: sortDirection === 'asc' ? 'ASC' : 'DESC'
                  })}
                </Button>
              </>
            }
          />
          {recordsLoading ? (
            <div className="text-slate-400">{t('attendance.loading_records', { defaultValue: 'Loading attendance records...' })}</div>
          ) : !visibleRecords.length ? (
            <div className="text-slate-400">{t('common.no_records_found', { defaultValue: 'No attendance records found.' })}</div>
          ) : (
            <DataTable columns={columns} items={visibleRecords} />
          )}
        </div>
      </Card>

      {isModalOpen && canManage && (
        <FormModal
          open={isModalOpen}
          title={t('attendance.record_attendance', { defaultValue: 'Record Attendance' })}
          onClose={() => {
            setIsModalOpen(false);
            setFormError('');
          }}
          onSubmit={(event) => {
            event.preventDefault();

            if (!formData.studentId || !formData.classId || !formData.attendanceDate) {
              setFormError(t('attendance.required_fields', { defaultValue: 'Student, class, and attendance date are required.' }));
              return;
            }

            if (!isValidJalaliDateInput(formData.attendanceDate)) {
              setFormError(t('errors.invalid_jalali_date', { defaultValue: 'Date must be in Hijri Shamsi format, for example 1405/2/1.' }));
              return;
            }

            const attendanceDate = jalaliInputToIsoDate(formData.attendanceDate);
            if (!attendanceDate) {
              setFormError(t('errors.invalid_jalali_date', { defaultValue: 'Date must be in Hijri Shamsi format, for example 1405/2/1.' }));
              return;
            }

            createMutation.mutate({
              studentId: formData.studentId,
              classId: formData.classId,
              attendanceDate,
              session: formData.session,
              status: formData.status,
              notes: formData.notes,
              source: 'web'
            });
          }}
          submitLabel={t('attendance.save_attendance', { defaultValue: 'Save Attendance' })}
          loading={createMutation.isPending}
        >
          {formError && <div className="rounded-2xl border border-rose-500/50 bg-rose-500/10 p-3 text-sm text-rose-200">{formError}</div>}

          <div>
            <label className="mb-1 block text-sm text-slate-300">{t('common.student', { defaultValue: 'Student' })}</label>
            <Select
              value={formData.studentId}
              options={studentOptions}
              placeholder={optionsLoading ? t('attendance.loading_students', { defaultValue: 'Loading students...' }) : t('attendance.select_student', { defaultValue: 'Select student' })}
              onChange={(value) => {
                const studentId = String(value);
                const selectedStudent = (options?.students ?? []).find((item) => item._id === studentId);
                setFormData((current) => ({
                  ...current,
                  studentId,
                  classId: selectedStudent?.classId ?? current.classId
                }));
              }}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">{t('common.class', { defaultValue: 'Class' })}</label>
            <Select
              value={formData.classId}
              options={(options?.classes ?? []).map((item) => ({ value: item._id, label: item.className }))}
              placeholder={optionsLoading ? t('attendance.loading_classes', { defaultValue: 'Loading classes...' }) : t('attendance.select_class', { defaultValue: 'Select class' })}
              onChange={(value) => setFormData((current) => ({ ...current, classId: String(value) }))}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm text-slate-300">{t('common.date', { defaultValue: 'Date' })}</label>
              <JalaliDateInput
                value={formData.attendanceDate}
                required
                onChange={(attendanceDate) => setFormData((current) => ({ ...current, attendanceDate }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">{t('attendance.session', { defaultValue: 'Session' })}</label>
              <Select value={formData.session} options={formSessionOptions} onChange={(value) => setFormData((current) => ({ ...current, session: String(value) }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">{t('attendance.status', { defaultValue: 'Status' })}</label>
              <Select value={formData.status} options={formStatusOptions} onChange={(value) => setFormData((current) => ({ ...current, status: String(value) }))} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">{t('attendance.notes', { defaultValue: 'Notes' })}</label>
            <textarea
              rows={4}
              value={formData.notes}
              onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none backdrop-blur-sm transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </FormModal>
      )}

      {isSessionModalOpen && canCreateSession && (
        <FormModal
          open={isSessionModalOpen}
          title={t('attendance.create_class_session', { defaultValue: 'فعال‌سازی حاضری صنف' })}
          onClose={() => {
            setIsSessionModalOpen(false);
            setSessionError('');
          }}
          onSubmit={(event) => {
            event.preventDefault();
            if (!sessionForm.classId || !sessionForm.subjectId || !sessionForm.teacherId || !sessionForm.startTime || !sessionForm.endTime) {
              setSessionError(t('common.required_fields', { defaultValue: 'صنف، مضمون، استاد و وقت ضروری است.' }));
              return;
            }
            createSessionMutation.mutate();
          }}
          submitLabel={t('attendance.activate_attendance', { defaultValue: 'فعال‌سازی حاضری' })}
          loading={createSessionMutation.isPending}
        >
          {sessionError && <div className="rounded-2xl border border-rose-500/50 bg-rose-500/10 p-3 text-sm text-rose-200">{sessionError}</div>}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-300">{t('common.class')}</label>
              <Select
                value={sessionForm.classId}
                options={timetableClasses.map((item) => ({ value: item._id, label: item.className ?? item.name ?? item._id }))}
                placeholder={t('attendance.select_class')}
                onChange={(value) => setSessionForm((current) => ({ ...current, classId: String(value), subjectId: '', teacherId: '' }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">{t('common.subject')}</label>
              <Select
                value={sessionForm.subjectId}
                options={sessionSubjects.map((item) => ({ value: item._id, label: item.title ?? item.name ?? item._id }))}
                placeholder={sessionForm.classId ? t('common.subject') : t('common.select_class_first')}
                disabled={!sessionForm.classId}
                onChange={(value) => setSessionForm((current) => ({ ...current, subjectId: String(value), teacherId: '' }))}
              />
              {sessionForm.classId && !sessionSubjects.length && <p className="mt-2 text-sm text-amber-200">{t('common.no_subject_for_class')}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">{t('common.teacher')}</label>
              <Select
                value={sessionForm.teacherId}
                options={sessionTeachers.map((item) => ({ value: item._id, label: item.name ?? item._id }))}
                placeholder={sessionForm.subjectId ? t('common.teacher') : t('common.select_subject_first')}
                disabled={!sessionForm.subjectId}
                onChange={(value) => setSessionForm((current) => ({ ...current, teacherId: String(value) }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">{t('common.room')}</label>
              <Input value={sessionForm.room} onChange={(event) => setSessionForm((current) => ({ ...current, room: event.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">{t('common.start_time')}</label>
              <Input type="time" value={sessionForm.startTime} onChange={(event) => setSessionForm((current) => ({ ...current, startTime: event.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">{t('common.end_time')}</label>
              <Input type="time" value={sessionForm.endTime} onChange={(event) => setSessionForm((current) => ({ ...current, endTime: event.target.value }))} />
            </div>
          </div>
          <p className="text-sm text-slate-400">
            {t('attendance.session_visibility_hint', { defaultValue: 'این حاضری فقط برای حساب‌های مربوط به همین صنف، مضمون و استاد نمایش داده می‌شود.' })}
          </p>
        </FormModal>
      )}
    </div>
  );
}
