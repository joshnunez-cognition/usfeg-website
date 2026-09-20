import PageHero from '../components/PageHero'
import Section from '../components/Section'
import { chapterPhotos, chapters, chaptersPage } from '../data/site'
import { asset } from '../lib/asset'

export default function Chapters() {
  return (
    <>
      <PageHero
        eyebrow="Chapters"
        title="Chapter Meetings"
        image={chaptersPage.heroImage}
        subtitle={chaptersPage.intro}
      />

      <Section>
        <div className="grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="eyebrow">How chapters work</p>
            <p className="mt-4 leading-relaxed text-slate-700 sm:text-lg">
              {chaptersPage.body}
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {chaptersPage.features.map(
                (f) => (
                  <li key={f} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-brand-navy">
                    <span className="h-2 w-2 rounded-full bg-brand-gold" />
                    {f}
                  </li>
                ),
              )}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:col-span-7 sm:grid-cols-3">
            {chapterPhotos.slice(0, 6).map((src, i) => (
              <img
                key={src}
                src={asset(src)}
                alt=""
                loading="lazy"
                className={`w-full rounded-2xl object-cover shadow-sm ${i === 0 ? 'col-span-2 aspect-[16/9] sm:aspect-[4/3]' : 'aspect-square'}`}
              />
            ))}
          </div>
        </div>
      </Section>

      <Section tone="muted" eyebrow="Our Chapters" title="Across the Gulf Coast">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {chapters.map((c) => (
            <div key={c.state} className={`card p-6 ${c.state === 'Louisiana' ? 'sm:col-span-2 lg:col-span-1' : ''}`}>
              <h3 className="text-lg font-bold text-brand-navy">{c.state}</h3>
              <ul className={`mt-4 gap-x-6 gap-y-2 text-sm text-slate-600 ${c.state === 'Louisiana' ? 'grid grid-cols-2 lg:grid-cols-1' : 'grid'}`}>
                {c.cities.map((city) => (
                  <li key={city} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-gold" />
                    {city}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="card flex flex-col justify-between bg-brand-navy p-6 text-white sm:col-span-2 lg:col-span-5 lg:flex-row lg:items-center">
            <div>
              <p className="eyebrow text-brand-gold-light">Don't see your city?</p>
              <p className="mt-3 text-lg font-semibold">Interested in joining a chapter or starting one in your area?</p>
            </div>
            <a href="#contact" className="btn-gold mt-6 self-start lg:mt-0">
              Contact Us
            </a>
          </div>
        </div>
      </Section>
    </>
  )
}
