import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { authService } from '@/features/auth/services/authService';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useTheme } from '@/app/providers/ThemeProvider';
import { offlineRegistrationOptions } from '@/services/offlineData';
import { formatCurrency } from '@/utils/formatters';
import {
  isValidAfghanPhone,
  isValidPersonName,
  sanitizeAfghanPhoneInput,
  sanitizePersonNameInput
} from '@/utils/formValidation';

interface RegistrationOptionsResponse {
  classes: Array<{ _id: string; className: string; classCode: string; branchId?: string | null; feeAmount?: number }>;
  subjects: Array<{ _id: string; title: string; classId: string; code: string; teacherId?: string | null; feeAmount?: number }>;
  teachers: Array<{ _id: string; name: string; email: string }>;
}

export function RegisterPage() {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const classIdParam = searchParams.get('classId')?.trim() ?? '';
  const subjectIdParam = searchParams.get('subjectId')?.trim() ?? '';
  const teacherIdParam = searchParams.get('teacherId')?.trim() ?? '';
  const courseIdParam = searchParams.get('courseId')?.trim() ?? '';
  const sourceTitle = searchParams.get('sourceTitle')?.trim() ?? '';
  const sourceType = searchParams.get('sourceType')?.trim() ?? '';
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    whatsapp: '',
    gender: '',
    password: '',
    confirmPassword: '',
    classId: classIdParam,
    subjectId: subjectIdParam,
    teacherId: teacherIdParam
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutToken, setCheckoutToken] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [serverQuote, setServerQuote] = useState<{ classFee: number; subjectFee: number; totalFee: number; currency: string } | null>(null);

  const { data: paymentConfig } = useQuery({
    queryKey: ['registration-payment-config'],
    queryFn: () => authService.registerPaymentConfig()
  });

  const { data: options, isLoading } = useQuery({
    queryKey: ['registration-options', formData.classId, formData.subjectId],
    queryFn: () => authService.getRegistrationOptions({
      ...(formData.classId ? { classId: formData.classId } : {}),
      ...(formData.subjectId ? { subjectId: formData.subjectId } : {})
    }),
    select: (response) => response.data as RegistrationOptionsResponse,
    placeholderData: { data: offlineRegistrationOptions },
    retry: false
  });

  const filteredSubjects = useMemo(
    () => (options?.subjects ?? []).filter((subject) => !formData.classId || String(subject.classId) === String(formData.classId)),
    [options?.subjects, formData.classId]
  );

  const linkedTeachers = useMemo(() => {
    if (!formData.subjectId) return options?.teachers ?? [];
    const subject = (options?.subjects ?? []).find((item) => String(item._id) === String(formData.subjectId));
    if (!subject?.teacherId) return options?.teachers ?? [];
    return (options?.teachers ?? []).filter((teacher) => String(teacher._id) === String(subject.teacherId));
  }, [options?.teachers, options?.subjects, formData.subjectId]);

  const selectedClass = useMemo(
    () => (options?.classes ?? []).find((klass) => String(klass._id) === String(formData.classId)),
    [options?.classes, formData.classId]
  );

  const selectedSubject = useMemo(
    () => (options?.subjects ?? []).find((subject) => String(subject._id) === String(formData.subjectId)),
    [options?.subjects, formData.subjectId]
  );

  const classFee = Number(serverQuote?.classFee ?? selectedClass?.feeAmount ?? 0);
  const subjectFee = Number(serverQuote?.subjectFee ?? selectedSubject?.feeAmount ?? 0);
  const totalFee = Number(serverQuote?.totalFee ?? classFee + subjectFee);
  const paymentRequired = totalFee > 0;
  const helperTextClass = isDark ? 'text-slate-400' : 'text-slate-500';
  const fieldErrorClass = isDark ? 'mt-2 text-xs text-rose-300' : 'mt-2 text-xs text-rose-600';
  const errorBannerClass = isDark ? 'border-rose-500/40 bg-rose-500/10 text-rose-100' : 'border-rose-200 bg-rose-50 text-rose-700';
  const successBannerClass = isDark ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700';

  const genderOptions = useMemo(
    () => [
      { value: 'male', label: t('students.gender_male', { defaultValue: 'Male' }) },
      { value: 'female', label: t('students.gender_female', { defaultValue: 'Female' }) },
      { value: 'other', label: t('students.gender_other', { defaultValue: 'Other' }) }
    ],
    [t]
  );

  const classOptions = useMemo(
    () => (options?.classes ?? []).map((klass) => ({ value: klass._id, label: klass.className })),
    [options?.classes]
  );

  const subjectOptions = useMemo(
    () => filteredSubjects.map((subject) => ({ value: subject._id, label: subject.title })),
    [filteredSubjects]
  );

  const teacherOptions = useMemo(
    () => linkedTeachers.map((teacher) => ({ value: teacher._id, label: teacher.name })),
    [linkedTeachers]
  );

  useEffect(() => {
    const stored = localStorage.getItem('nokta-selected-registration');
    let storedSelection: Record<string, string> = {};
    if (stored) {
      try {
        storedSelection = JSON.parse(stored) as Record<string, string>;
      } catch {
        storedSelection = {};
      }
    }

    setFormData((current) => ({
      ...current,
      classId: classIdParam || storedSelection.classId || current.classId,
      subjectId: subjectIdParam || storedSelection.subjectId || current.subjectId,
      teacherId: teacherIdParam || storedSelection.teacherId || current.teacherId
    }));
  }, [classIdParam, subjectIdParam, teacherIdParam, courseIdParam]);

  useEffect(() => {
    if (!formData.classId || !formData.subjectId || !formData.teacherId) {
      setServerQuote(null);
      setCheckoutToken('');
      return;
    }

    authService.registerQuote({
      classId: formData.classId,
      subjectId: formData.subjectId,
      teacherId: formData.teacherId
    })
      .then((response) => {
        const pricing = response?.data?.pricing ?? response?.pricing;
        if (pricing) {
          setServerQuote(pricing);
        }
      })
      .catch(() => {
        setServerQuote(null);
      });
  }, [formData.classId, formData.subjectId, formData.teacherId]);

  useEffect(() => {
    if (!formData.subjectId || formData.teacherId) {
      return;
    }

    const linkedTeacherId = selectedSubject?.teacherId ?? (linkedTeachers.length === 1 ? linkedTeachers[0]._id : '');
    if (!linkedTeacherId) {
      return;
    }

    setFormData((current) => (
      current.teacherId
        ? current
        : { ...current, teacherId: String(linkedTeacherId) }
    ));
  }, [formData.subjectId, formData.teacherId, linkedTeachers, selectedSubject?.teacherId]);

  const setFieldValue = (name: keyof typeof formData, value: string) => {
    setFormData((current) => ({
      ...current,
      [name]: value,
      ...(name === 'classId' ? { subjectId: '', teacherId: '' } : {}),
      ...(name === 'subjectId' ? { teacherId: '' } : {})
    }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[name];
      if (name === 'classId') {
        delete next.subjectId;
        delete next.teacherId;
      }
      if (name === 'subjectId') {
        delete next.teacherId;
      }
      return next;
    });
    setError('');
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    if (name === 'firstName' || name === 'lastName') {
      setFieldValue(name as keyof typeof formData, sanitizePersonNameInput(value));
      return;
    }
    if (name === 'phone' || name === 'whatsapp') {
      setFieldValue(name as keyof typeof formData, sanitizeAfghanPhoneInput(value));
      return;
    }
    setFieldValue(name as keyof typeof formData, value);
  };

  const buildRequiredMessage = (label: string) =>
    t('common.field_required', {
      field: label,
      defaultValue: `${label} is required.`
    });

  const fieldHint = (help: string, fieldName: keyof typeof formData) =>
    fieldErrors[fieldName] || help;

  const validateForm = (data: typeof formData = formData) => {
    const nextErrors: Record<string, string> = {};

    if (!data.firstName.trim()) {
      nextErrors.firstName = buildRequiredMessage(t('students.first_name', { defaultValue: 'First Name' }));
    } else if (!isValidPersonName(data.firstName)) {
      nextErrors.firstName = t('errors.invalid_person_name', { defaultValue: 'Name must contain only letters and cannot include numbers.' });
    }
    if (!data.lastName.trim()) {
      nextErrors.lastName = buildRequiredMessage(t('students.last_name', { defaultValue: 'Last Name' }));
    } else if (!isValidPersonName(data.lastName)) {
      nextErrors.lastName = t('errors.invalid_person_name', { defaultValue: 'Name must contain only letters and cannot include numbers.' });
    }
    if (!data.email.trim()) {
      nextErrors.email = buildRequiredMessage(t('common.email', { defaultValue: 'Email' }));
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      nextErrors.email = t('auth.invalid_email', { defaultValue: 'Enter a valid email address.' });
    }
    if (!data.phone.trim()) {
      nextErrors.phone = buildRequiredMessage(t('students.phone', { defaultValue: 'Phone Number' }));
    } else if (!isValidAfghanPhone(data.phone)) {
      nextErrors.phone = t('errors.invalid_afghan_phone', {
        defaultValue: 'Phone must be 10 digits and start with 070, 078, 079, 072, 077, or 074.'
      });
    }
    if (data.whatsapp.trim() && !isValidAfghanPhone(data.whatsapp)) {
      nextErrors.whatsapp = t('errors.invalid_afghan_phone', {
        defaultValue: 'Phone must be 10 digits and start with 070, 078, 079, 072, 077, or 074.'
      });
    }
    if (!data.gender) nextErrors.gender = buildRequiredMessage(t('students.gender', { defaultValue: 'Gender' }));
    if (!data.classId) nextErrors.classId = buildRequiredMessage(t('students.class', { defaultValue: 'Class' }));
    if (!data.subjectId) nextErrors.subjectId = buildRequiredMessage(t('students.subject', { defaultValue: 'Subject' }));
    if (!data.teacherId) nextErrors.teacherId = buildRequiredMessage(t('students.teacher', { defaultValue: 'Teacher' }));
    if (data.classId && data.subjectId && !subjectOptions.some((option) => String(option.value) === String(data.subjectId))) {
      nextErrors.subjectId = t('common.no_subject_for_class', { defaultValue: 'No subject is assigned to the selected class.' });
    }
    if (data.subjectId && data.teacherId && !teacherOptions.some((option) => String(option.value) === String(data.teacherId))) {
      nextErrors.teacherId = t('auth.no_teachers_available', { defaultValue: 'No teachers available' });
    }

    if (!data.password) {
      nextErrors.password = buildRequiredMessage(t('common.password', { defaultValue: 'Password' }));
    }

    if (!data.confirmPassword) {
      nextErrors.confirmPassword = buildRequiredMessage(t('auth.confirm_password', { defaultValue: 'Confirm Password' }));
    } else if (data.password !== data.confirmPassword) {
      nextErrors.confirmPassword = t('auth.password_mismatch', { defaultValue: 'Passwords do not match.' });
    }

    return nextErrors;
  };

  const renderFieldError = (fieldName: keyof typeof formData) => {
    const message = fieldErrors[fieldName];
    return message ? <p className={fieldErrorClass}>{message}</p> : null;
  };

  const applyFieldValidation = (fieldName: keyof typeof formData, data: typeof formData = formData) => {
    const nextErrors = validateForm(data);
    setFieldErrors((current) => {
      const updated = { ...current };
      if (nextErrors[fieldName]) {
        updated[fieldName] = nextErrors[fieldName];
      } else {
        delete updated[fieldName];
      }
      return updated;
    });
  };

  const handleFieldBlur = (fieldName: keyof typeof formData) => {
    applyFieldValidation(fieldName);
  };

  const setSelectValue = (name: 'gender' | 'classId' | 'subjectId' | 'teacherId', value: string) => {
    const nextData = {
      ...formData,
      [name]: value,
      ...(name === 'classId' ? { subjectId: '', teacherId: '' } : {}),
      ...(name === 'subjectId' ? { teacherId: '' } : {})
    };
    setFieldValue(name, value);
    applyFieldValidation(name, nextData);
  };

  const buildServerFieldErrors = (message: string) => {
    const normalizedMessage = message.toLowerCase();
    const nextErrors: Record<string, string> = {};

    const matchField = (fieldName: keyof typeof formData, ...keywords: string[]) => {
      if (keywords.some((keyword) => normalizedMessage.includes(keyword))) {
        nextErrors[fieldName] = message;
      }
    };

    matchField('firstName', 'firstname', 'first name');
    matchField('lastName', 'lastname', 'last name');
    matchField('email', 'email');
    matchField('phone', 'phone');
    matchField('gender', 'gender');
    matchField('classId', 'classid', 'class');
    matchField('subjectId', 'subjectid', 'subject');
    matchField('teacherId', 'teacherid', 'teacher');
    matchField('password', 'password');
    matchField('confirmPassword', 'confirm password', 'confirmation');

    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setFieldErrors({});

    setIsSubmitting(true);

    try {
      const nextErrors = validateForm();
      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors(nextErrors);
        setError(Object.values(nextErrors)[0]);
        return;
      }

      let activeCheckoutToken = checkoutToken;
      let activePaymentReference = paymentReference.trim();
      if (paymentRequired) {
        const checkout = await authService.registerCheckout({
          email: formData.email.trim(),
          classId: formData.classId,
          subjectId: formData.subjectId,
          teacherId: formData.teacherId
        });
        activeCheckoutToken = checkout?.data?.checkoutToken ?? checkout?.checkoutToken ?? '';
        if (!activeCheckoutToken) {
          throw new Error(t('auth.payment_checkout_failed', { defaultValue: 'Unable to prepare payment checkout.' }));
        }
        setCheckoutToken(activeCheckoutToken);

        if (!activePaymentReference || activePaymentReference.length < 6) {
          throw new Error(t('auth.payment_reference_required', { defaultValue: 'Enter your payment reference from the provider.' }));
        }

        const confirmed = await authService.confirmRegistrationPayment({
          email: formData.email.trim(),
          classId: formData.classId,
          subjectId: formData.subjectId,
          teacherId: formData.teacherId,
          checkoutToken: activeCheckoutToken,
          paymentReference: activePaymentReference,
          paymentMethod: 'mobile_money'
        });
        activeCheckoutToken = confirmed?.checkoutToken ?? activeCheckoutToken;
      }

      await authService.registerStudent({
        ...formData,
        checkoutToken: activeCheckoutToken,
        paymentReference: paymentRequired ? activePaymentReference : '',
        paymentMethod: 'mobile_money'
      });
      localStorage.removeItem('nokta-selected-registration');
      setSuccess(t('auth.register_success', { defaultValue: 'Student account created successfully. You can sign in now.' }));
      setFieldErrors({});
      setTimeout(() => navigate('/login'), 1200);
    } catch (error: any) {
      const serverMessage = error.response?.data?.message || error.message || t('auth.register_failed', { defaultValue: 'Registration failed' });
      const nextFieldErrors = buildServerFieldErrors(String(serverMessage));
      setFieldErrors(nextFieldErrors);
      setError(serverMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`login-page relative flex min-h-[100dvh] flex-col overflow-x-hidden overflow-y-auto ${
        isDark ? 'login-page--dark' : 'login-page--light'
      }`}
    >
      <div className="login-bg" aria-hidden="true">
        <div className="login-bg-base" />
        <div className="login-bg-grid" />
        <div className="login-bg-orb login-bg-orb--a" />
        <div className="login-bg-orb login-bg-orb--b" />
        <div className="login-bg-orb login-bg-orb--c" />
        <div className="login-bg-sheen" />
      </div>

      <header
        className={`login-minibar ${
          isDark ? 'border-white/10 bg-slate-950/95 text-slate-100' : 'border-slate-200/80 bg-white/95 text-slate-800'
        }`}
      >
        <div className="flex min-w-0 items-center justify-start gap-1.5 sm:gap-2">
          <div
            className={`inline-flex shrink-0 items-center gap-1 rounded-lg border p-1 ${
              isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-100/80'
            }`}
          >
            <ThemeToggle className="shrink-0" />
            <LanguageSwitcher compact />
          </div>
        </div>

        <h1
          className={`login-minibar-title register-minibar-title ${isDark ? 'text-white' : 'text-slate-900'}`}
          title={t('auth.register_minibar_title', { defaultValue: 'Student Registration Form' })}
        >
          {t('auth.register_minibar_title', { defaultValue: 'Student Registration Form' })}
        </h1>

        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 gap-1 px-2 text-xs"
            onClick={() => navigate('/login')}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="max-sm:hidden">{t('auth.back_to_login', { defaultValue: 'Back to Login' })}</span>
            <span className="sm:hidden">{t('common.back', { defaultValue: 'Back' })}</span>
          </Button>
        </div>
      </header>

      <main className="register-page-main">
        <div className="register-page-shell w-full">
          <Card
            className={`register-form-panel surface-elevated w-full border p-4 backdrop-blur-xl sm:p-6 ${
              isDark
                ? 'border-white/10 bg-slate-950/80 shadow-[0_30px_120px_rgba(15,23,42,0.5)]'
                : 'border-slate-200/80 bg-white/85 shadow-[0_24px_80px_rgba(15,23,42,0.12)]'
            }`}
          >
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              {sourceTitle && (
                <div className={`rounded-[1.5rem] border px-4 py-3 text-sm ${
                  isDark
                    ? 'border-sky-400/20 bg-sky-500/10 text-sky-100'
                    : 'border-sky-200 bg-sky-50 text-sky-700'
                }`}>
                  {sourceType === 'announcement'
                    ? t('auth.register_from_announcement', {
                        title: sourceTitle,
                        defaultValue: `Prefilled from announcement: ${sourceTitle}`
                      })
                    : sourceType === 'course'
                      ? t('auth.register_from_course', {
                          title: sourceTitle,
                          defaultValue: `Prefilled from course: ${sourceTitle}`
                        })
                      : t('auth.register_from_class', {
                          title: sourceTitle,
                          defaultValue: `Prefilled from class: ${sourceTitle}`
                        })}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={`mb-2 block text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{t('students.first_name', { defaultValue: 'First Name' })}</label>
                  <Input
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    onBlur={() => handleFieldBlur('firstName')}
                    invalid={Boolean(fieldErrors.firstName)}
                    title={fieldHint(t('auth.first_name_help', { defaultValue: 'Use your official first name.' }), 'firstName')}
                    placeholder={t('auth.first_name_placeholder', { defaultValue: 'Enter your first name' })}
                  />
                  {renderFieldError('firstName')}
                </div>
                <div>
                  <label className={`mb-2 block text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{t('students.last_name', { defaultValue: 'Last Name' })}</label>
                  <Input
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    onBlur={() => handleFieldBlur('lastName')}
                    invalid={Boolean(fieldErrors.lastName)}
                    title={fieldHint(t('auth.last_name_help', { defaultValue: 'Include family name/surname.' }), 'lastName')}
                    placeholder={t('auth.last_name_placeholder', { defaultValue: 'Enter your last name' })}
                  />
                  {renderFieldError('lastName')}
                </div>
                <div>
                  <label className={`mb-2 block text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{t('common.email', { defaultValue: 'Email' })}</label>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    onBlur={() => handleFieldBlur('email')}
                    invalid={Boolean(fieldErrors.email)}
                    title={fieldHint(t('auth.email_help', { defaultValue: 'We will use this for login and updates.' }), 'email')}
                    placeholder={t('auth.email_placeholder', { defaultValue: 'Enter a valid email address' })}
                  />
                  {renderFieldError('email')}
                </div>
                <div>
                  <label className={`mb-2 block text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{t('students.phone', { defaultValue: 'Phone Number' })}</label>
                  <Input
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    onBlur={() => handleFieldBlur('phone')}
                    invalid={Boolean(fieldErrors.phone)}
                    title={fieldHint(t('errors.afghan_phone_hint', { defaultValue: 'Only Afghan numbers: 070, 078, 079, 072, 077, 074 (10 digits).' }), 'phone')}
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="0781923460"
                  />
                  {renderFieldError('phone')}
                </div>
                <div>
                  <label className={`mb-2 block text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{t('auth.whatsapp_number', { defaultValue: 'WhatsApp Number' })}</label>
                  <Input
                    name="whatsapp"
                    value={formData.whatsapp}
                    onChange={handleInputChange}
                    onBlur={() => handleFieldBlur('whatsapp')}
                    invalid={Boolean(fieldErrors.whatsapp)}
                    title={fieldHint(t('errors.afghan_phone_hint', { defaultValue: 'Only Afghan numbers: 070, 078, 079, 072, 077, 074 (10 digits).' }), 'whatsapp')}
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="0781923460"
                  />
                  {renderFieldError('whatsapp')}
                </div>
                <div>
                  <label className={`mb-2 block text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{t('students.gender', { defaultValue: 'Gender' })}</label>
                  <Select
                    value={formData.gender}
                    options={genderOptions}
                    placeholder={t('auth.select_gender', { defaultValue: 'Select gender' })}
                    invalid={Boolean(fieldErrors.gender)}
                    title={fieldHint(t('auth.select_gender', { defaultValue: 'Select gender' }), 'gender')}
                    onChange={(value) => setSelectValue('gender', String(value))}
                  />
                  {renderFieldError('gender')}
                </div>
                <div>
                  <label className={`mb-2 block text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{t('common.password', { defaultValue: 'Password' })}</label>
                  <Input
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    onBlur={() => handleFieldBlur('password')}
                    invalid={Boolean(fieldErrors.password)}
                    title={fieldHint(t('auth.password_length_hint', { defaultValue: 'Any password is accepted.' }), 'password')}
                    placeholder={t('common.password', { defaultValue: 'Password' })}
                  />
                  {renderFieldError('password')}
                </div>
                <div>
                  <label className={`mb-2 block text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{t('auth.confirm_password', { defaultValue: 'Confirm Password' })}</label>
                  <Input
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    onBlur={() => handleFieldBlur('confirmPassword')}
                    invalid={Boolean(fieldErrors.confirmPassword)}
                    title={fieldHint(t('auth.confirm_password', { defaultValue: 'Confirm Password' }), 'confirmPassword')}
                    placeholder={t('auth.confirm_password', { defaultValue: 'Confirm Password' })}
                  />
                  {renderFieldError('confirmPassword')}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className={`mb-2 block text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{t('students.class', { defaultValue: 'Class' })}</label>
                  <Select
                    value={formData.classId}
                    options={classOptions}
                    placeholder={
                      isLoading
                        ? t('auth.loading_classes', { defaultValue: 'Loading classes...' })
                        : options?.classes?.length
                          ? t('auth.select_class', { defaultValue: 'Select class' })
                          : t('auth.no_classes_available', { defaultValue: 'No classes available' })
                    }
                    disabled={isLoading}
                    invalid={Boolean(fieldErrors.classId)}
                    title={fieldHint(t('auth.select_class', { defaultValue: 'Select class' }), 'classId')}
                    onChange={(value) => setSelectValue('classId', String(value))}
                  />
                  {renderFieldError('classId')}
                </div>
                <div>
                  <label className={`mb-2 block text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{t('students.subject', { defaultValue: 'Subject' })}</label>
                  <Select
                    value={formData.subjectId}
                    options={subjectOptions}
                    placeholder={
                      !formData.classId
                        ? t('auth.select_class_first', { defaultValue: 'Select class first' })
                        : !filteredSubjects.length
                          ? t('auth.no_subjects_available', { defaultValue: 'No subjects available' })
                          : t('auth.select_subject', { defaultValue: 'Select subject' })
                    }
                    disabled={isLoading || !filteredSubjects.length}
                    invalid={Boolean(fieldErrors.subjectId)}
                    title={fieldHint(t('auth.select_subject', { defaultValue: 'Select subject' }), 'subjectId')}
                    onChange={(value) => setSelectValue('subjectId', String(value))}
                  />
                  {renderFieldError('subjectId')}
                </div>
                <div>
                  <label className={`mb-2 block text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{t('students.teacher', { defaultValue: 'Teacher' })}</label>
                  <Select
                    value={formData.teacherId}
                    options={teacherOptions}
                    placeholder={
                      !formData.subjectId
                        ? t('auth.select_subject_first', { defaultValue: 'Select subject first' })
                        : !linkedTeachers.length
                          ? t('auth.no_teachers_available', { defaultValue: 'No teachers available' })
                          : t('auth.select_teacher', { defaultValue: 'Select teacher' })
                    }
                    disabled={isLoading || !linkedTeachers.length}
                    invalid={Boolean(fieldErrors.teacherId)}
                    title={fieldHint(t('auth.select_teacher', { defaultValue: 'Select teacher' }), 'teacherId')}
                    onChange={(value) => setSelectValue('teacherId', String(value))}
                  />
                  {renderFieldError('teacherId')}
                </div>
              </div>

              <div className={`grid gap-4 rounded-[2rem] border p-5 md:grid-cols-3 ${isDark ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50/80'}`}>
                <div>
                  <p className={`text-xs uppercase tracking-[0.25em] ${helperTextClass}`}>{t('auth.class_fee', { defaultValue: 'Class Fee' })}</p>
                  <p className={`mt-2 text-2xl font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(classFee, i18n.resolvedLanguage)}</p>
                </div>
                <div>
                  <p className={`text-xs uppercase tracking-[0.25em] ${helperTextClass}`}>{t('auth.subject_fee', { defaultValue: 'Subject Fee' })}</p>
                  <p className={`mt-2 text-2xl font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(subjectFee, i18n.resolvedLanguage)}</p>
                </div>
                <div>
                  <p className={`text-xs uppercase tracking-[0.25em] ${helperTextClass}`}>{t('auth.total_fee', { defaultValue: 'Total Fee' })}</p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-400">{formatCurrency(totalFee, i18n.resolvedLanguage)}</p>
                </div>
              </div>

              {paymentRequired && (
                <div className={`rounded-2xl border p-4 ${isDark ? 'border-sky-500/30 bg-sky-500/10' : 'border-sky-200 bg-sky-50'}`}>
                  <p className={`text-sm font-semibold ${isDark ? 'text-sky-100' : 'text-sky-900'}`}>
                    {paymentConfig?.liveReady
                      ? t('auth.payment_live_ready', { defaultValue: 'Payment provider is configured for live verification.' })
                      : t('auth.payment_manual_mode', { defaultValue: 'Pilot payment mode: enter the reference from your bank or mobile-money receipt.' })}
                  </p>
                  <label className={`mb-2 mt-4 block text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    {t('auth.payment_reference', { defaultValue: 'Payment reference' })}
                  </label>
                  <input
                    value={paymentReference}
                    onChange={(event) => setPaymentReference(event.target.value)}
                    placeholder={t('auth.payment_reference_placeholder', { defaultValue: 'e.g. PAY-123456 or bank receipt ID' })}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-emerald-400 ${
                      isDark ? 'border-white/10 bg-white/5 text-slate-100' : 'border-slate-200 bg-white text-slate-900'
                    }`}
                  />
                </div>
              )}

              {error && <div className={`rounded-2xl border px-4 py-3 text-sm ${errorBannerClass}`}>{error}</div>}
              {success && <div className={`rounded-2xl border px-4 py-3 text-sm ${successBannerClass}`}>{success}</div>}

              <div className={`flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {t('auth.already_have_account', { defaultValue: 'Already have an account?' })}{' '}
                  <Link to="/login" className="font-semibold text-emerald-300 hover:text-emerald-200">
                    {t('auth.sign_in_here', { defaultValue: 'Sign in here' })}
                  </Link>
                </p>
                <Button type="submit" disabled={isSubmitting || isLoading}>
                  {isSubmitting
                    ? t('auth.creating_account', { defaultValue: 'Creating account...' })
                    : t('auth.register_as_student', { defaultValue: 'Register as Student' })}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </main>
    </div>
  );
}
