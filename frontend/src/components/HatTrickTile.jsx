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

const GOAL_COLOR = {
  3: 'text-yellow-400',
  2: 'text-orange-400',
  1: 'text-white/70',
}

const GOAL_BAR_COLOR = {
  3: 'bg-yellow-400',
  2: 'bg-orange-400',
  1: 'bg-white/30',
}

export default function HatTrickTile({ winner, race = [] }) {
  const hasWinner = !!winner

  return (
    <TileShell title="Hat-Trick Race" icon="🎩" locked={hasWinner} winner={hasWinner}>
      {hasWinner && <Confetti />}

      <div className="relative z-10 space-y-3">
        {/* Winner banner — locked at top */}
        <AnimatePresence>
          {hasWinner && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-yellow-400/40 bg-yellow-400/10 p-3 text-center"
            >
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 2.2 }}
                className="text-3xl mb-1"
              >
                🏆
              </motion.div>
              {winner.crest && (
                <img src={winner.crest} alt={winner.team} className="w-10 h-10 object-contain mx-auto mb-1" />
              )}
              <p className="shimmer-text font-display text-xl tracking-widest">{winner.player}</p>
              <p className="text-yellow-400/70 text-xs mt-0.5">{winner.team}</p>
              <p className="text-white/30 text-xs mt-1">
                {winner.home} vs {winner.away} · {winner.matchDate ? format(parseISO(winner.matchDate), 'd MMM') : ''}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 bg-yellow-400/10 border border-yellow-400/30 rounded-full px-3 py-1">
                <span className="text-yellow-400 text-xs font-bold">🔒 FIRST HAT-TRICK — DECIDED</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Race list */}
        {race.length === 0 ? (
          <div className="text-center py-3">
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              className="text-4xl mb-2"
            >
              🎩
            </motion.div>
            <p className="text-white/40 text-sm">No goals scored yet</p>
            <p className="text-white/20 text-xs mt-1">Who will score a hat-trick first?</p>
          </div>
        ) : (
          <>
            {!hasWinner && (
              <p className="text-white/30 text-xs uppercase tracking-wider mb-1">Most goals in a single match</p>
            )}
            <div className="space-y-2">
              {race.map((entry, i) => {
                const isHatTrick = entry.goals >= 3
                const barWidth = Math.min(100, (entry.goals / 3) * 100)
                return (
                  <motion.div
                    key={`${entry.player}-${entry.matchDate}`}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className={`rounded-lg p-2.5 border transition-all
                      ${isHatTrick
                        ? 'bg-yellow-400/10 border-yellow-400/30'
                        : 'bg-white/3 border-white/5'}`}
                  >
                    <div className="flex items-center gap-2.5">
                      {entry.crest ? (
                        <img src={entry.crest} alt={entry.team} className="w-7 h-7 object-contain flex-shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-white/10 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-sm font-semibold truncate ${isHatTrick ? 'text-yellow-400' : 'text-white'}`}>
                            {entry.player}
                          </p>
                          {isHatTrick && <span className="text-xs">🎩</span>}
                        </div>
                        <p className="text-xs text-white/35 truncate">{entry.team} · {entry.home} vs {entry.away}</p>
                        {/* Progress bar toward hat-trick */}
                        <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${GOAL_BAR_COLOR[Math.min(entry.goals, 3)]}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${barWidth}%` }}
                            transition={{ delay: i * 0.06 + 0.2, duration: 0.6, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className={`font-display text-2xl ${GOAL_COLOR[Math.min(entry.goals, 3)]}`}>
                          {entry.goals}
                        </span>
                        <p className="text-white/30 text-xs">goal{entry.goals !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
            <p className="text-white/20 text-xs text-center pt-1">
              Progress bar shows distance to hat-trick (3 goals)
            </p>
          </>
        )}
      </div>
    </TileShell>
  )
}
