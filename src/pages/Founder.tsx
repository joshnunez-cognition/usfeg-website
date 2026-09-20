import PageHero from '../components/PageHero'
import Section from '../components/Section'
import { contact, founder } from '../data/site'
import { asset } from '../lib/asset'

export default function Founder() {
  return (
    <>
      <PageHero eyebrow="From the Founder" title="A note from Rod Nunez" image={founder.heroImage} />
      <Section>
        <div className="grid items-start gap-10 lg:grid-cols-12">
          <figure className="lg:col-span-4">
            <img
              src={asset(founder.photo)}
              alt="Rod Nunez, Founder & President of US FEG"
              className="aspect-[4/5] w-full rounded-3xl object-cover shadow-xl"
            />
            <figcaption className="mt-4">
              <p className="font-bold text-brand-navy">{founder.name}</p>
              <p className="text-sm text-slate-500">{founder.role}</p>
            </figcaption>
          </figure>
          <article className="lg:col-span-8">
            <h2 className="h-display">From The Founder</h2>
            <p className="mt-6 leading-relaxed text-slate-700 sm:text-lg">
              {founder.body}{' '}
              <a
                className="font-semibold text-brand-blue underline decoration-brand-gold underline-offset-4"
                href={`mailto:${contact.email}?subject=General%20question%20about%20US%20FEG`}
              >
                link
              </a>
              .
            </p>
            <p className="mt-8 leading-relaxed text-slate-700 sm:text-lg">
              Thank you,
              <br />
              <span className="font-semibold text-brand-navy">{founder.name}</span>
            </p>
          </article>
        </div>
      </Section>
    </>
  )
}
