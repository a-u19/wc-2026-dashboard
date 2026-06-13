import { motion } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import TileShell from './TileShell'

const MEDAL_LABEL = ['🥇', '🥈', '🥉']
const MEDAL_CLS   = ['rank-1', 'rank-2', 'rank-3']

export default function MostGoalsSingleGameTile({ data = [] }) {
  const top3 = data.slice(0, 3)

  return (
    <TileShell title="Most Goals in a Game" icon="🔥">
      {top3.length === 0 ? (
        <p className="text-tx-3 text-sm text-center py-4">No matches played yet</p>
      ) : (
        top3.map((g, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ x: 5 }}
            className="flex items-center gap-2 py-2.5 px-1 rounded-lg border-b border-divider last:border-0
              hover:bg-[var(--card-hover)] transition-colors cursor-default group"
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${MEDAL_CLS[i]}`}>
              {MEDAL_LABEL[i]}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                {g.homeCrest && <img src={g.homeCrest} alt="" className="w-5 h-5 object-contain" />}
                <span className="text-xs font-semibold text-tx-1 truncate">{g.home}</span>
                <motion.span
                  whileHover={{ scale: 1.1 }}
                  className={`font-display text-base tracking-wider px-2 py-0.5 rounded bg-surface-2 inline-block
                    ${i === 0 ? 'text-yellow-500 dark:text-yellow-400' : 'text-tx-1'}`}
                >
                  {g.homeScore}–{g.awayScore}
                </motion.span>
                <span className="text-xs font-semibold text-tx-1 truncate">{g.away}</span>
                {g.awayCrest && <img src={g.awayCrest} alt="" className="w-5 h-5 object-contain" />}
              </div>
              <p className="text-xs text-tx-3 mt-0.5">{format(parseISO(g.date), 'd MMM yyyy')}</p>
            </div>

            <div className="flex-shrink-0 text-right">
              <motion.span
                whileHover={{ scale: 1.15 }}
                className={`font-display text-2xl inline-block ${i === 0 ? 'text-yellow-500 dark:text-yellow-400' : 'text-tx-1'}`}
              >
                {g.total}
              </motion.span>
              <p className="text-xs text-tx-3">goals</p>
            </div>
          </motion.div>
        ))
      )}
    </TileShell>
  )
}
