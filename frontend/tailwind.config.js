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
        heading: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        observatory: {
          bg: 'var(--bg)',
          surface: 'var(--glass-bg)',
          'surface-hover': 'var(--glass-hover-bg)',
          border: 'var(--glass-border)',
          'border-hover': 'var(--glass-hover-border)',
        },
        // Cyan accent
        cyan: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
        // Violet secondary
        violet: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        // Status colors (with glow intent)
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
        // Text hierarchy (adapts to theme via CSS vars)
        'text-primary': 'var(--text-1)',
        'text-secondary': 'var(--text-2)',
        'text-muted': 'var(--text-3)',
        'text-dim': 'var(--text-4)',
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(6,182,212,0.15), 0 0 60px rgba(6,182,212,0.05)',
        'glow-cyan-lg': '0 0 30px rgba(6,182,212,0.25), 0 0 80px rgba(6,182,212,0.08)',
        'glow-emerald': '0 0 16px rgba(16,185,129,0.2)',
        'glow-rose': '0 0 16px rgba(244,63,94,0.2)',
        'glow-violet': '0 0 16px rgba(139,92,246,0.2)',
        'glow-amber': '0 0 16px rgba(245,158,11,0.2)',
        'inner-light': 'inset 0 1px 0 0 rgba(255,255,255,0.05)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 8px rgba(6,182,212,0.4)' },
          '50%': { opacity: '0.6', boxShadow: '0 0 16px rgba(6,182,212,0.6)' },
        },
        'ring-fill': {
          '0%': { '--ring-progress': '0deg' },
          '100%': { '--ring-progress': 'var(--ring-target)' },
        },
        'slide-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
        'fade-in': 'fade-in 0.3s ease-out both',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'ring-fill': 'ring-fill 1.2s ease-out both',
        'slide-in-left': 'slide-in-left 0.3s ease-out both',
      },
      backgroundImage: {
        'dot-grid': 'radial-gradient(circle, rgba(148,163,184,0.08) 1px, transparent 1px)',
        'gradient-radial': 'radial-gradient(ellipse at top, var(--tw-gradient-stops))',
      },
      backgroundSize: {
        'dot-grid': '24px 24px',
      },
    },
  },
  plugins: [],
}
