import PageHero from '../components/PageHero'
import Section from '../components/Section'
import { teamGleason as tg } from '../data/site'
import { asset } from '../lib/asset'

export default function TeamGleason() {
  const { campaign, event, contactPerson } = tg
  return (
    <>
      <PageHero eyebrow="Team Gleason" title={tg.title} image={tg.heroImage} subtitle={tg.subtitle}>
        <a href={tg.website} target="_blank" rel="noreferrer" className="btn-gold">
          Learn More About Team Gleason ↗
        </a>
      </PageHero>

      <Section>
        <div className="grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <img src={asset(tg.logo)} alt="Team Gleason" className="w-full max-w-sm rounded-2xl" />
          </div>
          <div className="lg:col-span-7">
            <p className="leading-relaxed text-slate-700 sm:text-lg">{tg.mission}</p>
          </div>
        </div>
      </Section>

      <Section tone="navy" eyebrow={campaign.eyebrow} title={campaign.title}>
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="space-y-5 leading-relaxed text-white/85 lg:col-span-7">
            <p className="text-lg font-semibold text-white">{campaign.lead}</p>
            {campaign.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <p>
              To qualify, you will need to use the following{' '}
              <a
                className="font-semibold text-brand-gold-light underline underline-offset-4"
                href={campaign.sponsorLink}
                target="_blank"
                rel="noreferrer"
              >
                link
              </a>
              .
            </p>
            <p className="italic text-white/70">{campaign.quote}</p>
            <a href={campaign.sponsorLink} target="_blank" rel="noreferrer" className="btn-gold">
              Become a Sponsor Today ↗
            </a>
          </div>
          <div className="lg:col-span-5">
            <div className="rounded-3xl bg-white p-7 text-brand-ink shadow-xl">
              <p className="eyebrow">{event.name}</p>
              <p className="mt-2 text-2xl font-bold text-brand-navy">{event.date}</p>
              <dl className="mt-5 space-y-3 text-sm">
                {event.schedule.map((s, i) => (
                  <div
                    key={s.label}
                    className={`flex justify-between ${i < event.schedule.length - 1 ? 'border-b border-slate-100 pb-3' : ''}`}
                  >
                    <dt className="font-semibold text-brand-navy">{s.label}</dt>
                    <dd>{s.time}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-6 border-t border-slate-100 pt-6 text-sm">
                <p className="text-slate-500">To learn more about ways to support our mission, contact:</p>
                <p className="mt-2 font-semibold text-brand-navy">{contactPerson.name}</p>
                <p className="text-slate-600">{contactPerson.role}</p>
                <p className="mt-2">
                  <a className="text-brand-blue" href={`tel:${contactPerson.phone.replace(/\D/g, '')}`}>
                    {contactPerson.phone}
                  </a>
                </p>
                <p>
                  <a className="break-all text-brand-blue" href={`mailto:${contactPerson.email}`}>
                    {contactPerson.email}
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </>
  )
}
