import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import TileShell from './TileShell'
import broadcastSchedule from '../data/broadcastSchedule.json'

// Normalise team names to handle API vs schedule name differences
const ALIASES = {
  'united states': 'usa',
  'us': 'usa',
  "cote d ivoire": 'ivory coast',
  'republic of ireland': 'ireland',
  'democratic republic of congo': 'dr congo',
  'democratic republic of the congo': 'dr congo',
  'congo dr': 'dr congo',
  'bosnia & herzegovina': 'bosnia-herzegovina',
  'bosnia and herzegovina': 'bosnia-herzegovina',
  'czechia': 'czech republic',
}
function normTeam(t) {
  if (!t) return ''
  // Strip diacritics (ç→c, é→e, etc.) before removing non-alphanum
  const s = t.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
  return ALIASES[s] ?? s
}

// Build lookup by sorted team pair — each group-stage pair plays once so no date needed
const broadcastLookup = new Map()
broadcastSchedule.forEach(entry => {
  const key = [normTeam(entry.home), normTeam(entry.away)].sort().join('|')
  broadcastLookup.set(key, entry)
})

function getBroadcast(match) {
  const home = normTeam(match.homeTeam?.name || match.homeTeam?.shortName)
  const away = normTeam(match.awayTeam?.name || match.awayTeam?.shortName)
  if (!home || !away) return null
  return broadcastLookup.get([home, away].sort().join('|')) ?? null
}

const STATUS_BADGE = {
  FINISHED:  { label: 'FT',       cls: 'bg-surface text-tx-2' },
  IN_PLAY:   { label: 'LIVE',     cls: 'bg-red-500 text-white animate-pulse' },
  PAUSED:    { label: 'HT',       cls: 'bg-orange-400 text-white' },
  SCHEDULED: { label: 'UPCOMING', cls: 'bg-accent-soft text-accent' },
  TIMED:     { label: 'UPCOMING', cls: 'bg-accent-soft text-accent' },
}

// ── Team combobox ──────────────────────────────────────────────────────────────
function TeamCombobox({ teams, value, onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(-1)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const wrapRef = useRef(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return teams
    return teams.filter(t => t.toLowerCase().includes(q))
  }, [teams, query])

  // Close on outside click
  useEffect(() => {
    function handle(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
        setCursor(-1)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Scroll highlighted item into view
  useEffect(() => {
    if (cursor >= 0 && listRef.current) {
      const item = listRef.current.children[cursor]
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [cursor])

  function select(team) {
    onChange(team)
    setOpen(false)
    setQuery('')
    setCursor(-1)
    inputRef.current?.blur()
  }

  function handleKey(e) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true)
      return
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter' && cursor >= 0) select(filtered[cursor])
    if (e.key === 'Escape') { setOpen(false); setQuery(''); setCursor(-1) }
  }

  const displayValue = open ? query : (value === 'All' ? '' : value)
  const placeholder = value === 'All' ? 'Filter by team…' : value

  return (
    <div ref={wrapRef} className="relative w-full sm:w-52">
      <div className={`flex items-center gap-1.5 bg-surface border rounded-lg px-2.5 py-1.5 transition-all
        ${open ? 'border-accent ring-1 ring-accent/20' : 'border-[var(--card-border)] hover:border-accent/50'}`}>
        {/* Search icon */}
        <svg className="w-3.5 h-3.5 text-tx-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>

        <input
          ref={inputRef}
          value={displayValue}
          placeholder={placeholder}
          onChange={e => { setQuery(e.target.value); setOpen(true); setCursor(-1) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          className="flex-1 bg-transparent text-tx-1 text-xs font-medium outline-none placeholder:text-tx-3 min-w-0"
        />

        {/* Clear / crest of selected team */}
        {value !== 'All' && !open && (
          <button
            onClick={() => { onChange('All'); setQuery('') }}
            className="text-tx-3 hover:text-tx-1 transition-colors text-sm leading-none flex-shrink-0"
            title="Clear filter"
          >
            ✕
          </button>
        )}
        {open && query && (
          <button
            onClick={() => { setQuery(''); setCursor(-1) }}
            className="text-tx-3 hover:text-tx-1 transition-colors text-sm leading-none flex-shrink-0"
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.ul
            ref={listRef}
            initial={{ opacity: 0, y: -4, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -4, scaleY: 0.95 }}
            transition={{ duration: 0.12 }}
            style={{ transformOrigin: 'top', background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
            className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto rounded-xl border shadow-lg py-1"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-tx-3 text-center">No teams match "{query}"</li>
            ) : (
              filtered.map((team, i) => {
                const isSelected = team === value
                const isActive = i === cursor
                return (
                  <li
                    key={team}
                    onMouseDown={() => select(team)}
                    onMouseEnter={() => setCursor(i)}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors
                      ${isActive ? 'bg-accent-soft text-accent' : ''}
                      ${isSelected && !isActive ? 'text-accent' : 'text-tx-1'}
                      ${!isActive && !isSelected ? 'hover:bg-[var(--card-hover)]' : ''}`}
                  >
                    {isSelected && <span className="text-accent">✓</span>}
                    {!isSelected && <span className="w-3.5" />}
                    {team}
                  </li>
                )
              })
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

const BROADCASTER_STYLE = {
  BBC: { label: 'BBC', cls: 'bg-[#000] text-white' },
  ITV: { label: 'ITV', cls: 'bg-[#f4c400] text-black' },
}

// ── Match card ─────────────────────────────────────────────────────────────────
function MatchCard({ m, index }) {
  const date = parseISO(m.utcDate)
  const badge = STATUS_BADGE[m.status] || { label: m.status, cls: 'bg-surface text-tx-2' }
  const isLive = m.status === 'IN_PLAY' || m.status === 'PAUSED'
  const homeScore = m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? null
  const awayScore = m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? null
  const hasScore = homeScore !== null
  const broadcast = getBroadcast(m)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      whileHover={{ scale: 1.01, y: -1 }}
      className={`rounded-xl p-3 mb-2 last:mb-0 border transition-all duration-150 cursor-default
        ${isLive
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
          : 'bg-[var(--card-hover)] border-[var(--card-border)] hover:border-[var(--accent-soft)] hover:shadow-md'}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-tx-3 uppercase tracking-wider truncate max-w-[55%]">
          {m.stage?.replace(/_/g, ' ')}{m.group ? ` · ${m.group}` : ''}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {broadcast && BROADCASTER_STYLE[broadcast.broadcaster] && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${BROADCASTER_STYLE[broadcast.broadcaster].cls}`}>
              {BROADCASTER_STYLE[broadcast.broadcaster].label}
            </span>
          )}
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {m.homeTeam?.crest && <img src={m.homeTeam.crest} alt="" className="w-6 h-6 object-contain flex-shrink-0" />}
          <span className="text-sm font-semibold text-tx-1 truncate">{m.homeTeam?.shortName || m.homeTeam?.name}</span>
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
          <span className="text-sm font-semibold text-tx-1 truncate text-right">{m.awayTeam?.shortName || m.awayTeam?.name}</span>
          {m.awayTeam?.crest && <img src={m.awayTeam.crest} alt="" className="w-6 h-6 object-contain flex-shrink-0" />}
        </div>
      </div>

      {!hasScore && (
        <p className="text-xs text-tx-3 text-center mt-1">{format(date, 'EEE d MMM yyyy')}</p>
      )}
    </motion.div>
  )
}

// ── Main tile ──────────────────────────────────────────────────────────────────
export default function MatchesTile({ matches = [] }) {
  const [tab, setTab] = useState('upcoming')
  const [selectedTeam, setSelectedTeam] = useState('All')

  const teams = useMemo(() => {
    const set = new Set()
    matches.forEach(m => {
      const h = m.homeTeam?.shortName || m.homeTeam?.name
      const a = m.awayTeam?.shortName || m.awayTeam?.name
      const isPlaceholder = t => !t || /^(TBD|3rd Group|Winner|Loser|Match \d)/i.test(t)
      if (h && !isPlaceholder(h)) set.add(h)
      if (a && !isPlaceholder(a)) set.add(a)
    })
    return ['All', ...Array.from(set).sort()]
  }, [matches])

  const filterByTeam = list =>
    selectedTeam === 'All'
      ? list
      : list.filter(m =>
          (m.homeTeam?.shortName || m.homeTeam?.name) === selectedTeam ||
          (m.awayTeam?.shortName || m.awayTeam?.name) === selectedTeam
        )

  const { upcoming, past, live } = useMemo(() => {
    const live     = matches.filter(m => m.status === 'IN_PLAY' || m.status === 'PAUSED')
    const upcoming = matches.filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED')
    const past     = matches.filter(m => m.status === 'FINISHED').reverse()
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

      {/* Controls: tabs + combobox */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
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
              {t === 'upcoming'
                ? `Upcoming (${filterByTeam(upcoming).length})`
                : `Results (${filterByTeam(past).length})`}
            </button>
          ))}
        </div>

        <TeamCombobox teams={teams} value={selectedTeam} onChange={setSelectedTeam} />
      </div>

      {/* Match list */}
      <div className="overflow-y-auto max-h-[440px] pr-1">
        <AnimatePresence mode="wait">
          {displayed.length === 0 ? (
            <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center text-tx-3 text-sm py-10">
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
