import { motion } from 'framer-motion'

const MEDAL = ['rank-1', 'rank-2', 'rank-3']
const MEDAL_LABEL = ['🥇', '🥈', '🥉']

export default function TeamRow({ rank, name, crest, value, valueLabel, sub, delay = 0 }) {
  const isTop = rank <= 3
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.35 }}
      whileHover={{ x: 5 }}
      className="flex items-center gap-3 py-2.5 px-1 rounded-lg border-b border-divider last:border-0
        hover:bg-[var(--card-hover)] transition-colors cursor-default group"
    >
      {/* Rank badge */}
      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
        ${isTop ? `${MEDAL[rank - 1]} text-white` : 'bg-surface text-tx-2'}`}>
        {isTop ? MEDAL_LABEL[rank - 1] : rank}
      </div>

      {/* Crest */}
      {crest ? (
        <motion.img
          src={crest} alt={name}
          className="w-7 h-7 object-contain flex-shrink-0"
          whileHover={{ scale: 1.2, rotate: [0, -5, 5, 0] }}
          transition={{ duration: 0.3 }}
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-surface flex items-center justify-center text-sm flex-shrink-0">🏳️</div>
      )}

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-tx-1 truncate group-hover:text-accent transition-colors">{name}</p>
        {sub && <p className="text-xs text-tx-3">{sub}</p>}
      </div>

      {/* Value */}
      <div className="text-right flex-shrink-0">
        <motion.span
          whileHover={{ scale: 1.15 }}
          className={`font-display text-xl tracking-wide inline-block ${rank === 1 ? 'text-yellow-500 dark:text-yellow-400' : 'text-tx-1'}`}
        >
          {value}
        </motion.span>
        {valueLabel && <p className="text-xs text-tx-3">{valueLabel}</p>}
      </div>
    </motion.div>
  )
}
