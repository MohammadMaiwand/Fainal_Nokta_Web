import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { GraduationCap, ReceiptText, UserCog, Users } from 'lucide-react';
import { AfghaniIcon } from '@/components/icons/AfghaniIcon';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { JalaliDateInput } from '@/components/forms/JalaliDateInput';
import { api } from '@/services/apiClient';
import { formatCurrency } from '@/utils/formatters';
import { getCurrentJalaliYearMonth } from '@/utils/date';
import { formatIsoToJalaliInput, isValidJalaliDateInput, jalaliInputToIsoDate } from '@/utils/jalaliDateInput';
import { paymentsService } from '@/features/payments/services/paymentsService';

export type PaymentTargetType = 'student' | 'teacher' | 'manager' | 'expense';

type WizardStep = 'target' | 'person' | 'details' | 'confirm';

type MakePaymentWizardProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (result: { message: string; receipt: Record<string, unknown> | null }) => void;
};

const STEPS: WizardStep[] = ['target', 'person', 'details', 'confirm'];

function useDebouncedValue<T>(value: T, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function personName(student: any) {
  return (
    student?.studentDisplay?.fullName ||
    [student?.firstName, student?.lastName].filter(Boolean).join(' ') ||
    student?.name ||
    '—'
  );
}

export function MakePaymentWizard({ open, onClose, onSuccess }: MakePaymentWizardProps) {
  const { t, i18n } = useTranslation();
  const current = getCurrentJalaliYearMonth();
  const [step, setStep] = useState<WizardStep>('target');
  const [targetType, setTargetType] = useState<PaymentTargetType | null>(null);
  const [branchId, setBranchId] = useState('');
  const [personSearch, setPersonSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedStudentData, setSelectedStudentData] = useState<any | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    amount: '',
    discount: '0',
    paymentDate: formatIsoToJalaliInput(new Date()),
    method: 'cash',
    referenceNumber: '',
    notes: '',
    expenseTitle: '',
    expenseCategory: 'سایر مصارفات',
    salaryMonth: String(current.month || 1),
    salaryYear: String(current.year || 1405)
  });

  const debouncedSearch = useDebouncedValue(personSearch, 350);
  const stepIndex = STEPS.indexOf(step);
  const isEmployee = targetType === 'teacher' || targetType === 'manager';
  const isExpense = targetType === 'expense';
  const payeeRole = targetType === 'manager' ? 'manager' : 'teacher';

  useEffect(() => {
    if (!open) return;
    setStep('target');
    setTargetType(null);
    setBranchId('');
    setPersonSearch('');
    setSelectedStudentId('');
    setSelectedStudentData(null);
    setSelectedEmployeeId('');
    setMessage('');
    setForm({
      amount: '',
      discount: '0',
      paymentDate: formatIsoToJalaliInput(new Date()),
      method: 'cash',
      referenceNumber: '',
      notes: '',
      expenseTitle: '',
      expenseCategory: 'سایر مصارفات',
      salaryMonth: String(current.month || 1),
      salaryYear: String(current.year || 1405)
    });
  }, [open, current.month, current.year]);

  const { data: branches = [] } = useQuery({
    queryKey: ['payment-branches'],
    enabled: open,
    queryFn: () => api.get('/branches', { params: { limit: 200 } }).then((res) => res.data.data ?? [])
  });

  const { data: students = [], isFetching: studentsLoading } = useQuery({
    queryKey: ['payment-wizard-students', branchId, debouncedSearch],
    enabled: open && targetType === 'student' && step !== 'target',
    staleTime: 30_000,
    placeholderData: (previous) => previous,
    queryFn: () =>
      paymentsService.searchStudents({
        branchId: branchId || undefined,
        search: debouncedSearch || undefined,
        limit: 5000
      })
  });

  const { data: employees = [], isFetching: employeesLoading } = useQuery({
    queryKey: ['payment-wizard-payees', payeeRole, branchId, debouncedSearch],
    enabled: open && isEmployee && step !== 'target',
    staleTime: 30_000,
    queryFn: () =>
      paymentsService.payees({
        role: payeeRole,
        ...(branchId ? { branchId } : {}),
        ...(debouncedSearch ? { search: debouncedSearch } : {})
      })
  });

  const selectedStudent =
    selectedStudentData && String(selectedStudentData._id) === selectedStudentId
      ? selectedStudentData
      : students.find((item: any) => String(item._id) === selectedStudentId);
  const selectedEmployee = employees.find((item: any) => String(item.value) === selectedEmployeeId);

  const {
    data: salaryPreview,
    isFetching: salaryPreviewLoading,
    isError: salaryPreviewError
  } = useQuery({
    queryKey: ['payment-wizard-salary-preview', selectedEmployeeId, payeeRole, form.salaryYear, form.salaryMonth],
    enabled:
      open &&
      isEmployee &&
      Boolean(selectedEmployeeId) &&
      Boolean(form.salaryMonth) &&
      Boolean(form.salaryYear) &&
      (step === 'details' || step === 'confirm'),
    staleTime: 15_000,
    queryFn: () =>
      paymentsService.salaryPreview({
        payeeUserId: selectedEmployeeId,
        payeeRole,
        salaryMonth: Number(form.salaryMonth),
        salaryYear: Number(form.salaryYear)
      })
  });

  const preview = salaryPreview?.preview ?? salaryPreview;
  const tax = useMemo(() => {
    if (!preview) {
      return {
        grossSalary: 0,
        taxAmount: 0,
        netSalary: 0,
        taxCategory: '',
        taxExplanation: '',
        unpaidNetBalance: 0,
        fixedAmount: 0,
        commissionAmount: 0,
        percentageUsed: 0,
        totalStudentPaymentsUsed: 0,
        settingMissing: false,
        warning: '',
        salaryType: selectedEmployee?.salaryType || 'fixed'
      };
    }
    return {
      grossSalary: Number(preview.grossSalary || 0),
      taxAmount: Number(preview.taxAmount || 0),
      netSalary: Number(preview.netSalary || 0),
      taxCategory: String(preview.taxCategory || ''),
      taxExplanation: String(preview.taxExplanation || preview.explanation || ''),
      unpaidNetBalance: Number(preview.unpaidNetBalance ?? preview.netSalary ?? 0),
      fixedAmount: Number(preview.fixedAmount || 0),
      commissionAmount: Number(preview.commissionAmount || 0),
      percentageUsed: Number(preview.percentageUsed ?? preview.commissionPercentage ?? 0),
      totalStudentPaymentsUsed: Number(preview.totalStudentPaymentsUsed ?? preview.commissionBase ?? 0),
      settingMissing: Boolean(preview.settingMissing),
      warning: preview.warning ? String(preview.warning) : '',
      salaryType: String(preview.salaryType || selectedEmployee?.salaryType || 'fixed')
    };
  }, [preview, selectedEmployee]);

  const feeAmount = Number(selectedStudent?.feeAmount ?? 0);
  const paidAmount = Number(selectedStudent?.paidAmount ?? 0);
  const remainingBalance = Math.max(
    0,
    Number(
      selectedStudent?.remainingBalance != null && !Number.isNaN(Number(selectedStudent.remainingBalance))
        ? selectedStudent.remainingBalance
        : feeAmount - paidAmount
    )
  );
  const paymentAmount = Number(form.amount || 0);
  const discountAmount = Number(form.discount || 0);
  const remainingAfterPayment = Math.max(0, remainingBalance - Math.max(0, paymentAmount - discountAmount));

  const salaryTypeLabel =
    tax.salaryType === 'percentage'
      ? t('payments.salary_type_percentage')
      : tax.salaryType === 'fixed_plus_percentage' || tax.salaryType === 'hybrid'
        ? t('payments.salary_type_hybrid')
        : t('payments.salary_type_fixed');

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!isValidJalaliDateInput(form.paymentDate)) {
        throw new Error(t('payments.invalid_date'));
      }
      const paymentDate = jalaliInputToIsoDate(form.paymentDate);
      if (!paymentDate) {
        throw new Error(t('payments.invalid_date'));
      }

      if (targetType === 'expense') {
        return paymentsService.makePayment({
          paymentType: 'expense',
          paymentFor: 'expense',
          amount: paymentAmount,
          expenseTitle: form.expenseTitle,
          expenseCategory: form.expenseCategory,
          branchId: branchId || undefined,
          paymentDate,
          method: form.method,
          referenceNumber: form.referenceNumber || undefined,
          notes: form.notes,
          idempotencyKey: paymentsService.createIdempotencyKey('expense')
        });
      }

      if (targetType === 'student') {
        return paymentsService.makePayment({
          paymentType: 'student_fee',
          paymentFor: 'student_fee',
          studentId: selectedStudentId,
          amount: paymentAmount,
          discount: discountAmount,
          branchId: branchId || undefined,
          paymentDate,
          method: form.method,
          referenceNumber: form.referenceNumber || undefined,
          notes: form.notes,
          idempotencyKey: paymentsService.createIdempotencyKey(`fee-${selectedStudentId}`)
        });
      }

      return paymentsService.makePayment({
        paymentType: 'employee_salary',
        paymentFor: targetType === 'manager' ? 'manager_salary' : 'teacher_salary',
        employeeRole: payeeRole,
        payeeRole,
        employeeId: selectedEmployeeId,
        payeeUserId: selectedEmployeeId,
        amount: Number(tax.unpaidNetBalance || tax.netSalary || 0),
        grossSalary: Number(tax.grossSalary || 0),
        salaryMonth: Number(form.salaryMonth),
        salaryYear: Number(form.salaryYear),
        branchId: branchId || selectedEmployee?.branchId || undefined,
        paymentDate,
        method: form.method,
        referenceNumber: form.referenceNumber || undefined,
        notes: form.notes,
        idempotencyKey: paymentsService.createIdempotencyKey(
          `salary-${selectedEmployeeId}-${form.salaryYear}-${form.salaryMonth}`
        )
      });
    },
    onSuccess: (response: any) => {
      const data = response?.data ?? response;
      const replay = Boolean(data?.idempotentReplay);
      onSuccess({
        message: replay ? t('payments.idempotent_replay') : t('payments.payment_saved'),
        receipt: data?.receipt || data?.salarySlip || data || null
      });
      onClose();
    },
    onError: (error: any) => {
      const serverMessage = error?.response?.data?.message || error?.message || '';
      const isNetwork =
        !error?.response &&
        (/network error/i.test(String(serverMessage)) || error?.code === 'ERR_NETWORK' || error?.code === 'ECONNABORTED');
      setMessage(
        isNetwork
          ? t('payments.network_error', {
              defaultValue: 'ارتباط با سرور برقرار نشد. لطفاً اتصال اینترنت و اجرای سرور را بررسی کرده دوباره تلاش کنید.'
            })
          : serverMessage || t('payments.payment_failed')
      );
    }
  });

  const selectTarget = (type: PaymentTargetType) => {
    setTargetType(type);
    setSelectedStudentId('');
    setSelectedStudentData(null);
    setSelectedEmployeeId('');
    setPersonSearch('');
    setForm((currentForm) => ({ ...currentForm, amount: '', discount: '0' }));
    setMessage('');
    setStep(type === 'expense' ? 'details' : 'person');
  };

  const studentRemaining = (student: any) => {
    const fee = Number(student?.feeAmount ?? 0);
    const paid = Number(student?.paidAmount ?? 0);
    const remaining = Number(student?.remainingBalance);
    if (student?.remainingBalance != null && !Number.isNaN(remaining)) {
      return Math.max(0, remaining);
    }
    return Math.max(0, fee - paid);
  };

  const selectStudent = (student: any) => {
    const id = String(student._id);
    const remaining = studentRemaining(student);
    const studentBranchId =
      student?.branchId?._id != null
        ? String(student.branchId._id)
        : student?.branchId
          ? String(student.branchId)
          : '';

    setSelectedStudentId(id);
    setSelectedStudentData(student);
    if (studentBranchId) {
      setBranchId(studentBranchId);
    }
    setForm((currentForm) => ({
      ...currentForm,
      amount: remaining > 0 ? String(remaining) : '',
      discount: '0',
      paymentDate: currentForm.paymentDate || formatIsoToJalaliInput(new Date()),
      method: currentForm.method || 'cash',
      referenceNumber: currentForm.referenceNumber || '',
      notes: currentForm.notes || ''
    }));
    setMessage('');
    setStep('details');
  };

  const canGoNext = () => {
    if (step === 'target') return Boolean(targetType);
    if (step === 'person') {
      return targetType === 'student' ? Boolean(selectedStudentId) : Boolean(selectedEmployeeId);
    }
    if (step === 'details') {
      if (!isValidJalaliDateInput(form.paymentDate)) return false;
      if (targetType === 'student') {
        if (remainingBalance <= 0) return false;
        return paymentAmount > 0 && paymentAmount <= remainingBalance + 0.0001;
      }
      if (isExpense) {
        return paymentAmount > 0 && Boolean(form.expenseTitle.trim()) && Boolean(form.expenseCategory);
      }
      const payable = Number(tax.unpaidNetBalance || tax.netSalary || 0);
      return !tax.settingMissing && payable > 0 && !salaryPreviewLoading;
    }
    if (step === 'confirm') {
      if (targetType === 'student') {
        return paymentAmount > 0 && paymentAmount <= remainingBalance + 0.0001 && isValidJalaliDateInput(form.paymentDate);
      }
      if (isExpense) {
        return paymentAmount > 0 && Boolean(form.expenseTitle.trim()) && Boolean(form.expenseCategory) && isValidJalaliDateInput(form.paymentDate);
      }
      return Number(tax.unpaidNetBalance || tax.netSalary || 0) > 0 && isValidJalaliDateInput(form.paymentDate);
    }
    return true;
  };

  const detailsBlockedReason = () => {
    if (step !== 'details' && step !== 'confirm') return '';
    if (!isValidJalaliDateInput(form.paymentDate)) {
      return t('payments.invalid_date', { defaultValue: 'Enter a valid payment date.' });
    }
    if (targetType === 'student') {
      if (remainingBalance <= 0) {
        return t('payments.no_remaining_balance', {
          defaultValue: 'This student has no remaining balance to pay.'
        });
      }
      if (!(paymentAmount > 0)) {
        return t('payments.invalid_amount', { defaultValue: 'Enter a payment amount greater than zero.' });
      }
      if (paymentAmount > remainingBalance + 0.0001) {
        return t('payments.overpay_not_allowed', { defaultValue: 'Amount cannot exceed the remaining balance.' });
      }
    } else if (isExpense) {
      if (!(paymentAmount > 0)) {
        return t('payments.invalid_amount', { defaultValue: 'Enter a payment amount greater than zero.' });
      }
      if (!form.expenseTitle.trim() || !form.expenseCategory) {
        return t('payments.expense_required', { defaultValue: 'Expense title and category are required.' });
      }
    } else if (isEmployee) {
      if (tax.settingMissing) {
        return t('payments.settings_required', { defaultValue: 'Salary settings are required before payout.' });
      }
      if (Number(tax.unpaidNetBalance || tax.netSalary || 0) <= 0) {
        return t('payments.invalid_net', { defaultValue: 'No unpaid salary balance for this period.' });
      }
    }
    return '';
  };

  const goNext = () => {
    setMessage('');
    if (step === 'person' && targetType === 'student' && selectedStudent) {
      const nextRemaining = Math.max(
        0,
        Number(
          selectedStudent.remainingBalance != null && !Number.isNaN(Number(selectedStudent.remainingBalance))
            ? selectedStudent.remainingBalance
            : Number(selectedStudent.feeAmount || 0) - Number(selectedStudent.paidAmount || 0)
        )
      );
      setForm((currentForm) => ({
        ...currentForm,
        amount: nextRemaining > 0 ? String(nextRemaining) : currentForm.amount || ''
      }));
    }
    if (step === 'details') {
      if (targetType === 'student') {
        if (paymentAmount <= 0) {
          setMessage(t('payments.invalid_amount'));
          return;
        }
        if (paymentAmount > remainingBalance) {
          setMessage(t('payments.overpay_not_allowed'));
          return;
        }
      } else if (!isExpense) {
        if (tax.settingMissing) {
          setMessage(t('payments.settings_required'));
          return;
        }
        if (Number(tax.unpaidNetBalance || tax.netSalary || 0) <= 0) {
          setMessage(t('payments.invalid_net'));
          return;
        }
      }
    }
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next);
  };

  const goBack = () => {
    setMessage('');
    if (isExpense && step === 'details') {
      setStep('target');
      return;
    }
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev);
  };

  const confirmPayment = () => {
    setMessage('');
    saveMutation.mutate();
  };

  if (!open) return null;

  const targetCards: Array<{ type: PaymentTargetType; icon: typeof GraduationCap; label: string; description: string }> = [
    {
      type: 'student',
      icon: GraduationCap,
      label: t('payments.target_student'),
      description: t('payments.target_student_desc')
    },
    {
      type: 'teacher',
      icon: Users,
      label: t('payments.target_teacher'),
      description: t('payments.target_teacher_desc')
    },
    {
      type: 'manager',
      icon: UserCog,
      label: t('payments.target_manager'),
      description: t('payments.target_manager_desc')
    },
    {
      type: 'expense',
      icon: ReceiptText,
      label: t('payments.target_expense'),
      description: t('payments.target_expense_desc')
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 backdrop-blur-sm sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border bg-[var(--color-panel)] shadow-xl"
        style={{ borderColor: 'var(--color-border)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="make-payment-wizard-title"
      >
        <div
          className={`flex items-center justify-between border-b p-4 ${i18n.resolvedLanguage === 'en' ? '' : 'flex-row-reverse'}`}
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className={i18n.resolvedLanguage === 'en' ? '' : 'text-right'}>
            <h2 id="make-payment-wizard-title" className="text-lg font-semibold text-[var(--color-text-strong)]">
              {t('payments.make_payment')}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {t('payments.wizard_step_label', {
                current: stepIndex + 1,
                total: STEPS.length,
                name: t(`payments.step_${step}`)
              })}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            {t('payments.close')}
          </Button>
        </div>

        <div className="border-b px-4 py-3" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex gap-2">
            {STEPS.map((item, index) => {
              const active = index === stepIndex;
              const done = index < stepIndex;
              return (
                <div
                  key={item}
                  className={`h-2 flex-1 rounded-full ${active ? 'bg-sky-500' : done ? 'bg-emerald-500/70' : 'bg-slate-500/20'}`}
                  title={t(`payments.step_${item}`)}
                />
              );
            })}
          </div>
        </div>

        <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
          {step === 'target' ? (
            <div className="space-y-4">
              <p className="text-sm text-[var(--color-text-muted)]">{t('payments.select_target_prompt')}</p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {targetCards.map((card) => {
                  const Icon = card.icon;
                  const selected = targetType === card.type;
                  return (
                    <button
                      key={card.type}
                      type="button"
                      onClick={() => selectTarget(card.type)}
                      className={`rounded-2xl border p-4 text-start transition hover:border-sky-400/60 hover:bg-sky-500/10 ${
                        selected ? 'border-sky-400 bg-sky-500/15' : ''
                      }`}
                      style={{ borderColor: selected ? undefined : 'var(--color-border)' }}
                    >
                      <Icon className="mb-3 h-6 w-6 text-sky-500" />
                      <p className="font-semibold text-[var(--color-text-strong)]">{card.label}</p>
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">{card.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {step === 'person' && targetType ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-[var(--color-text-muted)]">{t('common.branch')}</label>
                  <Select
                    value={branchId}
                    onChange={(value) => {
                      setBranchId(String(value));
                      setSelectedStudentId('');
                      setSelectedStudentData(null);
                      setSelectedEmployeeId('');
                    }}
                    options={[
                      { value: '', label: t('common.all_branches') },
                      ...branches.map((branch: any) => ({ value: String(branch._id), label: branch.name }))
                    ]}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-[var(--color-text-muted)]">{t('payments.search_person')}</label>
                  <Input
                    value={personSearch}
                    onChange={(event) => setPersonSearch(event.target.value)}
                    placeholder={t('payments.search_person_placeholder')}
                  />
                </div>
              </div>

              <div className="rounded-xl border p-2" style={{ borderColor: 'var(--color-border)' }}>
                {targetType === 'student' ? (
                  studentsLoading ? (
                    <p className="p-3 text-sm text-[var(--color-text-muted)]">{t('payments.loading')}</p>
                  ) : students.length ? (
                    <>
                      <p className="mb-2 px-2 text-xs text-[var(--color-text-muted)]">
                        {t('payments.all_students_count', {
                          count: students.length,
                          defaultValue: '{{count}} students — click one to auto-fill payment details'
                        })}
                      </p>
                      <ul className="max-h-80 space-y-1 overflow-y-auto">
                        {students.map((student: any) => {
                          const id = String(student._id);
                          const selected = selectedStudentId === id;
                          const remaining = studentRemaining(student);
                          const className =
                            student.studentDisplay?.className || student.className || '—';
                          const subjectName =
                            student.studentDisplay?.subjectName || student.subjectName || '—';
                          const teacherName =
                            student.studentDisplay?.teacherName || student.teacherName || '—';
                          return (
                            <li key={id}>
                              <button
                                type="button"
                                onClick={() => selectStudent(student)}
                                className={`w-full rounded-lg px-3 py-3 text-start transition ${
                                  selected ? 'bg-sky-500/20 ring-1 ring-sky-400/50' : 'hover:bg-white/5'
                                }`}
                              >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <p className="font-medium text-[var(--color-text-strong)]">{personName(student)}</p>
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                      remaining > 0
                                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                    }`}
                                  >
                                    {t('payments.remaining_balance')}:{' '}
                                    {formatCurrency(remaining, i18n.resolvedLanguage)}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                  {t('payments.person_id')}: {student.studentId || student.rollNo || id.slice(-6)}
                                  {student.familyPhone || student.phone
                                    ? ` · ${t('payments.phone')}: ${student.familyPhone || student.phone}`
                                    : ''}
                                </p>
                                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                  {t('common.class')}: {className}
                                  {` · ${t('payments.subject_or_course')}: ${subjectName}`}
                                  {` · ${t('common.teacher')}: ${teacherName}`}
                                </p>
                                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                  {t('payments.fee_amount')}:{' '}
                                  {formatCurrency(Number(student.feeAmount || 0), i18n.resolvedLanguage)}
                                  {` · ${t('payments.already_paid')}: ${formatCurrency(Number(student.paidAmount || 0), i18n.resolvedLanguage)}`}
                                </p>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  ) : (
                    <p className="p-3 text-sm text-[var(--color-text-muted)]">{t('payments.no_persons')}</p>
                  )
                ) : employeesLoading ? (
                  <p className="p-3 text-sm text-[var(--color-text-muted)]">{t('payments.loading')}</p>
                ) : employees.length ? (
                  <ul className="max-h-72 space-y-1 overflow-y-auto">
                    {employees.map((employee: any) => {
                      const id = String(employee.value);
                      const selected = selectedEmployeeId === id;
                      return (
                        <li key={id}>
                          <button
                            type="button"
                            onClick={() => setSelectedEmployeeId(id)}
                            className={`w-full rounded-lg px-3 py-3 text-start transition ${
                              selected ? 'bg-sky-500/20 ring-1 ring-sky-400/50' : 'hover:bg-white/5'
                            }`}
                          >
                            <p className="font-medium text-[var(--color-text-strong)]">{employee.label || employee.name}</p>
                            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                              {t('payments.role')}:{' '}
                              {employee.systemRole === 'branch_manager'
                                ? t('payments.target_branch_manager')
                                : targetType === 'teacher'
                                  ? t('payments.target_teacher')
                                  : t('payments.target_manager')}
                              {employee.phone ? ` · ${t('payments.phone')}: ${employee.phone}` : ''}
                              {` · ID: ${id.slice(-6)}`}
                            </p>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="p-3 text-sm text-[var(--color-text-muted)]">{t('payments.no_persons')}</p>
                )}
              </div>
            </div>
          ) : null}

          {step === 'details' && targetType === 'student' && selectedStudent ? (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-xl border bg-sky-500/5 p-4 sm:grid-cols-2" style={{ borderColor: 'var(--color-border)' }}>
                <p>
                  <span className="text-[var(--color-text-muted)]">{t('common.name')}: </span>
                  {personName(selectedStudent)}
                </p>
                <p>
                  <span className="text-[var(--color-text-muted)]">{t('common.class')}: </span>
                  {selectedStudent.studentDisplay?.className || selectedStudent.className || '—'}
                </p>
                <p>
                  <span className="text-[var(--color-text-muted)]">{t('payments.subject_or_course')}: </span>
                  {selectedStudent.studentDisplay?.subjectName || selectedStudent.subjectName || '—'}
                </p>
                <p>
                  <span className="text-[var(--color-text-muted)]">{t('payments.fee_amount')}: </span>
                  {formatCurrency(feeAmount, i18n.resolvedLanguage)}
                </p>
                <p>
                  <span className="text-[var(--color-text-muted)]">{t('payments.already_paid')}: </span>
                  {formatCurrency(paidAmount, i18n.resolvedLanguage)}
                </p>
                <p className="font-semibold text-amber-700 dark:text-amber-300">
                  <span className="text-[var(--color-text-muted)]">{t('payments.remaining_balance')}: </span>
                  {formatCurrency(remainingBalance, i18n.resolvedLanguage)}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  type="number"
                  min={0}
                  max={remainingBalance}
                  value={form.amount}
                  onChange={(event) => setForm((currentForm) => ({ ...currentForm, amount: event.target.value }))}
                  placeholder={t('payments.current_payment')}
                  required
                />
                <Input
                  type="number"
                  min={0}
                  value={form.discount}
                  onChange={(event) => setForm((currentForm) => ({ ...currentForm, discount: event.target.value }))}
                  placeholder={t('payments.discount')}
                />
                <Select
                  value={form.method}
                  onChange={(value) => setForm((currentForm) => ({ ...currentForm, method: String(value) }))}
                  options={[
                    { value: 'cash', label: t('payments.method_cash') },
                    { value: 'bank_transfer', label: t('payments.method_bank') },
                    { value: 'mobile_money', label: t('payments.method_mobile') },
                    { value: 'card', label: t('payments.method_card') }
                  ]}
                />
                <JalaliDateInput
                  value={form.paymentDate}
                  required
                  onChange={(paymentDate) => setForm((currentForm) => ({ ...currentForm, paymentDate }))}
                />
                <Input
                  value={form.referenceNumber}
                  onChange={(event) => setForm((currentForm) => ({ ...currentForm, referenceNumber: event.target.value }))}
                  placeholder={t('payments.invoice_number')}
                />
                <Input
                  value={form.notes}
                  onChange={(event) => setForm((currentForm) => ({ ...currentForm, notes: event.target.value }))}
                  placeholder={t('payments.notes')}
                />
              </div>
            </div>
          ) : null}

          {step === 'details' && isExpense ? (
            <div className="space-y-4">
              <div className="rounded-xl border bg-amber-500/5 p-4 text-sm" style={{ borderColor: 'var(--color-border)' }}>
                <p className="font-semibold text-[var(--color-text-strong)]">{t('payments.expense_payment_title')}</p>
                <p className="mt-1 text-[var(--color-text-muted)]">{t('payments.expense_payment_hint')}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  value={form.expenseTitle}
                  onChange={(event) => setForm((currentForm) => ({ ...currentForm, expenseTitle: event.target.value }))}
                  placeholder={t('payments.expense_title')}
                  required
                />
                <Select
                  value={form.expenseCategory}
                  onChange={(value) => setForm((currentForm) => ({ ...currentForm, expenseCategory: String(value) }))}
                  options={[
                    { value: 'کرایه', label: t('payments.expense_rent') },
                    { value: 'بل برق', label: t('payments.expense_electricity') },
                    { value: 'سایر مصارفات', label: t('payments.expense_other') }
                  ]}
                />
                <Input
                  type="number"
                  min={0}
                  value={form.amount}
                  onChange={(event) => setForm((currentForm) => ({ ...currentForm, amount: event.target.value }))}
                  placeholder={t('payments.current_payment')}
                  required
                />
                <Select
                  value={form.method}
                  onChange={(value) => setForm((currentForm) => ({ ...currentForm, method: String(value) }))}
                  options={[
                    { value: 'cash', label: t('payments.method_cash') },
                    { value: 'bank_transfer', label: t('payments.method_bank') },
                    { value: 'mobile_money', label: t('payments.method_mobile') },
                    { value: 'card', label: t('payments.method_card') }
                  ]}
                />
                <JalaliDateInput value={form.paymentDate} required onChange={(paymentDate) => setForm((currentForm) => ({ ...currentForm, paymentDate }))} />
                <Input value={form.referenceNumber} onChange={(event) => setForm((currentForm) => ({ ...currentForm, referenceNumber: event.target.value }))} placeholder={t('payments.reference_number')} />
                <div className="md:col-span-2">
                  <Input value={form.notes} onChange={(event) => setForm((currentForm) => ({ ...currentForm, notes: event.target.value }))} placeholder={t('payments.notes')} />
                </div>
              </div>
            </div>
          ) : null}

          {step === 'details' && isEmployee && selectedEmployee ? (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-xl border bg-sky-500/5 p-4 sm:grid-cols-2" style={{ borderColor: 'var(--color-border)' }}>
                <p>
                  <span className="text-[var(--color-text-muted)]">{t('common.name')}: </span>
                  {selectedEmployee.label || selectedEmployee.name}
                </p>
                <p>
                  <span className="text-[var(--color-text-muted)]">{t('payments.role')}: </span>
                  {targetType === 'teacher' ? t('payments.target_teacher') : t('payments.target_manager')}
                </p>
                <p>
                  <span className="text-[var(--color-text-muted)]">{t('payments.salary_type')}: </span>
                  {salaryTypeLabel}
                </p>
                <p>
                  <span className="text-[var(--color-text-muted)]">{t('payments.phone')}: </span>
                  {selectedEmployee.phone || '—'}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  value={form.salaryMonth}
                  onChange={(event) => setForm((currentForm) => ({ ...currentForm, salaryMonth: event.target.value }))}
                  placeholder={t('payments.hijri_month')}
                  required
                />
                <Input
                  value={form.salaryYear}
                  onChange={(event) => setForm((currentForm) => ({ ...currentForm, salaryYear: event.target.value }))}
                  placeholder={t('payments.hijri_year')}
                  required
                />
                <Select
                  value={form.method}
                  onChange={(value) => setForm((currentForm) => ({ ...currentForm, method: String(value) }))}
                  options={[
                    { value: 'cash', label: t('payments.method_cash') },
                    { value: 'bank_transfer', label: t('payments.method_bank') },
                    { value: 'mobile_money', label: t('payments.method_mobile') },
                    { value: 'card', label: t('payments.method_card') }
                  ]}
                />
                <JalaliDateInput
                  value={form.paymentDate}
                  required
                  onChange={(paymentDate) => setForm((currentForm) => ({ ...currentForm, paymentDate }))}
                />
                <Input
                  value={form.referenceNumber}
                  onChange={(event) => setForm((currentForm) => ({ ...currentForm, referenceNumber: event.target.value }))}
                  placeholder={t('payments.invoice_number')}
                />
                <Input
                  value={form.notes}
                  onChange={(event) => setForm((currentForm) => ({ ...currentForm, notes: event.target.value }))}
                  placeholder={t('payments.notes')}
                />
              </div>

              <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 p-4 text-sm">
                <p className="font-semibold text-sky-800 dark:text-sky-200">{t('payments.server_preview')}</p>
                {salaryPreviewLoading ? <p className="mt-2 text-[var(--color-text-muted)]">{t('payments.loading_preview')}</p> : null}
                {salaryPreviewError ? <p className="mt-2 text-amber-700 dark:text-amber-300">{t('payments.settings_required')}</p> : null}
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <p>
                    {t('payments.fixed_salary')}: {formatCurrency(tax.fixedAmount, i18n.resolvedLanguage)}
                  </p>
                  <p>
                    {t('payments.commission_percent')}: {tax.percentageUsed || selectedEmployee.percentageRate || 0}%
                  </p>
                  <p>
                    {t('payments.student_fees_month')}: {formatCurrency(tax.totalStudentPaymentsUsed, i18n.resolvedLanguage)}
                  </p>
                  <p>
                    {t('payments.commission_share')}: {formatCurrency(tax.commissionAmount, i18n.resolvedLanguage)}
                  </p>
                  <p>
                    {t('payments.gross_amount')}: {formatCurrency(tax.grossSalary, i18n.resolvedLanguage)}
                  </p>
                  <p>
                    {t('payments.tax_deduction')}: {formatCurrency(tax.taxAmount, i18n.resolvedLanguage)}
                  </p>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-300 sm:col-span-2">
                    {t('payments.unpaid_net_balance')}: {formatCurrency(tax.unpaidNetBalance || tax.netSalary, i18n.resolvedLanguage)}
                  </p>
                </div>
                {tax.taxExplanation ? <p className="mt-3 text-[var(--color-text-muted)]">{tax.taxExplanation}</p> : null}
                {tax.warning ? <p className="mt-2 text-amber-700 dark:text-amber-300">{tax.warning}</p> : null}
              </div>
            </div>
          ) : null}

          {step === 'confirm' ? (
            <div className="space-y-4">
              <p className="text-sm text-[var(--color-text-muted)]">{t('payments.confirm_summary_prompt')}</p>
              <div className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2" style={{ borderColor: 'var(--color-border)' }}>
                <p>
                  <span className="text-[var(--color-text-muted)]">{t('payments.payment_type')}: </span>
                  {targetType === 'student'
                    ? t('payments.target_student')
                    : targetType === 'teacher'
                      ? t('payments.target_teacher')
                      : targetType === 'manager'
                        ? t('payments.target_manager')
                        : t('payments.target_expense')}
                </p>
                <p>
                  <span className="text-[var(--color-text-muted)]">{t('common.name')}: </span>
                  {targetType === 'student'
                    ? personName(selectedStudent)
                    : isExpense
                      ? form.expenseTitle || '—'
                      : selectedEmployee?.label || selectedEmployee?.name || '—'}
                </p>
                <p>
                  <span className="text-[var(--color-text-muted)]">{t('payments.payment_method')}: </span>
                  {t(`payments.method_${form.method === 'bank_transfer' ? 'bank' : form.method === 'mobile_money' ? 'mobile' : form.method}`)}
                </p>
                <p>
                  <span className="text-[var(--color-text-muted)]">{t('payments.payment_date')}: </span>
                  {form.paymentDate}
                </p>

                {targetType === 'student' ? (
                  <>
                    <p>
                      <span className="text-[var(--color-text-muted)]">{t('payments.fee_amount')}: </span>
                      {formatCurrency(feeAmount, i18n.resolvedLanguage)}
                    </p>
                    <p>
                      <span className="text-[var(--color-text-muted)]">{t('payments.already_paid')}: </span>
                      {formatCurrency(paidAmount, i18n.resolvedLanguage)}
                    </p>
                    <p>
                      <span className="text-[var(--color-text-muted)]">{t('payments.current_payment')}: </span>
                      {formatCurrency(paymentAmount, i18n.resolvedLanguage)}
                    </p>
                    <p>
                      <span className="text-[var(--color-text-muted)]">{t('payments.discount')}: </span>
                      {formatCurrency(discountAmount, i18n.resolvedLanguage)}
                    </p>
                    <p className="font-semibold text-emerald-700 dark:text-emerald-300 sm:col-span-2">
                      {t('payments.remaining_after_payment')}: {formatCurrency(remainingAfterPayment, i18n.resolvedLanguage)}
                    </p>
                  </>
                ) : isExpense ? (
                  <>
                    <p>
                      <span className="text-[var(--color-text-muted)]">{t('payments.expense_category')}: </span>
                      {form.expenseCategory === 'کرایه'
                        ? t('payments.expense_rent')
                        : form.expenseCategory === 'بل برق'
                          ? t('payments.expense_electricity')
                          : t('payments.expense_other')}
                    </p>
                    <p className="font-semibold text-rose-700 dark:text-rose-300">
                      <span className="text-[var(--color-text-muted)]">{t('payments.current_payment')}: </span>
                      {formatCurrency(paymentAmount, i18n.resolvedLanguage)}
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      <span className="text-[var(--color-text-muted)]">{t('payments.hijri_month')}: </span>
                      {form.salaryMonth}/{form.salaryYear}
                    </p>
                    <p>
                      <span className="text-[var(--color-text-muted)]">{t('payments.gross_amount')}: </span>
                      {formatCurrency(tax.grossSalary, i18n.resolvedLanguage)}
                    </p>
                    <p>
                      <span className="text-[var(--color-text-muted)]">{t('payments.tax_amount')}: </span>
                      {formatCurrency(tax.taxAmount, i18n.resolvedLanguage)}
                    </p>
                    <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                      {t('payments.current_payment')}: {formatCurrency(tax.unpaidNetBalance || tax.netSalary, i18n.resolvedLanguage)}
                    </p>
                    <p className="sm:col-span-2">
                      <span className="text-[var(--color-text-muted)]">{t('payments.remaining_after_payment')}: </span>
                      {formatCurrency(0, i18n.resolvedLanguage)}
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : null}

          {message ? <p className="text-sm text-rose-600 dark:text-rose-300">{message}</p> : null}
          {!canGoNext() && detailsBlockedReason() ? (
            <p className="text-sm text-amber-700 dark:text-amber-300">{detailsBlockedReason()}</p>
          ) : null}
        </div>

        <div
          className={`sticky bottom-0 flex flex-wrap gap-2 border-t bg-[var(--color-panel)] p-4 ${
            i18n.resolvedLanguage === 'en' ? 'justify-end' : 'justify-start'
          }`}
          style={{ borderColor: 'var(--color-border)' }}
        >
          {stepIndex > 0 ? (
            <Button type="button" variant="outline" onClick={goBack} disabled={saveMutation.isPending}>
              {t('payments.back')}
            </Button>
          ) : null}
          {step !== 'confirm' && step !== 'target' ? (
            <Button type="button" onClick={goNext} disabled={!canGoNext()}>
              {t('payments.next')}
            </Button>
          ) : null}
          {step === 'confirm' ? (
            <Button type="button" onClick={confirmPayment} disabled={saveMutation.isPending || !canGoNext()}>
              <AfghaniIcon className="h-4 w-4" />
              {saveMutation.isPending ? t('payments.processing') : t('payments.confirm_payment')}
            </Button>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
