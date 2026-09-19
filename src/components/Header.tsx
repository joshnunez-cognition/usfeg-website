import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { externalLinks, navItems } from '../data/site'
import { asset } from '../lib/asset'

export default function Header() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:h-20">
        <Link to="/" className="flex shrink-0 items-center" aria-label="US FEG home">
          <img src={asset('/logo.svg')} alt="US FEG - Financial Executive Group" className="h-10 w-auto lg:h-12" width={352} height={134} />
        </Link>

        <nav className="hidden items-center gap-0.5 whitespace-nowrap xl:flex" aria-label="Primary">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-full px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wide transition 2xl:px-3 2xl:text-[13px] ${
                  isActive ? 'bg-brand-navy text-white' : 'text-brand-navy hover:bg-slate-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <span className="mx-2 h-6 w-px bg-slate-200" />
          <a
            href={externalLinks.swagStore}
            target="_blank"
            rel="noreferrer"
            className="rounded-full px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-brand-gold hover:bg-slate-100 2xl:px-3 2xl:text-[13px]"
          >
            Swag Store
          </a>
          <a
            href={externalLinks.memberSite}
            target="_blank"
            rel="noreferrer"
            className="btn-gold px-4 py-2 text-[11px] uppercase tracking-wide 2xl:text-[13px]"
          >
            Member Site
          </a>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-brand-navy hover:bg-slate-100 xl:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? (
              <>
                <path d="M6 6l12 12" />
                <path d="M18 6L6 18" />
              </>
            ) : (
              <>
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </>
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto bg-white xl:hidden">
          <nav className="container-x flex flex-col gap-1 py-6" aria-label="Mobile">
            <NavLink
              to="/"
              onClick={close}
              className={({ isActive }) =>
                `rounded-xl px-4 py-3 text-base font-semibold ${isActive ? 'bg-brand-navy text-white' : 'text-brand-navy'}`
              }
            >
              Home
            </NavLink>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={close}
                className={({ isActive }) =>
                  `rounded-xl px-4 py-3 text-base font-semibold ${isActive ? 'bg-brand-navy text-white' : 'text-brand-navy'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="my-3 h-px bg-slate-200" />
            <a
              href={externalLinks.swagStore}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl px-4 py-3 text-base font-semibold text-brand-gold"
            >
              Swag Store ↗
            </a>
            <a href={externalLinks.memberSite} target="_blank" rel="noreferrer" className="btn-gold mt-2">
              Member Site ↗
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}
