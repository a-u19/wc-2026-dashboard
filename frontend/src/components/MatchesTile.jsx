import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import TileShell from './TileShell'

const STATUS_BADGE = {
  FINISHED: { label: 'FT', cls: 'bg-surface text-tx-2' },
  IN_PLAY:  { label: 'LIVE', cls: 'bg-red-500 text-white animate-pulse' },
  PAUSED:   { label: 'HT',   cls: 'bg-orange-400 text-white' },
  SCHEDULED:{ label: 'UPCOMING', cls: 'bg-accent-soft text-accent' },
  TIMED:    { label: 'UPCOMING', cls: 'bg-accent-soft text-accent' },
}

function MatchCard({ m, index }) {
  const date = parseISO(m.utcDate)
  const badge = STATUS_BADGE[m.status] || { label: m.status, cls: 'bg-surface text-tx-2' }
  const isLive = m.status === 'IN_PLAY' || m.status === 'PAUSED'
  const homeScore = m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? null
  const awayScore = m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? null
  const hasScore = homeScore !== null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.035 }}
      whileHover={{ scale: 1.01, y: -1 }}
      className={`rounded-xl p-3 mb-2 last:mb-0 border transition-all duration-150 cursor-default
        ${isLive
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
          : 'bg-[var(--card-hover)] border-[var(--card-border)] hover:border-[var(--accent-soft)] hover:shadow-md'}`}
    >
      {/* Stage row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-tx-3 uppercase tracking-wider truncate max-w-[55%]">
          {m.stage?.replace(/_/g, ' ')}{m.group ? ` · ${m.group}` : ''}
        </span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
      </div>

      {/* Teams + Score */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {m.homeTeam?.crest && <img src={m.homeTeam.crest} alt="" className="w-6 h-6 object-contain flex-shrink-0" />}
          <span className="text-sm font-semibold text-tx-1 truncate">
            {m.homeTeam?.shortName || m.homeTeam?.name}
          </span>
        </div>

        <div className={`flex-shrink-0 text-center px-3 py-1 rounded-lg min-w-[64px] ${hasScore ? 'bg-surface-2' : 'bg-surface'}`}>
          {hasScore ? (
            <span className={`font-display text-lg tracking-widest ${isLive ? 'text-red-500' : 'text-tx-1'}`}>
              {homeScore} – {awayScore}
            </span>
          ) : (
            <span className="text-tx-3 text-xs font-medium">{format(date, 'HH:mm')}</span>
          )}
        </div>

        <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
          <span className="text-sm font-semibold text-tx-1 truncate text-right">
            {m.awayTeam?.shortName || m.awayTeam?.name}
          </span>
          {m.awayTeam?.crest && <img src={m.awayTeam.crest} alt="" className="w-6 h-6 object-contain flex-shrink-0" />}
        </div>
      </div>

      {!hasScore && (
        <p className="text-xs text-tx-3 text-center mt-1">{format(date, 'EEE d MMM yyyy')}</p>
      )}
    </motion.div>
  )
}

export default function MatchesTile({ matches = [] }) {
  const [tab, setTab] = useState('upcoming')
  const [selectedTeam, setSelectedTeam] = useState('All')

  const teams = useMemo(() => {
    const set = new Set()
    matches.forEach(m => {
      const h = m.homeTeam?.shortName || m.homeTeam?.name
      const a = m.awayTeam?.shortName || m.awayTeam?.name
      if (h) set.add(h)
      if (a) set.add(a)
    })
    return ['All', ...Array.from(set).sort()]
  }, [matches])

  const filterByTeam = (list) =>
    selectedTeam === 'All'
      ? list
      : list.filter(m =>
          (m.homeTeam?.shortName || m.homeTeam?.name) === selectedTeam ||
          (m.awayTeam?.shortName || m.awayTeam?.name) === selectedTeam
        )

  const { upcoming, past, live } = useMemo(() => {
    const live = matches.filter(m => m.status === 'IN_PLAY' || m.status === 'PAUSED')
    const upcoming = matches.filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED').slice(0, 20)
    const past = matches.filter(m => m.status === 'FINISHED').slice(-20).reverse()
    return { live, upcoming, past }
  }, [matches])

  const displayed = filterByTeam(tab === 'upcoming' ? upcoming : past)

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
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-2 flex items-center gap-2 mb-2">
              <span className="relative flex h-3 w-3">
                <span className="pulse-ring absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <span className="text-red-600 dark:text-red-400 text-xs font-bold">
                {live.length} MATCH{live.length > 1 ? 'ES' : ''} LIVE NOW
              </span>
            </div>
            {live.map((m, i) => <MatchCard key={m.id} m={m} index={i} />)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls row: tabs + team filter */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        {/* Tabs */}
        <div className="flex gap-1.5 flex-1">
          {['upcoming', 'results'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all
                ${tab === t
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-surface text-tx-2 hover:text-tx-1 hover:bg-[var(--card-hover)]'}`}
            >
              {t === 'upcoming' ? `Upcoming (${filterByTeam(upcoming).length})` : `Results (${filterByTeam(past).length})`}
            </button>
          ))}
        </div>

        {/* Team filter */}
        <div className="relative">
          <select
            value={selectedTeam}
            onChange={e => setSelectedTeam(e.target.value)}
            className="appearance-none w-full sm:w-44 bg-surface border border-[var(--card-border)] text-tx-1 text-xs font-medium
              rounded-lg px-3 py-1.5 pr-7 cursor-pointer outline-none
              hover:border-accent focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
          >
            {teams.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-tx-3 text-xs">▾</span>
        </div>
      </div>

      {/* Match list */}
      <div className="overflow-y-auto max-h-[440px] pr-1">
        <AnimatePresence mode="wait">
          {displayed.length === 0 ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-tx-3 text-sm py-10"
            >
              {selectedTeam === 'All' ? 'No matches yet' : `No matches found for ${selectedTeam}`}
            </motion.p>
          ) : (
            <motion.div key={tab + selectedTeam} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {displayed.map((m, i) => <MatchCard key={m.id} m={m} index={i} />)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TileShell>
  )
}
