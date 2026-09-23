import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '@/services/apiClient';
import { useDebounce } from '@/hooks/useDebounce';
import { useSelectOptions } from '@/hooks/useSelectOptions';
import { useTranslation } from 'react-i18next';
import i18n from '@/locales/i18n';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { AlertTriangle, ArrowUpDown, Clock, LayoutGrid, Plus, Table2, X } from 'lucide-react';
import { normalizeRole, userCanOpenPath, userHasModuleAction, type ModuleConfig, type ModuleField } from '@/features/resources/config/modules';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/app/providers/ThemeProvider';
import { PageHeader, SearchFilterBar, DataTable, FormModal } from '@/shared/components/Common';
import { ListPagination } from '@/shared/filters/ListPagination';
import { hasSortSupport, sortCollection, type ListSortDirection, type ListSortField } from '@/utils/listSearchSort';
import { formatJalaliDate, formatJalaliTime } from '@/utils/date';
import { EntityAvatar } from '@/components/ui/EntityAvatar';
import { ProfileImageField } from '@/components/forms/ProfileImageField';
import { getClassName, getEnrollmentStatus, getGuardianPhone, getStudentFullName, getStudentNumber, getStudentPhone, getSubjectName, getTeacherName, getBranchName } from '@/utils/studentDisplay';
import { valueOrFallback } from '@/utils/displayValue';
import { ExamResultInsightsPanel } from '@/features/results/components/ExamResultInsightsPanel';
import { IntelligentResultAnalysisPanel } from '@/features/results/components/IntelligentResultAnalysisPanel';
import { FamilyPortalAccountModal } from '@/features/families/components/FamilyPortalAccountModal';
import { PhoneContactBlock, PhoneFieldRow, isPhoneListFieldKey } from '@/components/contact/PhoneContactBlock';
import { JalaliDateInput } from '@/components/forms/JalaliDateInput';
import {
  isJalaliDateFieldName,
  isPersonNameFieldName,
  isPhoneLikeFieldName,
  isValidAfghanPhone,
  sanitizeAfghanPhoneInput,
  sanitizePersonNameInput,
  validateFieldValue
} from '@/utils/formValidation';
import { formatIsoToJalaliInput, jalaliInputToIsoDate } from '@/utils/jalaliDateInput';

interface CrudPageProps {
  config: ModuleConfig;
}

export const CrudPage = ({ config }: CrudPageProps) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState<ListSortField>('name');
  const [sortDirection, setSortDirection] = useState<ListSortDirection>('asc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreparingEdit, setIsPreparingEdit] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formError, setFormError] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [aiRecommendation, setAiRecommendation] = useState<any>(null);
  const [selectedAiResultId, setSelectedAiResultId] = useState<string | null>(null);
  const [selectedAiExamId, setSelectedAiExamId] = useState<string | null>(null);
  const [detailsItem, setDetailsItem] = useState<any>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [familyPortalTarget, setFamilyPortalTarget] = useState<any>(null);
  const location = useLocation();
  const dashboardNavigation = location.state as { preferCardView?: boolean; dashboardIntent?: 'edit' | 'delete' | 'create' } | null;
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [dependentFieldOptions, setDependentFieldOptions] = useState<Record<string, any[]>>({});
  const [dependentLoading, setDependentLoading] = useState<Record<string, boolean>>({});
  const debouncedSearch = useDebounce(search, 300);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const { isDark } = useTheme();
  const entityCardClass = isDark
    ? 'border-slate-800/80 bg-slate-950/90 text-slate-100 shadow-xl'
    : 'border-slate-200 bg-white/95 text-slate-900 shadow-[0_16px_40px_rgba(15,23,42,0.08)]';
  const entityPanelClass = isDark ? 'bg-slate-900/80 text-slate-100' : 'bg-slate-50 text-slate-900';
  const entityMutedTextClass = isDark ? 'text-slate-400' : 'text-slate-600';
  const entityBodyTextClass = isDark ? 'text-slate-300' : 'text-slate-700';
  const entityTitleClass = isDark ? 'text-white' : 'text-slate-950';

  const translate = (text: string | undefined) => (text ? t(text, { defaultValue: text }) : '');
  const pageTitle = translate(config.title);
  const pageDescription = config.description ? t(config.description, { defaultValue: config.description }) : undefined;
  const entityLabel = translate(config.entity);
  const entityText = entityLabel || pageTitle || 'Record';
  const notAvailable = t('common.not_available');
  const sortFieldCandidates = useMemo(() => {
    return new Set([
      ...(config.listFields ?? []).map((field) => field.key),
      ...(config.fields ?? []).map((field) => field.name),
      config.searchField ?? ''
    ].filter(Boolean));
  }, [config.fields, config.listFields, config.searchField]);

  const moduleKey = config.endpoint.replace(/^\//, '');
  const isSuperAdmin = normalizeRole(user?.role) === 'super_admin';

  useEffect(() => {
    if (!dashboardNavigation) return;

    if (dashboardNavigation.preferCardView) {
      setViewMode('card');
    }

    if (dashboardNavigation.dashboardIntent === 'delete') {
      setFeedbackMessage({
        type: 'success',
        text: t('dashboard.delete_from_cards_hint', {
          defaultValue: 'Select a record below and use the delete button on its card.'
        })
      });
    }

    if (dashboardNavigation.dashboardIntent === 'create') {
      setEditingItem(null);
      setFormData({});
      setIsModalOpen(true);
    }

    navigate(location.pathname, { replace: true, state: null });
  }, [dashboardNavigation, location.pathname, navigate, t]);

  const canView = userCanOpenPath(user, config.path);
  const canCreate = userHasModuleAction(user, moduleKey, 'create');
  const canEdit = userHasModuleAction(user, moduleKey, 'update');
  const canDelete = userHasModuleAction(user, moduleKey, 'delete');

  const queryKey = [config.path, debouncedSearch, page, pageSize, sortField, sortDirection];
  const isTeacherUser = normalizeRole(user?.role as any) === 'teacher';
  const visibleFields = config.fields.filter((field) => {
    if (editingItem && field.hiddenOnEdit) return false;
    // Teachers cannot browse /teachers; exam ownership is forced to self on the API.
    if (isTeacherUser && config.path === '/exams' && field.name === 'teacherId') return false;
    return true;
  });

  const transformPayloadForApi = (payload: Record<string, any>) => {
    const next = { ...payload };
    if (isTeacherUser && config.path === '/exams') {
      next.teacherId = String(user?.id ?? '');
    }
    visibleFields.forEach((field) => {
      if (!isJalaliDateFieldName(field.name, field.type)) return;
      const rawValue = next[field.name];
      if (!rawValue) return;
      const isoDate = jalaliInputToIsoDate(String(rawValue));
      if (isoDate) {
        next[field.name] = isoDate;
      }
    });
    return next;
  };

  const cleanPayload = (payload: Record<string, any>) => {
    return Object.entries(payload).reduce((acc, [key, value]) => {
      if (value === '' || value === null || value === undefined) return acc;
      if (Array.isArray(value)) {
        const filtered = value.filter((item) => item !== '' && item !== null && item !== undefined);
        if (filtered.length === 0) return acc;
        acc[key] = filtered;
        return acc;
      }
      acc[key] = value;
      return acc;
    }, {} as Record<string, any>);
  };

  const buildRequestData = (payload: Record<string, any>) => {
    return { payload, requestConfig: undefined };
  };

  const formatErrorMessage = (error: any, fallback: string) => {
    const serverMessage = error?.response?.data?.message;
    if (typeof serverMessage === 'string') {
      if (/class code already exists/i.test(serverMessage)) {
        return t('errors.class_code_exists');
      }
      if (/one or more assigned teachers are invalid/i.test(serverMessage)) {
        return t('errors.invalid_assigned_teacher', { defaultValue: 'یک یا چند استاد انتخاب‌شده معتبر نیستند.' });
      }
      if (/teacher gender must match class policy/i.test(serverMessage)) {
        return t('errors.teacher_class_policy_mismatch', { defaultValue: 'جنسیت استاد با پالیسی صنف مطابقت ندارد.' });
      }
      if (/class schedule end time must be after start time/i.test(serverMessage)) {
        return t('errors.invalid_class_schedule_time', { defaultValue: 'وقت ختم باید بعد از وقت شروع باشد.' });
      }
      return serverMessage;
    }
    return error?.message || fallback;
  };

  const getSuccessMessage = (serverMessage: unknown, action: 'created' | 'updated' | 'deleted') => {
    if (typeof serverMessage === 'string' && serverMessage.trim()) {
      return serverMessage;
    }

    return `${entityText} ${action} successfully`;
  };

  const getItemDisplayName = (item: any) => {
    if (!item || typeof item !== 'object') {
      return entityText;
    }

    if (item.name) return String(item.name);
    if (item.guardianName) return String(item.guardianName);
    if (item.title) return String(item.title);
    if (item.className) return String(item.className);
    if (item.firstName || item.lastName) return [item.firstName, item.lastName].filter(Boolean).join(' ').trim();
    if (item.email) return String(item.email);
    if (item.guardianEmail) return String(item.guardianEmail);
    return entityText;
  };

  const getExamTakeUrl = (item: any) => {
    const online = String(item?.onlineExamUrl ?? '').trim();
    const google = String(item?.googleFormUrl ?? '').trim();
    return online || google;
  };

  const getFieldDisplayValue = (item: any, key: string) => {
    if ((key === 'date' || key === 'examDate' || key === 'publishDate') && item?.[key]) {
      const formatted = formatJalaliDate(item[key], i18n.language);
      if (formatted) return formatted;
    }
    const displayValueMap: Record<string, string> = {
      studentNumber: getStudentNumber(item),
      rollNo: getStudentNumber(item),
      fullName: getStudentFullName(item),
      className: getClassName(item) || item?.className,
      subjectName: getSubjectName(item) || item?.subjectName,
      teacherName: getTeacherName(item) || item?.teacherName,
      guardianPhone: getGuardianPhone(item),
      familyPhone: getGuardianPhone(item),
      studentPhone: getStudentPhone(item),
      branchName: getBranchName(item) || item?.branchName,
      enrollmentStatus: getEnrollmentStatus(item)
    };
    return displayValueMap[key] || item?.[key];
  };

  const extractId = (value: any) => {
    if (!value) return '';
    if (typeof value === 'object') {
      return String(value._id ?? value.id ?? '');
    }
    return String(value);
  };

  const buildRegisterSearch = (item: any) => {
    const params = new URLSearchParams();
    const classId = config.path === '/classes' ? extractId(item?._id ?? item?.id) : extractId(item?.classId);
    const subjectId = extractId(item?.subjectId);
    const teacherId = extractId(item?.teacherId);
    const sourceTitle = config.path === '/classes'
      ? String(item?.className ?? item?.name ?? '')
      : String(item?.title ?? item?.className ?? item?.name ?? '');

    if (classId) params.set('classId', classId);
    if (subjectId) params.set('subjectId', subjectId);
    if (teacherId) params.set('teacherId', teacherId);
    if (sourceTitle) params.set('sourceTitle', sourceTitle);
    if (config.path === '/notifications') params.set('sourceType', 'announcement');
    if (config.path === '/classes') params.set('sourceType', 'class');

    return params.toString();
  };

  const navigateToRegister = (item: any) => {
    const searchString = buildRegisterSearch(item);
    navigate(searchString ? `/register?${searchString}` : '/register');
  };

  const listPageSize = pageSize;

  const fetchData = async () => {
    const response = await api.get(config.endpoint, {
      params: {
        search: debouncedSearch || undefined,
        page,
        limit: listPageSize,
        sortBy: sortField,
        sortOrder: sortDirection,
        lang: i18n.language,
        ...(isSuperAdmin ? { includeDeleted: true } : {})
      }
    });
    return {
      items: response.data.data ?? [],
      pagination: response.data.pagination ?? {
        page,
        limit: listPageSize,
        total: Array.isArray(response.data.data) ? response.data.data.length : 0
      }
    };
  };

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey,
    queryFn: fetchData,
    enabled: canView,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 60_000,
    placeholderData: keepPreviousData
  });

  const listItems = Array.isArray(data?.items) ? data.items : [];
  const paginationMeta = data?.pagination ?? { page, limit: pageSize, total: listItems.length };

  const createMutation = useMutation({
    mutationFn: async ({ payload, config: requestConfig }: { payload: any; config?: any }) => {
      return api.post(config.createEndpoint ?? config.endpoint, payload, requestConfig);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey });
      setIsModalOpen(false);
      setFormData({});
      setFormError('');
      setFeedbackMessage({ type: 'success', text: getSuccessMessage(response.data?.message, 'created') });
    },
    onError: (error: any) => {
      setFormError(formatErrorMessage(error, t('errors.unable_load_records')));
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload, config: requestConfig }: { id: string; payload: any; config?: any }) => {
      return api.put(`${config.endpoint}/${id}`, payload, requestConfig);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey });
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({});
      setFormError('');
      setFeedbackMessage({ type: 'success', text: getSuccessMessage(response.data?.message, 'updated') });
    },
    onError: (error: any) => {
      setFormError(formatErrorMessage(error, t('errors.unable_load_records')));
    }
  });

  const restoreMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => api.patch(`${config.endpoint}/${id}/restore`),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey });
      setFeedbackMessage({ type: 'success', text: getSuccessMessage(response.data?.message, 'updated') });
    },
    onError: (error: any) => {
      setFeedbackMessage({ type: 'error', text: formatErrorMessage(error, t('errors.unable_load_records')) });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      return api.delete(`${config.endpoint}/${id}`);
    },
    onMutate: async ({ id }: { id: string }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (current: any) => {
        if (!Array.isArray(current)) {
          return current;
        }

        return current.filter((item) => (item?._id ?? item?.id) !== id);
      });

      return { previousData };
    },
    onSuccess: (response) => {
      setFeedbackMessage({ type: 'success', text: getSuccessMessage(response.data?.message, 'deleted') });
    },
    onError: (error: any, _variables, context) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData);
      }

      setFeedbackMessage({ type: 'error', text: formatErrorMessage(error, t('errors.unable_load_records')) });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  const aiRecommendationMutation = useMutation({
    mutationFn: async (item: any) => {
      const id = item?._id ?? item?.id;
      return api.post(`${config.endpoint}/${id}/ai-recommendation`, { lang: i18n.language }).then((response) => response.data.data);
    },
    onSuccess: (payload) => {
      setAiRecommendation(payload);
      setFeedbackMessage({ type: 'success', text: t('common.ai_recommendation_ready', { defaultValue: 'AI recommendation is ready.' }) });
    },
    onError: (error: any) => {
      setFeedbackMessage({ type: 'error', text: formatErrorMessage(error, t('errors.unable_load_records')) });
    }
  });

  const aiInsightMutation = useMutation({
    mutationFn: async (item: any) => {
      const id = item?._id ?? item?.id;
      return api.post(`/ai-results/generate/${id}`).then((response) => response.data.data);
    },
    onSuccess: () => {
      setFeedbackMessage({ type: 'success', text: t('common.ai_insight_ready', { defaultValue: 'AI insight is ready.' }) });
    },
    onError: (error: any) => {
      setFeedbackMessage({ type: 'error', text: formatErrorMessage(error, t('errors.unable_load_records')) });
    }
  });

  const aiClassInsightMutation = useMutation({
    mutationFn: async (item: any) => {
      const id = item?._id ?? item?.id;
      return api.post(`/ai-results/generate-exam/${id}`).then((response) => response.data.data);
    },
    onSuccess: () => {
      setFeedbackMessage({ type: 'success', text: t('common.ai_insight_ready', { defaultValue: 'AI insight is ready.' }) });
    },
    onError: (error: any) => {
      setFeedbackMessage({ type: 'error', text: formatErrorMessage(error, t('errors.unable_load_records')) });
    }
  });

  const fieldOptions = useSelectOptions(config.fields);
  const privilegedCreateRoles = new Set(['super_admin', 'admin', 'branch_manager']);
  const allowQuickCreate =
    canCreate ||
    (privilegedCreateRoles.has(String(user?.role ?? '')) && ['/students', '/teachers'].includes(config.path));
  const selectedClassId = String(formData.classId ?? formData.class ?? '').trim();
  const selectedSubjectId = String(formData.subjectId ?? formData.subject ?? '').trim();

  const list = useMemo(() => {
    const items = listItems;
    if (isSuperAdmin) return items;
    return items.filter((item) => !item?.isDeleted);
  }, [isSuperAdmin, listItems]);
  const summaryData = useMemo(() => (config.type === 'summary' ? ((data as any)?.items ?? data ?? {}) : {}), [config.type, data]);
  const sortOptions = useMemo(() => {
    const options: Array<{ value: ListSortField; label: string }> = [];
    if (hasSortSupport(sortFieldCandidates, 'name')) {
      options.push({ value: 'name', label: t('common.sort_name', { defaultValue: 'Sort by Name' }) });
    }
    if (hasSortSupport(sortFieldCandidates, 'date')) {
      options.push({ value: 'date', label: t('common.sort_date', { defaultValue: 'Sort by Date' }) });
    }
    if (hasSortSupport(sortFieldCandidates, 'role')) {
      options.push({ value: 'role', label: t('common.sort_role', { defaultValue: 'Sort by Role' }) });
    }
    return options;
  }, [sortFieldCandidates, t]);
  const sortedList = useMemo(() => {
    if (!sortOptions.length) {
      return list;
    }

    return sortCollection(list, sortField, sortDirection);
  }, [list, sortDirection, sortField, sortOptions.length]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    if (sortOptions.length === 0) {
      return;
    }

    if (!sortOptions.some((option) => option.value === sortField)) {
      setSortField(sortOptions[0].value);
    }
  }, [sortField, sortOptions]);

  useEffect(() => {
    if (!isModalOpen || !selectedClassId) {
      setDependentFieldOptions((current) => ({ ...current, subjectId: [] }));
      return;
    }

    let active = true;
    setDependentLoading((current) => ({ ...current, subjectId: true }));

    api.get('/subjects', { params: { classId: selectedClassId, limit: 100 } })
      .then((response) => {
        if (!active) return;
        const items = Array.isArray(response.data?.data) ? response.data.data : [];
        setDependentFieldOptions((current) => ({
          ...current,
          subjectId: items.map((item: any) => ({
            value: String(item._id ?? item.id ?? ''),
            label: String(item.title ?? item.name ?? item.code ?? ''),
            classId: String(item.classId?._id ?? item.classId ?? selectedClassId)
          })).filter((option: any) => option.value)
        }));
      })
      .catch(() => {
        if (active) {
          setDependentFieldOptions((current) => ({ ...current, subjectId: [] }));
          setFormError(t('errors.unable_load_records'));
        }
      })
      .finally(() => {
        if (active) {
          setDependentLoading((current) => ({ ...current, subjectId: false }));
        }
      });

    return () => {
      active = false;
    };
  }, [isModalOpen, selectedClassId]);

  useEffect(() => {
    if (!isModalOpen || !selectedClassId || !selectedSubjectId) {
      setDependentFieldOptions((current) => ({ ...current, teacherId: [] }));
      return;
    }

    let active = true;
    setDependentLoading((current) => ({ ...current, teacherId: true, feeAmount: config.path === '/students' }));

    api.get('/teachers', { params: { classId: selectedClassId, subjectId: selectedSubjectId, limit: 100 } })
      .then(async (response) => {
        if (!active) return;
        let items = Array.isArray(response.data?.data) ? response.data.data : [];
        // Do not block exam creation when legacy class/subject records have no
        // teacher link yet. The selected teacher is linked by the exam API.
        if (!items.length && config.path === '/exams') {
          const fallbackResponse = await api.get('/teachers', { params: { limit: 100 } });
          items = Array.isArray(fallbackResponse.data?.data) ? fallbackResponse.data.data : [];
        }
        if (!active) return;
        setDependentFieldOptions((current) => ({
          ...current,
          teacherId: items.map((item: any) => ({
            value: String(item._id ?? item.id ?? ''),
            label: String(item.name ?? item.fullName ?? item.email ?? '')
          })).filter((option: any) => option.value)
        }));
      })
        .catch(() => {
          if (active) {
            setDependentFieldOptions((current) => ({ ...current, teacherId: [] }));
            setFormError(t('errors.unable_load_records'));
          }
        })
      .finally(() => {
        if (active) {
          setDependentLoading((current) => ({ ...current, teacherId: false }));
        }
      });

    if (config.path === '/students') {
      api.get('/fees/resolve', { params: { classId: selectedClassId, subjectId: selectedSubjectId } })
        .then((response) => {
          if (!active) return;
          const resolvedFee = response.data?.data?.resolvedFee;
          if (resolvedFee !== undefined && resolvedFee !== null) {
            setFormData((current) => ({ ...current, feeAmount: Number(resolvedFee) }));
          }
        })
        .catch(() => {
          if (active) {
            setFormError(t('errors.unable_load_records'));
          }
        })
        .finally(() => {
          if (active) {
            setDependentLoading((current) => ({ ...current, feeAmount: false }));
          }
        });
    }

    return () => {
      active = false;
    };
  }, [config.path, isModalOpen, selectedClassId, selectedSubjectId]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedbackMessage(null);

    const validationMessages = {
      required: t('common.required'),
      invalidPhone: t('errors.invalid_afghan_phone', {
        defaultValue: 'Phone must be 10 digits and start with 070, 078, 079, 072, 077, or 074.'
      }),
      invalidName: t('errors.invalid_person_name', {
        defaultValue: 'Name must contain only letters and cannot include numbers.'
      }),
      invalidDate: t('errors.invalid_jalali_date', {
        defaultValue: 'Date must be in Hijri Shamsi format, for example 1405/2/1.'
      })
    };

    for (const field of visibleFields) {
      const fieldError = validateFieldValue({
        fieldName: field.name,
        fieldType: field.type,
        value: formData[field.name],
        required: Boolean(field.required),
        messages: validationMessages
      });

      if (fieldError) {
        setFormError(`${translateField(field.label)}: ${fieldError}`);
        return;
      }
    }

    const payload = cleanPayload(transformPayloadForApi(formData));

    const { payload: requestPayload, requestConfig } = buildRequestData(payload);

    if (editingItem) {
      updateMutation.mutate({ id: editingItem._id || editingItem.id, payload: requestPayload, config: requestConfig });
    } else {
      createMutation.mutate({ payload: requestPayload, config: requestConfig });
    }
  };

  const prepareEditData = (item: any) => {
    const normalized = { ...item };
    ['classId', 'subjectId', 'teacherId', 'student', 'exam', 'gradedBy', 'subject', 'class', 'instructor'].forEach((key) => {
      const value = normalized[key];
      if (value && typeof value === 'object') {
        normalized[key] = value._id ?? value.id ?? '';
      }
    });

    ['assignedTeachers', 'assignedSubjects', 'assignedClasses', 'recipientRoles', 'recipientIds', 'subjects'].forEach((key) => {
      const value = normalized[key];
      if (Array.isArray(value)) {
        normalized[key] = value.map((item: any) => (item && typeof item === 'object' ? item._id ?? item.id ?? item.value ?? item.title ?? item.name ?? '' : item)).filter(Boolean);
      }
    });

    ['attendanceDate', 'publishDate', 'expiresAt', 'date', 'registrationExpiryDate', 'registrationStartDate', 'registrationEndDate', 'startDate', 'endDate'].forEach((key) => {
      const value = normalized[key];
      if (value) {
        const jalaliValue = formatIsoToJalaliInput(value);
        if (jalaliValue) {
          normalized[key] = jalaliValue;
        }
      }
    });

    if (config.path === '/teachers') {
      normalized.salaryValue =
        normalized.salaryType === 'percentage' || normalized.salaryType === 'fixed_plus_percentage'
          ? Number(normalized.percentageRate ?? normalized.customPercentage ?? 0)
          : Number(normalized.fixedSalary ?? 0);
    }

    if (config.path === '/notifications') {
      normalized.description = normalized.description ?? normalized.message ?? '';
      normalized.pinned = String(Boolean(normalized.pinned));
    }

    if (config.path === '/courses') {
      normalized.title = normalized.titleText ?? normalized.title?.[i18n.language] ?? normalized.title?.en ?? '';
      normalized.description = normalized.descriptionText ?? normalized.description?.[i18n.language] ?? normalized.description?.en ?? '';
      normalized.requirements = normalized.requirementsText ?? normalized.requirements?.[i18n.language] ?? normalized.requirements?.en ?? '';
      normalized.learningOutcomes = normalized.learningOutcomesText ?? normalized.learningOutcomes?.[i18n.language] ?? normalized.learningOutcomes?.en ?? '';
      normalized.featured = String(Boolean(normalized.featured));
    }

    if (config.path === '/classes' && !Array.isArray(normalized.weeklySchedule)) {
      normalized.weeklySchedule = [];
    }

    return normalized;
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({});
    setFormError('');
    setFeedbackMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    const loadRecord = async () => {
      setIsPreparingEdit(true);
      setFormError('');
      setFeedbackMessage(null);

      try {
        const id = item?._id ?? item?.id;
        const response = id ? await api.get(`${config.endpoint}/${id}`) : null;
        const nextItem = response?.data?.data ?? item;
        setEditingItem(nextItem);
        setFormData(prepareEditData(nextItem));
        setIsModalOpen(true);
      } catch {
        setEditingItem(item);
        setFormData(prepareEditData(item));
        setIsModalOpen(true);
      } finally {
        setIsPreparingEdit(false);
      }
    };

    void loadRecord();
  };

  const handleDelete = (item: any) => {
    const id = item?._id ?? item?.id;
    if (!id || deleteMutation.isPending) {
      return;
    }

    const itemLabel = getItemDisplayName(item);
    const confirmed = window.confirm(
      t('common.delete_confirmation', {
        entity: itemLabel,
        defaultValue: `Are you sure you want to delete ${itemLabel}?`
      })
    );

    if (!confirmed) {
      return;
    }

    setFeedbackMessage(null);
    deleteMutation.mutate({ id: String(id) });
  };

  const translateField = (text: string | undefined) => (text ? t(text, { defaultValue: text }) : '');

  const isDateDisplayFieldKey = (key: string) =>
    /date/i.test(key) || /(createdAt|updatedAt|joinDate|expiresAt|publishDate|paymentDate|attendanceDate)$/i.test(key);

  const renderAvatar = (item: any, label?: string) => (
    <EntityAvatar
      entityPath={config.path}
      item={item}
      label={label ?? getItemDisplayName(item)}
    />
  );

  const renderField = (field: ModuleField) => {
    const value = formData[field.name] ?? (field.multiple ? [] : '');
    if (field.type === 'textarea') {
      return (
        <textarea
          value={value}
          onChange={(event) => setFormData({ ...formData, [field.name]: event.target.value })}
          placeholder={translate(field.label)}
          className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
            isDark
              ? 'border-slate-700 bg-slate-900/80 text-slate-100 focus:border-sky-400'
              : 'border-slate-300 bg-white text-slate-900 focus:border-sky-500'
          }`}
          rows={4}
        />
      );
    }


    if (field.type === 'subjectList') {
      const subjects = Array.isArray(value) ? value : [];
      const updateSubject = (index: number, nextValue: string) => {
        const nextSubjects = [...subjects];
        nextSubjects[index] = nextValue;
        setFormData({ ...formData, [field.name]: nextSubjects });
      };
      const addSubject = () => {
        setFormData({ ...formData, [field.name]: [...subjects, ''] });
      };
      const removeSubject = (index: number) => {
        const nextSubjects = subjects.filter((_: any, idx: number) => idx !== index);
        setFormData({ ...formData, [field.name]: nextSubjects });
      };
      return (
        <div className="space-y-3">
          {subjects.map((subject: string, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                type="text"
                value={subject}
                onChange={(event) => updateSubject(index, event.target.value)}
                placeholder={`${translate(field.label)} ${index + 1}`}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => removeSubject(index)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 text-slate-200 transition hover:border-rose-400 hover:text-rose-300"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addSubject}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm text-slate-100 transition hover:border-sky-400 hover:text-sky-300"
          >
            <Plus size={16} /> {t('classes.add_subject')}
          </button>
        </div>
      );
    }

    if (field.type === 'classSchedule') {
      const schedule = Array.isArray(value) ? value : [];
      const updateSchedule = (index: number, key: string, nextValue: string | number) => {
        const nextSchedule = [...schedule];
        nextSchedule[index] = { ...nextSchedule[index], [key]: nextValue };
        setFormData({ ...formData, [field.name]: nextSchedule });
      };
      const addSchedule = () => setFormData({
        ...formData,
        [field.name]: [
          ...schedule,
          { dayOfWeek: 6, startTime: '08:00', endTime: '09:30', durationMinutes: 90, attendanceOpensBeforeMinutes: 10, attendanceClosesAfterMinutes: 15 }
        ]
      });
      const removeSchedule = (index: number) => setFormData({ ...formData, [field.name]: schedule.filter((_: any, idx: number) => idx !== index) });
      const dayOptions = [
        { value: '6', label: t('common.saturday', { defaultValue: 'Saturday' }) },
        { value: '0', label: t('common.sunday', { defaultValue: 'Sunday' }) },
        { value: '1', label: t('common.monday', { defaultValue: 'Monday' }) },
        { value: '2', label: t('common.tuesday', { defaultValue: 'Tuesday' }) },
        { value: '3', label: t('common.wednesday', { defaultValue: 'Wednesday' }) },
        { value: '4', label: t('common.thursday', { defaultValue: 'Thursday' }) },
        { value: '5', label: t('common.friday', { defaultValue: 'Friday' }) }
      ];

      return (
        <div className="space-y-3">
          {schedule.map((item: any, index: number) => (
            <div key={index} className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="grid gap-3 md:grid-cols-3">
                <Select value={String(item.dayOfWeek ?? 6)} options={dayOptions} onChange={(nextValue) => updateSchedule(index, 'dayOfWeek', Number(nextValue))} />
                <Input type="time" value={item.startTime ?? '08:00'} onChange={(event) => updateSchedule(index, 'startTime', event.target.value)} />
                <Input type="time" value={item.endTime ?? '09:30'} onChange={(event) => updateSchedule(index, 'endTime', event.target.value)} />
                <Input type="number" value={item.durationMinutes ?? 90} onChange={(event) => updateSchedule(index, 'durationMinutes', Number(event.target.value))} placeholder="Duration" />
                <Input type="number" value={item.attendanceOpensBeforeMinutes ?? 10} onChange={(event) => updateSchedule(index, 'attendanceOpensBeforeMinutes', Number(event.target.value))} placeholder="Opens before" />
                <Input type="number" value={item.attendanceClosesAfterMinutes ?? 15} onChange={(event) => updateSchedule(index, 'attendanceClosesAfterMinutes', Number(event.target.value))} placeholder="Closes after" />
              </div>
              <button type="button" onClick={() => removeSchedule(index)} className="mt-3 inline-flex items-center gap-2 text-sm text-rose-300">
                <X size={16} /> {t('common.remove', { defaultValue: 'Remove' })}
              </button>
            </div>
          ))}
          <button type="button" onClick={addSchedule} className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm text-slate-100 transition hover:border-sky-400 hover:text-sky-300">
            <Plus size={16} /> {t('common.add', { defaultValue: 'Add' })}
          </button>
        </div>
      );
    }

    if (field.type === 'profileImage') {
      return (
        <ProfileImageField
          label={translateField(field.label)}
          value={String(value ?? '')}
          role={String(formData.role ?? config.path.replace('/', ''))}
          name={getItemDisplayName(formData)}
          onChange={(nextValue) => setFormData({ ...formData, [field.name]: nextValue })}
        />
      );
    }

    if (field.type === 'file') {
      return (
        <ProfileImageField
          label={translateField(field.label)}
          value={String(value ?? '')}
          role={String(formData.role ?? config.path.replace('/', ''))}
          name={getItemDisplayName(formData)}
          onChange={(nextValue) => setFormData({ ...formData, [field.name]: nextValue })}
        />
      );
    }

    if (field.type === 'select') {
      const dynamicOptions = dependentFieldOptions[field.name] ?? (field.name === 'subject' ? dependentFieldOptions.subjectId : undefined);
      const sourceOptions =
        config.path === '/exams' && field.name === 'teacherId' && Array.isArray(dynamicOptions) && dynamicOptions.length === 0
          ? (fieldOptions[field.name] ?? [])
          : field.options ?? dynamicOptions ?? fieldOptions[field.name] ?? [];
      const dependentOptions = selectedClassId && ['subjectId', 'subject'].includes(field.name)
        ? sourceOptions.filter((option: any) => !option.classId || String(option.classId) === selectedClassId)
        : sourceOptions;
      const options = dependentOptions.map((option) => ({
        ...option,
        label: field.options ? translateField(option.label) : option.label
      }));
      const isMultiple = field.multiple === true;
      const requiresClass = ['subjectId', 'subject'].includes(field.name);
      const requiresSubject = field.name === 'teacherId' && ['/students', '/timetable', '/exams'].includes(config.path);
      const effectiveSubjectSelected = config.path === '/exams'
        ? Boolean(String(formData.subject ?? '').trim())
        : Boolean(selectedSubjectId);
      const disabled = (requiresClass && !selectedClassId) || (requiresSubject && (!selectedClassId || !effectiveSubjectSelected));
      const isLoading = dependentLoading[field.name] || (field.name === 'subject' && dependentLoading.subjectId);
      const placeholder = isLoading
        ? t('common.loading', { defaultValue: 'Loading...' })
        : disabled && requiresClass
          ? t('common.select_class_first', { defaultValue: 'Select class first' })
          : disabled && requiresSubject
            ? t('common.select_subject_first', { defaultValue: 'Select subject first' })
            : field.placeholder ?? t('common.select_field', { field: translateField(field.label) });
      const handleSelectChange = (nextValue: string | string[]) => {
        if (field.name === 'classId' || field.name === 'class') {
          setFormData({
            ...formData,
            [field.name]: nextValue,
            subjectId: '',
            subject: '',
            teacherId: '',
            feeAmount: ''
          });
          return;
        }

        if (field.name === 'subjectId' || field.name === 'subject') {
          setFormData({
            ...formData,
            [field.name]: nextValue,
            teacherId: '',
            feeAmount: ''
          });
          return;
        }

        setFormData({ ...formData, [field.name]: nextValue });
      };
      return (
        <Select
          value={value}
          options={options}
          multiple={isMultiple}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          onChange={handleSelectChange}
        />
      );
    }

    if (config.path === '/exams' && field.name === 'googleFormUrl') {
      return (
        <div className="space-y-2">
          <Input
            type="url"
            value={value}
            onChange={(event) => setFormData({ ...formData, googleFormUrl: event.target.value })}
            placeholder="https://forms.google.com/..."
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.open('https://docs.google.com/forms/u/0/', '_blank', 'noopener,noreferrer')}
          >
            ساخت Google Form
          </Button>
          <p className="text-xs text-slate-400">فرم را در گوگل بسازید، سپس لینک نهایی آن را در خانه بالا وارد کنید.</p>
        </div>
      );
    }

    if (config.path === '/exams' && (field.name === 'startTime' || field.name === 'endTime')) {
      return (
        <Input
          type="time"
          value={value}
          onChange={(event) => {
            const nextValue = event.target.value;
            const next = { ...formData, [field.name]: nextValue };
            const start = String(next.startTime || '');
            const end = String(next.endTime || '');
            if (/^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end)) {
              const [startHour, startMinute] = start.split(':').map(Number);
              const [endHour, endMinute] = end.split(':').map(Number);
              const minutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
              if (minutes > 0) next.durationMinutes = minutes;
            }
            setFormData(next);
          }}
        />
      );
    }

    if (field.type === 'date' || isJalaliDateFieldName(field.name, field.type)) {
      return (
        <JalaliDateInput
          value={String(value ?? '')}
          required={Boolean(field.required)}
          disabled={field.name === 'feeAmount' && config.path === '/students' && dependentLoading.feeAmount}
          onChange={(nextValue) => setFormData({ ...formData, [field.name]: nextValue })}
        />
      );
    }

    if (isPhoneLikeFieldName(field.name)) {
      const previewPhone = field.name === 'whatsapp' ? formData.phone : value;
      const previewWhatsapp = field.name === 'whatsapp' ? value : formData.whatsapp;
      const showPreview = isValidAfghanPhone(field.name === 'whatsapp' ? previewWhatsapp : previewPhone);

      return (
        <div>
          <Input
            type="text"
            inputMode="numeric"
            maxLength={10}
            value={value}
            onChange={(event) => setFormData({ ...formData, [field.name]: sanitizeAfghanPhoneInput(event.target.value) })}
            placeholder={field.placeholder ?? '0781923460'}
            disabled={field.name === 'feeAmount' && config.path === '/students' && dependentLoading.feeAmount}
          />
          <p className="mt-1 text-xs text-slate-400">
            {t('errors.afghan_phone_hint', {
              defaultValue: 'Only Afghan numbers: 070, 078, 079, 072, 077, 074 (10 digits).'
            })}
          </p>
          {showPreview ? <PhoneContactBlock phone={previewPhone} whatsapp={previewWhatsapp} variant="form-preview" /> : null}
        </div>
      );
    }

    if (isPersonNameFieldName(field.name)) {
      return (
        <div>
          <Input
            type="text"
            value={value}
            onChange={(event) => setFormData({ ...formData, [field.name]: sanitizePersonNameInput(event.target.value) })}
            placeholder={dependentLoading[field.name] ? t('common.loading', { defaultValue: 'Loading...' }) : field.placeholder ?? translate(field.label)}
          />
          <p className="mt-1 text-xs text-slate-400">
            {t('errors.person_name_hint', { defaultValue: 'Name must not contain numbers.' })}
          </p>
        </div>
      );
    }

    return (
      <Input
        type={field.type}
        value={value}
        onChange={(event) => setFormData({ ...formData, [field.name]: event.target.value })}
        placeholder={dependentLoading[field.name] ? t('common.loading', { defaultValue: 'Loading...' }) : field.placeholder ?? translate(field.label)}
        disabled={field.name === 'feeAmount' && config.path === '/students' && dependentLoading.feeAmount}
      />
    );
  };

  const columns = config.listFields.map((field) => ({
    key: field.key,
    label: translateField(field.label),
    width: field.width,
    render: (item: any) => {
      const rawValue = getFieldDisplayValue(item, field.key);

      if (isDateDisplayFieldKey(field.key) && rawValue) {
        return formatJalaliDate(rawValue, i18n.language) || notAvailable;
      }

      if (field.key.toLowerCase().includes('url') && typeof rawValue === 'string' && rawValue.trim()) {
        return (
          <a href={rawValue} target="_blank" rel="noreferrer" className="font-semibold text-sky-300 underline-offset-4 hover:underline">
            {t('common.open_link', { defaultValue: 'Open link' })}
          </a>
        );
      }

      if (isPhoneListFieldKey(field.key) && typeof rawValue === 'string' && rawValue.trim()) {
        return (
          <PhoneContactBlock
            phone={rawValue}
            whatsapp={item?.whatsapp}
            variant="inline"
          />
        );
      }

      return valueOrFallback(rawValue, notAvailable);
    }
  }));

  const buildRowActions = (item: any) => {
    const actions = [] as Array<{ label: string; onClick: (row: any) => void; variant?: 'outline' | 'destructive'; disabled?: boolean }>;
    const itemId = String(item?._id ?? item?.id ?? '');
    const isArchived = Boolean(item?.isDeleted);

    if (isArchived && isSuperAdmin && itemId) {
      actions.push({
        label: t('common.restore', { defaultValue: 'Restore' }),
        onClick: () => restoreMutation.mutate({ id: itemId }),
        variant: 'outline',
        disabled: restoreMutation.isPending
      });
      return actions;
    }

    if (canEdit && !config.disableEdit && config.fields.length > 0) {
      actions.push({ label: t('common.edit'), onClick: openEditModal, variant: 'outline', disabled: isPreparingEdit });
    }
    if (canDelete && !config.disableDelete) {
      actions.push({ label: t('common.delete'), onClick: handleDelete, variant: 'destructive', disabled: deleteMutation.isPending });
    }

    if (config.path === '/results' && ['super_admin', 'admin', 'branch_manager', 'teacher'].includes(String(normalizeRole(user?.role)))) {
      actions.push({
        label: t('common.ai_recommendation', { defaultValue: 'AI Recommendation' }),
        onClick: (row) => aiRecommendationMutation.mutate(row),
        variant: 'outline',
        disabled: aiRecommendationMutation.isPending
      });
      actions.push({
        label: t('common.ai_insights', { defaultValue: 'AI Insights' }),
        onClick: (row) => {
          const id = String(row?._id ?? row?.id ?? '');
          if (id) setSelectedAiResultId(id);
          aiInsightMutation.mutate(row);
        },
        variant: 'outline',
        disabled: aiInsightMutation.isPending
      });
    }

    if (config.path === '/exams' && ['super_admin', 'admin', 'branch_manager', 'teacher'].includes(String(normalizeRole(user?.role)))) {
      actions.push({
        label: t('common.class_analytics', { defaultValue: 'Class Analytics' }),
        onClick: (row) => {
          const id = String(row?._id ?? row?.id ?? '');
          if (id) setSelectedAiExamId(id);
          aiClassInsightMutation.mutate(row);
        },
        variant: 'outline',
        disabled: aiClassInsightMutation.isPending
      });
    }

    if (config.path === '/exams' && normalizeRole(user?.role as any) === 'student') {
      const examUrl = getExamTakeUrl(item);
      actions.push({
        label: t('common.start_exam', { defaultValue: 'شروع امتحان' }),
        onClick: () => {
          if (!examUrl) return;
          window.open(examUrl, '_blank', 'noopener,noreferrer');
        },
        variant: 'outline',
        disabled: !examUrl
      });
    }

    if (
      config.path === '/families' &&
      ['super_admin', 'admin'].includes(String(normalizeRole(user?.role)))
    ) {
      actions.push({
        label: t('families.manage_portal_account', { defaultValue: 'مدیریت اکانت / پسورد' }),
        onClick: (row) => setFamilyPortalTarget(row),
        variant: 'outline'
      });
    }

    return actions;
  };

  const renderCardActions = (item: any, extraActions?: ReactNode) => {
    const itemActions = buildRowActions(item);
    return (
      <div className="mt-4 flex flex-wrap gap-2">
        {item?.isDeleted ? (
          <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-200">
            {t('common.deleted_record', { defaultValue: 'Deleted' })}
          </span>
        ) : null}
        {extraActions}
        {itemActions.map((action) => (
          <Button key={action.label} variant={action.variant ?? 'outline'} size="sm" onClick={() => action.onClick(item)} disabled={action.disabled}>
            {action.label}
          </Button>
        ))}
      </div>
    );
  };

  const openDetails = async (item: any, resource: 'classes' | 'subjects') => {
    const id = item?._id ?? item?.id;
    if (!id) return;
    setIsDetailsLoading(true);
    try {
      const response = await api.get(`/${resource}/${id}/details`);
      setDetailsItem({ ...(response.data.data ?? item), detailsType: resource });
    } catch {
      setDetailsItem({ ...item, detailsType: resource });
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const renderStudentCard = (student: any) => (
    <Card key={student._id || student.id} className={`overflow-hidden rounded-3xl border p-5 ${entityCardClass} ${i18n.language === 'en' ? 'text-left' : 'text-right'}`}>
      <div className="space-y-5">
        <div className="flex flex-col items-center text-center">
          {renderAvatar(student, `${student.firstName ?? ''} ${student.lastName ?? ''}`)}
          <div>
            <h3 className={`text-lg font-semibold ${entityTitleClass}`}>{getStudentFullName(student) || notAvailable}</h3>
            <p className={`text-sm ${entityMutedTextClass}`}>{t('students.roll_no')}: {getStudentNumber(student) || notAvailable}</p>
          </div>
        </div>
        <div className={`space-y-3 text-sm text-slate-400 ${i18n.language === 'en' ? 'text-left' : 'text-right'}`}>
          <p>{t('students.class')}: {getClassName(student) || notAvailable}</p>
          <p>{t('students.subject')}: {getSubjectName(student) || notAvailable}</p>
          <p>{t('students.teacher')}: {getTeacherName(student) || notAvailable}</p>
          <PhoneFieldRow
            label={t('students.guardian_phone')}
            phone={getGuardianPhone(student)}
            whatsapp={student?.familyPhone ?? student?.guardianPhone}
            notAvailable={notAvailable}
          />
          <PhoneFieldRow
            label={t('students.phone')}
            phone={getStudentPhone(student)}
            whatsapp={student?.whatsapp ?? student?.phone}
            notAvailable={notAvailable}
          />
          <p>{t('common.branch', { defaultValue: 'نمایندگی' })}: {getBranchName(student) || notAvailable}</p>
          <p>{t('common.status')}: {getEnrollmentStatus(student) || notAvailable}</p>
        </div>
        {renderCardActions(student)}
      </div>
    </Card>
  );

  const renderFamilyCard = (family: any) => (
    <Card key={family._id || family.id} className={`overflow-hidden rounded-3xl border p-5 ${entityCardClass} ${i18n.language === 'en' ? 'text-left' : 'text-right'}`}>
      <div className="space-y-5">
        <div className="text-center">
          {renderAvatar(family, family.guardianName || family.portalAccount?.name)}
          <h3 className={`mt-4 text-lg font-semibold ${entityTitleClass}`}>
            {family.guardianName || family.portalAccount?.name || notAvailable}
          </h3>
          <p className={`text-sm ${entityMutedTextClass}`}>{t('common.family', { defaultValue: 'خانواده' })}</p>
        </div>
        <div className={`space-y-3 text-sm ${entityMutedTextClass}`}>
          <p>{t('common.guardian_email', { defaultValue: 'ایمیل سرپرست' })}: {family.guardianEmail || notAvailable}</p>
          <p>{t('common.login_email', { defaultValue: 'ایمیل ورود' })}: {family.portalAccount?.email || family.guardianEmail || notAvailable}</p>
          <PhoneFieldRow
            label={t('common.guardian_phone', { defaultValue: 'تلفن سرپرست' })}
            phone={family.guardianPhone || family.portalAccount?.phone}
            whatsapp={family.guardianPhone || family.portalAccount?.phone}
            notAvailable={notAvailable}
          />
          <p>
            {t('common.status')}:{' '}
            {family.portalAccount
              ? family.portalAccount.active
                ? t('common.active', { defaultValue: 'فعال' })
                : t('common.inactive', { defaultValue: 'غیرفعال' })
              : t('families.no_portal_account', { defaultValue: 'بدون اکانت ورود' })}
          </p>
        </div>
        {renderCardActions(family)}
      </div>
    </Card>
  );

  const renderClassCard = (klass: any) => (
    <Card key={klass._id || klass.id} className={`overflow-hidden rounded-3xl border p-5 ${entityCardClass}`}>
      <div className={`mb-4 rounded-3xl p-5 text-center ${entityPanelClass}`}>
        {renderAvatar(klass, klass.className || klass.name)}
        <p className={`text-sm uppercase tracking-[0.3em] ${entityMutedTextClass}`}>{t('common.class')}</p>
        <p className="mt-3 text-2xl font-semibold">{klass.className || klass.name || notAvailable}</p>
      </div>
      <div className={`space-y-3 text-sm ${entityBodyTextClass}`}>
        <p>{t('students.students_count')}: {klass.studentCount ?? 0}</p>
        <p>{t('students.subjects_count')}: {klass.assignedSubjectCount ?? 0}</p>
        <p>{t('students.teachers_count')}: {klass.assignedTeacherCount ?? 0}</p>
        <p>{t('common.room', { defaultValue: 'Room' })}: {valueOrFallback(klass.room, notAvailable)}</p>
        <p>{t('attendance.status', { defaultValue: 'Status' })}: {valueOrFallback(klass.attendanceStatus ?? klass.status ?? (klass.active !== false ? t('common.active') : ''), notAvailable)}</p>
      </div>
      {renderCardActions(
        klass,
        <>
          <Button size="sm" onClick={() => navigateToRegister(klass)}>
            {t('common.register', { defaultValue: 'Register' })}
          </Button>
          <Button size="sm" variant="outline" onClick={() => openDetails(klass, 'classes')} disabled={isDetailsLoading}>
            {t('common.view_details', { defaultValue: 'View Details' })}
          </Button>
        </>
      )}
    </Card>
  );

  const renderSubjectCard = (subject: any) => (
    <Card key={subject._id || subject.id} className={`overflow-hidden rounded-3xl border p-5 ${entityCardClass}`}>
      <div className={`mb-4 rounded-3xl p-5 text-center ${entityPanelClass}`}>
        {renderAvatar(subject, subject.title)}
        <p className={`text-sm uppercase tracking-[0.3em] ${entityMutedTextClass}`}>{t('common.subject')}</p>
        <p className="mt-3 text-2xl font-semibold">{subject.title || notAvailable}</p>
      </div>
      <div className={`space-y-3 text-sm ${entityBodyTextClass}`}>
        <p>{t('common.class')}: {valueOrFallback(subject.className ?? subject.classId, notAvailable)}</p>
        <p>{t('subjects.teacher')}: {valueOrFallback(subject.teacherName ?? subject.teacher, notAvailable)}</p>
        <p>{t('subjects.code')}: {valueOrFallback(subject.code, notAvailable)}</p>
      </div>
      {renderCardActions(
        subject,
        <Button size="sm" variant="outline" onClick={() => openDetails(subject, 'subjects')} disabled={isDetailsLoading}>
          {t('common.view_details', { defaultValue: 'View Details' })}
        </Button>
      )}
    </Card>
  );

  const renderTeacherCard = (teacher: any) => {
    const subjectText = teacher.displaySubject || teacher.assignedSubjectNames || t('students.not_assigned');
    return (
      <Card key={teacher._id || teacher.id} className={`overflow-hidden rounded-3xl border p-5 ${entityCardClass} ${i18n.language === 'en' ? 'text-left' : 'text-right'}`}>
        <div className="space-y-5">
          <div className="flex flex-col items-center text-center">
            {renderAvatar(teacher, teacher.name)}
            <div>
              <h3 className={`text-lg font-semibold ${entityTitleClass}`}>{teacher.name || [teacher.firstName, teacher.lastName].filter(Boolean).join(' ') || notAvailable}</h3>
              <p className={`text-sm ${entityMutedTextClass}`}>{t('common.subject')}: {subjectText}</p>
            </div>
          </div>
          <div className={`space-y-3 text-sm ${entityMutedTextClass} ${i18n.language === 'en' ? 'text-left' : 'text-right'}`}>
            <PhoneFieldRow
              label={t('students.phone')}
              phone={teacher.phone}
              whatsapp={teacher.whatsapp}
              notAvailable={notAvailable}
            />
            <p>{t('students.email')}: {valueOrFallback(teacher.email, notAvailable)}</p>
            <p>{t('common.branch', { defaultValue: 'نمایندگی' })}: {valueOrFallback(teacher.branchName ?? teacher.branchId, notAvailable)}</p>
          </div>
          {renderCardActions(teacher)}
        </div>
      </Card>
    );
  };

  const renderUserCard = (account: any) => (
    <Card key={account._id || account.id} className={`overflow-hidden rounded-3xl border p-5 ${entityCardClass} ${i18n.language === 'en' ? 'text-left' : 'text-right'}`}>
      <div className="space-y-5">
        <div className="flex flex-col items-center text-center">
          {renderAvatar(account, account.name)}
          <div>
            <h3 className={`text-lg font-semibold ${entityTitleClass}`}>{account.name || notAvailable}</h3>
            <p className={`text-sm ${entityMutedTextClass}`}>{account.role ? t(`common.${account.role}`, { defaultValue: account.role }) : notAvailable}</p>
          </div>
        </div>
        <div className={`space-y-3 text-sm ${entityMutedTextClass} ${i18n.language === 'en' ? 'text-left' : 'text-right'}`}>
          <p>{t('common.email')}: {valueOrFallback(account.email, notAvailable)}</p>
          <PhoneFieldRow
            label={t('common.phone')}
            phone={account.phone}
            whatsapp={account.whatsapp}
            notAvailable={notAvailable}
          />
          <p>{t('common.branch', { defaultValue: 'نمایندگی' })}: {valueOrFallback(account.branchName ?? account.branchId, notAvailable)}</p>
          <p>{t('common.status')}: {account.active ? t('common.active') : 'Inactive'}</p>
        </div>
        {renderCardActions(account)}
      </div>
    </Card>
  );

  const renderNotificationCard = (notification: any) => (
      <Card key={notification._id || notification.id} className={`overflow-hidden rounded-3xl border ${entityCardClass}`}>
        <div className="space-y-4 p-5">
          {renderAvatar(notification, notification.title)}
          <p className="text-xs uppercase tracking-[0.25em] text-sky-300">
            {notification.publishDate ? formatJalaliDate(notification.publishDate, i18n.language) : notAvailable}
          </p>
          <h3 className={`text-2xl font-semibold ${entityTitleClass}`}>{notification.title || notAvailable}</h3>
          <p className={`text-sm leading-7 ${entityMutedTextClass}`}>{notification.description || notification.message || notAvailable}</p>
          {(notification.className || notification.subjectName || notification.teacherName) && (
            <div className={`space-y-2 text-sm ${entityBodyTextClass}`}>
              <p>{t('students.class')}: {notification.className || notAvailable}</p>
              <p>{t('students.subject')}: {notification.subjectName || notAvailable}</p>
              <p>{t('students.teacher')}: {notification.teacherName || notAvailable}</p>
            </div>
          )}
          {renderCardActions(
            notification,
            <Button size="sm" onClick={() => navigateToRegister(notification)}>
              {t('common.register', { defaultValue: 'Register' })}
            </Button>
          )}
        </div>
      </Card>
  );

  const renderExamTakeButton = (item: any) => {
    const examUrl = getExamTakeUrl(item);
    if (examUrl) {
      return (
        <a
          href={examUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          {t('common.start_exam', { defaultValue: 'شروع امتحان' })}
        </a>
      );
    }

    return (
      <div className="space-y-2">
        <button
          type="button"
          disabled
          className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-slate-500/40 px-4 py-3 text-sm font-semibold text-slate-300"
        >
          {t('common.start_exam', { defaultValue: 'شروع امتحان' })}
        </button>
        <p className={`text-xs ${entityMutedTextClass}`}>
          {t('common.exam_link_unavailable', {
            defaultValue: 'لینک این امتحان هنوز فعال نشده است. با مدیریت یا استاد هماهنگ کنید.'
          })}
        </p>
      </div>
    );
  };

  const renderExamCard = (item: any) => {
    const isStudent = normalizeRole(user?.role as any) === 'student';
    return (
      <Card key={item._id || item.id || getItemDisplayName(item)} className={`overflow-hidden rounded-3xl border p-5 ${entityCardClass} ${i18n.language === 'en' ? 'text-left' : 'text-right'}`}>
        <div className="space-y-5">
          <div className="text-center">
            {renderAvatar(item)}
            <h3 className={`mt-4 text-lg font-semibold ${entityTitleClass}`}>{getItemDisplayName(item)}</h3>
            <p className={`text-sm ${entityMutedTextClass}`}>{entityText}</p>
          </div>
          <div className={`space-y-3 text-sm ${entityMutedTextClass} ${i18n.language === 'en' ? 'text-left' : 'text-right'}`}>
            <p>
              <span className={entityBodyTextClass}>{t('common.title')}:</span>{' '}
              {valueOrFallback(item?.title, notAvailable)}
            </p>
            <p>
              <span className={entityBodyTextClass}>{t('students.subject')}:</span>{' '}
              {valueOrFallback(item?.subjectName || getSubjectName(item), notAvailable)}
            </p>
            <p>
              <span className={entityBodyTextClass}>{t('students.class')}:</span>{' '}
              {valueOrFallback(item?.className || getClassName(item), notAvailable)}
            </p>
            <p>
              <span className={entityBodyTextClass}>{t('students.teacher')}:</span>{' '}
              {valueOrFallback(item?.teacherName || getTeacherName(item), notAvailable)}
            </p>
            <p>
              <span className={entityBodyTextClass}>{t('common.date')}:</span>{' '}
              {valueOrFallback(item?.date ? formatJalaliDate(item.date, i18n.language) : '', notAvailable)}
            </p>
            {item?.startTime || item?.endTime ? (
              <p>
                <span className={entityBodyTextClass}>{t('common.time', { defaultValue: 'وقت' })}:</span>{' '}
                {[item?.startTime, item?.endTime].filter(Boolean).join(' – ') || notAvailable}
              </p>
            ) : null}
          </div>
          {isStudent ? renderExamTakeButton(item) : renderCardActions(item)}
        </div>
      </Card>
    );
  };

  const renderGenericCard = (item: any) => (
    <Card key={item._id || item.id || getItemDisplayName(item)} className={`overflow-hidden rounded-3xl border p-5 ${entityCardClass} ${i18n.language === 'en' ? 'text-left' : 'text-right'}`}>
      <div className="space-y-5">
        <div className="text-center">
          {renderAvatar(item)}
          <h3 className={`mt-4 text-lg font-semibold ${entityTitleClass}`}>{getItemDisplayName(item)}</h3>
          <p className={`text-sm ${entityMutedTextClass}`}>{entityText}</p>
        </div>
        <div className={`space-y-3 text-sm ${entityMutedTextClass} ${i18n.language === 'en' ? 'text-left' : 'text-right'}`}>
          {config.listFields.slice(0, 5).map((field) => {
            const rawValue = getFieldDisplayValue(item, field.key);
            if (isPhoneListFieldKey(field.key) && typeof rawValue === 'string' && rawValue.trim()) {
              return (
                <div key={field.key} className="space-y-2">
                  <p className={entityBodyTextClass}>{translateField(field.label)}</p>
                  <PhoneContactBlock phone={rawValue} whatsapp={item?.whatsapp} variant="card" />
                </div>
              );
            }
            return (
              <p key={field.key}>
                <span className={entityBodyTextClass}>{translateField(field.label)}:</span>{' '}
                {valueOrFallback(rawValue, notAvailable)}
              </p>
            );
          })}
        </div>
        {renderCardActions(item)}
      </div>
    </Card>
  );

  const renderEntityCards = () => {
    const renderers: Record<string, (item: any) => JSX.Element> = {
      '/students': renderStudentCard,
      '/families': renderFamilyCard,
      '/classes': renderClassCard,
      '/subjects': renderSubjectCard,
      '/teachers': renderTeacherCard,
      '/users': renderUserCard,
      '/notifications': renderNotificationCard,
      '/exams': renderExamCard
    };

    const renderCard = renderers[config.path] ?? renderGenericCard;

    return (
        <div className="w-full overflow-x-hidden">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {sortedList.map((item: any) => renderCard(item))}
        </div>
      </div>
    );
  };

  const sortControls = sortOptions.length ? (
    <>
      <div className="w-full sm:w-56">
        <Select
          value={sortField}
          options={sortOptions}
          placeholder={t('common.sort', { defaultValue: 'Sort' })}
          onChange={(value) => setSortField(String(value) as ListSortField)}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))}
      >
        <ArrowUpDown className="h-4 w-4" />
        {t(sortDirection === 'asc' ? 'common.ascending' : 'common.descending', {
          defaultValue: sortDirection === 'asc' ? 'ASC' : 'DESC'
        })}
      </Button>
    </>
  ) : null;
  const viewControls = (
    <div className={`inline-flex rounded-2xl border p-1 ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-slate-100'}`}>
      <button
        type="button"
        onClick={() => setViewMode('card')}
        className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
          viewMode === 'card'
            ? (isDark ? 'bg-sky-500/25 text-sky-100' : 'bg-sky-600 text-white shadow-sm')
            : (isDark ? 'text-slate-300 hover:bg-white/10 hover:text-white' : 'text-slate-700 hover:bg-white hover:text-slate-900')
        }`}
      >
        <LayoutGrid className="h-4 w-4" />
        {t('common.card_view', { defaultValue: 'نمای کارت' })}
      </button>
      <button
        type="button"
        onClick={() => setViewMode('table')}
        className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
          viewMode === 'table'
            ? (isDark ? 'bg-sky-500/25 text-sky-100' : 'bg-sky-600 text-white shadow-sm')
            : (isDark ? 'text-slate-300 hover:bg-white/10 hover:text-white' : 'text-slate-700 hover:bg-white hover:text-slate-900')
        }`}
      >
        <Table2 className="h-4 w-4" />
        {t('common.table_view', { defaultValue: 'نمای جدول' })}
      </button>
    </div>
  );
  const listControls = (
    <>
      {sortControls}
      {viewControls}
    </>
  );

  if (!canView) {
    return (
      <Card className="p-8 text-center">
        <AlertTriangle size={40} className="mx-auto mb-4 text-rose-400" />
        <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{t('common.access_denied')}</p>
        <p className="mt-2 text-slate-600 dark:text-slate-400">{t('errors.permission_view', { entity: pageTitle })}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={config.title}
        description={pageDescription}
        actions={config.type === 'summary' ? undefined : (
          <SearchFilterBar
            value={search}
            onChange={setSearch}
            placeholder={t('common.search_placeholder', { entity: pageTitle })}
            createLabel={t('common.add_entity', { entity: entityLabel })}
            onCreate={allowQuickCreate ? openCreateModal : undefined}
            createVisible={allowQuickCreate && config.fields.length > 0}
            extraActions={listControls}
          />
        )}
      />

      {feedbackMessage && (
        <Card className={feedbackMessage.type === 'success' ? 'border border-emerald-500/40 bg-emerald-500/5 text-emerald-200' : 'border border-rose-500/40 bg-rose-500/5 text-rose-200'}>
          <p>{feedbackMessage.text}</p>
        </Card>
      )}

      {isError && (
        <Card className="border border-rose-500/40 bg-rose-500/5 text-rose-200">
          <p>
            {(error as any)?.response?.status === 403
              ? t('errors.permission_view', { entity: pageTitle })
              : formatErrorMessage(error, t('errors.unable_load_records'))}
          </p>
        </Card>
      )}

      {config.type === 'summary' ? (
        <div className="grid gap-4 xl:grid-cols-3">
          {config.summaryCards?.map((card) => (
            <Card key={card.key} className="p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{t(card.label, { defaultValue: card.label })}</p>
              <p className="mt-4 text-4xl font-semibold text-slate-100">{card.prefix ?? ''}{summaryData[card.key] ?? 0}</p>
            </Card>
          ))}
        </div>
      ) : (
        <Card className={`space-y-4 transition-opacity ${isFetching ? 'opacity-80' : ''}`}>
          {isLoading && !data ? (
            <div className="grid gap-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-16" />
              ))}
            </div>
          ) : sortedList.length ? (
            <>
              {viewMode === 'card' ? renderEntityCards() : <DataTable columns={columns} items={sortedList} actions={buildRowActions} />}
              <ListPagination
                meta={paginationMeta}
                disabled={isFetching}
                onPageChange={setPage}
                onLimitChange={(limit) => {
                  setPageSize(limit);
                  setPage(1);
                }}
              />
            </>
          ) : (
            <div className="py-12 text-center text-slate-400">
              {debouncedSearch ? t('filters.no_matching_filters') : t('common.no_records_found')}
            </div>
          )}
        </Card>
      )}

      {aiRecommendation && (
        <Card className="border border-sky-400/30 bg-sky-500/5 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-sky-300">{t('common.ai_recommendation')}</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--color-text-strong)]">
                {aiRecommendation.recommendation?.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--color-text)]">
                {aiRecommendation.recommendation?.message}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setAiRecommendation(null)}>
              {t('common.close')}
            </Button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-strong)]">{t('common.resources')}</p>
              <ul className="mt-3 space-y-2 text-sm text-[var(--color-text)]">
                {(aiRecommendation.recommendation?.suggestedResources ?? aiRecommendation.recommendation?.resources ?? []).map((resource: any, index: number) => {
                  if (typeof resource === 'string') {
                    return (
                      <li key={`${resource}-${index}`} className="rounded-2xl bg-[var(--color-surface-strong)] px-4 py-3">
                        {resource}
                      </li>
                    );
                  }

                  const title = resource?.title || t('common.resource', { defaultValue: 'Resource' });
                  const meta = [resource?.kindLabel, resource?.description].filter(Boolean).join(' • ');
                  return (
                    <li key={`${title}-${index}`} className="rounded-2xl bg-[var(--color-surface-strong)] px-4 py-3">
                      <p className="font-medium text-[var(--color-text-strong)]">{title}</p>
                      {meta ? <p className="mt-1 text-xs text-[var(--color-text-muted)]">{meta}</p> : null}
                      {resource?.url ? (
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex text-xs text-sky-400 underline-offset-2 hover:underline"
                        >
                          {t('common.open_link', { defaultValue: 'Open link' })}
                        </a>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-strong)]">{t('common.study_plan', { defaultValue: 'Study Plan' })}</p>
              <ul className="mt-3 space-y-2 text-sm text-[var(--color-text)]">
                {(aiRecommendation.recommendation?.studyPlan ?? []).map((step: string) => (
                  <li key={step} className="rounded-2xl bg-[var(--color-surface-strong)] px-4 py-3">{step}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {selectedAiResultId && (
        <IntelligentResultAnalysisPanel
          resultId={selectedAiResultId}
          canManage={['super_admin', 'admin', 'branch_manager', 'teacher'].includes(String(normalizeRole(user?.role)))}
          viewer={
            String(normalizeRole(user?.role)) === 'teacher'
              ? 'teacher'
              : ['parent', 'family_student', 'family'].includes(String(normalizeRole(user?.role)))
                ? 'parent'
                : 'student'
          }
        />
      )}

      {selectedAiExamId && (
        <ExamResultInsightsPanel
          examId={selectedAiExamId}
          canRegenerate
          onClose={() => setSelectedAiExamId(null)}
        />
      )}

      {detailsItem && (
        <FormModal
          open={Boolean(detailsItem)}
          title={detailsItem.className || detailsItem.title || t('classes.class_name', { defaultValue: 'Class Details' })}
          onClose={() => setDetailsItem(null)}
          onSubmit={(event) => {
            event.preventDefault();
            setDetailsItem(null);
          }}
          submitLabel={t('common.close', { defaultValue: 'Close' })}
        >
          <div className="space-y-4 text-sm text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-lg font-semibold text-white">{detailsItem.title || detailsItem.className}</p>
              <p className="mt-2 leading-7">{detailsItem.description || t('common.not_available')}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <p>{t('common.subject', { defaultValue: 'Subject' })}: {detailsItem.subjectName || notAvailable}</p>
              <p>{t('common.class', { defaultValue: 'Class' })}: {detailsItem.className || detailsItem.relatedClass?.className || notAvailable}</p>
              <p>{t('common.teacher', { defaultValue: 'Teacher' })}: {detailsItem.teacherName || detailsItem.assignedTeacherNames?.join(', ') || detailsItem.teachers?.map((teacher: any) => teacher.name).join(', ') || notAvailable}</p>
              <p>{t('common.room', { defaultValue: 'Room' })}: {detailsItem.room || notAvailable}</p>
              <p>{t('students.students_count')}: {detailsItem.enrolledStudentsCount ?? detailsItem.studentCount ?? 0}</p>
              <p>{t('students.fee_amount', { defaultValue: 'Fee Amount' })}: {detailsItem.feeAmount ?? notAvailable}</p>
              <p>{t('common.status', { defaultValue: 'Status' })}: {detailsItem.status || detailsItem.accountStatus || notAvailable}</p>
              <p>{t('common.start_date', { defaultValue: 'Start Date' })}: {detailsItem.startDateJalali || formatJalaliDate(detailsItem.startDate, i18n.language) || notAvailable}</p>
              <p>{t('common.end_date', { defaultValue: 'End Date' })}: {detailsItem.endDateJalali || formatJalaliDate(detailsItem.endDate, i18n.language) || notAvailable}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center gap-2 text-white">
                <Clock className="h-4 w-4 text-sky-300" />
                <span>{t('common.schedule', { defaultValue: 'Schedule' })}</span>
              </div>
              <div className="space-y-2">
                {(detailsItem.timetable ?? detailsItem.schedule ?? detailsItem.weeklySchedule ?? []).map((item: any, index: number) => (
                  <div key={index} className="rounded-xl bg-slate-950/60 p-3">
                    <p>{t('common.day_of_week', { defaultValue: 'Day' })}: {item.dayOfWeek}</p>
                    <p>{item.startTime} - {item.endTime} ({item.durationMinutes} {t('common.minutes', { defaultValue: 'minutes' })})</p>
                    <p>{t('attendance.opens_at', { defaultValue: 'Attendance opens at' })}: {formatJalaliTime(item.opensAt)} / {t('attendance.closes_at', { defaultValue: 'closes at' })}: {formatJalaliTime(item.closesAt)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-emerald-100">
              {t('attendance.status', { defaultValue: 'Status' })}: {detailsItem.attendanceStatus || detailsItem.currentSessionStatus?.status || 'closed'}
            </div>
          </div>
        </FormModal>
      )}

      {isModalOpen && (
        <FormModal
          open={isModalOpen}
          title={editingItem ? t('common.edit_entity', { entity: entityLabel }) : t('common.add_entity', { entity: entityLabel })}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
          submitLabel={editingItem ? t('common.update') : t('common.create')}
          loading={createMutation.status === 'pending' || updateMutation.status === 'pending'}
        >
          {formError && (
            <div className="rounded-2xl border border-rose-500/50 bg-rose-500/10 p-3 text-sm text-rose-200">
              {formError}
            </div>
          )}
          {visibleFields.map((field) => (
              <div key={field.name}>
                <label className="block text-sm text-slate-300 mb-1">{translateField(field.label)}</label>
                {renderField(field)}
              </div>
            ))}
        </FormModal>
      )}

      <FamilyPortalAccountModal
        family={familyPortalTarget}
        open={Boolean(familyPortalTarget)}
        onClose={() => setFamilyPortalTarget(null)}
      />
    </div>
  );
};
