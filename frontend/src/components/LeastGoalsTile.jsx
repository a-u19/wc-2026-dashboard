import TileShell from './TileShell'
import TeamRow from './TeamRow'

export default function LeastGoalsTile({ data = [] }) {
  const top3 = data.slice(0, 3)
  return (
    <TileShell title="Fewest Goals Scored" icon="🔒⚽">
      {top3.length === 0 ? (
        <p className="text-tx-3 text-sm text-center py-4">No matches played yet</p>
      ) : (
        top3.map((t, i) => (
          <TeamRow
            key={t.name}
            rank={i + 1}
            name={t.name}
            crest={t.crest}
            value={t.scored}
            valueLabel="goals"
            sub={`${t.played} match${t.played !== 1 ? 'es' : ''} played`}
            delay={i * 0.08}
          />
        ))
      )}
    </TileShell>
  )
}
