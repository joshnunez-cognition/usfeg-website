import type { ReactNode } from 'react'
import { asset } from '../lib/asset'

type Props = {
  eyebrow?: string
  title: string
  subtitle?: ReactNode
  image?: string
  children?: ReactNode
}

export default function PageHero({ eyebrow, title, subtitle, image, children }: Props) {
  return (
    <section className="relative isolate overflow-hidden bg-brand-navy text-white">
      {image && (
        <img
          src={asset(image)}
          alt=""
          className="absolute inset-0 -z-20 h-full w-full object-cover opacity-40"
          fetchPriority="high"
        />
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-navy via-brand-navy/90 to-brand-blue/70" />
      <div className="container-x py-16 sm:py-20 lg:py-28">
        <div className="max-w-3xl fade-up">
          {eyebrow && <p className="eyebrow text-brand-gold-light">{eyebrow}</p>}
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">{title}</h1>
          {subtitle && <div className="mt-4 text-base leading-relaxed text-white/80 sm:text-lg">{subtitle}</div>}
          {children && <div className="mt-8">{children}</div>}
        </div>
      </div>
    </section>
  )
}
