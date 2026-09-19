import { partnerTiers } from '../data/site'
import { asset } from '../lib/asset'

export default function PartnerGrid() {
  return (
    <div className="space-y-12">
      {partnerTiers.map(({ tier, color, partners }) => (
        <div key={tier}>
          <div className="flex items-center gap-4">
            <span className={`${color} rounded-full px-4 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white`}>{tier}</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <ul
            className={`mt-6 grid gap-4 ${
              tier === 'Title'
                ? 'grid-cols-1 sm:max-w-md'
                : tier === 'Gold'
                  ? 'grid-cols-2 md:grid-cols-4'
                  : tier === 'Silver'
                    ? 'grid-cols-2 sm:max-w-lg'
                    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-6'
            }`}
          >
            {partners.map((p) => (
              <li
                key={p.name}
                className={`card flex items-center justify-center p-5 transition hover:-translate-y-0.5 hover:shadow-md ${
                  tier === 'Title' ? 'h-40' : tier === 'Gold' ? 'h-32' : 'h-28'
                } ${p.wide && tier !== 'Title' ? 'col-span-2 md:col-span-2' : ''}`}
              >
                <img
                  src={asset(p.logo)}
                  alt={p.name}
                  loading="lazy"
                  className="max-h-full max-w-full object-contain"
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
