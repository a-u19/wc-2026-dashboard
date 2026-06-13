import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import Header from './components/Header'
import MatchesTile from './components/MatchesTile'
import CardsTile from './components/CardsTile'
import LeastGoalsTile from './components/LeastGoalsTile'
import FastestGoalsTile from './components/FastestGoalsTile'
import HatTrickTile from './components/HatTrickTile'
import MostGoalsSingleGameTile from './components/MostGoalsSingleGameTile'
import LoadingScreen from './components/LoadingScreen'
const REFRESH_MS = 90_000
const API = (typeof __API_BASE__ !== 'undefined' && __API_BASE__) ? __API_BASE__ : ''

function ErrorBanner({ message }) {
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-500/30
        rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
        <span className="mt-0.5">⚠️</span>
        <div>
          <p className="font-semibold">API Error</p>
          <p className="text-red-500 dark:text-red-400/70 text-xs mt-0.5">{message}</p>
          <p className="text-red-400/70 text-xs mt-1">
            Check your internet connection — the dashboard fetches live data directly from worldcup26.ir.
          </p>
        </div>
      </div>
    </motion.div>
  )
}

function PitchBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      <div className="absolute inset-0" style={{ background: 'var(--page-bg)', transition: 'background 0.3s ease' }} />
      <div className="absolute inset-0 pitch-lines" />
      <div className="absolute top-0 left-0 w-80 h-80 bg-green-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-green-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
    </div>
  )
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('wc-theme') || 'light')
  const [matches, setMatches] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  // Apply theme class to <html>
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('wc-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light')

  const fetchAll = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true)
    try {
      const [mRes, sRes] = await Promise.all([
        fetch(`${API}/api/matches`),
        fetch(`${API}/api/stats`),
      ])
      if (!mRes.ok) throw new Error(await mRes.text())
      if (!sRes.ok) throw new Error(await sRes.text())
      const [mData, sData] = await Promise.all([mRes.json(), sRes.json()])
      setMatches(mData.matches || [])
      setStats(sData)
      setError(null)
      setLastUpdated(new Date())
    } catch (e) {
      setError(e.message)
    } finally {
      if (showSpinner) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll(true)  // show spinner only on first load
    const id = setInterval(() => fetchAll(false), REFRESH_MS)
    return () => clearInterval(id)
  }, [fetchAll])

  if (loading && !stats && !error) return <LoadingScreen />

  return (
    <div className="relative min-h-screen">
      <PitchBackground />

      <div className="relative z-10">
        <Header
          lastUpdated={lastUpdated}
          onRefresh={() => fetchAll(true)}
          loading={loading}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <main className="max-w-7xl mx-auto px-3 sm:px-4 py-6">
          {error && <ErrorBanner message={error} />}

          {/* Matches — full width */}
          <div className="mb-4">
            <MatchesTile matches={matches} />
          </div>

          {/* Stats grid — 3 columns */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <LeastGoalsTile data={stats.leastGoals} />
              <FastestGoalsTile data={stats.fastestGoals} />
              <HatTrickTile winner={stats.hatTrick} race={stats.hatTrickRace ?? []} />
              <CardsTile data={stats.mostCards} />
              <MostGoalsSingleGameTile data={stats.mostGoalsSingleGame} />
            </div>
          )}

          <p className="text-center text-tx-3 text-xs mt-8 pb-4">
            Data via football-data.org · Refreshes every 90s · FIFA World Cup 2026 🏆
          </p>
        </main>
      </div>
    </div>
  )
}
