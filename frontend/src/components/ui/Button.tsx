import type { ButtonHTMLAttributes } from 'react';
import { designSystem } from '@/constants/designSystem';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'default' | 'solid' | 'destructive';
  size?: 'sm' | 'md';
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-gradient-to-r from-primary via-secondary to-accent text-white shadow-[0_20px_80px_rgba(79,70,229,0.18)] hover:scale-[1.01] active:scale-95',
  secondary: 'border app-border app-surface text-[var(--color-text-strong)] hover:brightness-105',
  danger: 'bg-gradient-to-r from-danger to-warning text-white shadow-[0_20px_60px_rgba(239,68,68,0.24)] hover:scale-[1.01] active:scale-95',
  outline: 'border app-border bg-transparent text-[var(--color-text-strong)] hover:bg-white/10',
  ghost: 'bg-transparent text-[var(--color-text)] hover:app-surface',
  default: 'bg-gradient-to-r from-primary via-secondary to-accent text-white shadow-[0_20px_80px_rgba(79,70,229,0.18)] hover:scale-[1.01] active:scale-95',
  solid: 'bg-gradient-to-r from-primary via-secondary to-accent text-white shadow-[0_20px_80px_rgba(79,70,229,0.18)] hover:scale-[1.01] active:scale-95',
  destructive: 'bg-gradient-to-r from-danger to-warning text-white shadow-[0_20px_60px_rgba(239,68,68,0.24)] hover:scale-[1.01] active:scale-95',
};

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-2 text-xs',
  md: 'px-5 py-3 text-sm',
};

export function Button({ children, className = '', variant = 'primary', size = 'md', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center ${designSystem.borderRadius} ${designSystem.transitions} font-medium disabled:pointer-events-none disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/35 focus:ring-offset-2 focus:ring-offset-transparent ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </button>
  );
}
