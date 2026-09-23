import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AlertTriangle, Award, BarChart3, CalendarClock, CheckCircle2, DatabaseBackup, FileCheck2, GraduationCap, LockKeyhole, Radar, ShieldCheck, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/shared/components/Common';
import { enterpriseService } from '@/features/enterprise/services/enterpriseService';
import { formatJalaliDate } from '@/utils/date';

const modules = [
  { key: 'timetable', icon: CalendarClock, priority: 1 },
  { key: 'attendance', icon: LockKeyhole, priority: 2 },
  { key: 'class_subjects', icon: FileCheck2, priority: 3 },
  { key: 'transcripts', icon: GraduationCap, priority: 4 },
  { key: 'online_exams', icon: ShieldCheck, priority: 5 },
  { key: 'assignments', icon: FileCheck2, priority: 6 },
  { key: 'parents', icon: Users, priority: 7 },
  { key: 'certificates', icon: Award, priority: 8 },
  { key: 'analytics', icon: BarChart3, priority: 9 },
  { key: 'backups', icon: DatabaseBackup, priority: 10 },
  { key: 'security', icon: Radar, priority: 11 }
];

export function EnterprisePage() {
  const { t, i18n } = useTranslation();
  const [subjectCheck, setSubjectCheck] = useState({ classId: '', subjectId: '' });
  const [timetableCheck, setTimetableCheck] = useState({
    classId: '',
    subjectId: '',
    teacherId: '',
    room: '',
    dayOfWeek: 6,
    startTime: '08:00',
    endTime: '09:00'
  });
  const [message, setMessage] = useState('');

  const { data: health, isError: healthError } = useQuery({
    queryKey: ['enterprise-health'],
    queryFn: enterpriseService.health,
    staleTime: 60_000
  });
  const { data: readiness, isError: readinessError } = useQuery({
    queryKey: ['enterprise-readiness'],
    queryFn: enterpriseService.readiness,
    staleTime: 45_000,
    refetchInterval: 120_000,
    refetchIntervalInBackground: false
  });
  const { data: activeSessions = [], isError: sessionsError } = useQuery({
    queryKey: ['enterprise-active-sessions'],
    queryFn: enterpriseService.activeSessions,
    staleTime: 45_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false
  });
  const { data: analytics, isError: analyticsError } = useQuery({
    queryKey: ['enterprise-analytics'],
    queryFn: enterpriseService.analytics,
    staleTime: 120_000
  });
  const { data: securityEvents = [], isError: securityError } = useQuery({
    queryKey: ['enterprise-security-events'],
    queryFn: enterpriseService.securityEvents,
    staleTime: 60_000
  });
  const enterpriseError = healthError || readinessError || sessionsError || analyticsError || securityError;

  const validateSubjectMutation = useMutation({
    mutationFn: enterpriseService.validateSubject,
    onSuccess: () => setMessage(t('enterprise.subject_valid', { defaultValue: 'Class and subject relation is valid.' })),
    onError: (error: any) => setMessage(error?.response?.data?.message ?? error.message)
  });

  const validateTimetableMutation = useMutation({
    mutationFn: enterpriseService.validateTimetable,
    onSuccess: () => setMessage(t('enterprise.timetable_valid', { defaultValue: 'Timetable entry is conflict-free.' })),
    onError: (error: any) => setMessage(error?.response?.data?.message ?? error.message)
  });

  const backupMutation = useMutation({
    mutationFn: enterpriseService.manualBackup,
    onSuccess: () => setMessage(t('enterprise.backup_created', { defaultValue: 'Manual backup created successfully.' })),
    onError: (error: any) => setMessage(error?.response?.data?.message ?? error.message)
  });

  const attendanceChart = useMemo(
    () => (analytics?.attendanceByStatus ?? []).map((item) => ({ status: item._id, total: item.total })),
    [analytics?.attendanceByStatus]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="enterprise.title"
        description={t('enterprise.description', { defaultValue: 'Enterprise academic ERP command center for timetable, attendance, transcripts, LMS exams, assignments, parents, certificates, analytics, backup, and security.' })}
        actions={<Button type="button" variant="outline" onClick={() => backupMutation.mutate()} disabled={backupMutation.isPending}>{t('enterprise.manual_backup', { defaultValue: 'Manual Backup' })}</Button>}
      />

      {message && <Card className="border border-sky-400/30 bg-sky-500/5 p-4 text-sky-100">{message}</Card>}
      {enterpriseError && (
        <Card className="border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">
          {t('errors.unable_load_records')}
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <p className="text-sm text-slate-400">{t('enterprise.status', { defaultValue: 'Enterprise Status' })}</p>
          <p className="mt-2 text-xl font-semibold text-emerald-200">{health?.status ?? 'loading'}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-400">{t('enterprise.jalali_today', { defaultValue: 'Jalali Today' })}</p>
          <p className="mt-2 text-xl font-semibold text-white">{health?.jalaliDate ?? formatJalaliDate(new Date(), i18n.resolvedLanguage)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-400">{t('enterprise.active_sessions', { defaultValue: 'Active Sessions' })}</p>
          <p className="mt-2 text-xl font-semibold text-emerald-200">{activeSessions.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-400">{t('enterprise.security_events', { defaultValue: 'Security Events' })}</p>
          <p className="mt-2 text-xl font-semibold text-amber-200">{securityEvents.length}</p>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="grid gap-0 xl:grid-cols-[320px_1fr]">
          <div className="border-b border-white/10 bg-gradient-to-br from-sky-500/20 via-cyan-500/10 to-emerald-500/10 p-6 xl:border-b-0 xl:border-e">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-cyan-200" />
              <p className="text-sm uppercase tracking-[0.24em] text-slate-300">{t('enterprise.global_readiness', { defaultValue: 'Global Readiness' })}</p>
            </div>
            <p className="mt-5 text-6xl font-semibold text-white">{readiness?.overallScore ?? 0}%</p>
            <p className="mt-2 text-sm text-slate-300">{t(`enterprise.${readiness?.status ?? 'loading'}`, { defaultValue: readiness?.status ?? 'loading' })}</p>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300" style={{ width: `${readiness?.overallScore ?? 0}%` }} />
            </div>
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {(readiness?.domains ?? []).map((domain) => (
              <div key={domain.key} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{t(`enterprise.readiness_${domain.key}`, { defaultValue: domain.key.replace(/_/g, ' ') })}</p>
                    <p className="mt-1 text-xs text-slate-400">{domain.completed}/{domain.total} · {domain.issues} {t('enterprise.issues', { defaultValue: 'issues' })}</p>
                  </div>
                  {domain.score >= 80 ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : <AlertTriangle className="h-5 w-5 text-amber-300" />}
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className={`h-full rounded-full ${domain.score >= 80 ? 'bg-emerald-300' : domain.score >= 60 ? 'bg-amber-300' : 'bg-rose-300'}`} style={{ width: `${domain.score}%` }} />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-100">{domain.score}% · {t(`enterprise.${domain.status}`, { defaultValue: domain.status })}</p>
                <p className="mt-2 text-xs leading-5 text-slate-400">{domain.recommendations[0]}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {modules.map((item) => (
          <motion.div key={item.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="h-full p-5">
              <div className="flex items-center justify-between">
                <item.icon className="h-5 w-5 text-sky-300" />
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">P{item.priority}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">{t(`enterprise.${item.key}`, { defaultValue: item.key.replace(/_/g, ' ') })}</h3>
              <p className="mt-2 text-sm text-slate-400">{t(`enterprise.${item.key}_description`, { defaultValue: 'Isolated enterprise module with backend validation authority.' })}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-white">{t('enterprise.conflict_engine', { defaultValue: 'Timetable Conflict Engine' })}</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Input placeholder="classId" value={timetableCheck.classId} onChange={(event) => setTimetableCheck((current) => ({ ...current, classId: event.target.value }))} />
            <Input placeholder="subjectId" value={timetableCheck.subjectId} onChange={(event) => setTimetableCheck((current) => ({ ...current, subjectId: event.target.value }))} />
            <Input placeholder="teacherId" value={timetableCheck.teacherId} onChange={(event) => setTimetableCheck((current) => ({ ...current, teacherId: event.target.value }))} />
            <Input placeholder="room" value={timetableCheck.room} onChange={(event) => setTimetableCheck((current) => ({ ...current, room: event.target.value }))} />
            <Input type="time" value={timetableCheck.startTime} onChange={(event) => setTimetableCheck((current) => ({ ...current, startTime: event.target.value }))} />
            <Input type="time" value={timetableCheck.endTime} onChange={(event) => setTimetableCheck((current) => ({ ...current, endTime: event.target.value }))} />
          </div>
          <Button className="mt-4" type="button" onClick={() => validateTimetableMutation.mutate(timetableCheck)}>{t('enterprise.validate', { defaultValue: 'Validate' })}</Button>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold text-white">{t('enterprise.class_subject_guard', { defaultValue: 'Class Subject Guard' })}</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Input placeholder="classId" value={subjectCheck.classId} onChange={(event) => setSubjectCheck((current) => ({ ...current, classId: event.target.value }))} />
            <Input placeholder="subjectId" value={subjectCheck.subjectId} onChange={(event) => setSubjectCheck((current) => ({ ...current, subjectId: event.target.value }))} />
          </div>
          <Button className="mt-4" type="button" onClick={() => validateSubjectMutation.mutate(subjectCheck)}>{t('enterprise.validate_dependency', { defaultValue: 'Validate Dependency' })}</Button>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2 text-white">
          <AlertTriangle className="h-5 w-5 text-amber-300" />
          <h2 className="text-lg font-semibold">{t('enterprise.analytics_dashboard', { defaultValue: 'Advanced Analytics Dashboard' })}</h2>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={attendanceChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
              <XAxis dataKey="status" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Bar dataKey="total" fill="#38bdf8" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-white">
            <AlertTriangle className="h-5 w-5 text-rose-300" />
            <h2 className="text-lg font-semibold">{t('enterprise.conflict_warnings', { defaultValue: 'Conflict Warnings' })}</h2>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">{readiness?.conflicts.length ?? 0}</span>
        </div>
        <div className="space-y-3">
          {(readiness?.conflicts ?? []).slice(0, 8).map((conflict) => (
            <div key={`${conflict.sourceId}-${conflict.targetId}-${conflict.type}`} className="rounded-2xl border border-rose-300/20 bg-rose-500/5 p-4 text-sm text-rose-100">
              <span className="font-semibold">{conflict.type}</span> · {conflict.message}
            </div>
          ))}
          {readiness && readiness.conflicts.length === 0 && (
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/5 p-4 text-sm text-emerald-100">
              {t('enterprise.no_conflicts', { defaultValue: 'No active timetable conflicts detected.' })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
