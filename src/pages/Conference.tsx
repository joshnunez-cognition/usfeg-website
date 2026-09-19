import { useState } from 'react'
import PageHero from '../components/PageHero'
import Section from '../components/Section'
import PartnerGrid from '../components/PartnerGrid'
import { agenda, contact, galleryImages, sponsorshipLevels } from '../data/site'
import { asset } from '../lib/asset'

const details = [
  { label: 'Date', value: 'Thursday, June 11' },
  { label: 'Time', value: '8:00am – 5:00pm' },
  { label: 'Venue', value: 'Hyatt Regency New Orleans' },
  { label: 'Room', value: 'Empire Ballroom A' },
]

export default function Conference() {
  const [showAll, setShowAll] = useState(false)
  const gallery = showAll ? galleryImages : galleryImages.slice(0, 12)

  return (
    <>
      <PageHero eyebrow="US FEG & US LEG" title="Summer Conference 2026" image="/images/photos/conference-banner.jpg">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {details.map((d) => (
            <div key={d.label} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
              <dt className="text-xs font-semibold uppercase tracking-wider text-brand-gold-light">{d.label}</dt>
              <dd className="mt-1 text-sm font-semibold sm:text-base">{d.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a href="#agenda" className="btn-gold">
            View Agenda
          </a>
          <a href="#sponsorship" className="btn-outline-light">
            Sponsorship Opportunities
          </a>
        </div>
      </PageHero>

      <Section id="agenda" eyebrow="Conference Agenda" title="Thursday, June 11">
        <ol className="relative space-y-4 border-l-2 border-slate-200 pl-6 sm:pl-10">
          {agenda.map((item, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[31px] top-5 h-3.5 w-3.5 rounded-full border-2 border-white bg-brand-gold ring-2 ring-brand-gold/30 sm:-left-[47px]" />
              <div className={`card p-5 sm:p-6 ${item.session ? '' : 'border-dashed bg-slate-50/60'}`}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-wider">
                  <span className="text-brand-blue">{item.time}</span>
                  {item.session && <span className="rounded-full bg-brand-navy px-2.5 py-0.5 text-[10px] text-white">{item.session}</span>}
                </div>
                <h3 className="mt-2 text-base font-bold text-brand-navy sm:text-lg">{item.title}</h3>
                {item.description && <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>}
                {item.panelists && (
                  <div className="mt-5 border-t border-slate-100 pt-5">
                    <p className="eyebrow">Panelists</p>
                    <div className="mt-3 grid gap-4 md:grid-cols-2">
                      {item.panelists.map((p) => (
                        <div key={p.name} className="rounded-xl bg-slate-50 p-4">
                          <p className="font-semibold text-brand-navy">{p.name}</p>
                          <p className="mt-1 text-sm leading-relaxed text-slate-600">{p.bio}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="muted" eyebrow="Strategic Partners" intro="US FEG would like to thank our Strategic Partners for their support.">
        <PartnerGrid />
      </Section>

      <Section id="sponsorship" eyebrow="Sponsorship" title="2026 Conference Sponsorship Opportunities">
        <div className="grid gap-5 lg:grid-cols-3">
          {sponsorshipLevels.map((s) => (
            <div key={s.level} className={`card flex flex-col border-t-8 p-7 ${s.color}`}>
              <p className="eyebrow">{s.level}</p>
              <p className="mt-2 text-4xl font-bold text-brand-navy">{s.price}</p>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-slate-600">
                {s.perks.map((perk) => (
                  <li key={perk} className="flex gap-3">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path
                        fillRule="evenodd"
                        d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0l-3.5-3.5a1 1 0 111.4-1.4l2.8 2.8 6.8-6.8a1 1 0 011.4 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {perk}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 rounded-2xl bg-brand-navy p-7 text-white sm:flex sm:items-center sm:justify-between sm:gap-8">
          <p className="text-lg font-semibold">
            If you would like to sponsor, please contact Rod Nunez at{' '}
            <a className="whitespace-nowrap underline decoration-brand-gold underline-offset-4" href={`tel:${contact.phone}`}>
              {contact.phone}
            </a>{' '}
            or{' '}
            <a className="underline decoration-brand-gold underline-offset-4" href={`mailto:${contact.email}`}>
              {contact.email}
            </a>
          </p>
          <a href={`mailto:${contact.email}?subject=Conference%20Sponsorship`} className="btn-gold mt-5 shrink-0 sm:mt-0">
            Email Rod
          </a>
        </div>
      </Section>

      <Section tone="muted" eyebrow="Gallery" title="Past Conference Pictures">
        <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>img]:mb-3">
          {gallery.map((src) => (
            <img key={src} src={asset(src)} alt="Past US FEG conference" loading="lazy" className="w-full break-inside-avoid rounded-xl shadow-sm" />
          ))}
        </div>
        {!showAll && (
          <div className="mt-8 text-center">
            <button type="button" onClick={() => setShowAll(true)} className="btn-outline">
              Show all {galleryImages.length} photos
            </button>
          </div>
        )}
      </Section>
    </>
  )
}
