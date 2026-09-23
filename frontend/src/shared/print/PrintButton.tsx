import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { usePrint } from './usePrint';
import type { PrintOptions } from './printElement';

type PrintButtonProps = {
  targetId?: string;
  targetSelector?: string;
  title?: string;
  orientation?: PrintOptions['orientation'];
  label?: string;
  className?: string;
  variant?: 'solid' | 'outline' | 'ghost';
  size?: 'sm' | 'md';
  disabled?: boolean;
  beforePrint?: () => boolean | Promise<boolean>;
  getOptions?: () => PrintOptions | Promise<PrintOptions>;
};

export function PrintButton({
  targetId,
  targetSelector,
  title,
  orientation = 'portrait',
  label,
  className,
  variant = 'outline',
  size,
  disabled,
  beforePrint,
  getOptions
}: PrintButtonProps) {
  const { t } = useTranslation();
  const { print, printing, message, setMessage } = usePrint({ orientation, title });

  const onClick = async () => {
    setMessage('');
    if (beforePrint) {
      const allowed = await beforePrint();
      if (!allowed) return;
    }
    const extra = getOptions ? await getOptions() : {};
    await print({
      targetId,
      targetSelector,
      title,
      orientation,
      ...extra
    });
  };

  return (
    <div className="no-print inline-flex flex-col items-start gap-1" data-no-print>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={disabled || printing}
        onClick={() => {
          void onClick();
        }}
      >
        <Printer className="h-4 w-4" />
        {printing ? t('print.preparing') : label || t('common.print')}
      </Button>
      {message ? <p className="text-xs text-amber-700 dark:text-amber-300">{message}</p> : null}
    </div>
  );
}
