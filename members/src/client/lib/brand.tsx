import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from './api'

export type Brand = {
  id: 'feg' | 'leg'
  code: 'FEG' | 'LEG'
  name: string
  shortName: string
  tagline: string
  logo: string | null
  logoText: string | null
  colors: { navy: string; navyDark: string; blue: string; gold: string; goldLight: string; ink: string }
  publicSiteUrl: string
  publicSiteLabel: string
  domain: string
  contact: { phone: string; email: string; addressLine1: string; addressLine2: string }
  sibling: { name: string; url: string }
}

const BrandContext = createContext<Brand | null>(null)

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brand, setBrand] = useState<Brand | null>(null)

  useEffect(() => {
    api<Brand>('/api/brand')
      .then((next) => {
        const root = document.documentElement
        root.style.setProperty('--color-brand-navy', next.colors.navy)
        root.style.setProperty('--color-brand-navy-dark', next.colors.navyDark)
        root.style.setProperty('--color-brand-blue', next.colors.blue)
        root.style.setProperty('--color-brand-gold', next.colors.gold)
        root.style.setProperty('--color-brand-gold-light', next.colors.goldLight)
        root.style.setProperty('--color-brand-ink', next.colors.ink)
        document.title = `Member Site | ${next.shortName}`
        const description = document.querySelector('meta[name="description"]')
        if (description) {
          description.setAttribute(
            'content',
            `${next.shortName} member site. ${next.tagline}. Chapter meetings, the directory, and the career center.`,
          )
        }
        setBrand(next)
      })
      .catch(() => setBrand(null))
  }, [])

  if (!brand) return <p className="px-8 py-16 text-sm text-slate-500">Loading…</p>
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>
}

export function useBrand() {
  const brand = useContext(BrandContext)
  if (!brand) throw new Error('Brand is missing')
  return brand
}

export function Logo({ className = 'h-10 w-auto lg:h-12' }: { className?: string }) {
  const brand = useBrand()
  if (brand.logo) {
    return <img src={brand.logo} alt={brand.shortName} className={className} width={352} height={134} />
  }
  const text = brand.logoText || brand.shortName
  const [first, ...rest] = text.split(' ')
  return (
    <span className={`inline-flex items-baseline gap-1 text-xl font-bold tracking-tight text-brand-navy ${className}`}>
      <span className="text-brand-gold">{first}</span>
      <span>{rest.join(' ')}</span>
    </span>
  )
}
