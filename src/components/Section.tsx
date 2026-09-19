import type { ReactNode } from 'react'

type Props = {
  id?: string
  eyebrow?: string
  title?: string
  intro?: ReactNode
  tone?: 'white' | 'muted' | 'navy'
  children: ReactNode
  className?: string
}

const tones = {
  white: 'bg-white',
  muted: 'bg-slate-50',
  navy: 'bg-brand-navy text-white',
}

export default function Section({ id, eyebrow, title, intro, tone = 'white', children, className = '' }: Props) {
  const navy = tone === 'navy'
  return (
    <section id={id} className={`${tones[tone]} py-14 sm:py-16 lg:py-24 ${className}`}>
      <div className="container-x">
        {(eyebrow || title || intro) && (
          <div className="mb-10 max-w-3xl lg:mb-14">
            {eyebrow && <p className={`eyebrow ${navy ? 'text-brand-gold-light' : ''}`}>{eyebrow}</p>}
            {title && <h2 className={`h-display mt-3 ${navy ? 'text-white' : ''}`}>{title}</h2>}
            {intro && <div className={`mt-4 text-base leading-relaxed sm:text-lg ${navy ? 'text-white/80' : 'text-slate-600'}`}>{intro}</div>}
          </div>
        )}
        {children}
      </div>
    </section>
  )
}
