module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--app-font-family)', 'Arial', 'sans-serif'],
        rtl: ['Vazirmatn', 'Tahoma', 'Arial', 'sans-serif'],
        english: ['Inter', 'Arial', 'sans-serif'],
      },
      colors: {
        primary: '#4f46e5',
        secondary: '#06b6d4',
        accent: '#22c55e',
        danger: '#ef4444',
        error: '#fb7185',
        warning: '#f59e0b',
        background: 'var(--color-background)',
        surface: 'rgba(255,255,255,0.05)',
        surfaceAlt: 'rgba(255,255,255,0.08)',
        panel: 'rgba(255,255,255,0.06)',
        border: 'rgba(255,255,255,0.12)',
        text: '#e2e8f0',
        'text-secondary': '#94a3b8',
      },
      boxShadow: {
        glow: '0 0 30px rgba(0, 0, 0, 0.3)',
        'card-glow': '0 20px 80px rgba(79, 70, 229, 0.16)',
        hover: '0 25px 60px rgba(79, 70, 229, 0.22)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
