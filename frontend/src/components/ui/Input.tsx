import type { InputHTMLAttributes } from 'react';
import { useTheme } from '@/app/providers/ThemeProvider';
import { designSystem } from '@/constants/designSystem';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export function Input({ invalid = false, className = '', ...props }: InputProps) {
  const { isDark } = useTheme();
  const themeClasses = invalid
    ? isDark
      ? 'border-rose-400/80 bg-rose-500/10 text-slate-100 placeholder-rose-200/60 focus:border-rose-400 focus:ring-rose-400/30'
      : 'border-rose-400 bg-rose-50 text-slate-900 placeholder-rose-400/70 focus:border-rose-500 focus:ring-rose-500/25'
    : isDark
      ? 'border-white/10 bg-white/5 text-slate-100 placeholder-slate-500 focus:border-primary focus:ring-primary/30'
      : 'border-slate-300/80 bg-white/95 text-slate-900 placeholder-slate-500 focus:border-sky-500 focus:ring-sky-500/25';

  const mergedClassName = `w-full ${designSystem.borderRadius} border px-4 py-3 text-sm outline-none backdrop-blur-sm ${designSystem.transitions} focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent ${themeClasses} ${className}`.trim();

  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      className={mergedClassName}
    />
  );
}
