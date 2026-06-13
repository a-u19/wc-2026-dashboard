import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO, isPast } from 'date-fns'
import TileShell from './TileShell'

const STATUS_BADGE = {
  FINISHED: { label: 'FT', cls: 'bg-white/10 text-white/60' },
  IN_PLAY: { label: 'LIVE', cls: 'bg-red-500 text-white animate-pulse' },
  PAUSED: { label: 'HT', cls: 'bg-orange-400 text-white' },
  SCHEDULED: { label: 'UPCOMING', cls: 'bg-green-700/60 text-green-300' },
  TIMED: { label: 'UPCOMING', cls: 'bg-green-700/60 text-green-300' },
}

function MatchCard({ m, index }) {
  const date = parseISO(m.utcDate)
  const badge = STATUS_BADGE[m.status] || { label: m.status, cls: 'bg-white/10 text-white/60' }
  const isLive = m.status === 'IN_PLAY' || m.status === 'PAUSED'
  const homeScore = m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? null
  const awayScore = m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? null
  const hasScore = homeScore !== null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`rounded-xl p-3 mb-2 last:mb-0 border transition-all duration-200
        ${isLive
          ? 'bg-red-900/20 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
          : 'bg-white/3 border-white/5 hover:border-white/10'}`}
    >
      {/* Stage + Date row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-white/30 uppercase tracking-wider truncate max-w-[55%]">
          {m.stage?.replace(/_/g, ' ')} {m.group ? `· ${m.group}` : ''}
        </span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
      </div>

      {/* Teams + Score */}
      <div className="flex items-center gap-2">
        {/* Home */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {m.homeTeam?.crest && (
            <img src={m.homeTeam.crest} alt="" className="w-6 h-6 object-contain flex-shrink-0" />
          )}
          <span className="text-sm font-semibold text-white truncate">
            {m.homeTeam?.shortName || m.homeTeam?.name}
          </span>
        </div>

        {/* Score */}
        <div className={`flex-shrink-0 text-center px-3 py-1 rounded-lg min-w-[60px]
          ${hasScore ? 'bg-white/10' : 'bg-white/5'}`}>
          {hasScore ? (
            <span className={`font-display text-lg tracking-widest ${isLive ? 'text-red-400' : 'text-white'}`}>
              {homeScore} – {awayScore}
            </span>
          ) : (
            <span className="text-white/40 text-xs">{format(date, 'HH:mm')}</span>
          )}
        </div>

        {/* Away */}
        <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
          <span className="text-sm font-semibold text-white truncate text-right">
            {m.awayTeam?.shortName || m.awayTeam?.name}
          </span>
          {m.awayTeam?.crest && (
            <img src={m.awayTeam.crest} alt="" className="w-6 h-6 object-contain flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Date */}
      {!hasScore && (
        <p className="text-xs text-white/30 text-center mt-1">{format(date, 'EEE d MMM yyyy')}</p>
      )}
    </motion.div>
  )
}

export default function MatchesTile({ matches = [] }) {
  const [tab, setTab] = useState('upcoming')

  const { upcoming, past, live } = useMemo(() => {
    const live = matches.filter(m => m.status === 'IN_PLAY' || m.status === 'PAUSED')
    const upcoming = matches
      .filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED')
      .slice(0, 12)
    const past = matches
      .filter(m => m.status === 'FINISHED')
      .slice(-12)
      .reverse()
    return { live, upcoming, past }
  }, [matches])

  const displayed = tab === 'upcoming' ? upcoming : past

  return (
    <TileShell title="Matches" icon="⚽">
      {/* Live banner */}
      <AnimatePresence>
        {live.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-3"
          >
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-2 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="pulse-ring absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <span className="text-red-400 text-xs font-bold">{live.length} MATCH{live.length > 1 ? 'ES' : ''} LIVE NOW</span>
            </div>
            {live.map((m, i) => <MatchCard key={m.id} m={m} index={i} />)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-2 mb-3">
        {['upcoming', 'results'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all
              ${tab === t ? 'bg-green-600 text-white' : 'bg-white/5 text-white/40 hover:text-white/70'}`}
          >
            {t === 'upcoming' ? `Upcoming (${upcoming.length})` : `Results (${past.length})`}
          </button>
        ))}
      </div>

      {/* Match list */}
      <div className="overflow-y-auto max-h-[420px] pr-1 space-y-0">
        {displayed.length === 0 ? (
          <p className="text-center text-white/30 text-sm py-8">No matches yet</p>
        ) : (
          displayed.map((m, i) => <MatchCard key={m.id} m={m} index={i} />)
        )}
      </div>
    </TileShell>
  )
}
