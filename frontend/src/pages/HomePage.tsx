import { memo, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useTheme } from '@/app/providers/ThemeProvider';
import { api } from '@/services/apiClient';
import { formatCurrency } from '@/utils/formatters';
import { CatalogCard } from '@/features/catalog/components/CatalogCard';
import { CatalogDetailModal } from '@/features/catalog/components/CatalogDetailModal';
import type { CatalogOffering } from '@/features/catalog/types';
import { formatJalaliDate } from '@/utils/date';
import { submitPublicContact } from '@/services/offlineOutbox';

interface HomeNotification {
  _id: string;
  title: string;
  description: string;
  message?: string;
  publishDate?: string;
  classId?: string | null;
  subjectId?: string | null;
  teacherId?: string | null;
  className?: string;
  subjectName?: string;
  teacherName?: string;
}

type HomeOffering = CatalogOffering;

function readLocalizedText(value: unknown, language?: string) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;
  const lang = String(language || 'en').split('-')[0];
  const resolved =
    record[lang] ??
    record.en ??
    record.fa ??
    record.ps ??
    Object.values(record).find((item) => typeof item === 'string');
  return typeof resolved === 'string' ? resolved : '';
}

function normalizeOffering(raw: any, catalogType: 'class' | 'course', language?: string): HomeOffering {
  return {
    ...raw,
    _id: String(raw?._id ?? ''),
    catalogType,
    titleText: readLocalizedText(raw?.titleText ?? raw?.className ?? raw?.title, language),
    shortDescription: readLocalizedText(raw?.shortDescription ?? raw?.descriptionText ?? raw?.description, language),
    descriptionText: readLocalizedText(raw?.descriptionText ?? raw?.description ?? raw?.shortDescription, language),
    fullDescription: readLocalizedText(raw?.fullDescription ?? raw?.description ?? raw?.descriptionText, language),
    teacherName: readLocalizedText(raw?.teacherName ?? raw?.instructorName ?? raw?.teacher?.name, language),
    subjectName: readLocalizedText(raw?.subjectName ?? raw?.subject?.title, language),
    academicCategory: readLocalizedText(raw?.academicCategory ?? raw?.category, language),
    schedule: readLocalizedText(raw?.schedule, language),
    duration: readLocalizedText(raw?.duration, language),
    currency: readLocalizedText(raw?.currency, language) || 'AFN'
  } as HomeOffering;
}

function AnimatedHeroTitle({ text }: { text: unknown }) {
  const safeText = typeof text === 'string' ? text : '';
  const words = safeText.split(/\s+/).filter(Boolean);

  return (
    <h1 className="mx-auto max-w-4xl bg-gradient-to-r from-amber-100 via-yellow-300 to-amber-500 bg-clip-text text-5xl font-black leading-tight text-transparent drop-shadow-[0_16px_55px_rgba(0,0,0,0.58)] sm:text-6xl lg:text-7xl">
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          className="mx-1 inline-block"
          animate={{ opacity: [0, 1, 1, 0], y: [14, 0, 0, -8] }}
          transition={{
            duration: 3.6,
            times: [0, 0.16, 0.78, 1],
            delay: index * 0.18,
            repeat: Infinity,
            repeatDelay: Math.max(1.2, words.length * 0.18)
          }}
        >
          {word}
        </motion.span>
      ))}
    </h1>
  );
}

const sectionReveal = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 }
};

function MotionSection({ id, className, children }: { id: string; className: string; children: React.ReactNode }) {
  return (
    <motion.section
      id={id}
      className={className}
      variants={sectionReveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.18 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
    >
      {children}
    </motion.section>
  );
}

export const HomePage = memo(function HomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactStatus, setContactStatus] = useState('');
  const [contactStatusType, setContactStatusType] = useState<'success' | 'error' | ''>('');
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const lastContactSubmitAt = useRef(0);
  const [activeHeroImage, setActiveHeroImage] = useState(0);
  const [selectedOffering, setSelectedOffering] = useState<HomeOffering | null>(null);

  const heroImages = useMemo(
    () => [
      '/images/home/academic-classroom.jpg',
      '/images/home/lecture-hall.jpg',
      '/images/home/university-library.jpg'
    ],
    []
  );

  const { data: announcements, isError: announcementsError, isLoading: announcementsLoading } = useQuery({
    queryKey: ['home-notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications/public', { params: { limit: 4 } });
      return (Array.isArray(res.data.data) ? res.data.data : []) as HomeNotification[];
    },
    staleTime: 60_000
  });

  const { data: courses, isError: coursesError, isLoading: coursesLoading } = useQuery({
    queryKey: ['home-courses', i18n.resolvedLanguage],
    queryFn: async () => {
      const res = await api.get('/courses/public/home', { params: { limit: 50, lang: i18n.resolvedLanguage || 'en' } });
      return (Array.isArray(res.data.data) ? res.data.data : [])
        .map((item: any) => normalizeOffering(item, 'course', i18n.resolvedLanguage));
    },
    staleTime: 60_000
  });

  const { data: classes, isError: classesError, isLoading: classesLoading } = useQuery({
    queryKey: ['home-classes', i18n.resolvedLanguage],
    queryFn: async () => {
      const res = await api.get('/classes/public/home', { params: { limit: 50, lang: i18n.resolvedLanguage || 'en' } });
      return (Array.isArray(res.data.data) ? res.data.data : [])
        .map((item: any) => normalizeOffering(item, 'class', i18n.resolvedLanguage));
    },
    staleTime: 60_000
  });

  const homeCatalogError = announcementsError || coursesError || classesError;
  const homeCatalogLoading = announcementsLoading || coursesLoading || classesLoading;

  const displayedAnnouncements = useMemo(
    () => {
      const source = announcements ?? [];
      return source.map((item: HomeNotification) => ({
        ...item,
        title: readLocalizedText(item.title, i18n.resolvedLanguage),
        description: readLocalizedText(item.description, i18n.resolvedLanguage),
        message: readLocalizedText(item.message, i18n.resolvedLanguage),
        className: readLocalizedText(item.className, i18n.resolvedLanguage),
        subjectName: readLocalizedText(item.subjectName, i18n.resolvedLanguage),
        teacherName: readLocalizedText(item.teacherName, i18n.resolvedLanguage)
      }));
    },
    [announcements, i18n.resolvedLanguage]
  );

  const displayedClasses = useMemo(
    () => (classes ?? []).filter((item: HomeOffering) => item.registrationOpen !== false),
    [classes]
  );
  const displayedCourses = useMemo(
    () => (courses ?? []).filter((item: HomeOffering) => (item as CatalogOffering).registrationOpen !== false),
    [courses]
  );

  const navItems = useMemo(
    () => [
      { id: 'home', label: t('nav_home') },
      { id: 'about', label: t('nav_about') },
      { id: 'courses', label: t('common.courses', { defaultValue: 'Courses' }) },
      { id: 'classes', label: t('common.classes', { defaultValue: 'Classes' }) },
      { id: 'notifications', label: t('common.announcements', { defaultValue: 'Announcements' }) },
      { id: 'contact', label: t('nav_contact') }
    ],
    [t]
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveHeroImage((current) => (current + 1) % heroImages.length);
    }, 7000);
    return () => window.clearInterval(intervalId);
  }, [heroImages.length]);

  const services = useMemo(
    () => [
      t('service_student_management'),
      t('service_teacher_management'),
      t('service_finance_reports'),
      t('service_exams_results'),
      t('service_family_access'),
      t('service_notifications')
    ],
    [t]
  );

  const teacherCards = useMemo(
    () => [
      { title: t('common.teachers'), text: t('about_feature_teachers') },
      { title: t('common.attendance'), text: t('service_student_management') },
      { title: t('common.results'), text: t('service_exams_results') }
    ],
    [t]
  );

  const scrollTo = useCallback((section: string) => {
    const element = document.getElementById(section);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleContactSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = contactName.trim();
    const trimmedEmail = contactEmail.trim();
    const trimmedPhone = contactPhone.trim();
    const trimmedMessage = contactMessage.trim();

    if (!trimmedName || !trimmedMessage) {
      setContactStatusType('error');
      setContactStatus(t('contact_validation_required'));
      return;
    }

    if (!trimmedEmail && !trimmedPhone) {
      setContactStatusType('error');
      setContactStatus(t('contact_validation_contact'));
      return;
    }

    const now = Date.now();
    if (now - lastContactSubmitAt.current < 4000) {
      return;
    }
    lastContactSubmitAt.current = now;

    setContactSubmitting(true);
    setContactStatusType('');
    setContactStatus(t('contact_sending'));
    try {
      const result = await submitPublicContact({
        name: trimmedName,
        email: trimmedEmail || undefined,
        phone: trimmedPhone || undefined,
        message: trimmedMessage,
        subject: t('contact_title')
      });

      setContactStatusType('success');
      setContactStatus(result.status === 'queued' ? t('contact_queued') : t('contact_sent'));
      setContactName('');
      setContactEmail('');
      setContactPhone('');
      setContactMessage('');
    } catch (error) {
      setContactStatusType('error');
      const message = error instanceof Error && error.message.trim()
        ? error.message
        : t('contact_error');
      setContactStatus(message);
    } finally {
      setContactSubmitting(false);
    }
  };

  const handleAnnouncementRegister = (announcement: HomeNotification) => {
    const params = new URLSearchParams();
    if (announcement.classId) params.set('classId', announcement.classId);
    if (announcement.subjectId) params.set('subjectId', announcement.subjectId);
    if (announcement.teacherId) params.set('teacherId', announcement.teacherId);
    if (announcement.title) params.set('sourceTitle', announcement.title);
    params.set('sourceType', 'announcement');
    localStorage.setItem('nokta-selected-registration', JSON.stringify({
      sourceType: 'announcement',
      title: announcement.title,
      classId: announcement.classId ?? null,
      subjectId: announcement.subjectId ?? null,
      teacherId: announcement.teacherId ?? null,
      className: announcement.className ?? '',
      subjectName: announcement.subjectName ?? '',
      teacherName: announcement.teacherName ?? ''
    }));
    navigate(`/register?${params.toString()}`);
  };

  const handleOfferingRegister = (item: HomeOffering) => {
    const params = new URLSearchParams();
    if (item.catalogType === 'course') {
      params.set('courseId', item._id);
      params.set('sourceType', 'course');
      if (item.classId) params.set('classId', item.classId);
      if (item.subjectId) params.set('subjectId', item.subjectId);
      if (item.teacherId) params.set('teacherId', item.teacherId);
    } else {
      params.set('classId', item.classId ?? item._id);
      params.set('sourceType', 'class');
      if (item.subjectId) params.set('subjectId', item.subjectId);
      if (item.teacherId) params.set('teacherId', item.teacherId);
    }
    params.set('sourceTitle', item.titleText);
    localStorage.setItem('nokta-selected-registration', JSON.stringify({
      sourceType: item.catalogType,
      title: item.titleText,
      classId: params.get('classId'),
      subjectId: params.get('subjectId'),
      teacherId: params.get('teacherId'),
      courseId: params.get('courseId')
    }));
    navigate(`/register?${params.toString()}`);
  };

  const pageClass = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const headerClass = isDark ? 'border-slate-800/70 bg-slate-950/95' : 'border-slate-200/80 bg-white/95';
  const navClass = isDark ? 'text-slate-300 hover:text-slate-100' : 'text-slate-600 hover:text-slate-950';
  const titleClass = isDark ? 'text-white' : 'text-slate-950';
  const textClass = isDark ? 'text-slate-400' : 'text-slate-600';
  const sectionBorderClass = isDark ? 'border-slate-800/80' : 'border-slate-200/80';
  const cardClass = isDark ? 'border-slate-800/80 bg-slate-900/85 shadow-slate-950/20' : 'border-slate-200 bg-white shadow-slate-200/70';
  const courseCardClass = isDark
    ? 'border-slate-800/80 bg-slate-900/90 shadow-slate-950/25 hover:border-sky-400/55'
    : 'border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.10)] hover:border-sky-300 hover:shadow-[0_30px_80px_rgba(14,165,233,0.18)]';
  const courseMediaClass = isDark
    ? 'bg-gradient-to-br from-slate-800 via-slate-900 to-sky-950 text-sky-200'
    : 'bg-gradient-to-br from-sky-50 via-white to-emerald-50 text-sky-700';
  const insetCardClass = isDark ? 'border-slate-800/80 bg-slate-950/70 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700';
  const serviceSectionClass = isDark ? 'bg-slate-900/80' : 'bg-white';
  const inputClass = isDark
    ? 'border-slate-800/80 bg-slate-900/80 text-slate-100 focus:border-sky-500 focus:ring-sky-500/20'
    : 'border-slate-200 bg-white text-slate-900 focus:border-sky-500 focus:ring-sky-500/20';
  const loginNavButtonClass = isDark
    ? 'border-slate-600/70 bg-slate-800/70 text-slate-100 hover:bg-slate-700/80'
    : 'border-sky-300 bg-white text-sky-800 shadow-sm hover:bg-sky-50';

  return (
    <div className={`min-h-screen ${pageClass}`}>
      {(homeCatalogError || homeCatalogLoading) && (
        <div className="relative z-[60] border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-900 dark:text-amber-100">
          {homeCatalogLoading
            ? t('common.loading')
            : t('errors.unable_load_records')}
        </div>
      )}
      <header className={`fixed inset-x-0 top-0 z-50 border-b ${headerClass} backdrop-blur-xl`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white/95 shadow-lg shadow-amber-500/10 ring-1 ring-amber-200/40">
              <img src="/images/1.png" alt="Nokta Academy" className="h-full w-full object-contain p-1" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-400">{t('home_brand')}</p>
              <p className={isDark ? 'text-xs text-slate-500' : 'text-xs text-slate-600'}>{t('home_tagline')}</p>
            </div>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollTo(item.id)}
                className={`text-sm font-medium transition ${navClass}`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden md:flex">
              <LanguageSwitcher />
            </div>
            <Button variant="outline" size="sm" className={`hidden sm:inline-flex ${loginNavButtonClass}`} onClick={() => navigate('/login')}>
              {t('nav_login')}
            </Button>
          </div>
        </div>
      </header>

      <main className="pt-24">
        <MotionSection id="home" className="relative min-h-[calc(100vh-6rem)] overflow-hidden px-4 pb-10 pt-20 sm:px-6 lg:px-8">
          <div className="absolute inset-0">
            {heroImages.map((image, index) => (
              <img
                key={image}
                src={image}
                alt=""
                loading={index === 0 ? 'eager' : 'lazy'}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${index === activeHeroImage ? 'opacity-100' : 'opacity-0'}`}
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            ))}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.55),rgba(15,23,42,0.66)_48%,rgba(2,6,23,0.9))]" />
            <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-slate-950 via-slate-950/72 to-transparent" />
          </div>
          <div className="relative mx-auto flex min-h-[calc(100vh-10rem)] max-w-7xl flex-col justify-between gap-10">
            <div className="mx-auto flex max-w-5xl flex-1 flex-col items-center justify-center text-center">
              <div className="space-y-5">
                <AnimatedHeroTitle text={t('hero_title')} />
                <p className="mx-auto max-w-3xl text-lg font-medium leading-8 text-amber-50/95 drop-shadow-[0_8px_30px_rgba(0,0,0,0.62)] sm:text-xl">
                  {t('hero_description')}
                </p>
              </div>

              <div className="mt-8 flex flex-row flex-wrap items-center justify-center gap-4">
                <Button size="md" className="min-w-[150px] py-4 shadow-[0_18px_60px_rgba(14,165,233,0.26)] hover:scale-[1.02]" onClick={() => navigate('/login')}>
                  {t('hero_cta_login')}
                </Button>
                <Button size="md" className="min-w-[150px] py-4 shadow-[0_18px_60px_rgba(14,165,233,0.26)] hover:scale-[1.02]" onClick={() => scrollTo('about')}>
                  {t('hero_cta_learn_more')}
                </Button>
                <Button size="md" className="min-w-[150px] py-4 shadow-[0_18px_60px_rgba(14,165,233,0.26)] hover:scale-[1.02]" onClick={() => scrollTo('contact')}>
                  {t('hero_cta_contact')}
                </Button>
              </div>
            </div>

            <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_1fr_360px]">
              <div className="rounded-[1.75rem] border border-amber-200/15 bg-slate-950/68 p-6 shadow-xl shadow-slate-950/20 backdrop-blur-xl transition duration-500 hover:-translate-y-1 hover:border-amber-300/45">
                <p className="text-xs uppercase tracking-[0.3em] text-amber-200/75">{t('home_summary_title')}</p>
                <p className="mt-4 text-2xl font-semibold text-amber-50">{t('home_summary_students')}</p>
                <p className="mt-2 text-slate-300">{t('home_summary_students_text')}</p>
              </div>
              <div className="rounded-[1.75rem] border border-amber-200/15 bg-slate-950/68 p-6 shadow-xl shadow-slate-950/20 backdrop-blur-xl transition duration-500 hover:-translate-y-1 hover:border-amber-300/45">
                <p className="text-xs uppercase tracking-[0.3em] text-amber-200/75">{t('home_summary_title')}</p>
                <p className="mt-4 text-2xl font-semibold text-amber-50">{t('home_summary_reports')}</p>
                <p className="mt-2 text-slate-300">{t('home_summary_reports_text')}</p>
              </div>

              <div className="rounded-[1.75rem] border border-amber-200/20 bg-slate-950/72 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-amber-200">{t('home_login_card')}</p>
                  <h2 className="text-2xl font-semibold text-amber-50">{t('home_login_card')}</h2>
                  <p className="text-sm leading-6 text-slate-300">{t('home_login_hint')}</p>
                </div>
                <div className="mt-5">
                  <Button className="w-full py-3" onClick={() => navigate('/login')}>
                    {t('hero_cta_login')}
                  </Button>
                </div>
                <div className="mt-5 flex justify-center gap-2">
                  {heroImages.map((image, index) => (
                    <button
                      key={image}
                      type="button"
                      aria-label={t('common.select_slide', { defaultValue: 'Select slide' })}
                      onClick={() => setActiveHeroImage(index)}
                      className={`h-2 rounded-full transition-all ${index === activeHeroImage ? 'w-10 bg-amber-300' : 'w-2 bg-slate-500'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </MotionSection>

        <MotionSection id="about" className={`border-t ${sectionBorderClass} px-4 py-20 sm:px-6 lg:px-8`}>
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl space-y-4">
              <p className="text-sky-400 uppercase tracking-[0.3em] text-xs">{t('about_label')}</p>
              <h2 className={`text-4xl font-semibold ${titleClass}`}>{t('about_title')}</h2>
              <p className={`text-lg leading-8 ${textClass}`}>{t('about_description')}</p>
            </div>
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {[
                t('about_feature_students'),
                t('about_feature_teachers'),
                t('about_feature_reports')
              ].map((text) => (
                <div key={text} className={`rounded-3xl border ${cardClass} p-6 transition duration-500 hover:-translate-y-1 hover:border-sky-500/50`}>
                  <p className={`text-lg font-semibold ${titleClass}`}>{text}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 grid gap-6 lg:grid-cols-3">
              {teacherCards.map((card) => (
                <motion.div
                  key={card.title}
                  className={`rounded-3xl border ${cardClass} p-6 transition duration-500 hover:-translate-y-1 hover:border-amber-400/60`}
                  variants={sectionReveal}
                >
                  <p className={`text-lg font-semibold ${titleClass}`}>{card.title}</p>
                  <p className={`mt-3 text-sm leading-7 ${textClass}`}>{card.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </MotionSection>

        <MotionSection id="courses" className={`border-t ${sectionBorderClass} px-4 py-20 sm:px-6 lg:px-8`}>
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl space-y-4">
              <p className="text-sky-400 uppercase tracking-[0.3em] text-xs">{t('common.courses', { defaultValue: 'Courses' })}</p>
              <h2 className={`text-4xl font-semibold ${titleClass}`}>{t('common.courses', { defaultValue: 'Courses' })}</h2>
              <p className={`text-lg leading-8 ${textClass}`}>{t('common.educational_programs_description')}</p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {displayedCourses.map((item: HomeOffering) => (
                <CatalogCard
                  key={`${item.catalogType}-${item._id}`}
                  item={item}
                  isDark={isDark}
                  onViewDetails={(item) => {
                    setSelectedOffering(item);
                    navigate(`/home/${item.catalogType === 'class' ? 'classes' : 'courses'}/${item._id}`);
                  }}
                  onRegister={handleOfferingRegister}
                />
              ))}
            </div>

            {!displayedCourses.length && (
              <div className={`mt-12 rounded-3xl border border-dashed ${sectionBorderClass} p-8 text-center ${textClass}`}>
                {t('common.no_records_found')}
              </div>
            )}
          </div>
        </MotionSection>

        <MotionSection id="classes" className={`${serviceSectionClass} border-t ${sectionBorderClass} px-4 py-20 sm:px-6 lg:px-8`}>
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl space-y-4">
              <p className="text-sky-400 uppercase tracking-[0.3em] text-xs">{t('common.classes', { defaultValue: 'Classes' })}</p>
              <h2 className={`text-4xl font-semibold ${titleClass}`}>{t('common.classes', { defaultValue: 'Classes' })}</h2>
              <p className={`text-lg leading-8 ${textClass}`}>{t('common.public_classes_description', { defaultValue: 'Explore active public classes with teacher, fee, schedule, and enrollment details.' })}</p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {displayedClasses.map((item: HomeOffering) => (
                <CatalogCard
                  key={`${item.catalogType}-${item._id}`}
                  item={item}
                  isDark={isDark}
                  onViewDetails={(item) => {
                    setSelectedOffering(item);
                    navigate(`/home/${item.catalogType === 'class' ? 'classes' : 'courses'}/${item._id}`);
                  }}
                  onRegister={handleOfferingRegister}
                />
              ))}
            </div>

            {!displayedClasses.length && (
              <div className={`mt-12 rounded-3xl border border-dashed ${sectionBorderClass} p-8 text-center ${textClass}`}>
                {t('common.no_records_found')}
              </div>
            )}
          </div>
        </MotionSection>

        <MotionSection id="services" className={`${serviceSectionClass} px-4 py-20 sm:px-6 lg:px-8`}>
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl space-y-4">
              <p className="text-sky-400 uppercase tracking-[0.3em] text-xs">{t('services_label')}</p>
              <h2 className={`text-4xl font-semibold ${titleClass}`}>{t('services_title')}</h2>
              <p className={`text-lg leading-8 ${textClass}`}>{t('services_description')}</p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {services.map((service) => (
                <motion.div key={service} className={`group rounded-[2rem] border ${cardClass} p-8 shadow-2xl transition duration-500 hover:-translate-y-1 hover:border-sky-500/50`} variants={sectionReveal}>
                  <div className={`mb-6 inline-flex rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] ${
                    isDark ? 'bg-sky-500/10 text-sky-300' : 'bg-sky-100 text-sky-700'
                  }`}>
                    {t('service_tag')}
                  </div>
                  <h3 className={`text-2xl font-semibold ${titleClass}`}>{service}</h3>
                  <p className={`mt-4 ${textClass}`}>{t('service_card_description')}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </MotionSection>

        <MotionSection id="notifications" className={`border-t ${sectionBorderClass} px-4 py-20 sm:px-6 lg:px-8`}>
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl space-y-4">
              <p className="text-sky-400 uppercase tracking-[0.3em] text-xs">{t('notifications.latest_announcements', { defaultValue: 'Latest Announcements' })}</p>
              <h2 className={`text-4xl font-semibold ${titleClass}`}>{t('notifications.latest_announcements', { defaultValue: 'Latest Announcements' })}</h2>
              <p className={`text-lg leading-8 ${textClass}`}>{t('notifications.home_description', { defaultValue: 'Stay updated with the newest academy announcements, notices, and published updates.' })}</p>
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
              {displayedAnnouncements.map((announcement) => (
                <motion.article key={announcement._id} className={`overflow-hidden rounded-[2rem] border ${cardClass} shadow-2xl transition duration-500 hover:-translate-y-1 hover:border-sky-500/50`} variants={sectionReveal}>
                  <div className="space-y-4 p-6">
                    <p className="text-xs uppercase tracking-[0.25em] text-sky-300">
                      {announcement.publishDate ? formatJalaliDate(announcement.publishDate, i18n.resolvedLanguage) : ''}
                    </p>
                    <h3 className={`text-2xl font-semibold ${titleClass}`}>{announcement.title}</h3>
                    <p className={`text-sm leading-7 ${textClass}`}>{announcement.description || announcement.message || t('common.not_available')}</p>
                    {(announcement.className || announcement.subjectName || announcement.teacherName) && (
                      <div className={`space-y-2 rounded-2xl border p-4 text-sm ${insetCardClass}`}>
                        <p>{t('students.class')}: {announcement.className || t('common.not_available')}</p>
                        <p>{t('students.subject')}: {announcement.subjectName || t('common.not_available')}</p>
                        <p>{t('students.teacher')}: {announcement.teacherName || t('common.not_available')}</p>
                      </div>
                    )}
                    <Button size="sm" onClick={() => handleAnnouncementRegister(announcement)}>
                      {t('common.register', { defaultValue: 'Register' })}
                    </Button>
                  </div>
                </motion.article>
              ))}
            </div>

            {!displayedAnnouncements.length && (
              <div className={`mt-12 rounded-[2rem] border border-dashed ${sectionBorderClass} p-8 text-center ${textClass}`}>
                {t('common.no_records_found')}
              </div>
            )}
          </div>
        </MotionSection>

        <MotionSection id="contact" className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6">
                <p className="text-sky-400 uppercase tracking-[0.3em] text-xs">{t('contact_label')}</p>
                <h2 className={`text-4xl font-semibold ${titleClass}`}>{t('contact_title')}</h2>
                <p className={`text-lg leading-8 ${textClass}`}>{t('contact_description')}</p>
                <div className={`space-y-4 rounded-3xl border ${cardClass} p-6`}>
                  <p className={`text-base font-semibold ${titleClass}`}>{t('contact_email')}</p>
                  <a href={`mailto:${t('contact_email_value')}`} className={`${textClass} hover:text-sky-400`}>
                    {t('contact_email_value')}
                  </a>
                  <p className={`text-base font-semibold ${titleClass}`}>{t('contact_phone')}</p>
                  <a href={`tel:${t('contact_phone_value')}`} className={`${textClass} hover:text-sky-400`}>
                    {t('contact_phone_value')}
                  </a>
                  <p className={`text-base font-semibold ${titleClass}`}>{t('contact_address')}</p>
                  <p className={textClass}>{t('contact_address_text')}</p>
                </div>
              </div>

              <div className={`rounded-[2rem] border ${cardClass} p-8 shadow-2xl`}>
                <h3 className={`text-2xl font-semibold ${titleClass}`}>{t('contact_form_title')}</h3>
                <p className={`mt-3 ${textClass}`}>{t('contact_form_description')}</p>
                <form onSubmit={handleContactSubmit} className="mt-8 space-y-5">
                  <div>
                    <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('contact_form_name')}</label>
                    <Input value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder={t('contact_form_name_placeholder')} />
                  </div>
                  <div>
                    <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('contact_form_email')}</label>
                    <Input value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder={t('contact_form_email_placeholder')} type="email" />
                  </div>
                  <div>
                    <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('contact_phone')}</label>
                    <Input value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} placeholder={t('contact_phone_value')} />
                  </div>
                  <div>
                    <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('contact_form_message')}</label>
                    <textarea
                      value={contactMessage}
                      onChange={(event) => setContactMessage(event.target.value)}
                      placeholder={t('contact_form_message_placeholder')}
                      rows={5}
                      className={`w-full rounded-3xl border px-4 py-3 outline-none transition focus:ring-2 ${inputClass}`}
                    />
                  </div>
                  {contactStatus && (
                    <p className={`text-sm ${contactStatusType === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {contactStatus}
                    </p>
                  )}
                  <Button type="submit" className="w-full py-4" disabled={contactSubmitting}>
                    {contactSubmitting ? t('contact_sending') : t('contact_form_submit')}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </MotionSection>

        <footer className={`border-t ${sectionBorderClass} ${isDark ? 'bg-slate-950/90' : 'bg-white'} px-4 py-12 sm:px-6 lg:px-8`}>
          <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-400">{t('home_brand')}</p>
              <p className={`mt-3 max-w-xl ${textClass}`}>{t('footer_description')}</p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-10">
              <div className="space-y-2">
                <p className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>{t('footer_quick_links')}</p>
                <div className={`flex flex-wrap gap-3 text-sm ${textClass}`}>
                  {navItems.map((item) => (
                    <button key={item.id} type="button" onClick={() => scrollTo(item.id)} className={`transition ${isDark ? 'hover:text-slate-100' : 'hover:text-slate-950'}`}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <LanguageSwitcher />
              </div>
            </div>
          </div>
          <div className={`mt-10 border-t ${sectionBorderClass} pt-6 text-sm ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
            {t('footer_copyright')}
          </div>
        </footer>
      </main>
      <CatalogDetailModal
        item={selectedOffering}
        isDark={isDark}
        onClose={() => setSelectedOffering(null)}
        onRegister={(item) => {
          setSelectedOffering(null);
          handleOfferingRegister(item);
        }}
      />
    </div>
  );
});
