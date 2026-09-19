import PageHero from '../components/PageHero'
import Section from '../components/Section'
import { contact } from '../data/site'
import { asset } from '../lib/asset'

export default function Founder() {
  return (
    <>
      <PageHero eyebrow="From the Founder" title="A note from Rod Nunez" image="/images/photos/hero-3.jpg" />
      <Section>
        <div className="grid items-start gap-10 lg:grid-cols-12">
          <figure className="lg:col-span-4">
            <img
              src={asset('/images/photos/rod-nunez.jpg')}
              alt="Rod Nunez, Founder & President of US FEG"
              className="aspect-[4/5] w-full rounded-3xl object-cover shadow-xl"
            />
            <figcaption className="mt-4">
              <p className="font-bold text-brand-navy">Rod Nunez</p>
              <p className="text-sm text-slate-500">Founder & President, US FEG</p>
            </figcaption>
          </figure>
          <article className="lg:col-span-8">
            <h2 className="h-display">From The Founder</h2>
            <p className="mt-6 leading-relaxed text-slate-700 sm:text-lg">
              US FEG began in February of 2019 in New Orleans with five original members, John Gerrets, Tim Lott, Brad
              Prendergast, Scott Stephenson, and Joe Tumminello. The input from these members has created the model used for
              running US FEG today. From the beginning it was decided that the members would determine the rules and content
              chosen for the monthly chapter meetings and the two annual conferences. Rules such as having a nomination
              process for new members. Also limiting the size of the chapters to promote better discussion among members. We
              have grown to a large network of financial professionals in several states in the Gulf Coast region. The
              feedback received from the members has been extremely positive. If you're interested in joining a chapter or
              starting your own chapter, please contact me using the following{' '}
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
              <span className="font-semibold text-brand-navy">Rod Nunez</span>
            </p>
          </article>
        </div>
      </Section>
    </>
  )
}
