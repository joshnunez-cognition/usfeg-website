import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Section from '../components/Section'
import PartnerGrid from '../components/PartnerGrid'
import { aboutBlurb, chapters, heroPhotos, home, site, testimonials, testimonialsPage } from '../data/site'
import { asset } from '../lib/asset'

const highlights = home.highlights

export default function Home() {
  const [slide, setSlide] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setSlide((s) => (s + 1) % heroPhotos.length), 6000)
    return () => window.clearInterval(id)
  }, [])

  const cityCount = chapters.reduce((n, c) => n + c.cities.length, 0)

  return (
    <>
      <section className="relative isolate min-h-[85svh] overflow-hidden bg-brand-navy text-white lg:min-h-[80vh]">
        {heroPhotos.map((src, i) => (
          <img
            key={src}
            src={asset(src)}
            alt=""
            fetchPriority={i === 0 ? 'high' : 'low'}
            loading={i === 0 ? 'eager' : 'lazy'}
            className={`absolute inset-0 -z-20 h-full w-full object-cover transition-opacity duration-1000 ${
              i === slide ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-brand-navy via-brand-navy/80 to-brand-navy/40" />
        <div className="container-x flex min-h-[85svh] flex-col justify-end pb-16 pt-20 sm:pb-24 lg:min-h-[80vh] lg:justify-center">
          <div className="max-w-3xl fade-up">
            <p className="eyebrow text-brand-gold-light">{site.tagline}</p>
            <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              {home.heroTitle}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg">
              {home.heroText}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/about-us" className="btn-gold">
                Learn More
                <span aria-hidden>→</span>
              </Link>
              <Link to="/join-us-feg" className="btn-outline-light">
                Find a Chapter
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-5 right-5 hidden gap-1.5 sm:flex" aria-hidden>
          {heroPhotos.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSlide(i)}
              className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-8 bg-brand-gold-light' : 'w-3 bg-white/40'}`}
              tabIndex={-1}
            />
          ))}
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="container-x grid grid-cols-2 divide-x divide-slate-200 py-8 sm:grid-cols-4">
          {[
            ['5', 'Gulf Coast states'],
            [String(cityCount), 'Chapters'],
            ['10', 'Monthly lunches / yr'],
            ['2', 'Annual conferences'],
          ].map(([n, label]) => (
            <div key={label} className="px-4 text-center">
              <p className="text-3xl font-bold text-brand-navy sm:text-4xl">{n}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <Section eyebrow="Who we are" title="A forum for financial executives" intro={aboutBlurb}>
        <div className="grid gap-5 md:grid-cols-3">
          {highlights.map((h) => (
            <Link key={h.title} to={h.to} className="card group flex flex-col p-7 transition hover:-translate-y-1 hover:shadow-lg">
              <span className="h-1 w-12 rounded-full bg-brand-gold" />
              <h3 className="mt-5 text-xl font-bold text-brand-navy">{h.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{h.body}</p>
              <span className="mt-6 text-sm font-semibold text-brand-blue group-hover:text-brand-navy">
                {h.cta} <span aria-hidden>→</span>
              </span>
            </Link>
          ))}
        </div>
      </Section>

      <Section
        tone="navy"
        eyebrow="Why US FEG?"
        title="Listen to what our members are saying."
        intro={testimonialsPage.intro}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {testimonials.map((t) => (
            <Link key={t.name} to="/team-3" className="group overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10 transition hover:bg-white/10">
              <img src={asset(t.photo)} alt={t.name} loading="lazy" className="aspect-[4/3] w-full object-cover" />
              <div className="p-5">
                <p className="font-semibold">{t.name}</p>
                <p className="mt-1 text-sm text-white/70">
                  {t.title}, {t.company}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <Section eyebrow="Strategic Partners" title="Thank you to our Strategic Partners" intro="US FEG would like to thank our Strategic Partners for their support.">
        <PartnerGrid />
        <div className="mt-10">
          <Link to="/team-4" className="btn-outline">
            View all partners
          </Link>
        </div>
      </Section>

      <section className="bg-brand-gold">
        <div className="container-x flex flex-col items-start justify-between gap-6 py-12 text-white lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">Get involved</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Interested in joining or starting a chapter?</h2>
          </div>
          <a href="#contact" className="btn bg-white text-brand-navy hover:bg-brand-navy hover:text-white">
            Contact Us
          </a>
        </div>
      </section>
    </>
  )
}
