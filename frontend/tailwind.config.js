/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Sora"', 'system-ui', 'sans-serif'],
        sans: ['"Manrope"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        'text-primary': 'var(--text-1)',
        'text-secondary': 'var(--text-2)',
        'text-muted': 'var(--text-3)',
        'text-dim': 'var(--text-4)',
        indigo: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        cyan: {
          400: '#42d6c4',
          500: '#00a896',
          600: '#008a7c',
        },
        violet: {
          400: '#ffb49d',
          500: '#ff9b7b',
          600: '#ff7a59',
        },
        emerald: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        rose: {
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
      },
      boxShadow: {
        'glow-cyan': '0 0 22px rgba(0,168,150,0.18)',
        'glow-cyan-lg': '0 0 34px rgba(0,168,150,0.28)',
        'glow-emerald': '0 0 16px rgba(52,199,89,0.2)',
        'glow-rose': '0 0 16px rgba(255,59,48,0.2)',
        'glow-violet': '0 0 18px rgba(255,122,89,0.22)',
        'glow-amber': '0 0 16px rgba(255,159,10,0.2)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.5rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
        'fade-in': 'fade-in 0.3s ease-out both',
        'slide-in': 'slide-in 0.3s ease-out both',
      },
    },
  },
  plugins: [],
}
