import { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/services/apiClient';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/utils/formatters';
import { useTheme } from '@/app/providers/ThemeProvider';
import type { CatalogOffering } from '@/features/catalog/types';

function mapPublicDetail(data: any, catalogType: 'class' | 'course'): CatalogOffering {
  return {
    _id: String(data?._id ?? ''),
    catalogType,
    titleText: data?.titleText ?? data?.className ?? data?.title ?? '',
    shortDescription: data?.shortDescription ?? data?.description ?? '',
    descriptionText: data?.descriptionText ?? data?.description ?? '',
    fullDescription: data?.fullDescription ?? data?.description ?? '',
    teacherName: data?.teacherName ?? data?.teacher?.name ?? '',
    subjectName: data?.subjectName ?? data?.subject?.title ?? '',
    academicCategory: data?.academicCategory ?? '',
    schedule: data?.schedule ?? '',
    duration: data?.duration ?? '',
    fee: Number(data?.fee ?? data?.feeAmount ?? 0),
    feeAmount: Number(data?.feeAmount ?? data?.fee ?? 0),
    currency: data?.currency ?? 'AFN',
    imageUrl: data?.imageUrl ?? '',
    availableSeats: data?.availableSeats,
    capacity: data?.capacity,
    registrationOpen: data?.registrationOpen,
    classId: data?.classId ?? (catalogType === 'class' ? data?._id : ''),
    subjectId: data?.subjectId ?? data?.subject?._id ?? '',
    teacherId: data?.teacherId ?? data?.teacher?._id ?? ''
  };
}

export function CatalogDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const catalogType: 'class' | 'course' = location.pathname.includes('/home/classes/') ? 'class' : 'course';
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const endpoint = catalogType === 'class' ? `/classes/public/${id}` : `/courses/public/${id}`;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['catalog-detail', catalogType, id],
    queryFn: () => api.get(endpoint).then((res) => res.data.data),
    enabled: Boolean(id)
  });

  const item = useMemo(() => (data ? mapPublicDetail(data, catalogType) : null), [catalogType, data]);
  const panelClass = isDark ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-900';
  const handleRegister = () => {
    if (!item) {
      navigate('/register');
      return;
    }

    const params = new URLSearchParams();
    params.set('sourceType', item.catalogType);
    params.set('sourceTitle', item.titleText || '');
    if (item.catalogType === 'course') {
      params.set('courseId', item._id);
    }
    if (item.classId) params.set('classId', item.classId);
    if (item.subjectId) params.set('subjectId', item.subjectId);
    if (item.teacherId) params.set('teacherId', item.teacherId);

    localStorage.setItem('nokta-selected-registration', JSON.stringify({
      sourceType: item.catalogType,
      title: item.titleText,
      classId: item.classId ?? null,
      subjectId: item.subjectId ?? null,
      teacherId: item.teacherId ?? null,
      courseId: item.catalogType === 'course' ? item._id : null
    }));
    navigate(`/register?${params.toString()}`);
  };

  return (
    <div className={`min-h-screen px-4 py-10 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <div className={`mx-auto max-w-4xl rounded-3xl border p-6 shadow-2xl ${panelClass}`}>
        <Button variant="ghost" onClick={() => navigate('/home')} className="mb-6">
          <ArrowLeft className="h-4 w-4" />
          {t('common.back_to_home', { defaultValue: 'Back to home' })}
        </Button>
        {isLoading && <p>{t('common.loading')}</p>}
        {isError && <p>{t('errors.unable_load_records')}</p>}
        {item && (
          <>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-500">{catalogType === 'class' ? t('common.class') : t('common.course')}</p>
            <h1 className="mt-2 text-3xl font-semibold">{item.titleText}</h1>
            <p className="mt-4 text-sm leading-7 opacity-80">{item.fullDescription || item.descriptionText || item.shortDescription}</p>
            <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
              <p>{t('common.instructor')}: {item.teacherName || t('common.not_available')}</p>
              <p>{t('common.subject')}: {item.subjectName || t('common.not_available')}</p>
              <p>{t('common.schedule')}: {item.schedule || t('common.not_available')}</p>
              <p>{t('common.duration')}: {item.duration || t('common.not_available')}</p>
              <p>{t('common.fee')}: {formatCurrency(Number(item.fee ?? item.feeAmount ?? 0), i18n.resolvedLanguage)}</p>
            </div>
            <div className="mt-8">
              <Button onClick={handleRegister}>{t('common.register_now')}</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
