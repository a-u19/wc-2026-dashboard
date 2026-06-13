import { motion } from 'framer-motion'
import { format } from 'date-fns'

export default function Header({ lastUpdated, onRefresh, loading, theme, onToggleTheme }) {
  const isDark = theme === 'dark'

  return (
    <header className="relative overflow-hidden border-b border-[var(--divider)]"
      style={{ background: 'var(--header-bg)', backdropFilter: 'blur(16px)' }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-64 h-24 bg-green-500/5 rounded-full blur-3xl" />
        <div className="absolute top-0 right-1/4 w-48 h-16 bg-yellow-400/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <motion.span
            animate={{ rotate: [0, 6, -6, 0] }}
            transition={{ repeat: Infinity, duration: 4 }}
            className="text-4xl"
          >
            🏆
          </motion.span>
          <div>
            <h1 className="font-display text-3xl sm:text-4xl tracking-widest shimmer-text leading-none">
              WORLD CUP 2026
            </h1>
            <p className="text-tx-3 text-xs tracking-widest uppercase mt-0.5">USA · Canada · Mexico</p>
          </div>
        </motion.div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <p className="text-tx-3 text-xs hidden sm:block">
              Updated {format(lastUpdated, 'HH:mm:ss')}
            </p>
          )}

          {/* Theme toggle */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={onToggleTheme}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex items-center gap-1.5 bg-surface border border-[var(--card-border)] hover:border-accent
              text-tx-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
          >
            <motion.span
              key={isDark ? 'moon' : 'sun'}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 0.25 }}
            >
              {isDark ? '☀️' : '🌙'}
            </motion.span>
            <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
          </motion.button>

          {/* Refresh */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700
              text-white text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-lg
              transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            <motion.span animate={loading ? { rotate: 360 } : {}} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}>
              ↻
            </motion.span>
            <span className="hidden sm:inline">{loading ? 'Refreshing…' : 'Refresh'}</span>
          </motion.button>
        </div>
      </div>
    </header>
  )
}
