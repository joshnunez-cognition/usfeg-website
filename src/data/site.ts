// All editable content lives in src/content/*.json and is managed through
// Decap CMS at /admin. This module only adds typing and presentation
// metadata (colors, nav routes) that editors should not need to touch.
import settings from '../content/settings.json'
import partnersContent from '../content/partners.json'
import chaptersContent from '../content/chapters.json'
import testimonialsContent from '../content/testimonials.json'
import conferenceContent from '../content/conference.json'
import homeContent from '../content/home.json'
import aboutContent from '../content/about.json'
import founderContent from '../content/founder.json'
import teamGleasonContent from '../content/teamgleason.json'

export const site = settings
export const contact = settings.contact
export const externalLinks = settings.externalLinks
export const aboutBlurb = settings.aboutBlurb

export const navItems = [
  { label: 'About Us', to: '/about-us' },
  { label: 'From the Founder', to: '/from-the-founder' },
  { label: 'Chapters', to: '/join-us-feg' },
  { label: 'Conference', to: '/conference' },
  { label: 'Why US FEG?', to: '/team-3' },
  { label: 'Strategic Partners', to: '/team-4' },
  { label: 'Team Gleason', to: '/teamgleason' },
]

export type Partner = { name: string; logo: string; wide?: boolean }

const tierColors: Record<string, string> = {
  Title: 'bg-brand-blue',
  Gold: 'bg-brand-olive',
  Silver: 'bg-brand-silver',
  Bronze: 'bg-brand-bronze',
}

export const partnerTiers: { tier: string; color: string; partners: Partner[] }[] = partnersContent.tiers.map(
  (t) => ({ ...t, color: tierColors[t.tier] ?? 'bg-brand-navy' }),
)

export const chaptersPage = chaptersContent
export const chapters: { state: string; cities: string[] }[] = chaptersContent.states
export const chapterPhotos: string[] = chaptersContent.photos

export const testimonialsPage = testimonialsContent
export const testimonials = testimonialsContent.items

export type AgendaItem = {
  time: string
  title: string
  session?: string
  description?: string
  panelists?: { name: string; bio: string }[]
}

const levelColors: Record<string, string> = {
  Gold: 'border-brand-gold',
  Silver: 'border-brand-silver',
  Bronze: 'border-brand-bronze',
}

export const conference = conferenceContent
export const agenda: AgendaItem[] = conferenceContent.agenda
export const sponsorshipLevels = conferenceContent.sponsorshipLevels.map((s) => ({
  ...s,
  color: levelColors[s.level] ?? 'border-brand-navy',
}))
export const galleryImages: string[] = conferenceContent.gallery.map((g) => g.image)

export const home = homeContent
export const heroPhotos: string[] = homeContent.heroPhotos.map((h) => h.image)

export const about = aboutContent
export const founder = founderContent
export const teamGleason = teamGleasonContent
