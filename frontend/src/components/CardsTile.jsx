import TileShell from './TileShell'
import TeamRow from './TeamRow'

export default function CardsTile({ data = [] }) {
  const top3 = data.slice(0, 3)
  return (
    <TileShell title="Most Cards" icon="🟨">
      {top3.length === 0 ? (
        <div className="text-center py-5">
          <p className="text-2xl mb-1">🟨</p>
          <p className="text-tx-2 text-sm font-medium">Not available</p>
          <p className="text-tx-3 text-xs mt-1">The data source doesn't provide card data</p>
        </div>
      ) : (
        top3.map((t, i) => (
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
        ))
      )}
    </TileShell>
  )
}
