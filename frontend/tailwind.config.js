/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic tokens backed by CSS variables — change with theme
        tx: {
          1: 'var(--tx1)',
          2: 'var(--tx2)',
          3: 'var(--tx3)',
        },
        card: 'var(--card-bg)',
        'card-border': 'var(--card-border)',
        'card-hover': 'var(--card-hover)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        divider: 'var(--divider)',
        accent: 'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
        'page-bg': 'var(--page-bg)',
        pitch: {
          950: '#020b06',
          900: '#041408',
          800: '#071f0d',
          700: '#0a2e12',
        },
        gold: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        tile: '0 2px 12px var(--tile-shadow)',
        'tile-hover': '0 8px 30px var(--tile-shadow-hover)',
      },
      animation: {
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        float: 'float 3s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(251,191,36,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(251,191,36,0.8), 0 0 80px rgba(251,191,36,0.3)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
}
