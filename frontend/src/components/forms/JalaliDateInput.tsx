import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import { sanitizeJalaliDateInput } from '@/utils/jalaliDateInput';

interface JalaliDateInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

export function JalaliDateInput({ value, onChange, placeholder, disabled, required }: JalaliDateInputProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-1">
      <Input
        type="text"
        inputMode="numeric"
        value={value}
        required={required}
        disabled={disabled}
        placeholder={placeholder ?? t('common.jalali_date_placeholder', { defaultValue: '1405/2/1' })}
        onChange={(event) => onChange(sanitizeJalaliDateInput(event.target.value))}
        dir="ltr"
        className="text-left"
      />
      <p className="text-xs text-slate-400">
        {t('common.jalali_date_hint', { defaultValue: 'Enter date in Hijri Shamsi format: year/month/day (e.g. 1405/2/1)' })}
      </p>
    </div>
  );
}
