import PageHero from '../components/PageHero'
import Section from '../components/Section'
import { asset } from '../lib/asset'

const sponsorLink =
  'https://teamgleason.app.neoncrm.com/np/clients/teamgleason/eventRegistration.jsp?1=1&event=834&sdcdsc=sdcdsc&event=834'

export default function TeamGleason() {
  return (
    <>
      <PageHero
        eyebrow="Team Gleason"
        title="US FEG is a proud supporter of Team Gleason."
        image="/images/photos/team-gleason.jpg"
        subtitle="There is NO CURE for ALS. Until there is a Cure, There is Team Gleason."
      >
        <a href="http://www.teamgleason.org/" target="_blank" rel="noreferrer" className="btn-gold">
          Learn More About Team Gleason ↗
        </a>
      </PageHero>

      <Section>
        <div className="grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <img
              src={asset('/images/logos/logo-team-gleason.jpg')}
              alt="Team Gleason"
              className="w-full max-w-sm rounded-2xl"
            />
          </div>
          <div className="lg:col-span-7">
            <p className="leading-relaxed text-slate-700 sm:text-lg">
              Since 2011, Team Gleason, founded by Steve Gleason, has provided over $55 million in adventure, technology,
              equipment, and care services to people living with Amyotrophic Lateral Sclerosis (ALS) and countless others
              through advocacy, support and ultimately bringing an end to the disease.
            </p>
          </div>
        </div>
      </Section>

      <Section tone="navy" eyebrow="Gleason Gras 2025" title="Step Up and Out for Gleason Gras">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="space-y-5 leading-relaxed text-white/85 lg:col-span-7">
            <p className="text-lg font-semibold text-white">
              Team Gleason is challenging our US FEG partners-in-mission to Step Up and Out for Gleason Gras 2025!
            </p>
            <p>
              If US FEG affiliated companies collectively meet a goal of $50,000, we will host a private Patron Party for US
              FEG members with a very special musical performance, food, wine, and special branded cups.
            </p>
            <p>
              Get involved as a Patron Sponsor for $5K, or as a Black and Gold Sponsor at $10K. All it takes is 10 sponsorship
              commitments at Patron Level of $5K to unlock your private party with a purpose!
            </p>
            <p>
              To qualify, you will need to use the following{' '}
              <a className="font-semibold text-brand-gold-light underline underline-offset-4" href={sponsorLink} target="_blank" rel="noreferrer">
                link
              </a>
              .
            </p>
            <p className="italic text-white/70">
              At Team Gleason we believe there is strength in relationships. When we come together, we’re able to make a bigger
              impact for the ALS community.
            </p>
            <a href={sponsorLink} target="_blank" rel="noreferrer" className="btn-gold">
              Become a Sponsor Today ↗
            </a>
          </div>
          <div className="lg:col-span-5">
            <div className="rounded-3xl bg-white p-7 text-brand-ink shadow-xl">
              <p className="eyebrow">13th Annual Gleason Gras</p>
              <p className="mt-2 text-2xl font-bold text-brand-navy">October 10th, 2025</p>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between border-b border-slate-100 pb-3">
                  <dt className="font-semibold text-brand-navy">US FEG Patron Party</dt>
                  <dd>7-8 pm</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-semibold text-brand-navy">Gleason Gras</dt>
                  <dd>8-11 pm</dd>
                </div>
              </dl>
              <div className="mt-6 border-t border-slate-100 pt-6 text-sm">
                <p className="text-slate-500">To learn more about ways to support our mission, contact:</p>
                <p className="mt-2 font-semibold text-brand-navy">Katherine O’Hagan</p>
                <p className="text-slate-600">Team Gleason, Chief Development Officer</p>
                <p className="mt-2">
                  <a className="text-brand-blue" href="tel:5046884734">
                    (504) 688-4734
                  </a>
                </p>
                <p>
                  <a className="break-all text-brand-blue" href="mailto:Katherine.OHagan@TeamGleason.org">
                    Katherine.OHagan@TeamGleason.org
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
