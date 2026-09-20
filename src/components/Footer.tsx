import { Link } from 'react-router-dom'
import { aboutBlurb, contact, externalLinks, navItems, site } from '../data/site'
import { asset } from '../lib/asset'
import ContactForm from './ContactForm'

export default function Footer() {
  return (
    <footer id="contact" className="bg-brand-navy-dark text-white">
      <div className="container-x grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-12 lg:py-20">
        <div className="lg:col-span-4">
          <img src={asset(site.logo)} alt="" className="h-12 w-auto rounded-lg bg-white px-3 py-2" />
          <p className="eyebrow mt-6">About Us</p>
          <p className="mt-4 text-sm leading-relaxed text-white/75">{aboutBlurb}</p>
        </div>

        <div className="lg:col-span-3">
          <p className="eyebrow">Address</p>
          <ul className="mt-4 space-y-3 text-sm text-white/85">
            <li>
              <a className="hover:text-brand-gold-light" href={`tel:${contact.phone}`}>
                {contact.phone}
              </a>
            </li>
            <li>
              {contact.addressLine1}
              <br />
              {contact.addressLine2}
            </li>
            <li>
              <a className="underline decoration-brand-gold underline-offset-4 hover:text-brand-gold-light" href={`mailto:${contact.email}`}>
                {contact.email}
              </a>
            </li>
          </ul>
          <p className="eyebrow mt-8">Explore</p>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-white/85 md:grid-cols-1">
            {navItems.map((n) => (
              <li key={n.to}>
                <Link className="hover:text-brand-gold-light" to={n.to}>
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <a className="hover:text-brand-gold-light" href={externalLinks.swagStore} target="_blank" rel="noreferrer">
                Swag Store ↗
              </a>
            </li>
            <li>
              <a className="hover:text-brand-gold-light" href={externalLinks.memberSite} target="_blank" rel="noreferrer">
                Member Site ↗
              </a>
            </li>
          </ul>
        </div>

        <div className="md:col-span-2 lg:col-span-5">
          <p className="eyebrow">Contact Us</p>
          <p className="mt-4 text-sm text-white/75">{site.contactFormIntro}</p>
          <div className="mt-5">
            <ContactForm />
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-2 py-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {site.siteName}</p>
          <p>{site.tagline}</p>
        </div>
      </div>
    </footer>
  )
}
