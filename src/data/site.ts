export const contact = {
  phone: '504-220-3166',
  email: 'rod@usfeg.org',
  addressLine1: '1544 Stillwater Dr.',
  addressLine2: 'Mandeville, LA 70471',
}

export const externalLinks = {
  swagStore: 'https://www.splashbrandslite.com/',
  memberSite: 'https://usfeg.site-ym.com/login.aspx',
}

export const navItems = [
  { label: 'About Us', to: '/about-us' },
  { label: 'From the Founder', to: '/from-the-founder' },
  { label: 'Chapters', to: '/join-us-feg' },
  { label: 'Conference', to: '/conference' },
  { label: 'Why US FEG?', to: '/team-3' },
  { label: 'Strategic Partners', to: '/team-4' },
  { label: 'Team Gleason', to: '/teamgleason' },
]

export const aboutBlurb =
  "US FEG is a financial executive networking group whose purpose is to give financial executives such as CFO's, Controllers, and Directors of Finance a forum to discuss issues with their peers."

export type Partner = { name: string; logo: string; wide?: boolean }

export const partnerTiers: { tier: string; color: string; partners: Partner[] }[] = [
  {
    tier: 'Title',
    color: 'bg-brand-blue',
    partners: [{ name: 'HUB International', logo: '/images/logos/logo-hub.jpg' }],
  },
  {
    tier: 'Gold',
    color: 'bg-brand-olive',
    partners: [
      { name: 'EisnerAmper', logo: '/images/logos/logo-eisneramper.png', wide: true },
      { name: 'Capital One', logo: '/images/logos/logo-capital-one.png' },
      { name: 'Crescent / Empact HR', logo: '/images/logos/logo-crescent.png' },
      { name: 'Bank of America', logo: '/images/logos/logo-bank-of-america.png', wide: true },
      { name: 'Wells Fargo', logo: '/images/logos/logo-wells-fargo.png' },
      { name: 'Chubb Benefits', logo: '/images/logos/logo-chubb.png' },
      { name: 'ClearPoint Health', logo: '/images/logos/logo-clearpoint.png', wide: true },
      { name: 'Team Gleason', logo: '/images/logos/logo-team-gleason.jpg', wide: true },
    ],
  },
  {
    tier: 'Silver',
    color: 'bg-brand-silver',
    partners: [
      { name: 'Chaffe', logo: '/images/logos/logo-chaffe.jpg' },
      { name: 'V.Graham', logo: '/images/logos/logo-vgraham.png' },
    ],
  },
  {
    tier: 'Bronze',
    color: 'bg-brand-bronze',
    partners: [
      { name: 'PGIM', logo: '/images/logos/logo-pgim.png' },
      { name: 'ACE Scholarships', logo: '/images/logos/logo-ace.png' },
      { name: 'Tulane Freeman School of Business', logo: '/images/logos/logo-tulane.jpg' },
      { name: 'The PCG - Personnel Consulting Group', logo: '/images/logos/logo-pcg.jpg' },
      { name: 'Ener Systems', logo: '/images/logos/logo-ener-systems.png' },
      { name: 'Hancock Whitney', logo: '/images/logos/logo-hancock-whitney.png' },
    ],
  },
]

export const chapters: { state: string; cities: string[] }[] = [
  { state: 'Alabama', cities: ['Birmingham', 'Mobile'] },
  { state: 'Florida', cities: ['Pensacola'] },
  {
    state: 'Louisiana',
    cities: [
      'Baton Rouge',
      'Covington',
      'Houma',
      'Lafayette',
      'Lake Charles',
      'Monroe',
      'New Orleans',
      'Ruston',
      'Shreveport',
    ],
  },
  { state: 'Mississippi', cities: ['Biloxi', 'Hattiesburg', 'Jackson'] },
  { state: 'Texas', cities: ['Austin', 'Dallas', 'Houston'] },
]

export const testimonials = [
  {
    name: 'Sherri Spinelli',
    company: 'Louisiana Restaurant Association',
    title: 'CFO',
    photo: '/images/photos/testimonial-sherri-spinelli.jpg',
  },
  {
    name: 'Casey Willis',
    company: 'EN Bisso & Son, Inc',
    title: 'CFO',
    photo: '/images/photos/testimonial-casey-willis.jpg',
  },
  {
    name: 'Alita Caparotta',
    company: 'New Orleans Convention Center',
    title: 'CAO',
    photo: '/images/photos/testimonial-alita-caparotta.jpg',
  },
  {
    name: 'Larry Smith',
    company: 'Auto-Chlor',
    title: 'CFO',
    photo: '/images/photos/testimonial-larry-smith.jpg',
  },
]

export type AgendaItem = {
  time: string
  title: string
  session?: string
  description?: string
  panelists?: { name: string; bio: string }[]
}

export const agenda: AgendaItem[] = [
  {
    time: '7:30 – 8:15 AM',
    title: 'Registration & Networking Breakfast',
    description:
      'Provide attendees with time to connect with peers, speakers, and sponsors before formal sessions begin.',
  },
  {
    time: '8:00 – 8:15 AM',
    title: 'Welcome & Opening Remarks from US FEG Founder & President Rod Nunez',
    description:
      'Set expectations for the day, outline learning objectives, and emphasize how the agenda aligns with today’s CFO responsibilities.',
  },
  {
    session: 'Session 1',
    time: '8:15 – 9:15 AM',
    title: 'Economic Outlook - Sarah House - Managing Director & Senior Economist - Wells Fargo & Company',
    description:
      'This session provides a data driven overview of the U.S. and global economic landscape with direct implications for financial strategy. Key Discussion Points: Interest rate outlook and capital market implications. Inflation trends and cost management planning. Labor market dynamics and wage pressure. Sector specific risks and opportunities. Forecast scenarios CFOs should be planning for.',
  },
  {
    session: 'Session 2',
    time: '9:15 – 10:15 AM',
    title: 'Insurance, Risk, & Cyber Update - Annette Dowdle & Allen Chapman - HUB International',
    description:
      'This session addresses the evolving risk environment facing organizations, with a strong focus on employee benefits, commercial insurance markets, and cyber exposure. Key Discussion Points: Current trends in employee benefits, property, casualty, and liability insurance. Cyber risk escalation and real world breach examples. Risk transfer strategies and policy design. Governance and compliance expectations for finance leaders. CFO’s role in enterprise risk management',
  },
  { time: '10:15 – 10:35 AM', title: 'Networking Break' },
  {
    session: 'Session 3',
    time: '10:35 – 11:35 PM',
    title: 'Leadership & Management with Julie Couret',
    description:
      'This session shifts from technical finance to people leadership, focusing on how CFOs lead teams during change. Key Discussion Points: Leading hybrid and multi generational teams. Managing performance while preventing burnout. Influencing across the executive team and board. Developing high potential finance talent. Leading through uncertainty and transformation.',
  },
  {
    session: 'Session 4',
    time: '11:35 AM – 12:35 PM',
    title:
      'Private Equity Panel including representatives from local private equity firms : M&A and Business Valuation',
    description:
      'An interactive panel discussion focused on mergers, acquisitions, and valuation in today’s competitive deal environment. Key Discussion Points: Current deal activity and valuation trends. What PE firms look for in acquisition targets. Preparing companies for a sale or recapitalization. Due diligence pitfalls and CFO best practices. Post transaction integration challenges.',
    panelists: [
      {
        name: 'Charles Cox',
        bio: "As Partner and Head of Business Development, Charles Cox leads LongueVue Capital's business development activities, including the sourcing, evaluation, and execution of new platform investments and add-on opportunities for existing portfolio companies. An active member of the private equity industry, Charles serves on the Board of Directors of the Southeastern SBIA and Louisiana ACG organizations.",
      },
      {
        name: 'David De Laureal',
        bio: 'David de Laureal is Founder and Managing Partner of Carr’s Hill Partners. He brings nearly 20 years of direct investment experience to CHP, having completed numerous private equity, private credit, venture capital and real estate transactions over his career.',
      },
      {
        name: 'Michael H. Schmidt',
        bio: 'Michael is the President of Chaffe Securities, Inc., where he oversees the firm’s Corporate Finance Group, providing leadership across the firm’s investment banking, mergers and acquisitions, financial restructuring, and special situations advisory services. He is a member of Chaffe’s Board of Directors and serves on the firm’s Fairness Opinion Committee, supporting boards, committees, and fiduciaries in transaction-related decision-making.',
      },
      {
        name: 'Sam Scofield',
        bio: 'Sam is a Principal at Black Bay, where he is involved with the firm’s efforts in sourcing investments, executing transactions, and monitoring active portfolio companies. Prior to joining Black Bay, Sam spent three years working in the Energy Investment Banking Group at BMO Capital Markets in Houston, where he focused on M&A advisory work and public and private capital raises within the energy industry.',
      },
    ],
  },
  { time: '12:35 – 1:30 PM', title: 'Networking Lunch' },
  {
    session: 'Session 5',
    time: '1:30 – 2:30 PM',
    title:
      'AI Practical Uses in the Workplace - Andrew Schwarz - Professor, Stephenson Department of Entrepreneurship & Information Systems - LSU',
    description:
      'An educational session demystifying artificial intelligence and focusing on realistic, responsible applications in business settings. What AI can and cannot do today. Productivity gains from generative AI tools. Risks related to data, privacy, and governance. Change management and adoption challenges. Preparing employees for AI enabled workflows.',
  },
  {
    session: 'Session 6',
    time: '2:30 – 3:40 PM',
    title: 'The Digital CFO: AI Practical Use Demonstrations by US FEG members',
    description:
      'A peer led showcase where CFOs demonstrate real, working examples of AI and digital tools used in their organizations. Examples May Include AI assisted forecasting and budgeting, Automating variance analysis and reporting, Contract review and compliance checks, Vendor analysis and cash flow optimization, Internal controls and audit support tools.',
  },
  { time: '3:40 – 4:00 PM', title: 'Afternoon Break' },
  {
    time: '4:00 – 5:15 PM',
    title: 'US LEG Members: Breakout Session in Bolden 6 with Julie Couret',
  },
  {
    session: 'Session 7',
    time: '4:00 – 4:40 PM',
    title: 'AR/AP Automation - Randy LeBeau - EisnerAmper',
    description:
      'A focused discussion on automating accounts receivable and payable to optimize working capital and reduce manual effort. Automation opportunities across AR and AP. Reducing days sales outstanding (DSO). Fraud prevention and internal controls. Integration with existing ERP systems. Measuring ROI on finance automation.',
  },
  {
    session: 'Session 8',
    time: '4:40 – 5:15 PM',
    title: 'Tax Update - Gina Rachel - EisnerAmper',
    description:
      'A timely update on federal, state, and local tax developments affecting CFO decision making. Recent legislative and regulatory changes. Planning opportunities and compliance risks. Business deductions and credits. State and local tax considerations. What CFOs should watch in the coming year.',
  },
  {
    time: '5:15 – 5:30 PM',
    title: "Closing Remarks & Key Takeaway's",
    description:
      'Summarize the day’s major insights, reinforce next steps, and encourage continued peer collaboration beyond the conference.',
  },
  { time: '5:30 PM', title: 'Cocktail Reception - Regency Club - 32nd floor' },
]

export const sponsorshipLevels = [
  {
    level: 'Gold',
    price: '$3000',
    color: 'border-brand-gold',
    perks: [
      '5 minutes to speak about your company at the conference',
      'Introduce one of the session speakers',
      'Company logo on US FEG internal member Event page for 6 months',
      'One Strategic Partner Spotlight marketing email to be sent to entire US FEG network',
      'Large company logo on US FEG website as Strategic Partner for 6 months',
      'Large company logo on conference promotional emails',
      'Large company logo on conference website',
      'Two conference registrations',
      'Two invitations to cocktail reception',
      'Table to display promotional materials during the conference',
    ],
  },
  {
    level: 'Silver',
    price: '$2000',
    color: 'border-brand-silver',
    perks: [
      'Medium company logo on US FEG website as Strategic Partner for 6 months',
      'One Strategic Partner Spotlight marketing email to be sent to entire US FEG network',
      'Medium company logo on conference promotional emails',
      'Medium company logo on conference website',
      'Two conference registrations',
      'Two invitations to cocktail reception',
      'Table to display promotional materials during the conference',
    ],
  },
  {
    level: 'Bronze',
    price: '$1000',
    color: 'border-brand-bronze',
    perks: [
      'Small company logo on conference promotional emails',
      'Small company logo on conference website',
      'One conference registration',
      'One invitation to cocktail reception',
      'Table to display promotional materials during the conference',
    ],
  },
]

export const galleryImages = Array.from({ length: 32 }, (_, i) => {
  const n = String(i + 1).padStart(2, '0')
  return `/images/gallery/gallery-${n}.jpg`
})

export const chapterPhotos = Array.from({ length: 7 }, (_, i) => `/images/photos/chapter-${i + 1}.jpg`)

export const heroPhotos = Array.from({ length: 5 }, (_, i) => `/images/photos/hero-${i + 1}.jpg`)
