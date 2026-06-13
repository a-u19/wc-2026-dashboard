import TileShell from './TileShell'
import TeamRow from './TeamRow'

export default function CardsTile({ data = [] }) {
  const top3 = data.slice(0, 3)

  return (
    <TileShell title="Most Cards" icon="🟨">
      {top3.length === 0 ? (
        <p className="text-white/30 text-sm text-center py-4">No card data yet</p>
      ) : (
        <>
          {top3.map((t, i) => (
            <TeamRow
              key={t.name}
              rank={i + 1}
              name={t.name}
              crest={t.crest}
              value={t.total}
              valueLabel="cards"
              sub={`🟨 ${t.yellow}  🟥 ${t.red}`}
              delay={i * 0.08}
            />
          ))}
        </>
      )}
    </TileShell>
  )
}
