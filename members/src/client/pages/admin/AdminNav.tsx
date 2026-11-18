import { NavLink } from 'react-router-dom'
import { useBrand } from '../../lib/brand'

const links = [
  ['/admin', 'Overview'],
  ['/admin/members', 'Members'],
  ['/admin/events', 'Events'],
  ['/admin/jobs', 'Jobs'],
  ['/admin/files', 'Files'],
  ['/admin/payments', 'Payments'],
  ['/admin/settings', 'Settings'],
]

export default function AdminNav() {
  const brand = useBrand()
  return (
    <nav className="border-b border-slate-200 bg-white" aria-label="Admin">
      <div className="container-x flex gap-2 overflow-x-auto py-3">
        {links.map(([to, label]) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin'}
            className={({ isActive }) =>
              `rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap ${isActive ? 'bg-brand-navy text-white' : 'text-brand-navy hover:bg-slate-100'}`
            }
          >
            {label}
          </NavLink>
        ))}
        <a href={brand.sibling.url} className="ml-auto rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap text-brand-gold hover:bg-slate-100">
          {brand.sibling.name}
        </a>
      </div>
    </nav>
  )
}
