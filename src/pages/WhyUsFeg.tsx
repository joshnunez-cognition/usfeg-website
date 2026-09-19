import PageHero from '../components/PageHero'
import Section from '../components/Section'
import { testimonials } from '../data/site'
import { asset } from '../lib/asset'

export default function WhyUsFeg() {
  return (
    <>
      <PageHero eyebrow="Why US FEG?" title="Listen to what our members are saying." image="/images/photos/hero-4.jpg" />
      <Section>
        <div className="grid gap-6 sm:grid-cols-2">
          {testimonials.map((t) => (
            <article key={t.name} className="card overflow-hidden transition hover:-translate-y-1 hover:shadow-lg">
              <div className="relative">
                <img src={asset(t.photo)} alt={t.name} loading="lazy" className="aspect-video w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/70 to-transparent" />
              </div>
              <div className="p-6">
                <h2 className="text-xl font-bold text-brand-navy">{t.name}</h2>
                <p className="mt-1 text-sm font-semibold text-brand-gold">{t.title}</p>
                <p className="text-sm text-slate-600">{t.company}</p>
              </div>
            </article>
          ))}
        </div>
      </Section>
    </>
  )
}
