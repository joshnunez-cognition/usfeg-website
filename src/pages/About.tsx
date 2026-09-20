import PageHero from '../components/PageHero'
import Section from '../components/Section'
import { about } from '../data/site'
import { asset } from '../lib/asset'

export default function About() {
  return (
    <>
      <PageHero eyebrow="About Us" title="United States Financial Executive Group" image={about.heroImage} />
      <Section>
        <div className="grid items-start gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="text-lg leading-relaxed text-slate-700 sm:text-xl">
              {about.lead}
            </p>
            <p className="mt-6 leading-relaxed text-slate-600">
              {about.body}
            </p>
            <div className="mt-8 rounded-2xl border-l-4 border-brand-gold bg-slate-50 p-6">
              <p className="font-medium text-brand-navy">
                {about.callout}
              </p>
              <a href="#contact" className="btn-primary mt-5">
                Contact Us
              </a>
            </div>
          </div>
          <figure className="lg:col-span-5">
            <img
              src={asset(about.image)}
              alt="US FEG members at a chapter meeting"
              className="aspect-[4/3] w-full rounded-3xl object-cover shadow-xl"
            />
          </figure>
        </div>
      </Section>
    </>
  )
}
