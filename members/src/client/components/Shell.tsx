import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import type { MemberProfile, User } from '../lib/api'
import { Logo, useBrand } from '../lib/brand'

const memberNav = [
  { to: '/events', label: 'Events', short: 'Events' },
  { to: '/directory', label: 'Directory', short: 'Directory' },
  { to: '/careers', label: 'Career Center', short: 'Careers' },
  { to: '/files', label: 'Files', short: 'Files' },
]

export default function Shell({
  user,
  member,
  onLogout,
  children,
}: {
  user: User | null
  member: MemberProfile | null
  onLogout: () => void
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const staff = user && user.role !== 'member'
  const brand = useBrand()

  useEffect(() => {
    setOpen(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:h-20">
          <Link to={user ? '/' : '/login'} className="flex shrink-0 items-center" aria-label={`${brand.shortName} member home`}>
            <Logo />
          </Link>
          <nav className="hidden items-center gap-0.5 whitespace-nowrap xl:flex" aria-label="Primary">
            <a href={brand.publicSiteUrl} className="rounded-full px-2 py-2 text-xs font-semibold uppercase tracking-wide text-brand-navy hover:bg-slate-100 2xl:px-3 2xl:text-sm">
              {brand.publicSiteLabel}
            </a>
            {user &&
              memberNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `rounded-full px-2 py-2 text-xs font-semibold uppercase tracking-wide transition 2xl:px-3 2xl:text-sm ${
                      isActive ? 'bg-brand-navy text-white' : 'text-brand-navy hover:bg-slate-100'
                    }`
                  }
                >
                  <span className="2xl:hidden">{item.short}</span>
                  <span className="hidden 2xl:inline">{item.label}</span>
                </NavLink>
              ))}
            {staff && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `rounded-full px-2 py-2 text-xs font-semibold uppercase tracking-wide 2xl:px-3 2xl:text-sm ${
                    isActive ? 'bg-brand-navy text-white' : 'text-brand-gold hover:bg-slate-100'
                  }`
                }
              >
                Admin
              </NavLink>
            )}
            <span className="mx-2 h-6 w-px bg-slate-200" />
            {user ? (
              <>
                <NavLink to="/account" className="btn-gold px-4 py-2 text-xs uppercase tracking-wide 2xl:text-sm">
                  Account
                </NavLink>
                <button type="button" onClick={onLogout} className="rounded-full px-2 py-2 text-xs font-semibold uppercase tracking-wide text-brand-navy hover:bg-slate-100">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/join" className="rounded-full px-2 py-2 text-xs font-semibold uppercase tracking-wide text-brand-navy hover:bg-slate-100 2xl:text-sm">
                  Join
                </NavLink>
                <NavLink to="/login" className="btn-gold px-4 py-2 text-xs uppercase tracking-wide 2xl:text-sm">
                  Sign in
                </NavLink>
              </>
            )}
          </nav>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-brand-navy hover:bg-slate-100 xl:hidden"
            aria-expanded={open}
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
          <div className="absolute inset-x-0 top-full z-40 h-[calc(100dvh-4rem)] overflow-y-auto border-t border-slate-200 bg-white xl:hidden">
            <nav className="container-x flex flex-col gap-1 py-6" aria-label="Mobile">
              <a href={brand.publicSiteUrl} className="rounded-xl px-4 py-3 text-base font-semibold text-brand-navy">
                {brand.publicSiteLabel}
              </a>
              {user &&
                memberNav.map((item) => (
                  <NavLink key={item.to} to={item.to} className="rounded-xl px-4 py-3 text-base font-semibold text-brand-navy">
                    {item.label}
                  </NavLink>
                ))}
              {staff && (
                <NavLink to="/admin" className="rounded-xl px-4 py-3 text-base font-semibold text-brand-gold">
                  Admin
                </NavLink>
              )}
              {user ? (
                <>
                  <NavLink to="/account" className="btn-gold mt-2">
                    Account
                  </NavLink>
                  <button type="button" onClick={onLogout} className="rounded-xl px-4 py-3 text-left text-base font-semibold text-brand-navy">
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <NavLink to="/join" className="rounded-xl px-4 py-3 text-base font-semibold text-brand-navy">
                    Join
                  </NavLink>
                  <NavLink to="/login" className="btn-gold mt-2">
                    Sign in
                  </NavLink>
                </>
              )}
            </nav>
          </div>
        )}
      </header>
      {user && user.status === 'pending_payment' && (
        <div className="bg-brand-gold text-white">
          <div className="container-x flex flex-wrap items-center justify-between gap-3 py-3 text-sm font-semibold">
            <p>Dues payment is still open. Membership starts after the payment is approved.</p>
            <Link to="/account" className="underline decoration-white/70 underline-offset-4">
              Pay dues
            </Link>
          </div>
        </div>
      )}
      {user && user.status === 'pending_approval' && (
        <div className="bg-brand-navy text-white">
          <div className="container-x py-3 text-sm">
            Payment received. {member?.firstName ? `${member.firstName}, ` : ''}Rod will approve the membership before the directory opens.
          </div>
        </div>
      )}
      <main className="flex-1">{children}</main>
      <footer className="bg-brand-navy-dark text-white">
        <div className="container-x grid gap-10 py-14 md:grid-cols-3">
          <div>
            <span className="inline-flex rounded-lg bg-white px-3 py-2">
              <Logo className="h-12 w-auto" />
            </span>
            <p className="eyebrow mt-6 text-brand-gold-light">{brand.tagline}</p>
            <p className="mt-4 text-sm leading-relaxed text-white/75">
              The member site for {brand.name}. Chapter lunches, the directory, and the career center.
            </p>
          </div>
          <div>
            <p className="eyebrow">Address</p>
            <ul className="mt-4 space-y-3 text-sm text-white/85">
              <li>
                <a className="hover:text-brand-gold-light" href={`tel:${brand.contact.phone.replace(/[^\d+]/g, '')}`}>
                  {brand.contact.phone}
                </a>
              </li>
              <li>
                {brand.contact.addressLine1}
                <br />
                {brand.contact.addressLine2}
              </li>
              <li>
                <a className="underline decoration-brand-gold underline-offset-4 hover:text-brand-gold-light" href={`mailto:${brand.contact.email}`}>
                  {brand.contact.email}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="eyebrow">Explore</p>
            <ul className="mt-4 space-y-2 text-sm text-white/85">
              <li>
                <a className="hover:text-brand-gold-light" href={brand.publicSiteUrl}>
                  Public site
                </a>
              </li>
              {staff && (
                <li>
                  <a className="hover:text-brand-gold-light" href={brand.sibling.url}>
                    {brand.sibling.name} member site
                  </a>
                </li>
              )}
              {user &&
                memberNav.map((item) => (
                  <li key={item.to}>
                    <Link className="hover:text-brand-gold-light" to={item.to}>
                      {item.label}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="container-x flex flex-col gap-2 py-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
            <p>© {brand.name}</p>
            <p>{brand.tagline}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export function PageHero({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <section className="relative isolate overflow-hidden bg-brand-navy text-white">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-navy via-brand-navy/90 to-brand-blue/70" />
      <div className="container-x py-14 sm:py-16">
        <div className="max-w-3xl fade-up">
          {eyebrow && <p className="eyebrow text-brand-gold-light">{eyebrow}</p>}
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">{title}</h1>
          {subtitle && <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">{subtitle}</p>}
        </div>
      </div>
    </section>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-brand-navy">
      {label}
      {children}
    </label>
  )
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null
  return <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{children}</p>
}

export function Pill({ children, tone = 'navy' }: { children: ReactNode; tone?: 'navy' | 'gold' | 'slate' }) {
  const tones = {
    navy: 'bg-brand-navy/10 text-brand-navy',
    gold: 'bg-brand-gold/15 text-brand-gold',
    slate: 'bg-slate-100 text-slate-600',
  }
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${tones[tone]}`}>{children}</span>
}
