import PageHero from '../components/PageHero'
import Section from '../components/Section'
import { asset } from '../lib/asset'

export default function About() {
  return (
    <>
      <PageHero eyebrow="About Us" title="United States Financial Executive Group" image="/images/photos/about.jpg" />
      <Section>
        <div className="grid items-start gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="text-lg leading-relaxed text-slate-700 sm:text-xl">
              US FEG is a financial executive networking group whose purpose is to give financial executives such as CFO's,
              Controllers, and Directors of Finance a forum to discuss issues with their peers.
            </p>
            <p className="mt-6 leading-relaxed text-slate-600">
              The focus of every meeting is to keep the content and discussion lively by allowing the members to share their
              experiences and knowledge with the group. The input of the members is what guides the content, topics, and
              speakers for future meetings. There are ten monthly chapter lunch meetings with two all-chapter conferences in
              June and December in New Orleans. There are several opportunities to receive CPE credit throughout the year.
            </p>
            <div className="mt-8 rounded-2xl border-l-4 border-brand-gold bg-slate-50 p-6">
              <p className="font-medium text-brand-navy">
                Please fill out the Contact Us form below if you are interested in joining a chapter or starting one in your
                area.
              </p>
              <a href="#contact" className="btn-primary mt-5">
                Contact Us
              </a>
            </div>
          </div>
          <figure className="lg:col-span-5">
            <img
              src={asset('/images/photos/about.jpg')}
              alt="US FEG members at a chapter meeting"
              className="aspect-[4/3] w-full rounded-3xl object-cover shadow-xl"
            />
          </figure>
        </div>
      </Section>
    </>
  )
}
