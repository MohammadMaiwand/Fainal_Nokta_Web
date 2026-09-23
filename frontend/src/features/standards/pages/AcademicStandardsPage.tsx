import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileText,
  GraduationCap,
  Languages,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Target,
  Users
} from 'lucide-react';
import { AfghaniIcon } from '@/components/icons/AfghaniIcon';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { dashboardService, type DashboardSummary, type MasterDashboardSummary } from '@/features/dashboard/services/dashboardService';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/app/providers/ThemeProvider';

type StandardDomain = {
  id: string;
  title: string;
  benchmark: string;
  icon: typeof GraduationCap;
  modules: Array<keyof MasterDashboardSummary>;
  signals: Array<keyof DashboardSummary>;
  actionPath: string;
  actionLabel: string;
  globalReference: string;
  referenceUrl: string;
};

const standardDomains: StandardDomain[] = [
  {
    id: 'records',
    title: 'Student Information Core',
    benchmark: 'Central student, staff, class, branch and family records with one reliable source of truth.',
    icon: Database,
    modules: ['students', 'teachers', 'classes', 'subjects', 'branches', 'users'],
    signals: ['totalStudents', 'totalTeachers', 'totalClasses', 'totalSubjects', 'totalUsers'],
    actionPath: '/students',
    actionLabel: 'Strengthen records',
    globalReference: 'OpenEMIS / PowerSchool',
    referenceUrl: 'https://www.openemis.org/products'
  },
  {
    id: 'attendance',
    title: 'Attendance and Intervention',
    benchmark: 'Daily attendance capture, trend visibility, guardian awareness and missing-record follow-up.',
    icon: ClipboardCheck,
    modules: ['attendance', 'notifications'],
    signals: ['totalNotifications'],
    actionPath: '/attendance',
    actionLabel: 'Review attendance',
    globalReference: 'OpenEMIS / openSIS',
    referenceUrl: 'https://www.opensis.com/feature-attendance'
  },
  {
    id: 'gradebook',
    title: 'Gradebook, Exams and Results',
    benchmark: 'Assessment records, exam planning, result publishing and transcript-ready academic history.',
    icon: GraduationCap,
    modules: ['exams', 'results', 'subjects', 'classes'],
    signals: ['totalClasses', 'totalSubjects'],
    actionPath: '/results',
    actionLabel: 'Open results',
    globalReference: 'Classter / PowerSchool',
    referenceUrl: 'https://www.classter.com/blog/edtech/10-must-have-features-in-a-student-information-system-in-2026/'
  },
  {
    id: 'portal',
    title: 'Family and Student Portal',
    benchmark: 'Transparent access to attendance, grades, payments, announcements and academic progress.',
    icon: Users,
    modules: ['students', 'families' as keyof MasterDashboardSummary, 'notifications', 'payments'],
    signals: ['totalFamilies', 'totalNotifications'],
    actionPath: '/families',
    actionLabel: 'Manage families',
    globalReference: 'PowerSchool / OpenEMIS Guardian',
    referenceUrl: 'https://ps.powerschool-docs.com/pssis-student-parent/latest/get-started'
  },
  {
    id: 'analytics',
    title: 'Analytics and Strategic Reporting',
    benchmark: 'Live dashboards, trend analysis, audit-ready reports and KPI monitoring for leaders.',
    icon: BarChart3,
    modules: ['reports', 'finance', 'audit'],
    signals: ['enrollmentTrend', 'monthlyFinances', 'expenseCategoryBreakdown', 'totalAuditLogs'],
    actionPath: '/reports',
    actionLabel: 'View reports',
    globalReference: 'OpenEMIS Dashboard / PowerSchool Analytics',
    referenceUrl: 'https://www.openemis.org/'
  },
  {
    id: 'finance',
    title: 'Finance, Billing and Operations',
    benchmark: 'Payments, expenses, outstanding balances and branch-level operational finance visibility.',
    icon: AfghaniIcon,
    modules: ['payments', 'finance', 'expenses', 'branches'],
    signals: ['incomeTotal', 'expenseTotal', 'outstandingBalance'],
    actionPath: '/finance',
    actionLabel: 'Open finance',
    globalReference: 'openSIS / Classter',
    referenceUrl: 'https://www.opensis.com/features'
  },
  {
    id: 'security',
    title: 'Security, Roles and Compliance',
    benchmark: 'Role-based access, audit history, permission discipline and production security readiness.',
    icon: LockKeyhole,
    modules: ['roles', 'audit', 'users'],
    signals: ['totalAuditLogs', 'totalUsers'],
    actionPath: '/roles',
    actionLabel: 'Review roles',
    globalReference: 'openSIS privacy posture',
    referenceUrl: 'https://www.opensis.com/'
  },
  {
    id: 'curriculum',
    title: 'Curriculum and Learning Programs',
    benchmark: 'Course catalog, curriculum plans, outcomes, resources and learning progression management.',
    icon: BookOpen,
    modules: ['subjects', 'classes'],
    signals: ['totalSubjects', 'totalClasses'],
    actionPath: '/curriculum',
    actionLabel: 'Open curriculum',
    globalReference: 'Modern SIS/LMS convergence',
    referenceUrl: 'https://www.classter.com/blog/edtech/10-must-have-features-in-a-student-information-system-in-2026/'
  },
  {
    id: 'communication',
    title: 'Communication and Multilingual Access',
    benchmark: 'Announcements, preferred-language readiness, offline continuity and role-aware messaging.',
    icon: Languages,
    modules: ['notifications', 'users'],
    signals: ['totalNotifications'],
    actionPath: '/notifications',
    actionLabel: 'Send updates',
    globalReference: 'openSIS multilingual communication',
    referenceUrl: 'https://www.opensis.com/features'
  }
];

const roadmap = [
  'Create admission pipeline stages and document-upload tracking.',
  'Add automated absence thresholds with parent notifications.',
  'Introduce weighted grade categories, GPA logic and report-card export.',
  'Add behavior and student support records for intervention tracking.',
  'Add data-quality checks for missing guardian, class, teacher and fee fields.',
  'Connect dashboards to role-specific weekly operational tasks.'
];

function hasSignal(summary: DashboardSummary | undefined, signal: keyof DashboardSummary) {
  const value = summary?.[signal];
  if (Array.isArray(value)) return value.length > 0;
  return Number(value ?? 0) > 0;
}

function getDomainScore(domain: StandardDomain, master?: MasterDashboardSummary, summary?: DashboardSummary) {
  const moduleHits = domain.modules.filter((moduleKey) => Number(master?.[moduleKey] ?? 0) > 0).length;
  const signalHits = domain.signals.filter((signal) => hasSignal(summary, signal)).length;
  const total = domain.modules.length + domain.signals.length;

  if (!total) return 0;
  return Math.round(((moduleHits + signalHits) / total) * 100);
}

function readinessLabel(score: number) {
  if (score >= 85) return 'Global-ready';
  if (score >= 65) return 'Strong foundation';
  if (score >= 40) return 'Needs completion';
  return 'Setup required';
}

export function AcademicStandardsPage() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const summaryQuery = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardService.summary()
  });

  const masterQuery = useQuery({
    queryKey: ['dashboard-master-summary'],
    queryFn: dashboardService.masterSummary
  });

  const domains = useMemo(() => {
    return standardDomains.map((domain) => ({
      ...domain,
      score: getDomainScore(domain, masterQuery.data, summaryQuery.data)
    }));
  }, [masterQuery.data, summaryQuery.data]);

  const readinessScore = domains.length
    ? Math.round(domains.reduce((sum, domain) => sum + domain.score, 0) / domains.length)
    : 0;
  const completedDomains = domains.filter((domain) => domain.score >= 70).length;
  const needsAttention = domains.filter((domain) => domain.score < 70);
  const loading = summaryQuery.isLoading || masterQuery.isLoading;
  const failed = summaryQuery.isError || masterQuery.isError;
  const panelClass = isDark
    ? 'border-white/10 bg-white/5 text-slate-100'
    : 'border-slate-200 bg-white/90 text-slate-900 shadow-[0_18px_50px_rgba(15,23,42,0.08)]';
  const mutedText = isDark ? 'text-slate-300' : 'text-slate-600';
  const softText = isDark ? 'text-slate-400' : 'text-slate-500';
  const sectionBg = isDark
    ? 'border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.22),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.92))]'
    : 'border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(241,245,249,0.94))]';

  const tr = (key: string, defaultValue: string) => t(`common.${key}`, { defaultValue });

  return (
    <div className="space-y-6">
      <section className={`overflow-hidden rounded-[2rem] border p-6 shadow-[0_28px_90px_rgba(15,23,42,0.18)] sm:p-8 ${sectionBg}`}>
        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <div>
            <div className={`inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${isDark ? 'text-cyan-100' : 'text-cyan-700'}`}>
              <ShieldCheck className="h-4 w-4" />
              {tr('academic_standards_badge', 'Global SIS Benchmark')}
            </div>
            <h1 className={`mt-5 max-w-4xl text-3xl font-semibold sm:text-4xl ${isDark ? 'text-white' : 'text-slate-950'}`}>
              {tr('academic_standards_title', 'Academic Standards Center')}
            </h1>
            <p className={`mt-4 max-w-3xl text-sm leading-7 sm:text-base ${mutedText}`}>
              {tr('academic_standards_description', 'A web control center that compares Nokta Academy with modern academic platforms: SIS records, attendance, gradebook, family portal, reports, finance, security, curriculum and multilingual communication.')}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/reports">
                <Button className="gap-2">
                  <Activity className="h-4 w-4" />
                  <span>{tr('academic_standards_open_reports', 'Open reports')}</span>
                </Button>
              </Link>
              <Link to="/curriculum">
                <Button variant="outline" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span>{tr('academic_standards_curriculum_map', 'Curriculum map')}</span>
                </Button>
              </Link>
            </div>
          </div>

          <Card className={`border p-5 ${panelClass}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`text-xs uppercase tracking-[0.22em] ${softText}`}>{tr('academic_standards_readiness_score', 'Readiness score')}</p>
                <div className={`mt-3 text-5xl font-semibold ${isDark ? 'text-white' : 'text-slate-950'}`}>{loading ? '...' : `${readinessScore}%`}</div>
              </div>
              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-emerald-200">
                <Target className="h-6 w-6" />
              </div>
            </div>
            <p className={`mt-4 text-sm ${mutedText}`}>{tr(`academic_standards_readiness_${readinessLabel(readinessScore).toLowerCase().replace(/\s+/g, '_').replace('-', '_')}`, readinessLabel(readinessScore))}</p>
            <div className={`mt-5 h-3 overflow-hidden rounded-full ${isDark ? 'bg-slate-900/80' : 'bg-slate-200'}`}>
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300" style={{ width: `${readinessScore}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className={`rounded-2xl border p-3 ${isDark ? 'border-white/10 bg-slate-950/30' : 'border-slate-200 bg-slate-50'}`}>
                <p className={softText}>{tr('academic_standards_strong_domains', 'Strong domains')}</p>
                <p className={`mt-1 text-2xl font-semibold ${isDark ? 'text-white' : 'text-slate-950'}`}>{completedDomains}</p>
              </div>
              <div className={`rounded-2xl border p-3 ${isDark ? 'border-white/10 bg-slate-950/30' : 'border-slate-200 bg-slate-50'}`}>
                <p className={softText}>{tr('academic_standards_need_work', 'Need work')}</p>
                <p className={`mt-1 text-2xl font-semibold ${isDark ? 'text-white' : 'text-slate-950'}`}>{needsAttention.length}</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {failed && (
        <Card className={`border border-amber-300/30 bg-amber-300/10 p-4 ${isDark ? 'text-amber-100' : 'text-amber-700'}`}>
          {tr('academic_standards_metrics_failed', 'Live metrics could not be loaded. The standards map is still available, but readiness scores may be lower than actual.')}
        </Card>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        {domains.map((domain) => {
          const Icon = domain.icon;
          const healthy = domain.score >= 70;

          return (
            <Card key={domain.title} className={`flex h-full flex-col border p-5 ${panelClass}`}>
              <div className="flex items-start justify-between gap-4">
                <div className={`rounded-2xl border p-3 ${healthy ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200' : 'border-amber-300/20 bg-amber-300/10 text-amber-200'}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-slate-950'}`}>{loading ? '--' : `${domain.score}%`}</p>
                  <p className={`text-xs ${softText}`}>{tr(`academic_standards_readiness_${readinessLabel(domain.score).toLowerCase().replace(/\s+/g, '_').replace('-', '_')}`, readinessLabel(domain.score))}</p>
                </div>
              </div>
              <h2 className={`mt-5 text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-950'}`}>{tr(`standard_${domain.id}_title`, domain.title)}</h2>
              <p className={`mt-2 flex-1 text-sm leading-6 ${mutedText}`}>{tr(`standard_${domain.id}_benchmark`, domain.benchmark)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {domain.modules.slice(0, 4).map((moduleKey) => (
                  <span key={String(moduleKey)} className={`rounded-full border px-3 py-1 text-xs ${isDark ? 'border-white/10 bg-white/10 text-slate-300' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>
                    {String(moduleKey)}
                  </span>
                ))}
              </div>
              <div className={`mt-5 flex items-center justify-between gap-3 border-t pt-4 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <a href={domain.referenceUrl} target="_blank" rel="noreferrer" className="text-xs text-cyan-200 hover:text-cyan-100">
                  {domain.globalReference}
                </a>
                <Link to={domain.actionPath} className={`text-sm font-semibold ${isDark ? 'text-white hover:text-cyan-100' : 'text-slate-900 hover:text-cyan-700'}`}>
                  {tr(`standard_${domain.id}_action`, domain.actionLabel)}
                </Link>
              </div>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card className={`border p-6 ${panelClass}`}>
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-cyan-200" />
            <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-slate-950'}`}>{tr('academic_standards_roadmap', 'Global upgrade roadmap')}</h2>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {roadmap.map((item, index) => (
              <div key={item} className={`flex gap-3 rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-slate-950/30' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-300/10 text-sm font-semibold text-cyan-100">
                  {index + 1}
                </div>
                <p className={`text-sm leading-6 ${mutedText}`}>{tr(`academic_standards_roadmap_${index + 1}`, item)}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className={`border p-6 ${panelClass}`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-200" />
            <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-slate-950'}`}>{tr('academic_standards_priority_gaps', 'Priority gaps')}</h2>
          </div>
          <div className="mt-5 space-y-3">
            {(needsAttention.length ? needsAttention : domains.slice(0, 3)).map((domain) => (
              <Link key={domain.title} to={domain.actionPath} className={`flex items-center justify-between gap-3 rounded-2xl border p-4 transition hover:border-cyan-300/30 hover:bg-cyan-300/10 ${isDark ? 'border-white/10 bg-slate-950/30' : 'border-slate-200 bg-slate-50'}`}>
                <span className={`text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{tr(`standard_${domain.id}_title`, domain.title)}</span>
                <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-950'}`}>{domain.score}%</span>
              </Link>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { icon: CheckCircle2, label: 'Verified builds', value: 'TypeScript + Vite' },
          { icon: ShieldCheck, label: 'Security posture', value: 'RBAC + audit' },
          { icon: Bell, label: 'Communication', value: 'Role-aware notices' },
          { icon: FileText, label: 'Reports', value: 'Operational KPIs' },
          { icon: Languages, label: 'Localization', value: 'EN / FA / PS' },
          { icon: Activity, label: 'Continuity', value: 'PWA/offline cache' }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className={`flex items-center gap-4 border p-4 ${panelClass}`}>
              <div className={`rounded-2xl border p-3 ${isDark ? 'border-white/10 bg-white/10 text-cyan-100' : 'border-slate-200 bg-slate-100 text-cyan-700'}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className={`text-sm ${softText}`}>{tr(`academic_standards_signal_${item.label.toLowerCase().replace(/\s+/g, '_')}`, item.label)}</p>
                <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-950'}`}>{tr(`academic_standards_signal_value_${item.label.toLowerCase().replace(/\s+/g, '_')}`, item.value)}</p>
              </div>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
