import PageHero from '../components/PageHero'
import Section from '../components/Section'
import { about, site } from '../data/site'
import { asset } from '../lib/asset'
import VideoCard from '../components/VideoCard'

export default function About() {
  return (
    <>
      <PageHero eyebrow="About Us" title={site.siteName} image={about.heroImage} />
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
          <figure className="overflow-hidden rounded-3xl shadow-xl lg:col-span-5">
            <VideoCard photo={asset(about.image)} alt="About US FEG" videoUrl={about.videoUrl} className="aspect-[4/3]" />
          </figure>
        </div>
      </Section>
    </>
  )
}
