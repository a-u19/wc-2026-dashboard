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
const API = typeof __API_BASE__ !== 'undefined' ? __API_BASE__ : ''

function ErrorBanner({ message }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto px-4 mb-4"
    >
      <div className="bg-red-900/30 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-300 flex items-start gap-2">
        <span>⚠️</span>
        <div>
          <p className="font-semibold">API Error</p>
          <p className="text-red-400/70 text-xs mt-0.5">{message}</p>
          <p className="text-red-400/50 text-xs mt-1">
            Make sure your <code className="bg-white/10 px-1 rounded">FOOTBALL_API_KEY</code> is set in{' '}
            <code className="bg-white/10 px-1 rounded">backend/.env</code> and the Python server is running.
          </p>
        </div>
      </div>
    </motion.div>
  )
}

function PitchBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Subtle green gradient bg */}
      <div className="absolute inset-0 bg-gradient-to-b from-pitch-900 via-pitch-950 to-pitch-950" />
      {/* Pitch stripe pattern */}
      <div className="absolute inset-0 pitch-lines opacity-100" />
      {/* Corner glows */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-green-900/15 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-green-800/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
    </div>
  )
}

export default function App() {
  const [matches, setMatches] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
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
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    const id = setInterval(fetchAll, REFRESH_MS)
    return () => clearInterval(id)
  }, [fetchAll])

  if (loading && !stats && !error) return <LoadingScreen />

  return (
    <div className="relative min-h-screen text-white">
      <PitchBackground />

      <div className="relative z-10">
        <Header lastUpdated={lastUpdated} onRefresh={fetchAll} loading={loading} />

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
          <p className="text-center text-white/20 text-xs mt-8 pb-4">
            Data via football-data.org · Refreshes every 90s · FIFA World Cup 2026 🏆
          </p>
        </main>
      </div>
    </div>
  )
}
