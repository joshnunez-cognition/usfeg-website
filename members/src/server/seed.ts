import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { paymentOrderId, type SiteDefinition } from '../shared/sites'
import type { Db, MemberRow } from './db'
import { hashPassword } from './passwords'
import { sameCentralDay, upcomingCentral } from '../shared/central'
import { addDays, id, nowIso, paymentId, slug } from './ids'

/**
 * Local demo data so the member site can be clicked through before any
 * YourMembership export exists. Not used when NODE_ENV=production.
 * People and companies here are fictional. Chapters come from the site definition.
 */

export const DEMO_ADMIN_EMAIL = 'rod@usfeg.org'
export const DEMO_ADMIN_PASSWORD = 'usfeg-demo-admin'
export const DEMO_MEMBER_PASSWORD = 'usfeg-demo-member'

export const DEMO_MEMBER_EMAIL = {
  feg: 'jordan.hale@example.com',
  leg: 'elena.vasquez@example.com',
} as const

export function seedDatabase(db: Db, uploadDir: string, site: SiteDefinition, opts: { demo: boolean; adminEmail?: string; adminPassword?: string }) {
  if (db.userCount() > 0) return { seeded: false as const }
  db.setSetting('dues_cents', '49500')
  db.setSetting('renewal_lead_days', '30')
  db.setSetting('rebilling_enabled', '1')

  site.chapters.forEach((chapter, sort) => {
    db.insertChapter({ id: slug(chapter.name), name: chapter.name, state: chapter.state, sort_order: sort })
  })

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
  const chapter = (name: string) => db.findChapter(name)?.id ?? null
  const feg = site.id === 'feg'

  const featured = feg
    ? member(db, password, {
    email: 'jordan.hale@example.com',
    first: 'Jordan',
    last: 'Hale',
    company: 'Hale Manufacturing',
    title: 'Chief Financial Officer',
    chapterId: chapter('New Orleans'),
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
    : member(db, password, {
    email: 'elena.vasquez@example.com',
    first: 'Elena',
    last: 'Vasquez',
    company: 'Vasquez & Co.',
    title: 'Chief Executive Officer',
    chapterId: chapter('Chapter 1'),
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
  if (feg) member(db, password, {
    email: 'camille.brooks@example.com',
    first: 'Camille',
    last: 'Brooks',
    company: 'Delta Marine Services',
    title: 'Controller',
    chapterId: chapter('Baton Rouge'),
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
  if (feg) member(db, password, {
    email: 'andre.washington@example.com',
    first: 'Andre',
    last: 'Washington',
    company: 'Pine Belt Health',
    title: 'VP of Finance',
    chapterId: chapter('Hattiesburg'),
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
  if (feg) member(db, password, {
    email: 'priya.shah@example.com',
    first: 'Priya',
    last: 'Shah',
    company: 'Bayou Logistics',
    title: 'Director of Finance',
    chapterId: chapter('Lafayette'),
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
  if (feg) member(db, password, {
    email: 'chris.landry@example.com',
    first: 'Chris',
    last: 'Landry',
    company: 'Landry Foods',
    title: 'Controller',
    chapterId: chapter('Covington'),
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
  if (feg) member(db, null, {
    email: 'sam.nguyen@example.com',
    first: 'Sam',
    last: 'Nguyen',
    company: 'Gulf Coast Bank',
    title: 'CFO',
    chapterId: chapter('Houston'),
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
  if (!feg) {
    member(db, password, {
      email: 'marcus.ellison@example.com',
      first: 'Marcus',
      last: 'Ellison',
      company: 'Ellison Counsel',
      title: 'Managing Partner',
      chapterId: chapter('Chapter 2'),
      phone: '',
      city: '',
      state: '',
      showEmail: 0,
      showPhone: 0,
      status: 'active',
      membership: 'active',
      renewalDays: 90,
      paid: true,
    })
  }

  // Chapter lunches run 12:00–1:00 PM Central. June and December have no
  // chapter meetings (the conferences replace them), so samples skip those months.
  const skipConferenceMonths = [6, 12]
  const lunchStart = upcomingCentral({ weekday: 3, hour: 12, minute: 0, minDaysAhead: 7, skipMonths: skipConferenceMonths })
  const lunchId = id()
  db.insertEvent({
    id: lunchId,
    title: feg ? 'New Orleans Chapter Lunch' : 'Chapter 1 Lunch',
    type: 'chapter_meeting',
    chapter_id: chapter(feg ? 'New Orleans' : 'Chapter 1'),
    description:
      'Monthly closed-square lunch. A short speaker, then peer discussion. Registration includes your lunch order so the restaurant can prep the right count.',
    location: feg ? 'Commander’s Palace, 1403 Washington Ave, New Orleans' : 'Chapter 1 meeting room',
    starts_at: lunchStart,
    ends_at: sameCentralDay(lunchStart, 13, 0),
    capacity: 25,
    price_cents: 0,
    status: 'published',
    created_at: nowIso(),
    updated_at: nowIso(),
  })
  for (const [index, label] of ['Grilled chicken', 'Shrimp pasta', 'Vegetarian plate'].entries()) {
    db.insertLunch({ id: id(), event_id: lunchId, label, sort_order: index })
  }

  const conferenceStart = upcomingCentral({ weekday: 4, hour: 8, minute: 30, minDaysAhead: 50, skipMonths: skipConferenceMonths })
  db.insertEvent({
    id: id(),
    title: `${site.shortName} Conference`,
    type: 'conference',
    chapter_id: null,
    description:
      `All-chapter ${site.shortName} conference. Paid registration, with CPE sessions through the day.`,
    location: 'Higgins Hotel, New Orleans',
    starts_at: conferenceStart,
    ends_at: sameCentralDay(conferenceStart, 16, 30),
    capacity: 200,
    price_cents: 17500,
    status: 'published',
    created_at: nowIso(),
    updated_at: nowIso(),
  })

  const workshopStart = upcomingCentral({ weekday: 2, hour: 9, minute: 0, minDaysAhead: 28, skipMonths: skipConferenceMonths })
  db.insertEvent({
    id: id(),
    title: 'Ethics Workshop',
    type: 'workshop',
    chapter_id: chapter(feg ? 'Baton Rouge' : 'Chapter 2'),
    description: 'Half-day ethics course for CPE credit. Registration is paid separately from dues.',
    location: feg ? 'Baton Rouge chapter, downtown' : 'Chapter 2 meeting room',
    starts_at: workshopStart,
    ends_at: sameCentralDay(workshopStart, 12, 0),
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
    posted_by: featured,
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
    posted_by: featured,
    created_at: published,
    published_at: null,
  })

  mkdirSync(uploadDir, { recursive: true })
  const stored = 'a1b2c3d4e5f60718293a4b5c6d7e8f90.txt'
  writeFileSync(
    path.join(uploadDir, stored),
    `${site.shortName} chapter host notes\n\nClosed-square seating. Collect lunch orders from the member site the Friday before the meeting.\n`,
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

  if (featured) {
    const paidAt = addDays(nowIso(), -40)
    const payId = paymentId()
    db.insertPayment({
      id: payId,
      order_id: paymentOrderId(site.code, payId),
      site_code: site.code,
      user_id: featured,
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
