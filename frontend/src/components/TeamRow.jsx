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
      className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0"
    >
      {/* Rank badge */}
      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-pitch-950
        ${isTop ? MEDAL[rank - 1] : 'bg-white/10 text-white/50'}`}>
        {isTop ? MEDAL_LABEL[rank - 1] : rank}
      </div>

      {/* Crest / flag */}
      {crest ? (
        <img src={crest} alt={name} className="w-7 h-7 object-contain flex-shrink-0" />
      ) : (
        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-sm flex-shrink-0">🏳️</div>
      )}

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{name}</p>
        {sub && <p className="text-xs text-white/40">{sub}</p>}
      </div>

      {/* Value */}
      <div className="text-right flex-shrink-0">
        <span className={`font-display text-xl tracking-wide ${rank === 1 ? 'text-yellow-400' : 'text-white/80'}`}>
          {value}
        </span>
        {valueLabel && <p className="text-xs text-white/40">{valueLabel}</p>}
      </div>
    </motion.div>
  )
}
