import { motion } from 'framer-motion'

export default function TileShell({ title, icon, children, className = '', locked = false, winner = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className={`glass rounded-2xl overflow-hidden tile-hover relative ${winner ? 'animate-pulse-gold glow-gold' : ''}`}
    >
      {/* Top accent bar */}
      <div className={`h-1 w-full ${
        winner
          ? 'bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-400'
          : 'bg-gradient-to-r from-green-700 via-green-500 to-green-700'
      }`} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <h2 className={`font-display tracking-wider text-sm uppercase ${winner ? 'winner-shimmer' : 'text-accent'}`}>
            {title}
          </h2>
        </div>
        {locked && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.6 }}
            className="flex items-center gap-1 bg-yellow-400/20 border border-yellow-400/40 rounded-full px-2 py-0.5"
          >
            <span className="text-xs">🔒</span>
            <span className="text-yellow-500 dark:text-yellow-400 text-xs font-semibold tracking-wide">DECIDED</span>
          </motion.div>
        )}
      </div>

      <div className={`px-4 pb-4 ${className}`}>{children}</div>

      {/* Winner shimmer sweep */}
      {winner && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-yellow-400/10 to-transparent skew-x-12"
          />
        </div>
      )}
    </motion.div>
  )
}
