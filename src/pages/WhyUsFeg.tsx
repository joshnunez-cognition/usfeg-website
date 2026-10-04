import PageHero from '../components/PageHero'
import Section from '../components/Section'
import { testimonials, testimonialsPage } from '../data/site'
import { asset } from '../lib/asset'
import VideoCard from '../components/VideoCard'

export default function WhyUsFeg() {
  return (
    <>
      <PageHero eyebrow="Why US FEG?" title="Listen to what our members are saying." image={testimonialsPage.heroImage} />
      <Section>
        <div className="grid gap-6 sm:grid-cols-2">
          {testimonials.map((t) => (
            <article key={t.name} className="card overflow-hidden transition hover:-translate-y-1 hover:shadow-lg">
              <VideoCard photo={asset(t.photo)} alt={t.name} videoUrl={t.videoUrl} />
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
