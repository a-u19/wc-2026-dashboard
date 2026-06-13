import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import TileShell from './TileShell'

function Confetti() {
  const colors = ['#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#fff']
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-sm"
          style={{ left: `${4 + (i * 4.8) % 92}%`, top: '-8px', backgroundColor: colors[i % colors.length] }}
          animate={{ y: ['0px', '350px'], rotate: [0, 540 * (i % 2 ? 1 : -1)], opacity: [1, 1, 0] }}
          transition={{ duration: 2.5 + (i % 3) * 0.5, delay: (i * 0.18) % 1.8, repeat: Infinity, ease: 'linear' }}
        />
      ))}
    </div>
  )
}

const BAR_COLOR = { 3: 'bg-yellow-400', 2: 'bg-orange-400', 1: 'bg-green-500' }
const TEXT_COLOR = { 3: 'text-yellow-500 dark:text-yellow-400', 2: 'text-orange-500 dark:text-orange-400', 1: 'text-tx-1' }

export default function HatTrickTile({ winner, race = [] }) {
  const hasWinner = !!winner

  return (
    <TileShell title="Hat-Trick Race" icon="🎩" locked={hasWinner} winner={hasWinner}>
      {hasWinner && <Confetti />}

      <div className="relative z-10 space-y-3">
        {/* Winner card — locked at top */}
        <AnimatePresence>
          {hasWinner && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-yellow-400/40 bg-yellow-50 dark:bg-yellow-400/10 p-3 text-center"
            >
              <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 2.2 }} className="text-3xl mb-1">
                🏆
              </motion.div>
              {winner.crest && (
                <img src={winner.crest} alt={winner.team} className="w-10 h-10 object-contain mx-auto mb-1" />
              )}
              <p className="winner-shimmer font-display text-xl tracking-widest">{winner.player}</p>
              <p className="text-yellow-600 dark:text-yellow-400/70 text-xs mt-0.5">{winner.team}</p>
              <p className="text-tx-3 text-xs mt-1">
                {winner.home} vs {winner.away}
                {winner.matchDate ? ` · ${format(parseISO(winner.matchDate), 'd MMM')}` : ''}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 bg-yellow-400/10 border border-yellow-400/30 rounded-full px-3 py-1">
                <span className="text-yellow-600 dark:text-yellow-400 text-xs font-bold">🔒 FIRST HAT-TRICK — DECIDED</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Race list */}
        {race.length === 0 ? (
          <div className="text-center py-3">
            <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2.5 }} className="text-4xl mb-2">
              🎩
            </motion.div>
            <p className="text-tx-3 text-sm">No goals scored yet</p>
            <p className="text-tx-3/60 text-xs mt-1">Who will score a hat-trick first?</p>
          </div>
        ) : (
          <>
            {!hasWinner && (
              <p className="text-tx-3 text-xs uppercase tracking-wider">Most goals in a single match</p>
            )}
            <div className="space-y-2">
              {race.map((entry, i) => {
                const tier = Math.min(entry.goals, 3)
                const barWidth = Math.min(100, (entry.goals / 3) * 100)
                const isHT = entry.goals >= 3
                return (
                  <motion.div
                    key={`${entry.player}-${entry.matchDate}`}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.055 }}
                    whileHover={{ x: 4 }}
                    className={`rounded-lg p-2.5 border transition-all cursor-default
                      ${isHT
                        ? 'bg-yellow-50 dark:bg-yellow-400/10 border-yellow-300 dark:border-yellow-400/30'
                        : 'bg-[var(--card-hover)] border-[var(--card-border)] hover:border-[var(--accent-soft)]'}`}
                  >
                    <div className="flex items-center gap-2.5">
                      {entry.crest ? (
                        <motion.img
                          src={entry.crest} alt={entry.team}
                          className="w-7 h-7 object-contain flex-shrink-0"
                          whileHover={{ scale: 1.2 }}
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-surface flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-sm font-semibold truncate ${isHT ? 'text-yellow-600 dark:text-yellow-400' : 'text-tx-1'}`}>
                            {entry.player}
                          </p>
                          {isHT && <span className="text-xs">🎩</span>}
                        </div>
                        <p className="text-xs text-tx-3 truncate">{entry.team} · {entry.home} vs {entry.away}</p>
                        {/* Progress bar */}
                        <div className="mt-1.5 h-1 rounded-full bg-[var(--divider)] overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${BAR_COLOR[tier]}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${barWidth}%` }}
                            transition={{ delay: i * 0.055 + 0.2, duration: 0.6, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                      <motion.div whileHover={{ scale: 1.1 }} className="flex-shrink-0 text-right">
                        <span className={`font-display text-2xl ${TEXT_COLOR[tier]}`}>{entry.goals}</span>
                        <p className="text-tx-3 text-xs">goal{entry.goals !== 1 ? 's' : ''}</p>
                      </motion.div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
            <p className="text-tx-3 text-xs text-center pt-1">Bar shows progress toward a hat-trick (3 goals)</p>
          </>
        )}
      </div>
    </TileShell>
  )
}
