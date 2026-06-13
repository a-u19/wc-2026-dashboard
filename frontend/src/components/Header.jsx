import { motion } from 'framer-motion'
import { format } from 'date-fns'

export default function Header({ lastUpdated, onRefresh, loading }) {
  return (
    <header className="relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-64 h-32 bg-green-600/10 rounded-full blur-3xl" />
        <div className="absolute top-0 right-1/4 w-64 h-32 bg-yellow-400/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Title */}
        <div className="text-center sm:text-left">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 justify-center sm:justify-start"
          >
            <motion.span
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="text-4xl"
            >
              🏆
            </motion.span>
            <div>
              <h1 className="font-display text-3xl sm:text-4xl tracking-widest shimmer-text leading-none">
                WORLD CUP 2026
              </h1>
              <p className="text-green-400/60 text-xs tracking-widest uppercase mt-0.5">
                USA · Canada · Mexico
              </p>
            </div>
          </motion.div>
        </div>

        {/* Right side */}
        <div className="flex flex-col items-end gap-1">
          {lastUpdated && (
            <p className="text-white/30 text-xs">
              Updated {format(lastUpdated, 'HH:mm:ss')}
            </p>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 bg-green-700/30 hover:bg-green-700/50 border border-green-600/30
              text-green-400 text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-lg
              transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <motion.span animate={loading ? { rotate: 360 } : {}} transition={{ duration: 1, repeat: Infinity }}>
              ↻
            </motion.span>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-green-700/50 to-transparent" />
    </header>
  )
}
