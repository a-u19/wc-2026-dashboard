/**
 * worldcup26.ir API client — handles JWT auth + data fetching entirely in the browser.
 * No Python backend needed.
 */

const BASE         = 'https://worldcup26.ir'
const EMAIL        = 'wcdash2026x@gmail.com'
const PASSWORD     = 'Dashboard2026!'
const NAME         = 'WC Dashboard'
const TOKEN_KEY    = 'wc26_token'
const TOKEN_TS_KEY = 'wc26_token_ts'
const TOKEN_TTL    = 7_000_000_000  // ~81 days in ms

// ── Auth ─────────────────────────────────────────────────────────────────────

async function getToken() {
  const stored = localStorage.getItem(TOKEN_KEY)
  const ts     = Number(localStorage.getItem(TOKEN_TS_KEY) || 0)
  if (stored && Date.now() - ts < TOKEN_TTL) return stored

  // Try login first
  let r = await fetch(`${BASE}/auth/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })

  if (!r.ok) {
    // Register then login
    const reg = await fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD, name: NAME }),
    })
    const regData = await reg.json()
    if (regData.token) {
      localStorage.setItem(TOKEN_KEY, regData.token)
      localStorage.setItem(TOKEN_TS_KEY, String(Date.now()))
      return regData.token
    }
    // 409 already exists — try login again
    r = await fetch(`${BASE}/auth/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    })
  }

  const data = await r.json()
  if (!data.token) throw new Error(`Auth failed: ${JSON.stringify(data)}`)
  localStorage.setItem(TOKEN_KEY, data.token)
  localStorage.setItem(TOKEN_TS_KEY, String(Date.now()))
  return data.token
}

async function wcGet(path) {
  const token = await getToken()
  const r = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (r.status === 401) {
    // Clear stale token and retry once
    localStorage.removeItem(TOKEN_KEY)
    const token2 = await getToken()
    const r2 = await fetch(`${BASE}${path}`, {
      headers: { Authorization: `Bearer ${token2}` },
    })
    if (!r2.ok) throw new Error(`API ${path} → ${r2.status}`)
    return r2.json()
  }
  if (!r.ok) throw new Error(`API ${path} → ${r.status}`)
  return r.json()
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(localDate) {
  if (!localDate) return null
  // "MM/DD/YYYY HH:mm"
  const m = localDate.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/)
  if (!m) return localDate
  return `${m[3]}-${m[1]}-${m[2]}T${m[4]}:${m[5]}:00Z`
}

function mapStatus(game) {
  if (String(game.finished).toUpperCase() === 'TRUE') return 'FINISHED'
  const te = String(game.time_elapsed || 'notstarted').trim().toLowerCase()
  if (te === 'notstarted') return 'SCHEDULED'
  if (te === 'ht') return 'PAUSED'
  if (/^\d+$/.test(te)) return 'IN_PLAY'
  return 'SCHEDULED'
}

function mapStage(game) {
  return {
    group: 'GROUP_STAGE', r32: 'ROUND_OF_32', r16: 'ROUND_OF_16',
    qf: 'QUARTER_FINALS', sf: 'SEMI_FINALS', third: 'THIRD_PLACE', final: 'FINAL',
  }[(game.type || '').toLowerCase()] || game.type || ''
}

/**
 * Parse MongoDB set notation: {"Name ","Name +","Name2 "}
 * Returns plain name strings. Strips +, (OG), minute annotations.
 * Excludes own goals from returned list.
 */
function parseScorers(raw) {
  if (!raw || String(raw).trim().toLowerCase() === 'null') return []
  let s = String(raw).trim()
  if (s.startsWith('{')) s = s.replace(/^\{/, '').replace(/\}$/, '')

  const parts = s.includes('"') ? s.split(/",\s*"/) : s.split(',')

  return parts
    .map(p => p.trim().replace(/^["']|["']$/g, ''))
    .filter(p => !/\(OG\)/i.test(p))          // drop own goals
    .map(p => p.replace(/\s*\+\s*$/, '')       // strip repeat marker
               .replace(/\s*\d+[''′]?\s*$/, '') // strip minute annotation
               .trim())
    .filter(Boolean)
}

function extractList(data, ...keys) {
  if (Array.isArray(data)) return data
  for (const k of keys) if (Array.isArray(data[k])) return data[k]
  for (const v of Object.values(data)) if (Array.isArray(v)) return v
  return []
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function fetchMatches() {
  const [teamsData, gamesData] = await Promise.all([
    wcGet('/get/teams'),
    wcGet('/get/games'),
  ])
  const teamsArr = extractList(teamsData, 'teams', 'data')
  const gamesArr = extractList(gamesData, 'games', 'data', 'matches')

  const teams = Object.fromEntries(
    teamsArr.map(t => [String(t.id), { name: t.name_en || t.name || '', flag: t.flag || '' }])
  )

  const matches = gamesArr.map(g => {
    const homeId = String(g.home_team_id || '0')
    const awayId = String(g.away_team_id || '0')
    const home   = teams[homeId] || {}
    const away   = teams[awayId] || {}
    const status = mapStatus(g)

    const hs = parseInt(g.home_score, 10)
    const as_ = parseInt(g.away_score, 10)
    const hasScore = status === 'FINISHED' && !isNaN(hs)

    return {
      id:       g.id,
      utcDate:  parseDate(g.local_date),
      status,
      stage:    mapStage(g),
      group:    g.group,
      homeTeam: {
        id:        homeId,
        name:      home.name || g.home_team_name_en || g.home_team_label || 'TBD',
        shortName: home.name || g.home_team_name_en || g.home_team_label || 'TBD',
        crest:     home.flag || '',
      },
      awayTeam: {
        id:        awayId,
        name:      away.name || g.away_team_name_en || g.away_team_label || 'TBD',
        shortName: away.name || g.away_team_name_en || g.away_team_label || 'TBD',
        crest:     away.flag || '',
      },
      score: {
        fullTime: { home: hasScore ? hs  : null, away: hasScore ? as_ : null },
        halfTime: { home: null, away: null },
      },
      _raw: g,  // kept for stats computation
    }
  })

  return matches
}

export function computeStats(matches) {
  const goalsByTeam    = {}
  const hatTricks      = []
  const raceEntries    = []
  const mostGoalsSingle = []

  for (const m of matches) {
    if (m.status !== 'FINISHED') continue
    const g = m._raw
    const hs = m.score.fullTime.home ?? 0
    const as_ = m.score.fullTime.away ?? 0

    for (const [team, crest, scored] of [
      [m.homeTeam.name, m.homeTeam.crest, hs],
      [m.awayTeam.name, m.awayTeam.crest, as_],
    ]) {
      if (!team || team === 'TBD') continue
      if (!goalsByTeam[team]) goalsByTeam[team] = { name: team, crest, scored: 0, played: 0 }
      goalsByTeam[team].scored += scored
      goalsByTeam[team].played += 1
    }

    // Scorers
    for (const [rawScorers, teamName, teamCrest] of [
      [g.home_scorers, m.homeTeam.name, m.homeTeam.crest],
      [g.away_scorers, m.awayTeam.name, m.awayTeam.crest],
    ]) {
      const names = parseScorers(rawScorers)
      const counts = {}
      for (const n of names) counts[n] = (counts[n] || 0) + 1

      for (const [player, count] of Object.entries(counts)) {
        const entry = {
          player, team: teamName, crest: teamCrest, goals: count,
          matchDate: m.utcDate, home: m.homeTeam.name, away: m.awayTeam.name,
        }
        raceEntries.push(entry)
        if (count >= 3) hatTricks.push(entry)
      }
    }

    mostGoalsSingle.push({
      home: m.homeTeam.name, homeCrest: m.homeTeam.crest, homeScore: hs,
      away: m.awayTeam.name, awayCrest: m.awayTeam.crest, awayScore: as_,
      total: hs + as_, date: m.utcDate,
    })
  }

  const leastGoals = Object.values(goalsByTeam)
    .filter(t => t.played > 0)
    .sort((a, b) => a.scored - b.scored || b.played - a.played)

  const hatTrickRace = raceEntries
    .sort((a, b) => b.goals - a.goals || a.matchDate?.localeCompare(b.matchDate))

  const hatTrick = hatTricks.sort((a, b) => a.matchDate?.localeCompare(b.matchDate))[0] || null

  const mostGoalsSingleGame = mostGoalsSingle
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  return {
    mostCards:           [],
    leastGoals:          leastGoals.slice(0, 10),
    fastestGoals:        [],
    hatTrick,
    hatTrickRace:        hatTrickRace.slice(0, 10),
    mostGoalsSingleGame,
  }
}
