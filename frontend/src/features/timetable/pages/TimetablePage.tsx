import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CalendarDays, Clock, Grid2X2, Pencil, Printer, Table2, Trash2, Wand2 } from 'lucide-react';
import { printElement, ExportButtons } from '@/shared/print';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PageHeader, FormModal } from '@/shared/components/Common';
import { timetableService, type TimetableEntry, type TimetablePayload, type TimetablePrintSheet } from '@/features/timetable/services/timetableService';
import { PrintableTimetableAllClasses, PrintableTimetableSheet, PrintableTimetableSummary } from '@/features/timetable/components/PrintableTimetableSheet';
import { useAuthStore } from '@/store/authStore';
import { normalizeRole } from '@/features/resources/config/modules';
import { formatJalaliDate } from '@/utils/date';
import { registerPrintRecord, searchPrintRecords, type PrintRecord } from '@/shared/print/printRegistry';

const days = [
  { value: 6, labelKey: 'common.saturday', fallback: 'Saturday' },
  { value: 0, labelKey: 'common.sunday', fallback: 'Sunday' },
  { value: 1, labelKey: 'common.monday', fallback: 'Monday' },
  { value: 2, labelKey: 'common.tuesday', fallback: 'Tuesday' },
  { value: 3, labelKey: 'common.wednesday', fallback: 'Wednesday' },
  { value: 4, labelKey: 'common.thursday', fallback: 'Thursday' }
];

const dayStyles = [
  'from-sky-400/38 via-cyan-300/30 to-blue-400/24 border-sky-300/55 shadow-sky-500/16',
  'from-emerald-400/38 via-teal-300/30 to-lime-400/24 border-emerald-300/55 shadow-emerald-500/16',
  'from-violet-400/38 via-fuchsia-300/30 to-indigo-400/24 border-violet-300/55 shadow-violet-500/16',
  'from-amber-400/38 via-orange-300/30 to-yellow-400/24 border-amber-300/55 shadow-amber-500/16',
  'from-rose-400/38 via-pink-300/30 to-orange-400/24 border-rose-300/55 shadow-rose-500/16',
  'from-cyan-400/38 via-blue-300/30 to-indigo-400/24 border-cyan-300/55 shadow-cyan-500/16',
  'from-lime-400/38 via-emerald-300/30 to-cyan-400/24 border-lime-300/55 shadow-lime-500/16',
  'from-purple-400/38 via-violet-300/30 to-sky-400/24 border-purple-300/55 shadow-purple-500/16'
];

const subjectStyles = [
  'bg-gradient-to-br from-sky-300/85 via-sky-100/80 to-blue-200/85 text-sky-950 ring-sky-400/45 dark:from-sky-500/32 dark:via-sky-400/20 dark:to-blue-500/22 dark:text-sky-50',
  'bg-gradient-to-br from-emerald-300/85 via-emerald-100/80 to-lime-200/85 text-emerald-950 ring-emerald-400/45 dark:from-emerald-500/32 dark:via-teal-400/20 dark:to-lime-500/22 dark:text-emerald-50',
  'bg-gradient-to-br from-violet-300/85 via-violet-100/80 to-fuchsia-200/85 text-violet-950 ring-violet-400/45 dark:from-violet-500/32 dark:via-fuchsia-400/20 dark:to-indigo-500/22 dark:text-violet-50',
  'bg-gradient-to-br from-amber-300/85 via-amber-100/80 to-orange-200/85 text-amber-950 ring-amber-400/45 dark:from-amber-500/32 dark:via-orange-400/20 dark:to-yellow-500/22 dark:text-amber-50',
  'bg-gradient-to-br from-rose-300/85 via-rose-100/80 to-pink-200/85 text-rose-950 ring-rose-400/45 dark:from-rose-500/32 dark:via-pink-400/20 dark:to-orange-500/22 dark:text-rose-50',
  'bg-gradient-to-br from-cyan-300/85 via-cyan-100/80 to-teal-200/85 text-cyan-950 ring-cyan-400/45 dark:from-cyan-500/32 dark:via-blue-400/20 dark:to-teal-500/22 dark:text-cyan-50',
  'bg-gradient-to-br from-lime-300/85 via-lime-100/80 to-emerald-200/85 text-lime-950 ring-lime-400/45 dark:from-lime-500/32 dark:via-emerald-400/20 dark:to-cyan-500/22 dark:text-lime-50',
  'bg-gradient-to-br from-purple-300/85 via-purple-100/80 to-indigo-200/85 text-purple-950 ring-purple-400/45 dark:from-purple-500/32 dark:via-violet-400/20 dark:to-sky-500/22 dark:text-purple-50'
];

function hashText(value: string) {
  return Array.from(value || 'default').reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function toMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function getSessionState(entry: TimetableEntry, now: Date) {
  const today = now.getDay();
  if (Number(entry.dayOfWeek) !== today) return 'upcoming';
  const current = now.getHours() * 60 + now.getMinutes();
  if (current >= toMinutes(entry.startTime) && current < toMinutes(entry.endTime)) return 'active';
  if (current >= toMinutes(entry.endTime)) return 'completed';
  return 'upcoming';
}

export function TimetablePage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const role = normalizeRole((user?.role as any) ?? null);
  const canManage = ['super_admin', 'admin', 'branch_manager'].includes(role ?? '');
  const [view, setView] = useState<'week' | 'teacher' | 'room' | 'class'>('week');
  const [displayMode, setDisplayMode] = useState<'cards' | 'table'>('cards');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [printMode, setPrintMode] = useState<'selected' | 'all'>('all');
  const [printClassId, setPrintClassId] = useState('');
  const [printBranchId, setPrintBranchId] = useState('');
  const [printAcademicYear, setPrintAcademicYear] = useState('');
  const [printSemester, setPrintSemester] = useState('');
  const [timetablePrintRecord, setTimetablePrintRecord] = useState<PrintRecord | null>(null);
  const [timetablePrintSearch, setTimetablePrintSearch] = useState('');
  const [timetablePrintHistory, setTimetablePrintHistory] = useState<PrintRecord[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [editing, setEditing] = useState<TimetableEntry | null>(null);
  const [, setDraggedEntryId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [generationResult, setGenerationResult] = useState('');
  const [conflictPreview, setConflictPreview] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<TimetablePayload>({
    classId: '',
    subjectId: '',
    teacherId: '',
    room: '',
    dayOfWeek: 6,
    startTime: '08:00',
    endTime: '09:00',
    academicYear: '1405',
    semester: 'semester_1',
    isActive: true
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedClass) setPrintClassId(selectedClass);
  }, [selectedClass]);

  const params = useMemo(() => {
    const next: Record<string, string> = {};
    if (view === 'teacher' && selectedTeacher) next.teacherId = selectedTeacher;
    if (view === 'room' && selectedRoom) next.room = selectedRoom;
    if (selectedClass) next.classId = selectedClass;
    return next;
  }, [selectedClass, selectedRoom, selectedTeacher, view]);

  const { data: weekData, isLoading } = useQuery({
    queryKey: ['timetable-week', params],
    queryFn: () => timetableService.week(params),
    staleTime: 30_000
  });
  const { data: listFallback = [], isLoading: isListLoading } = useQuery({
    queryKey: ['timetable-list-fallback', params],
    queryFn: () => timetableService.list(params),
    staleTime: 30_000
  });
  const { data: unfilteredFallback = [] } = useQuery({
    queryKey: ['timetable-list-unfiltered-fallback'],
    queryFn: () => timetableService.list({}),
    staleTime: 30_000
  });
  const { data: allWeekData } = useQuery({
    queryKey: ['timetable-week-all-for-print'],
    queryFn: () => timetableService.week({}),
    enabled: displayMode === 'table' && printMode === 'all',
    staleTime: 30_000
  });
  const { data: analytics } = useQuery({ queryKey: ['timetable-analytics'], queryFn: timetableService.analytics });
  const { data: classes = [] } = useQuery({ queryKey: ['timetable-classes'], queryFn: timetableService.classes });
  const { data: branches = [] } = useQuery({
    queryKey: ['timetable-branches'],
    queryFn: timetableService.branches,
    enabled: ['super_admin', 'admin'].includes(role ?? '')
  });
  const { data: teachers = [] } = useQuery({
    queryKey: ['timetable-teachers', formData.classId, formData.subjectId],
    queryFn: () => timetableService.teachers(formData.classId && formData.subjectId ? { classId: formData.classId, subjectId: formData.subjectId } : {}),
    enabled: !isModalOpen || !formData.classId || Boolean(formData.subjectId)
  });
  const { data: subjects = [] } = useQuery({
    queryKey: ['timetable-subjects', formData.classId],
    queryFn: () => timetableService.subjects(formData.classId),
    enabled: Boolean(formData.classId)
  });

  const printParams = useMemo(() => {
    const next: Record<string, string> = {};
    if (printBranchId) next.branchId = printBranchId;
    if (printAcademicYear) next.academicYear = printAcademicYear;
    if (printSemester) next.semester = printSemester;
    return next;
  }, [printAcademicYear, printBranchId, printSemester]);
  const selectedPrintParams = useMemo(() => ({ ...printParams, classId: printClassId }), [printClassId, printParams]);
  const { data: selectedPrintSheet } = useQuery({
    queryKey: ['timetable-print-view', selectedPrintParams],
    queryFn: () => timetableService.printView(selectedPrintParams),
    enabled: displayMode === 'table' && printMode === 'selected' && Boolean(printClassId)
  });
  const { data: allPrintData } = useQuery({
    queryKey: ['timetable-print-view-all', printParams],
    queryFn: () => timetableService.printViewAll(printParams),
    enabled: displayMode === 'table' && printMode === 'all'
  });

  const entries = weekData?.items?.length ? weekData.items : (listFallback.length ? listFallback : unfilteredFallback);
  const rooms = useMemo(() => Array.from(new Set(entries.map((entry) => entry.room).filter(Boolean))), [entries]);
  const conflicts = weekData?.conflicts ?? [];
  const conflictIds = useMemo(() => new Set(conflicts.flatMap((conflict) => [conflict.sourceId, conflict.targetId])), [conflicts]);
  const classOptions = classes.map((item) => ({ value: item._id, label: item.className ?? item.name ?? item._id }));
  const teacherOptions = teachers.map((item) => ({ value: item._id, label: item.name ?? item._id }));
  const subjectOptions = subjects.map((item) => ({ value: item._id, label: item.title ?? item.name ?? item._id }));
  const roomOptions = rooms.map((room) => ({ value: room, label: room }));
  const branchOptions = branches.map((item) => ({ value: item._id, label: item.name ?? item.code ?? item._id }));
  const localPrintSheets = useMemo<TimetablePrintSheet[]>(() => {
    const allEntries = allWeekData?.items?.length ? allWeekData.items : (unfilteredFallback.length ? unfilteredFallback : entries);
    const sourceEntries = printMode === 'selected' && printClassId
      ? entries.filter((entry) => String(entry.classId) === String(printClassId))
      : allEntries;
    const groups = new Map<string, TimetableEntry[]>();
    sourceEntries.forEach((entry) => {
      const key = String(entry.classId || entry.className);
      groups.set(key, [...(groups.get(key) ?? []), entry]);
    });

    return Array.from(groups.entries()).map(([classId, groupEntries]) => {
      const first = groupEntries[0];
      const classRecord = classes.find((item) => String(item._id) === String(first.classId));
      const normalizedEntries = groupEntries.map((entry) => ({
        _id: entry._id,
        dayOfWeek: Number(entry.dayOfWeek),
        startTime: entry.startTime,
        endTime: entry.endTime,
        room: entry.room ?? '',
        academicYear: entry.academicYear ?? '',
        semester: entry.semester ?? '',
        classId: entry.classId,
        className: entry.className,
        classCode: (classRecord as any)?.classCode ?? classRecord?.code ?? '',
        subjectId: entry.subjectId,
        subjectName: entry.subjectName,
        subjectCode: '',
        teacherId: entry.teacherId,
        teacherName: entry.teacherName,
        teacherPhone: ''
      }));
      const timeSlots = Array.from(new Set(normalizedEntries.map((entry) => `${entry.startTime}-${entry.endTime}`))).sort((a, b) => a.localeCompare(b));
      const cells = normalizedEntries.reduce<TimetablePrintSheet['cells']>((acc, entry) => {
        const dayKey = String(entry.dayOfWeek);
        const slotKey = `${entry.startTime}-${entry.endTime}`;
        acc[dayKey] = acc[dayKey] ?? {};
        acc[dayKey][slotKey] = [...(acc[dayKey][slotKey] ?? []), entry];
        return acc;
      }, {});

      return {
        classInfo: {
          _id: classId,
          name: first.className || classRecord?.className || classRecord?.name || t('common.class', { defaultValue: 'صنف' }),
          code: (classRecord as any)?.classCode ?? classRecord?.code ?? '',
          room: first.room ?? '',
          semester: first.semester ?? '',
          academicYear: first.academicYear ?? ''
        },
        branchInfo: null,
        academicYear: first.academicYear ?? '',
        semester: first.semester ?? '',
        timeSlots,
        days: [6, 0, 1, 2, 3, 4],
        entries: normalizedEntries,
        cells
      };
    });
  }, [allWeekData?.items, classes, entries, printClassId, printMode, t, unfilteredFallback]);
  const printableSheets = useMemo<TimetablePrintSheet[]>(() => (
    printMode === 'all'
      ? ((allPrintData?.sheets?.length ? allPrintData.sheets : localPrintSheets) ?? [])
      : (selectedPrintSheet?.entries?.length ? [selectedPrintSheet] : localPrintSheets)
  ), [allPrintData?.sheets, localPrintSheets, printMode, selectedPrintSheet]);

  useEffect(() => {
    if (!printClassId && classes[0]?._id) setPrintClassId(classes[0]._id);
  }, [classes, printClassId]);
  const entriesByClass = useMemo(() => {
    const groups = new Map<string, TimetableEntry[]>();
    entries.forEach((entry) => {
      const key = entry.className || entry.classId || t('common.class', { defaultValue: 'Class' });
      groups.set(key, [...(groups.get(key) ?? []), entry]);
    });
    return Array.from(groups.entries()).map(([className, items]) => ({
      className,
      items: items.sort((a, b) => Number(a.dayOfWeek) - Number(b.dayOfWeek) || a.startTime.localeCompare(b.startTime))
    }));
  }, [entries, t]);

  const saveMutation = useMutation({
    mutationFn: () => editing ? timetableService.update(editing._id, formData) : timetableService.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable-week'] });
      queryClient.invalidateQueries({ queryKey: ['timetable-analytics'] });
      setIsModalOpen(false);
      setEditing(null);
      setError('');
    },
    onError: (err: any) => setError(err?.response?.data?.message ?? err?.message ?? t('errors.unable_save', { defaultValue: 'Unable to save timetable entry.' }))
  });

  const conflictCheckMutation = useMutation({
    mutationFn: timetableService.checkConflicts,
    onSuccess: (result) => {
      const messages = result.conflicts.map((conflict) => `${conflict.type}: ${conflict.message}`);
      setConflictPreview(messages);
      if (result.hasConflict) {
        setError(messages.join(' '));
        return;
      }
      setError('');
      saveMutation.mutate();
    },
    onError: (err: any) => setError(err?.response?.data?.message ?? err?.message ?? t('errors.unable_save', { defaultValue: 'Unable to check timetable conflicts.' }))
  });

  const deleteMutation = useMutation({
    mutationFn: timetableService.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable-week'] });
      queryClient.invalidateQueries({ queryKey: ['timetable-analytics'] });
    }
  });

  const generateMutation = useMutation({
    mutationFn: () => timetableService.generateAuto({ classIds: selectedClass ? [selectedClass] : undefined }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['timetable-week'] });
      queryClient.invalidateQueries({ queryKey: ['timetable-analytics'] });
      setGenerationResult(`Created: ${result.createdCount}. Skipped: ${result.skippedCount}.${result.conflicts.length ? ` ${result.conflicts.slice(0, 3).map((item) => item.reason).join(' ')}` : ''}`);
      setIsGenerateOpen(false);
    },
    onError: (err: any) => setError(err?.response?.data?.message ?? err?.message ?? t('errors.unable_save', { defaultValue: 'Unable to generate timetable.' }))
  });

  const openCreate = () => {
    setEditing(null);
    setError('');
    setConflictPreview([]);
    setFormData({ classId: '', subjectId: '', teacherId: '', room: '', dayOfWeek: 6, startTime: '08:00', endTime: '09:00', academicYear: '1405', semester: 'semester_1', isActive: true });
    setIsModalOpen(true);
  };

  const openEdit = (entry: TimetableEntry) => {
    setEditing(entry);
    setError('');
    setConflictPreview([]);
    setFormData({ classId: entry.classId, subjectId: entry.subjectId, teacherId: entry.teacherId, room: entry.room, dayOfWeek: entry.dayOfWeek, startTime: entry.startTime, endTime: entry.endTime, academicYear: entry.academicYear ?? '', semester: entry.semester ?? '', isActive: entry.isActive });
    setIsModalOpen(true);
  };

  const prepareTimetableOutput = async (outputType: 'print' | 'pdf' | 'excel') => {
    if (printMode === 'selected' && !printClassId) {
      setError(t('print.select_class_first'));
      return false;
    }
    const record = await registerPrintRecord({
      documentType: 'timetable_sheet',
      outputType,
      title: printMode === 'all' ? `${t('common.timetable')} - همه صنف‌ها` : `${t('common.timetable')} - ${classes.find((item) => String(item._id) === printClassId)?.className || ''}`,
      branchId: printBranchId || undefined,
      metadata: { mode: printMode, classId: printClassId, academicYear: printAcademicYear, semester: printSemester }
    });
    setTimetablePrintRecord(record);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    return true;
  };

  const handlePrint = async () => {
    if (!(await prepareTimetableOutput('print'))) return;
    await printElement({
      targetId: 'timetable-print-area',
      title: t('common.timetable'),
      orientation: 'landscape',
      documentLanguage: i18n.resolvedLanguage || i18n.language,
      onEmpty: () => setError(t('print.no_data'))
    });
  };

  const runTimetablePrintSearch = async () => {
    setTimetablePrintHistory(await searchPrintRecords(timetablePrintSearch, printBranchId || undefined));
  };

  const renderEntry = (entry: TimetableEntry) => {
    const state = getSessionState(entry, now);
    const isConflict = conflictIds.has(entry._id);
    const colorIndex = Math.abs(hashText(`${entry.subjectName}-${entry.className}`)) % subjectStyles.length;
    return (
      <div
        key={entry._id}
        draggable={canManage}
        onDragStart={() => setDraggedEntryId(entry._id)}
        className={`rounded-xl border p-3 text-xs shadow-md ring-1 transition hover:-translate-y-0.5 hover:shadow-lg ${subjectStyles[colorIndex]} ${state === 'active' ? 'animate-pulse border-emerald-400' : ''} ${state === 'completed' ? 'opacity-75 grayscale-[0.15]' : ''} ${isConflict ? 'border-rose-500 ring-rose-400/50' : ''}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-base font-extrabold tracking-tight">{entry.subjectName}</p>
            <p className="mt-1 truncate text-sm font-bold">{entry.className}</p>
            <p className="mt-2 truncate text-sm font-bold opacity-95">{entry.teacherName}</p>
            <div className="mt-3 grid gap-1.5">
              <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white/65 px-2.5 py-1.5 font-extrabold text-slate-950 shadow-sm ring-1 ring-white/60 dark:bg-slate-950/45 dark:text-white dark:ring-white/10">
                <Clock className="h-3.5 w-3.5" />
                {t('common.start_time', { defaultValue: 'Start' })}: {entry.startTime}
              </p>
              <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white/65 px-2.5 py-1.5 font-extrabold text-slate-950 shadow-sm ring-1 ring-white/60 dark:bg-slate-950/45 dark:text-white dark:ring-white/10">
                <Clock className="h-3.5 w-3.5" />
                {t('common.end_time', { defaultValue: 'End' })}: {entry.endTime}
              </p>
            </div>
            <p className="mt-2 opacity-80">{entry.room} | {entry.durationMinutes}m</p>
            {state === 'active' && <p className="mt-2 rounded-full bg-emerald-500/20 px-2 py-1 text-emerald-900 dark:text-emerald-100">{t('attendance.active_now', { defaultValue: 'Active Now' })}</p>}
            {isConflict && <p className="mt-2 font-semibold text-rose-700 dark:text-rose-200">{t('common.conflict', { defaultValue: 'Conflict' })}</p>}
          </div>
          {canManage && (
            <div className="flex gap-1">
              <button type="button" onClick={() => openEdit(entry)} className="rounded-md p-1 hover:bg-white/10"><Pencil className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => deleteMutation.mutate(entry._id)} className="rounded-md p-1 text-rose-200 hover:bg-rose-500/20"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="common.timetable"
        description={t('common.timetable_description', { defaultValue: 'Plan weekly classes, prevent conflicts, and monitor live teaching sessions.' })}
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => { void handlePrint(); }} className="gap-2 no-print" data-no-print>
              <Printer className="h-4 w-4" />
              {t('common.print')}
            </Button>
            <ExportButtons
              targetId="timetable-print-area"
              title={t('common.timetable')}
              fileName={printMode === 'all' ? 'all-classes-timetable' : 'class-timetable'}
              orientation="landscape"
              beforeExport={(format) => prepareTimetableOutput(format)}
            />
            {canManage && <Button type="button" variant="outline" onClick={() => setIsGenerateOpen(true)} className="gap-2"><Wand2 className="h-4 w-4" />{t('common.generate_automatic_timetable', { defaultValue: 'Generate Automatic Timetable' })}</Button>}
            {canManage && <Button type="button" onClick={openCreate}>{t('common.add_entity', { entity: t('common.timetable_item', { defaultValue: 'Timetable Item' }) })}</Button>}
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4"><p className="text-sm text-slate-400">{t('common.today', { defaultValue: 'Today' })}</p><p className="mt-2 text-xl text-white">{formatJalaliDate(now, i18n.resolvedLanguage)}</p></Card>
        <Card className="p-4"><p className="text-sm text-slate-400">{t('common.total', { defaultValue: 'Total' })}</p><p className="mt-2 text-xl text-white">{analytics?.totalEntries ?? entries.length}</p></Card>
        <Card className="p-4"><p className="text-sm text-slate-400">{t('common.conflicts', { defaultValue: 'Conflicts' })}</p><p className="mt-2 text-xl text-rose-200">{conflicts.length}</p></Card>
        <Card className="p-4"><p className="text-sm text-slate-400">{t('common.current_session', { defaultValue: 'Current Session' })}</p><p className="mt-2 text-xl text-emerald-200">{entries.filter((entry) => getSessionState(entry, now) === 'active').length}</p></Card>
      </div>

      {conflicts.length > 0 && (
        <Card className="border border-rose-500/40 bg-rose-500/5 p-4 text-rose-100">
          <div className="flex items-start gap-3"><AlertTriangle className="mt-1 h-5 w-5" /><div>{conflicts.slice(0, 4).map((conflict) => <p key={`${conflict.sourceId}-${conflict.targetId}-${conflict.type}`}>{conflict.message}</p>)}</div></div>
        </Card>
      )}
      {error && <Card className="border border-rose-500/40 bg-rose-500/5 p-4 text-rose-100">{error}</Card>}
      {generationResult && <Card className="border border-emerald-500/40 bg-emerald-500/5 p-4 text-emerald-100">{generationResult}</Card>}

      <Card className="p-4">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {(['week', 'teacher', 'room', 'class'] as const).map((item) => (
            <Button key={item} type="button" size="sm" variant={view === item ? 'solid' : 'outline'} onClick={() => setView(item)}>
              {t(`common.${item}_view`, { defaultValue: item })}
            </Button>
          ))}
          <div className="ms-auto flex rounded-2xl border border-slate-300/50 bg-white/60 p-1 dark:border-white/10 dark:bg-white/5">
            <Button type="button" size="sm" variant={displayMode === 'cards' ? 'solid' : 'ghost'} className="gap-2" onClick={() => setDisplayMode('cards')}>
              <Grid2X2 className="h-4 w-4" /> {t('common.card_view', { defaultValue: 'Cards' })}
            </Button>
            <Button type="button" size="sm" variant={displayMode === 'table' ? 'solid' : 'ghost'} className="gap-2" onClick={() => setDisplayMode('table')}>
              <Table2 className="h-4 w-4" /> {t('common.table_view', { defaultValue: 'Table' })}
            </Button>
          </div>
          <div className="min-w-[220px]">
            <Select
              value={selectedClass}
              options={[{ value: '', label: t('common.all_classes', { defaultValue: 'All classes' }) }, ...classOptions]}
              onChange={(value) => setSelectedClass(String(value))}
            />
          </div>
          {view === 'teacher' && <Select value={selectedTeacher} options={[{ value: '', label: t('common.all', { defaultValue: 'All' }) }, ...teacherOptions]} onChange={(value) => setSelectedTeacher(String(value))} />}
          {view === 'room' && <Select value={selectedRoom} options={[{ value: '', label: t('common.all', { defaultValue: 'All' }) }, ...roomOptions]} onChange={(value) => setSelectedRoom(String(value))} />}
        </div>

        {isLoading && isListLoading ? (
          <p className="text-slate-400">{t('common.loading')}</p>
        ) : (
          <>
            {displayMode === 'cards' && (
              <div className="grid gap-5">
                {entriesByClass.length === 0 && <p className="app-text-muted p-4">{t('common.no_data', { defaultValue: 'No data available' })}</p>}
                {entriesByClass.map((group, groupIndex) => (
                  <section key={group.className} className={`rounded-2xl border bg-gradient-to-br p-4 shadow-xl ${dayStyles[groupIndex % dayStyles.length]}`}>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">{t('common.class', { defaultValue: 'Class' })}</p>
                        <h2 className="text-xl font-bold text-slate-950 dark:text-white">{group.className}</h2>
                      </div>
                      <span className="rounded-full bg-white/65 px-3 py-1 text-sm font-semibold text-slate-950 dark:bg-slate-950/35 dark:text-white">
                        {group.items.length} {t('common.timetable_item', { defaultValue: 'Timetable Item' })}
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {group.items.map((entry) => {
                        const dayIndex = days.findIndex((day) => day.value === Number(entry.dayOfWeek));
                        const entryColorIndex = Math.abs(hashText(`${entry.subjectName}-${entry.className}`)) % subjectStyles.length;
                        return (
                          <div key={entry._id} className={`rounded-2xl border bg-gradient-to-br p-3 shadow-lg ${dayStyles[(Math.max(dayIndex, 0) + entryColorIndex) % dayStyles.length]}`}>
                            <div className="mb-3 flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-2 rounded-full bg-white/65 px-3 py-1 text-xs font-bold text-slate-950 dark:bg-slate-950/35 dark:text-white">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {t(days.find((day) => day.value === Number(entry.dayOfWeek))?.labelKey ?? 'common.day', { defaultValue: days.find((day) => day.value === Number(entry.dayOfWeek))?.fallback ?? 'Day' })}
                              </span>
                              <span className="rounded-full bg-slate-950/10 px-3 py-1 text-xs font-semibold text-slate-950 dark:bg-white/10 dark:text-white">{entry.startTime}</span>
                            </div>
                            {renderEntry(entry)}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {displayMode === 'table' && (
              <div className="space-y-4">
                <div className="no-print grid gap-3 rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5 md:grid-cols-2 xl:grid-cols-6">
                  <Select
                    value={printMode}
                    options={[
                      { value: 'selected', label: t('common.selected_class', { defaultValue: 'صنف انتخاب‌شده' }) },
                      { value: 'all', label: t('common.all_classes', { defaultValue: 'همه صنف‌ها' }) }
                    ]}
                    onChange={(value) => setPrintMode(value as 'selected' | 'all')}
                  />
                  <Select
                    value={printClassId}
                    options={classOptions}
                    disabled={printMode === 'all'}
                    placeholder={t('common.class', { defaultValue: 'صنف' })}
                    onChange={(value) => setPrintClassId(String(value))}
                  />
                  {['super_admin', 'admin'].includes(role ?? '') && (
                    <Select
                      value={printBranchId}
                      options={[{ value: '', label: t('common.all_branches', { defaultValue: 'همه نمایندگی‌ها' }) }, ...branchOptions]}
                      onChange={(value) => setPrintBranchId(String(value))}
                    />
                  )}
                  <Input value={printAcademicYear} placeholder={t('common.academic_year', { defaultValue: 'سال تعلیمی' })} onChange={(event) => setPrintAcademicYear(event.target.value)} />
                  <Input value={printSemester} placeholder={t('common.semester', { defaultValue: 'سمستر' })} onChange={(event) => setPrintSemester(event.target.value)} />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" className="gap-2 no-print" data-no-print onClick={() => { void handlePrint(); }}>
                      <Printer className="h-4 w-4" />
                      {t('common.print')}
                    </Button>
                    <ExportButtons
                      targetId="timetable-print-area"
                      title={t('common.timetable')}
                      fileName={printMode === 'all' ? 'all-classes-timetable' : 'class-timetable'}
                      orientation="landscape"
                      beforeExport={(format) => prepareTimetableOutput(format)}
                    />
                  </div>
                </div>

                {printMode === 'selected' && !printClassId && (
                  <p className="no-print app-text-muted rounded-xl border border-amber-300/40 p-4">
                    {t('common.select_class_first', { defaultValue: 'لطفاً اول صنف را انتخاب کنید.' })}
                  </p>
                )}

                <div className="overflow-x-auto rounded-2xl bg-slate-100 p-4 dark:bg-slate-950/40">
                  <div id="timetable-print-area" className="timetable-print-area" data-print-root="timetable-report">
                    {printableSheets.length > 0 ? (
                      printMode === 'all' ? (
                        <PrintableTimetableAllClasses
                          sheets={printableSheets}
                          t={t}
                          serialNumber={timetablePrintRecord?.serialNumber}
                          printedBy={user?.name}
                        />
                      ) : (
                        <>
                          {printableSheets.map((sheet) => (
                            <PrintableTimetableSheet
                              key={sheet.classInfo._id}
                              sheet={sheet}
                              t={t}
                              serialNumber={timetablePrintRecord?.serialNumber}
                              printedBy={user?.name}
                            />
                          ))}
                          <PrintableTimetableSummary sheets={printableSheets} t={t} />
                        </>
                      )
                    ) : (
                      <div className="timetable-print-sheet empty-print-sheet" dir="rtl">
                        {t('common.no_data', { defaultValue: 'معلومات موجود نیست' })}
                      </div>
                    )}
                  </div>
                </div>
                <Card className="space-y-3 p-4 no-print" data-no-print>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">جستجوی سریال ورق‌های تقسیم اوقات</p>
                  <div className="flex flex-wrap gap-2">
                    <Input value={timetablePrintSearch} onChange={(event) => setTimetablePrintSearch(event.target.value)} placeholder="سریال یا عنوان ورق" />
                    <Button type="button" variant="outline" onClick={() => void runTimetablePrintSearch()}>جستجو</Button>
                  </div>
                  {timetablePrintHistory.map((record) => (
                    <p key={record.serialNumber} className="text-sm text-slate-700 dark:text-slate-300">
                      {record.serialNumber} — {record.title} — {record.outputType}
                    </p>
                  ))}
                </Card>
              </div>
            )}
          </>
        )}
      </Card>

      {isModalOpen && (
        <FormModal
          open={isModalOpen}
          title={editing ? t('common.edit_entity', { entity: t('common.timetable_item', { defaultValue: 'Timetable Item' }) }) : t('common.add_entity', { entity: t('common.timetable_item', { defaultValue: 'Timetable Item' }) })}
          onClose={() => setIsModalOpen(false)}
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (!formData.classId || !formData.subjectId || !formData.teacherId) {
              setError(t('common.required_fields', { defaultValue: 'Class, subject, and teacher are required.' }));
              return;
            }
            conflictCheckMutation.mutate(formData);
          }}
          submitLabel={t('common.save', { defaultValue: 'Save' })}
          loading={saveMutation.isPending}
        >
          {error && <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</div>}
          {conflictPreview.length > 0 && (
            <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-100">
              {conflictPreview.map((message) => <p key={message}>{message}</p>)}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <Select value={formData.classId} options={classOptions} placeholder={t('common.class')} onChange={(value) => setFormData((current) => ({ ...current, classId: String(value), subjectId: '', teacherId: '' }))} />
            <Select value={formData.subjectId} options={subjectOptions} placeholder={formData.classId ? t('common.subject') : t('common.select_class_first', { defaultValue: 'Select class first' })} disabled={!formData.classId} onChange={(value) => setFormData((current) => ({ ...current, subjectId: String(value), teacherId: '' }))} />
            {formData.classId && !subjectOptions.length && (
              <div className="md:col-span-2 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-100">
                {t('common.no_subject_for_class', { defaultValue: 'برای این صنف هنوز مضمون ثبت نشده است.' })}
              </div>
            )}
            <Select value={formData.teacherId} options={teacherOptions} placeholder={formData.subjectId ? t('common.teacher') : t('common.select_subject_first', { defaultValue: 'Select subject first' })} disabled={!formData.classId || !formData.subjectId} onChange={(value) => setFormData((current) => ({ ...current, teacherId: String(value) }))} />
            <Input value={formData.room} placeholder={t('common.room', { defaultValue: 'Room' })} onChange={(event) => setFormData((current) => ({ ...current, room: event.target.value }))} />
            <Select value={String(formData.dayOfWeek)} options={days.map((day) => ({ value: String(day.value), label: t(day.labelKey, { defaultValue: day.fallback }) }))} onChange={(value) => setFormData((current) => ({ ...current, dayOfWeek: Number(value) }))} />
            <Input type="time" value={formData.startTime} onChange={(event) => setFormData((current) => ({ ...current, startTime: event.target.value }))} />
            <Input type="time" value={formData.endTime} onChange={(event) => setFormData((current) => ({ ...current, endTime: event.target.value }))} />
            <Input value={formData.academicYear ?? ''} placeholder={t('common.academic_year', { defaultValue: 'Academic Year' })} onChange={(event) => setFormData((current) => ({ ...current, academicYear: event.target.value }))} />
            <Input value={formData.semester ?? ''} placeholder={t('common.semester', { defaultValue: 'Semester' })} onChange={(event) => setFormData((current) => ({ ...current, semester: event.target.value }))} />
          </div>
        </FormModal>
      )}

      {isGenerateOpen && (
        <FormModal
          open={isGenerateOpen}
          title={t('common.generate_automatic_timetable', { defaultValue: 'Generate Automatic Timetable' })}
          onClose={() => setIsGenerateOpen(false)}
          onSubmit={(event) => {
            event.preventDefault();
            generateMutation.mutate();
          }}
          submitLabel={t('common.generate', { defaultValue: 'Generate' })}
          loading={generateMutation.isPending}
        >
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            {t('common.confirm_generate_timetable', { defaultValue: 'This will create safe timetable entries for the selected class filter or all active classes. Existing conflicts and duplicates will be skipped.' })}
          </div>
        </FormModal>
      )}

      <style>{`
        .timetable-print-area {
          display: grid;
          gap: 18px;
          width: 100%;
          min-width: 0;
        }
        .timetable-print-sheet {
          width: 100%;
          max-width: 1122px;
          aspect-ratio: 297 / 210;
          margin: 0 auto;
          padding: 24px;
          background: #ffffff;
          color: #000000;
          box-sizing: border-box;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.2);
          page-break-after: always;
          break-after: page;
          overflow: hidden;
        }
        .timetable-document-header {
          display: grid;
          grid-template-columns: 1fr 220px 1fr;
          align-items: center;
          gap: 10px;
          min-height: 48px;
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 1px solid #94a3b8;
          font-size: 10px;
        }
        .timetable-document-brand {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          font-weight: 800;
        }
        .timetable-document-logo {
          display: inline-flex;
          width: 24px;
          height: 24px;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: #0f172a;
          color: #fff;
          font-weight: 800;
        }
        .timetable-document-serial {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          direction: ltr;
          font-weight: 700;
        }
        .timetable-document-serial .academy-linear-barcode {
          width: 145px;
          height: 32px;
        }
        .timetable-document-meta {
          text-align: left;
          line-height: 1.4;
        }
        .timetable-all-classes-sheet {
          width: 100%;
          max-width: 1122px;
          margin: 0 auto;
          padding: 24px;
          background: #ffffff;
          color: #000000;
          box-sizing: border-box;
        }
        .timetable-all-classes-table th {
          background: #ffffff;
          text-align: center;
          font-weight: 800;
        }
        .timetable-all-classes-table {
          min-height: 190mm;
        }
        .timetable-all-classes-table td {
          text-align: center;
          vertical-align: middle;
          padding: 6px;
        }
        .timetable-all-classes-table tbody tr {
          height: 27mm;
        }
        .timetable-empty-day-cell {
          text-align: center;
          vertical-align: middle;
          color: #64748b;
          font-style: italic;
        }
        .timetable-page-number {
          margin: 12px 0 0;
          text-align: center;
          font-size: 11px;
          font-weight: 700;
        }
        .empty-print-sheet {
          display: grid;
          place-items: center;
          font-weight: 700;
        }
        .official-timetable-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          direction: rtl;
          font-size: 10.5px;
          line-height: 1.45;
          font-family: var(--app-font-family);
        }
        .official-timetable-table th,
        .official-timetable-table td {
          border: 1px solid #111111;
          padding: 4px 5px;
          vertical-align: top;
        }
        .sheet-main-title {
          height: 28px;
          font-size: 16px;
          font-weight: 800;
          text-align: center;
        }
        .sheet-sub-title {
          height: 24px;
          font-size: 13px;
          font-weight: 800;
          text-align: center;
        }
        .sheet-meta {
          height: 22px;
          font-size: 10.5px;
          font-weight: 700;
          text-align: right;
        }
        .day-heading,
        .time-heading,
        .day-cell {
          background: #ffffff;
          font-weight: 800;
          text-align: center;
        }
        .day-heading,
        .day-cell {
          width: 76px;
        }
        .lesson-cell {
          height: 38px;
          white-space: normal;
        }
        .timetable-period-cell {
          width: 42px;
          text-align: center;
          font-weight: 800;
        }
        .timetable-vertical-day {
          width: 52px;
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          vertical-align: middle !important;
          letter-spacing: 1px;
        }
        .lesson-block {
          display: grid;
          gap: 2px;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .lesson-block + .lesson-block {
          margin-top: 4px;
          padding-top: 4px;
          border-top: 1px dotted #555555;
        }
        .lesson-block strong,
        .lesson-block span {
          display: block;
          overflow-wrap: anywhere;
        }
        .empty-cell {
          display: block;
          text-align: center;
          color: #444444;
        }
        @media print {
          .no-print {
            display: none !important;
          }
          .timetable-print-sheet {
            width: auto;
            max-width: none;
            min-height: 0;
            aspect-ratio: auto;
            margin: 0;
            padding: 0;
            box-shadow: none;
            overflow: visible;
            page-break-after: always;
            break-after: page;
          }
          .timetable-all-classes-sheet {
            width: auto;
            max-width: none;
            margin: 0;
            padding: 0;
            min-height: 0;
          }
          .timetable-all-classes-table thead {
            display: table-header-group;
          }
          .timetable-all-classes-table {
            min-height: 190mm;
          }
          .timetable-all-classes-table tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .timetable-page-number {
            position: fixed;
            bottom: 5mm;
            left: 0;
            right: 0;
          }
          .timetable-page-number::after {
            content: "صفحه " counter(page);
          }
          .official-timetable-table {
            font-size: 9.5px;
          }
          .timetable-document-header,
          .timetable-document-header * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .official-timetable-table thead {
            display: table-header-group;
          }
          .official-timetable-table th,
          .official-timetable-table td {
            border-color: #000000 !important;
          }
        }
      `}</style>
    </div>
  );
}
