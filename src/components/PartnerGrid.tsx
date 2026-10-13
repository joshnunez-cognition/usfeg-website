import { partnerTiers } from '../data/site'
import { asset } from '../lib/asset'

// Hierarchy is built into the layout: every logo in a tier fits the same
// fixed-height box, and each tier's box is a step smaller than the one above.
const tierSpec: Record<string, { card: string; logoHeight: number; grid: string }> = {
  Title: { card: 'h-48', logoHeight: 120, grid: 'grid-cols-1 sm:max-w-md' },
  Gold: { card: 'h-36', logoHeight: 64, grid: 'grid-cols-2 md:grid-cols-3' },
  Silver: { card: 'h-28', logoHeight: 44, grid: 'grid-cols-2 sm:max-w-lg' },
  Bronze: { card: 'h-20', logoHeight: 30, grid: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-6' },
}

export default function PartnerGrid() {
  return (
    <div className="space-y-12">
      {partnerTiers.map(({ tier, color, logoSize = 100, partners }) => {
        const spec = tierSpec[tier] ?? tierSpec.Gold
        return (
          <div key={tier}>
            <div className="flex items-center gap-4">
              <span className={`${color} rounded-full px-4 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white`}>{tier}</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <ul className={`mt-6 grid gap-4 ${spec.grid}`}>
              {partners.map((p) => (
                <li
                  key={p.name}
                  className={`card flex items-center justify-center px-5 transition hover:-translate-y-0.5 hover:shadow-md ${spec.card}`}
                >
                  <div
                    className="flex w-full items-center justify-center"
                    style={{ height: Math.round((spec.logoHeight * logoSize * (p.adjust ?? 100)) / 10000) }}
                  >
                    <img src={asset(p.logo)} alt={p.name} loading="lazy" className="max-h-full max-w-full object-contain" />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
