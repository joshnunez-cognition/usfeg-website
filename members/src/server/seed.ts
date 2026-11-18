import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import type { Db, MemberRow, Network } from './db'
import { hashPassword } from './passwords'
import { addDays, id, nowIso, paymentId, slug } from './ids'

/**
 * Local demo data so the member site can be clicked through before any
 * YourMembership export exists. Not used when NODE_ENV=production.
 * People and companies here are fictional. Chapter cities for FEG match the
 * public site; the single LEG chapter is a placeholder (see README).
 */

export const DEMO_ADMIN_EMAIL = 'rod@usfeg.org'
export const DEMO_ADMIN_PASSWORD = 'usfeg-demo-admin'
export const DEMO_MEMBER_PASSWORD = 'usfeg-demo-member'

const FEG_CHAPTERS: [string, string[]][] = [
  ['Alabama', ['Birmingham', 'Mobile']],
  ['Florida', ['Pensacola']],
  ['Louisiana', ['Baton Rouge', 'Covington', 'Houma', 'Lafayette', 'Lake Charles', 'Monroe', 'New Orleans', 'Ruston', 'Shreveport']],
  ['Mississippi', ['Biloxi', 'Hattiesburg', 'Jackson']],
  ['Texas', ['Austin', 'Dallas', 'Houston']],
  ['Georgia', ['Atlanta']],
]

export function seedDatabase(db: Db, uploadDir: string, opts: { demo: boolean; adminEmail?: string; adminPassword?: string }) {
  if (db.userCount() > 0) return { seeded: false as const }
  db.setSetting('dues_feg_cents', '49500')
  db.setSetting('dues_leg_cents', '49500')
  db.setSetting('renewal_lead_days', '30')
  db.setSetting('rebilling_enabled', '1')

  let sort = 0
  for (const [state, cities] of FEG_CHAPTERS) {
    for (const name of cities) {
      db.insertChapter({ id: `feg-${slug(name)}`, network: 'FEG', name, state, sort_order: sort++ })
    }
  }
  // Placeholder until the five real US LEG chapters are imported from YourMembership.
  db.insertChapter({ id: 'leg-new-orleans', network: 'LEG', name: 'New Orleans', state: 'Louisiana', sort_order: 0 })

  const adminEmail = opts.adminEmail || DEMO_ADMIN_EMAIL
  const adminPassword = opts.adminPassword || (opts.demo ? DEMO_ADMIN_PASSWORD : '')
  if (adminPassword) {
    const now = nowIso()
    db.insertUser({
      id: id(),
      email: adminEmail,
      password_hash: hashPassword(adminPassword),
      role: 'admin',
      status: 'active',
      created_at: now,
      updated_at: now,
      last_login_at: null,
    })
  }

  if (!opts.demo) return { seeded: true as const, demo: false as const }

  const password = hashPassword(DEMO_MEMBER_PASSWORD)
  const chapter = (network: Network, name: string) => db.findChapter(network, name)?.id ?? null

  const jordan = member(db, password, {
    email: 'jordan.hale@example.com',
    first: 'Jordan',
    last: 'Hale',
    company: 'Hale Manufacturing',
    title: 'Chief Financial Officer',
    network: 'FEG',
    chapterId: chapter('FEG', 'New Orleans'),
    phone: '504-555-0148',
    city: 'New Orleans',
    state: 'LA',
    showEmail: 1,
    showPhone: 1,
    status: 'active',
    membership: 'active',
    renewalDays: 320,
    paid: true,
  })
  member(db, password, {
    email: 'camille.brooks@example.com',
    first: 'Camille',
    last: 'Brooks',
    company: 'Delta Marine Services',
    title: 'Controller',
    network: 'FEG',
    chapterId: chapter('FEG', 'Baton Rouge'),
    phone: '225-555-0172',
    city: 'Baton Rouge',
    state: 'LA',
    showEmail: 1,
    showPhone: 0,
    status: 'active',
    membership: 'active',
    renewalDays: 40,
    paid: true,
  })
  member(db, password, {
    email: 'andre.washington@example.com',
    first: 'Andre',
    last: 'Washington',
    company: 'Pine Belt Health',
    title: 'VP of Finance',
    network: 'FEG',
    chapterId: chapter('FEG', 'Hattiesburg'),
    phone: '601-555-0190',
    city: 'Hattiesburg',
    state: 'MS',
    showEmail: 0,
    showPhone: 0,
    status: 'active',
    membership: 'active',
    renewalDays: 200,
    paid: true,
  })
  member(db, password, {
    email: 'priya.shah@example.com',
    first: 'Priya',
    last: 'Shah',
    company: 'Bayou Logistics',
    title: 'Director of Finance',
    network: 'FEG',
    chapterId: chapter('FEG', 'Lafayette'),
    phone: '337-555-0114',
    city: 'Lafayette',
    state: 'LA',
    showEmail: 1,
    showPhone: 0,
    status: 'active',
    membership: 'active',
    renewalDays: 20,
    paid: true,
  })
  member(db, password, {
    email: 'elena.vasquez@example.com',
    first: 'Elena',
    last: 'Vasquez',
    company: 'Vasquez & Co.',
    title: 'Chief Executive Officer',
    network: 'LEG',
    chapterId: chapter('LEG', 'New Orleans'),
    phone: '504-555-0166',
    city: 'New Orleans',
    state: 'LA',
    showEmail: 1,
    showPhone: 1,
    status: 'active',
    membership: 'active',
    renewalDays: 150,
    paid: true,
  })
  member(db, password, {
    email: 'chris.landry@example.com',
    first: 'Chris',
    last: 'Landry',
    company: 'Landry Foods',
    title: 'Controller',
    network: 'FEG',
    chapterId: chapter('FEG', 'Covington'),
    phone: '985-555-0133',
    city: 'Covington',
    state: 'LA',
    showEmail: 0,
    showPhone: 0,
    status: 'pending_approval',
    membership: 'pending',
    renewalDays: 365,
    paid: true,
  })
  member(db, null, {
    email: 'sam.nguyen@example.com',
    first: 'Sam',
    last: 'Nguyen',
    company: 'Gulf Coast Bank',
    title: 'CFO',
    network: 'FEG',
    chapterId: chapter('FEG', 'Houston'),
    phone: '',
    city: 'Houston',
    state: 'TX',
    showEmail: 0,
    showPhone: 0,
    status: 'invited',
    membership: 'active',
    renewalDays: 180,
    paid: true,
  })

  const now = Date.now()
  const lunchId = id()
  db.insertEvent({
    id: lunchId,
    title: 'New Orleans Chapter Lunch',
    type: 'chapter_meeting',
    chapter_id: chapter('FEG', 'New Orleans'),
    description:
      'Monthly closed-square lunch. A short speaker, then peer discussion. Registration includes your lunch order so the restaurant can prep the right count.',
    location: 'Commander’s Palace, 1403 Washington Ave, New Orleans',
    starts_at: new Date(now + 21 * 86400000).toISOString(),
    ends_at: new Date(now + 21 * 86400000 + 2 * 3600000).toISOString(),
    capacity: 25,
    price_cents: 0,
    status: 'published',
    created_at: nowIso(),
    updated_at: nowIso(),
  })
  for (const [index, label] of ['Grilled chicken', 'Shrimp pasta', 'Vegetarian plate'].entries()) {
    db.insertLunch({ id: id(), event_id: lunchId, label, sort_order: index })
  }

  db.insertEvent({
    id: id(),
    title: 'US FEG & US LEG Fall Conference',
    type: 'conference',
    chapter_id: null,
    description:
      'All-chapter conference in New Orleans. Paid registration. CPE sessions run through the day, with time set aside for the US LEG roundtable.',
    location: 'Higgins Hotel, New Orleans',
    starts_at: new Date(now + 45 * 86400000).toISOString(),
    ends_at: new Date(now + 46 * 86400000).toISOString(),
    capacity: 200,
    price_cents: 17500,
    status: 'published',
    created_at: nowIso(),
    updated_at: nowIso(),
  })

  db.insertEvent({
    id: id(),
    title: 'Ethics Workshop',
    type: 'workshop',
    chapter_id: chapter('FEG', 'Baton Rouge'),
    description: 'Half-day ethics course for CPE credit. Registration is paid separately from dues.',
    location: 'Baton Rouge chapter, downtown',
    starts_at: new Date(now + 70 * 86400000).toISOString(),
    ends_at: null,
    capacity: 40,
    price_cents: 7500,
    status: 'published',
    created_at: nowIso(),
    updated_at: nowIso(),
  })

  const published = nowIso()
  db.insertJob({
    id: id(),
    title: 'Controller',
    organization: 'Regional Bank of Louisiana',
    location: 'New Orleans, LA',
    category: 'Accounting',
    description: 'Hands-on controller role for a $400M community bank. Peer-referred through the New Orleans chapter.',
    contact_email: 'jobs@example.com',
    url: '',
    status: 'published',
    posted_by: jordan,
    created_at: published,
    published_at: published,
  })
  db.insertJob({
    id: id(),
    title: 'Chief Financial Officer',
    organization: 'Port Services Group',
    location: 'Houston, TX',
    category: 'Executive',
    description: 'CFO opening at a privately held port-services company. Members can apply by email.',
    contact_email: 'careers@example.com',
    url: '',
    status: 'published',
    posted_by: null,
    created_at: published,
    published_at: published,
  })
  db.insertJob({
    id: id(),
    title: 'Accounting Manager',
    organization: 'Sample Industrial',
    location: 'Mobile, AL',
    category: 'Accounting',
    description: 'Submitted by a member and waiting for Rod to publish or reject it.',
    contact_email: 'hr@example.com',
    url: '',
    status: 'pending',
    posted_by: jordan,
    created_at: published,
    published_at: null,
  })

  mkdirSync(uploadDir, { recursive: true })
  const stored = 'a1b2c3d4e5f60718293a4b5c6d7e8f90.txt'
  writeFileSync(
    path.join(uploadDir, stored),
    'US FEG chapter host notes\n\nClosed-square seating. Collect lunch orders from the member site the Friday before the meeting.\n',
  )
  db.insertFile({
    id: id(),
    title: 'Chapter host notes',
    description: 'How a chapter lunch is run, including the lunch-order count.',
    folder: 'Chapter operations',
    filename: 'chapter-host-notes.txt',
    stored_name: stored,
    mime: 'text/plain',
    size: 120,
    uploaded_by: null,
    created_at: nowIso(),
  })

  if (jordan) {
    const paidAt = addDays(nowIso(), -40)
    db.insertPayment({
      id: paymentId(),
      user_id: jordan,
      purpose: 'dues_signup',
      registration_id: null,
      amount_cents: 49500,
      status: 'approved',
      mode: 'manual',
      rebilling: 0,
      bluepay_trans_id: 'seed-jordan',
      bluepay_rebill_id: null,
      message: 'Sample dues payment',
      card_mask: '•••• 1111',
      created_at: paidAt,
      updated_at: paidAt,
    })
  }

  return { seeded: true as const, demo: true as const }
}

function member(
  db: Db,
  passwordHash: string | null,
  input: {
    email: string
    first: string
    last: string
    company: string
    title: string
    network: Network
    chapterId: string | null
    phone: string
    city: string
    state: string
    showEmail: number
    showPhone: number
    status: 'active' | 'pending_approval' | 'invited'
    membership: 'active' | 'pending'
    renewalDays: number
    paid: boolean
  },
) {
  const now = nowIso()
  const userId = id()
  db.insertUser({
    id: userId,
    email: input.email,
    password_hash: passwordHash,
    role: 'member',
    status: input.status,
    created_at: now,
    updated_at: now,
    last_login_at: null,
  })
  const row: MemberRow = {
    user_id: userId,
    first_name: input.first,
    last_name: input.last,
    company: input.company,
    title: input.title,
    network: input.network,
    chapter_id: input.chapterId,
    phone: input.phone,
    city: input.city,
    state: input.state,
    linkedin: '',
    show_email: input.showEmail,
    show_phone: input.showPhone,
    show_in_directory: 1,
    membership_status: input.membership,
    renewal_due_at: addDays(now, input.renewalDays),
    bluepay_rebill_id: null,
    dues_paid_at: input.paid ? now : null,
    reminder_sent_at: null,
    approved_at: input.status === 'active' ? now : null,
    approved_by: null,
  }
  db.insertMember(row)
  return userId
}
