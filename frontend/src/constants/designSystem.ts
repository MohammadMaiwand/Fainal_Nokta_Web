// Premium dark glass design system tokens
export const designSystem = {
  colors: {
    primary: '#4f46e5',
    secondary: '#06b6d4',
    accent: '#22c55e',
    danger: '#ef4444',
    warning: '#f59e0b',
    background: '#0f172a',
    surface: 'rgba(255,255,255,0.05)',
    surfaceAlt: 'rgba(255,255,255,0.08)',
    border: 'rgba(255,255,255,0.12)',
    text: '#e2e8f0',
    muted: '#94a3b8',
  },
  fonts: {
    heading: 'var(--app-font-family)',
    body: 'var(--app-font-family)',
  },
  spacing: {
    container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
    section: 'py-6 sm:px-6 lg:px-8',
    card: 'p-6',
    gap: 'gap-6',
  },
  borderRadius: 'rounded-[28px]',
  shadows: 'shadow-glow',
  transitions: 'transition-all duration-300 ease-in-out',
} as const;