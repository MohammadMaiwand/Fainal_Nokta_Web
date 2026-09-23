import { MoonStar, SunMedium } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useTranslation } from 'react-i18next';

interface ThemeToggleProps {
  compact?: boolean;
  className?: string;
}

export function ThemeToggle({ compact = true, className = '' }: ThemeToggleProps) {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  const currentThemeLabel = theme === 'dark'
    ? t('common.dark_mode', { defaultValue: 'Dark mode' })
    : t('common.light_mode', { defaultValue: 'Light mode' });

  const actionLabel = nextTheme === 'dark'
    ? t('common.switch_to_dark_mode', { defaultValue: 'Switch to dark mode' })
    : t('common.switch_to_light_mode', { defaultValue: 'Switch to light mode' });

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={toggleTheme}
      className={`theme-toggle theme-control-button px-3 py-2 ${compact ? 'gap-0' : 'gap-2'} ${className}`.trim()}
      aria-label={actionLabel}
      title={actionLabel}
    >
      <span className="relative flex h-5 w-5 items-center justify-center">
        <SunMedium
          className={`absolute h-4 w-4 transition-all duration-300 ${
            theme === 'light' ? 'scale-100 opacity-100 text-amber-500' : 'scale-75 opacity-0 text-amber-500'
          }`}
        />
        <MoonStar
          className={`absolute h-4 w-4 transition-all duration-300 ${
            theme === 'dark' ? 'scale-100 opacity-100 text-indigo-400' : 'scale-75 opacity-0 text-indigo-400'
          }`}
        />
      </span>
      {compact ? <span className="sr-only">{currentThemeLabel}</span> : <span>{currentThemeLabel}</span>}
    </Button>
  );
}
