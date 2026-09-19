import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero'
import Section from '../components/Section'
import PartnerGrid from '../components/PartnerGrid'
import { contact } from '../data/site'

export default function Partners() {
  return (
    <>
      <PageHero
        eyebrow="Strategic Partners"
        title="Strategic Partners"
        image="/images/photos/hero-5.jpg"
        subtitle="US FEG would like to thank our Strategic Partners for their support."
      />
      <Section>
        <PartnerGrid />
      </Section>
      <Section tone="muted">
        <div className="card flex flex-col gap-6 p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="eyebrow">Become a partner</p>
            <h2 className="mt-2 text-2xl font-bold text-brand-navy">Interested in partnering with US FEG?</h2>
            <p className="mt-2 text-slate-600">
              See the conference sponsorship levels or contact Rod Nunez at{' '}
              <a className="font-semibold text-brand-blue" href={`mailto:${contact.email}`}>
                {contact.email}
              </a>
              .
            </p>
          </div>
          <Link to="/conference#sponsorship" className="btn-primary shrink-0">
            Sponsorship Opportunities
          </Link>
        </div>
      </Section>
    </>
  )
}
