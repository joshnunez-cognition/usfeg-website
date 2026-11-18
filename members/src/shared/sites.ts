/**
 * One codebase, two deployments. Each site has its own database, members,
 * and admin. They share BluePay credentials; charges are tagged with the site code.
 * Colors match www.usfeg.org today. US LEG can change its palette here later.
 */

export type SiteCode = 'FEG' | 'LEG'
export type SiteId = 'feg' | 'leg'

export type SiteColors = {
  navy: string
  navyDark: string
  blue: string
  gold: string
  goldLight: string
  ink: string
}

export type SiteChapter = { name: string; state: string }

export type SiteDefinition = {
  id: SiteId
  code: SiteCode
  name: string
  shortName: string
  tagline: string
  /** Public SVG. Null uses logoText as a wordmark. */
  logo: string | null
  logoText: string | null
  colors: SiteColors
  publicSiteUrl: string
  publicSiteLabel: string
  domain: string
  mailFrom: string
  contact: { phone: string; email: string; addressLine1: string; addressLine2: string }
  /** Production URL of the other member site. Dev overrides this with localhost. */
  sibling: { name: string; url: string }
  chapters: SiteChapter[]
}

const fegColors: SiteColors = {
  navy: '#021464',
  navyDark: '#010b3a',
  blue: '#034c8c',
  gold: '#a38a00',
  goldLight: '#c9ad1a',
  ink: '#2f2f2f',
}

const sharedOffice = {
  phone: '504-220-3166',
  email: 'rod@usfeg.org',
  addressLine1: '1544 Stillwater Dr.',
  addressLine2: 'Mandeville, LA 70471',
}

/** Cities listed on www.usfeg.org. The full 27 come from the YM member export. */
const fegChapters: SiteChapter[] = [
  { name: 'Birmingham', state: 'Alabama' },
  { name: 'Mobile', state: 'Alabama' },
  { name: 'Pensacola', state: 'Florida' },
  { name: 'Baton Rouge', state: 'Louisiana' },
  { name: 'Covington', state: 'Louisiana' },
  { name: 'Houma', state: 'Louisiana' },
  { name: 'Lafayette', state: 'Louisiana' },
  { name: 'Lake Charles', state: 'Louisiana' },
  { name: 'Monroe', state: 'Louisiana' },
  { name: 'New Orleans', state: 'Louisiana' },
  { name: 'Ruston', state: 'Louisiana' },
  { name: 'Shreveport', state: 'Louisiana' },
  { name: 'Biloxi', state: 'Mississippi' },
  { name: 'Hattiesburg', state: 'Mississippi' },
  { name: 'Jackson', state: 'Mississippi' },
  { name: 'Austin', state: 'Texas' },
  { name: 'Dallas', state: 'Texas' },
  { name: 'Houston', state: 'Texas' },
  { name: 'Atlanta', state: 'Georgia' },
]

/**
 * Five slots for US LEG. The real chapter names are not on the public site;
 * replace these from the YourMembership export (Admin → Settings, or edit this list).
 */
const legChapters: SiteChapter[] = [
  { name: 'Chapter 1', state: '' },
  { name: 'Chapter 2', state: '' },
  { name: 'Chapter 3', state: '' },
  { name: 'Chapter 4', state: '' },
  { name: 'Chapter 5', state: '' },
]

export const SITES: Record<SiteId, SiteDefinition> = {
  feg: {
    id: 'feg',
    code: 'FEG',
    name: 'United States Financial Executive Group',
    shortName: 'US FEG',
    tagline: 'Your Network is Your Net Worth',
    logo: '/logo.svg',
    logoText: null,
    colors: fegColors,
    publicSiteUrl: 'https://www.usfeg.org',
    publicSiteLabel: 'USFEG.org',
    domain: 'members.usfeg.org',
    mailFrom: 'US FEG <rod@usfeg.org>',
    contact: sharedOffice,
    sibling: { name: 'US LEG', url: 'https://members.usleg.org' },
    chapters: fegChapters,
  },
  leg: {
    id: 'leg',
    code: 'LEG',
    name: 'US LEG',
    shortName: 'US LEG',
    tagline: 'Your Network is Your Net Worth',
    logo: null,
    logoText: 'US LEG',
    colors: { ...fegColors },
    publicSiteUrl: 'https://www.usleg.org',
    publicSiteLabel: 'USLEG.org',
    domain: 'members.usleg.org',
    mailFrom: 'US LEG <rod@usleg.org>',
    contact: { ...sharedOffice, email: 'rod@usleg.org' },
    sibling: { name: 'US FEG', url: 'https://members.usfeg.org' },
    chapters: legChapters,
  },
}

export function siteById(id: string | undefined): SiteDefinition {
  if (id === 'leg' || id === 'LEG') return SITES.leg
  if (id === 'feg' || id === 'FEG' || !id) return SITES.feg
  throw new Error(`Unknown SITE "${id}". Use feg or leg.`)
}

/** BluePay ORDER_ID / INVOICE_ID. The prefix is how the shared merchant account tells the sites apart. */
export function paymentOrderId(code: SiteCode, paymentId: string) {
  return `${code}-${paymentId}`
}

/** BluePay CUSTOM_ID2. Sealed with the charge. Format: "FEG:dues_signup". */
export function paymentSiteField(code: SiteCode, purpose: string) {
  return `${code}:${purpose}`
}

export function orderIdMatchesSite(orderId: string, code: SiteCode) {
  return orderId.startsWith(`${code}-`)
}
