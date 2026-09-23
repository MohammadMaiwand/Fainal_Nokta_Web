import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Briefcase, GraduationCap, UserCog, Users, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { JalaliDateInput } from '@/components/forms/JalaliDateInput';
import { api } from '@/services/apiClient';
import { formatCurrency } from '@/utils/formatters';
import { formatIsoToJalaliInput, isValidJalaliDateInput, jalaliInputToIsoDate } from '@/utils/jalaliDateInput';
import { loanService, type LoanPersonType } from '@/features/loans/services/loanService';

type WizardStep = 'target' | 'person' | 'details' | 'confirm';

type MakeLoanWizardProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (result: { message: string; loan: Record<string, unknown> | null }) => void;
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

export function MakeLoanWizard({ open, onClose, onSuccess }: MakeLoanWizardProps) {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState<WizardStep>('target');
  const [personType, setPersonType] = useState<LoanPersonType | null>(null);
  const [branchId, setBranchId] = useState('');
  const [personSearch, setPersonSearch] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    loanType: 'CASH_LOAN' as string,
    originalAmount: '',
    purpose: '',
    notes: '',
    loanDate: formatIsoToJalaliInput(new Date()),
    dueDate: '',
    payrollDeductionEnabled: false,
    installmentAmount: '',
    repaymentMethodDefault: 'cash'
  });

  const debouncedSearch = useDebouncedValue(personSearch, 350);
  const stepIndex = STEPS.indexOf(step);
  const isStaff = personType === 'teacher' || personType === 'manager' || personType === 'employee';

  useEffect(() => {
    if (!open) return;
    setStep('target');
    setPersonType(null);
    setBranchId('');
    setPersonSearch('');
    setSelectedPersonId('');
    setMessage('');
    setForm({
      loanType: 'CASH_LOAN',
      originalAmount: '',
      purpose: '',
      notes: '',
      loanDate: formatIsoToJalaliInput(new Date()),
      dueDate: '',
      payrollDeductionEnabled: false,
      installmentAmount: '',
      repaymentMethodDefault: 'cash'
    });
  }, [open]);

  const { data: branches = [] } = useQuery({
    queryKey: ['loan-branches'],
    enabled: open,
    queryFn: () => api.get('/branches', { params: { limit: 200 } }).then((res) => res.data.data ?? [])
  });

  const { data: people = [], isFetching: peopleLoading } = useQuery({
    queryKey: ['loan-person-options', personType, branchId, debouncedSearch],
    enabled: open && Boolean(personType) && step !== 'target',
    staleTime: 30_000,
    queryFn: () =>
      loanService.personOptions({
        personType: personType as LoanPersonType,
        branchId: branchId || undefined,
        search: debouncedSearch || undefined
      })
  });

  const { data: context, isFetching: contextLoading } = useQuery({
    queryKey: ['loan-person-context', personType, selectedPersonId],
    enabled: open && Boolean(personType) && Boolean(selectedPersonId) && (step === 'details' || step === 'confirm' || step === 'person'),
    staleTime: 15_000,
    queryFn: () => loanService.personContext(personType as LoanPersonType, selectedPersonId)
  });

  const selectedPerson = people.find((item: any) => String(item.value) === selectedPersonId);
  const amount = Number(form.originalAmount || 0);
  const remainingFee = Number(context?.student?.remainingFee || 0);

  const loanTypeOptions = useMemo(() => {
    const base = [
      { value: 'CASH_LOAN', label: t('loans.type_CASH_LOAN') },
      { value: 'EMERGENCY_LOAN', label: t('loans.type_EMERGENCY_LOAN') },
      { value: 'OTHER', label: t('loans.type_OTHER') }
    ];
    if (personType === 'student') {
      return [{ value: 'STUDENT_FEE_DEBT', label: t('loans.type_STUDENT_FEE_DEBT') }, ...base];
    }
    return [{ value: 'SALARY_ADVANCE', label: t('loans.type_SALARY_ADVANCE') }, ...base];
  }, [personType, t]);

  useEffect(() => {
    if (!personType) return;
    if (personType === 'student') {
      setForm((current) => ({ ...current, loanType: 'STUDENT_FEE_DEBT', payrollDeductionEnabled: false }));
    } else {
      setForm((current) => ({
        ...current,
        loanType: current.loanType === 'STUDENT_FEE_DEBT' ? 'SALARY_ADVANCE' : current.loanType || 'SALARY_ADVANCE',
        payrollDeductionEnabled: current.loanType === 'SALARY_ADVANCE' || current.payrollDeductionEnabled
      }));
    }
  }, [personType]);

  useEffect(() => {
    if (personType === 'student' && context?.student && form.loanType === 'STUDENT_FEE_DEBT' && !form.originalAmount) {
      setForm((current) => ({ ...current, originalAmount: String(remainingFee || '') }));
    }
  }, [personType, context, form.loanType, form.originalAmount, remainingFee]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!personType || !selectedPersonId) throw new Error(t('loans.loan_failed'));
      if (!isValidJalaliDateInput(form.loanDate)) throw new Error(t('payments.invalid_date'));
      const loanDate = jalaliInputToIsoDate(form.loanDate);
      if (!loanDate) throw new Error(t('payments.invalid_date'));
      const dueDate = form.dueDate && isValidJalaliDateInput(form.dueDate) ? jalaliInputToIsoDate(form.dueDate) : null;

      return loanService.create({
        personType,
        personId: selectedPersonId,
        loanType: form.loanType as any,
        purpose: form.purpose || undefined,
        originalAmount: amount,
        loanDate,
        dueDate,
        notes: form.notes || undefined,
        branchId: branchId || context?.branchId || undefined,
        payrollDeductionEnabled: isStaff ? form.payrollDeductionEnabled : false,
        installmentEnabled: isStaff && form.payrollDeductionEnabled && Number(form.installmentAmount || 0) > 0,
        installmentAmount: Number(form.installmentAmount || 0) || undefined,
        payrollDeductionAmount: Number(form.installmentAmount || 0) || undefined,
        repaymentMethodDefault: form.repaymentMethodDefault,
        classId: context?.student?.classId || undefined,
        subjectId: context?.student?.subjectId || undefined,
        idempotencyKey: loanService.createIdempotencyKey(`loan-${personType}-${selectedPersonId}`)
      });
    },
    onSuccess: (response: any) => {
      const data = response?.data ?? response;
      const replay = Boolean(data?.idempotentReplay);
      onSuccess({
        message: replay ? t('payments.idempotent_replay', { defaultValue: t('loans.loan_saved') }) : t('loans.loan_saved'),
        loan: data?.loan || data || null
      });
      onClose();
    },
    onError: (error: any) => {
      setMessage(error?.response?.data?.message || error?.message || t('loans.loan_failed'));
    }
  });

  const selectTarget = (type: LoanPersonType) => {
    setPersonType(type);
    setSelectedPersonId('');
    setPersonSearch('');
    setMessage('');
    setStep('person');
  };

  const canGoNext = () => {
    if (step === 'target') return Boolean(personType);
    if (step === 'person') return Boolean(selectedPersonId);
    if (step === 'details') {
      if (!(amount > 0)) return false;
      if (!isValidJalaliDateInput(form.loanDate)) return false;
      if (form.loanType === 'STUDENT_FEE_DEBT' && amount > remainingFee + 0.0001) return false;
      return true;
    }
    return true;
  };

  const goNext = () => {
    setMessage('');
    if (step === 'details') {
      if (!(amount > 0)) {
        setMessage(t('loans.invalid_amount'));
        return;
      }
      if (form.loanType === 'STUDENT_FEE_DEBT' && amount > remainingFee) {
        setMessage(t('loans.fee_debt_limit'));
        return;
      }
    }
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next);
  };

  const goBack = () => {
    setMessage('');
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev);
  };

  if (!open) return null;

  const targetCards: Array<{ type: LoanPersonType; icon: typeof GraduationCap; label: string; description: string }> = [
    { type: 'student', icon: GraduationCap, label: t('loans.target_student'), description: t('loans.target_student_desc') },
    { type: 'teacher', icon: Users, label: t('loans.target_teacher'), description: t('loans.target_teacher_desc') },
    { type: 'manager', icon: UserCog, label: t('loans.target_manager'), description: t('loans.target_manager_desc') },
    { type: 'employee', icon: Briefcase, label: t('loans.target_employee'), description: t('loans.target_employee_desc') }
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
        aria-labelledby="make-loan-wizard-title"
      >
        <div
          className={`flex items-center justify-between border-b p-4 ${i18n.resolvedLanguage === 'en' ? '' : 'flex-row-reverse'}`}
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className={i18n.resolvedLanguage === 'en' ? '' : 'text-right'}>
            <h2 id="make-loan-wizard-title" className="text-lg font-semibold text-[var(--color-text-strong)]">
              {t('loans.new_loan')}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {t('loans.wizard_step_label', {
                current: stepIndex + 1,
                total: STEPS.length,
                name: t(`loans.step_${step}`)
              })}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            {t('loans.close')}
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
                  title={t(`loans.step_${item}`)}
                />
              );
            })}
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {message ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-200">
              {message}
            </div>
          ) : null}

          {step === 'target' ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-text-muted)]">{t('loans.select_person_type')}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {targetCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={card.type}
                      type="button"
                      onClick={() => selectTarget(card.type)}
                      className="rounded-2xl border p-4 text-start transition hover:border-sky-500/50 hover:bg-sky-500/5"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <Icon className="h-5 w-5 text-sky-600 dark:text-sky-300" />
                        <span className="font-semibold text-[var(--color-text-strong)]">{card.label}</span>
                      </div>
                      <p className="text-sm text-[var(--color-text-muted)]">{card.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {step === 'person' ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-[var(--color-text-muted)]">{t('filters.branch')}</label>
                  <Select
                    value={branchId}
                    onChange={(value) => setBranchId(String(value))}
                    options={[
                      { value: '', label: t('common.all', { defaultValue: 'All' }) },
                      ...branches.map((branch: any) => ({ value: String(branch._id), label: branch.name }))
                    ]}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-[var(--color-text-muted)]">{t('loans.search_person')}</label>
                  <Input
                    value={personSearch}
                    onChange={(event) => setPersonSearch(event.target.value)}
                    placeholder={t('loans.search_person_placeholder')}
                  />
                </div>
              </div>

              <div className="max-h-72 space-y-2 overflow-y-auto">
                {peopleLoading ? (
                  <p className="text-sm text-[var(--color-text-muted)]">{t('loans.loading')}</p>
                ) : people.length ? (
                  people.map((person: any) => {
                    const selected = String(person.value) === selectedPersonId;
                    return (
                      <button
                        key={person.value}
                        type="button"
                        onClick={() => setSelectedPersonId(String(person.value))}
                        className={`w-full rounded-xl border p-3 text-start ${selected ? 'border-sky-500 bg-sky-500/10' : ''}`}
                        style={{ borderColor: selected ? undefined : 'var(--color-border)' }}
                      >
                        <div className="font-medium text-[var(--color-text-strong)]">{person.label}</div>
                        <div className="mt-1 grid gap-1 text-xs text-[var(--color-text-muted)] sm:grid-cols-3">
                          <span>
                            {t('loans.father_name')}: {person.fatherName || '—'}
                          </span>
                          <span>
                            {t('loans.person_id')}: {person.uniqueId || '—'}
                          </span>
                          <span>
                            {t('loans.phone')}: {person.phone || '—'}
                          </span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <p className="text-sm text-[var(--color-text-muted)]">{t('loans.no_persons')}</p>
                )}
              </div>

              {selectedPersonId && context ? (
                <div className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--color-border)' }}>
                  <p>
                    {t('loans.outstanding_for_person')}:{' '}
                    {formatCurrency(Number(context.outstandingLoanTotal || 0), i18n.resolvedLanguage)}
                  </p>
                  {context.student ? (
                    <p className="mt-1">
                      {t('loans.remaining_fee')}: {formatCurrency(Number(context.student.remainingFee || 0), i18n.resolvedLanguage)}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 'details' || step === 'confirm' ? (
            <div className="space-y-4">
              {(contextLoading || !context) && step === 'details' ? (
                <p className="text-sm text-[var(--color-text-muted)]">{t('loans.loading')}</p>
              ) : (
                <>
                  <div className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <p>
                        {t('loans.borrower')}: {context?.name || selectedPerson?.label || '—'}
                      </p>
                      <p>
                        {t('loans.father_name')}: {context?.fatherName || selectedPerson?.fatherName || '—'}
                      </p>
                      {context?.student ? (
                        <>
                          <p>
                            {t('common.classes')}: {context.student.className || '—'}
                          </p>
                          <p>
                            {t('common.subjects')}: {context.student.subjectName || '—'}
                          </p>
                          <p>
                            {t('loans.original_fee')}: {formatCurrency(context.student.originalFee, i18n.resolvedLanguage)}
                          </p>
                          <p>
                            {t('loans.paid_fee')}: {formatCurrency(context.student.paidFee, i18n.resolvedLanguage)}
                          </p>
                          <p>
                            {t('loans.remaining_fee')}: {formatCurrency(context.student.remainingFee, i18n.resolvedLanguage)}
                          </p>
                        </>
                      ) : null}
                      {context?.employee ? (
                        <>
                          <p>
                            {t('loans.role')}: {context.employee.role || '—'}
                          </p>
                          <p>
                            {t('loans.base_salary')}: {formatCurrency(context.employee.baseSalary, i18n.resolvedLanguage)}
                          </p>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {step === 'details' ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm text-[var(--color-text-muted)]">{t('loans.loan_type')}</label>
                        <Select
                          value={form.loanType}
                          onChange={(value) =>
                            setForm((current) => ({
                              ...current,
                              loanType: String(value),
                              payrollDeductionEnabled: String(value) === 'SALARY_ADVANCE' ? true : current.payrollDeductionEnabled
                            }))
                          }
                          options={loanTypeOptions}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-[var(--color-text-muted)]">{t('loans.loan_amount')}</label>
                        <Input
                          type="number"
                          min={0}
                          value={form.originalAmount}
                          onChange={(event) => setForm((current) => ({ ...current, originalAmount: event.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-[var(--color-text-muted)]">{t('loans.loan_date')}</label>
                        <JalaliDateInput
                          value={form.loanDate}
                          onChange={(loanDate) => setForm((current) => ({ ...current, loanDate }))}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-[var(--color-text-muted)]">{t('loans.due_date')}</label>
                        <JalaliDateInput
                          value={form.dueDate}
                          onChange={(dueDate) => setForm((current) => ({ ...current, dueDate }))}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-sm text-[var(--color-text-muted)]">{t('loans.purpose')}</label>
                        <Input
                          value={form.purpose}
                          onChange={(event) => setForm((current) => ({ ...current, purpose: event.target.value }))}
                        />
                      </div>
                      {isStaff ? (
                        <>
                          <label className="flex items-center gap-2 text-sm sm:col-span-2">
                            <input
                              type="checkbox"
                              checked={form.payrollDeductionEnabled}
                              onChange={(event) =>
                                setForm((current) => ({ ...current, payrollDeductionEnabled: event.target.checked }))
                              }
                            />
                            {t('loans.enable_payroll_deduction')}
                          </label>
                          {form.payrollDeductionEnabled ? (
                            <div>
                              <label className="mb-1 block text-sm text-[var(--color-text-muted)]">
                                {t('loans.installment_amount')}
                              </label>
                              <Input
                                type="number"
                                min={0}
                                value={form.installmentAmount}
                                onChange={(event) =>
                                  setForm((current) => ({ ...current, installmentAmount: event.target.value }))
                                }
                              />
                            </div>
                          ) : null}
                        </>
                      ) : null}
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-sm text-[var(--color-text-muted)]">{t('loans.notes')}</label>
                        <Input
                          value={form.notes}
                          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-sm">
                      <p>{t('loans.confirm_summary_prompt')}</p>
                      <p>
                        {t('loans.loan_type')}: {t(`loans.type_${form.loanType}`)}
                      </p>
                      <p>
                        {t('loans.loan_amount')}: {formatCurrency(amount, i18n.resolvedLanguage)}
                      </p>
                      {form.payrollDeductionEnabled ? (
                        <p>
                          {t('loans.payroll_deduction')}: {formatCurrency(Number(form.installmentAmount || 0), i18n.resolvedLanguage)}
                        </p>
                      ) : null}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t p-4" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex gap-2">
            {stepIndex > 0 ? (
              <Button type="button" variant="outline" onClick={goBack}>
                {t('loans.back')}
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            {step !== 'confirm' ? (
              <Button type="button" onClick={goNext} disabled={!canGoNext()}>
                {t('loans.next')}
              </Button>
            ) : (
              <Button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                <Wallet className="h-4 w-4" />
                {saveMutation.isPending ? t('loans.processing') : t('loans.confirm_loan')}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
