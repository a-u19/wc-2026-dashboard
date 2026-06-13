import { motion } from 'framer-motion'
import TileShell from './TileShell'

const MEDAL_LABEL = ['🥇', '🥈', '🥉']

export default function FastestGoalsTile({ data = [] }) {
  const top3 = data.slice(0, 3)

  return (
    <TileShell title="Fastest Goals" icon="⚡">
      {top3.length === 0 ? (
        <div className="text-center py-5">
          <p className="text-2xl mb-1">⚡</p>
          <p className="text-tx-2 text-sm font-medium">Not available</p>
          <p className="text-tx-3 text-xs mt-1">The data source doesn't provide goal minute data</p>
        </div>
      ) : (
        top3.map((g, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.09 }}
            whileHover={{ x: 5 }}
            className="flex items-center gap-3 py-2.5 px-1 rounded-lg border-b border-divider last:border-0
              hover:bg-[var(--card-hover)] transition-colors cursor-default group"
          >
            <span className="text-lg w-7 text-center flex-shrink-0">{MEDAL_LABEL[i]}</span>
            {g.crest ? (
              <motion.img
                src={g.crest} alt={g.team}
                className="w-7 h-7 object-contain flex-shrink-0"
                whileHover={{ scale: 1.2 }}
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-surface flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-tx-1 truncate group-hover:text-accent transition-colors">{g.player}</p>
              <p className="text-xs text-tx-3 truncate">{g.team} · {g.home} vs {g.away}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <motion.div className="flex items-baseline gap-0.5" whileHover={{ scale: 1.1 }}>
                <span className={`font-display text-2xl tracking-wide ${i === 0 ? 'text-yellow-500 dark:text-yellow-400' : 'text-tx-1'}`}>
                  {g.minute}
                </span>
                <span className="text-tx-3 text-xs">′</span>
              </motion.div>
            </div>
          </motion.div>
        ))
      )}
    </TileShell>
  )
}
