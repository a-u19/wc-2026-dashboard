import TileShell from './TileShell'
import { motion } from 'framer-motion'

const MEDAL_LABEL = ['🥇', '🥈', '🥉']

export default function FastestGoalsTile({ data = [] }) {
  const top3 = data.slice(0, 3)

  return (
    <TileShell title="Fastest Goals" icon="⚡">
      {top3.length === 0 ? (
        <p className="text-white/30 text-sm text-center py-4">No goal data yet</p>
      ) : (
        top3.map((g, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.09 }}
            className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0"
          >
            <span className="text-lg w-7 text-center flex-shrink-0">{MEDAL_LABEL[i]}</span>
            {g.crest ? (
              <img src={g.crest} alt={g.team} className="w-7 h-7 object-contain flex-shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-white/10 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{g.player}</p>
              <p className="text-xs text-white/40 truncate">{g.team} · {g.home} vs {g.away}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="flex items-baseline gap-0.5">
                <span className={`font-display text-2xl tracking-wide ${i === 0 ? 'text-yellow-400' : 'text-white/80'}`}>
                  {g.minute}
                </span>
                <span className="text-white/40 text-xs">′</span>
              </div>
            </div>
          </motion.div>
        ))
      )}
    </TileShell>
  )
}
