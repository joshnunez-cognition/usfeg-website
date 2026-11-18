import { parseCsv, pick } from './csv'
import type { Db, EventType, MembershipStatus, Network } from './db'
import { hashPassword } from './passwords'
import { id, isEmail, nowIso, slug, tokenPair } from './ids'
import type { MailMessage } from './mail'

export type ImportResult = { created: number; updated: number; skipped: number; errors: string[] }

type Mailer = (message: MailMessage) => void

const MEMBER_EMAIL = ['email', 'e-mail', 'email address', 'primary email', 'e mail']
const FIRST = ['first name', 'firstname', 'first']
const LAST = ['last name', 'lastname', 'last']
const COMPANY = ['company', 'organization', 'organisation', 'employer']
const TITLE = ['title', 'job title']
const NETWORK = ['network', 'group', 'directory', 'member type']
const CHAPTER = ['chapter', 'chapter name']
const PHONE = ['phone', 'phone number', 'mobile']
const CITY = ['city']
const STATE = ['state']
const STATUS = ['status', 'membership status', 'member status']
const RENEWAL = ['renewal', 'renewal date', 'renewal due', 'expiration', 'expiration date', 'paid through']

export function importMembers(db: Db, csv: string, opts: { sendInvites: boolean; publicUrl: string; send: Mailer }): ImportResult {
  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] }
  const rows = parseCsv(csv)
  rows.forEach((row, index) => {
    const line = index + 2
    const email = pick(row, MEMBER_EMAIL).toLowerCase()
    if (!email) {
      result.skipped += 1
      return
    }
    if (!isEmail(email)) {
      result.errors.push(`Line ${line}: "${email}" is not an email address.`)
      return
    }
    const first = pick(row, FIRST) || 'Member'
    const last = pick(row, LAST) || ''
    const network = parseNetwork(pick(row, NETWORK))
    const chapterName = pick(row, CHAPTER)
    const chapter = chapterName ? ensureChapter(db, network, chapterName, pick(row, STATE)) : null
    const membership = parseMembership(pick(row, STATUS))
    const renewal = parseDate(pick(row, RENEWAL))
    const existing = db.getUserByEmail(email)
    if (existing) {
      const member = db.getMember(existing.id)
      if (!member) {
        result.errors.push(`Line ${line}: ${email} is a user without a member profile.`)
        return
      }
      db.updateMember(existing.id, {
        first_name: first,
        last_name: last,
        company: pick(row, COMPANY),
        title: pick(row, TITLE),
        network,
        chapter_id: chapter?.id ?? member.chapter_id,
        phone: pick(row, PHONE) || member.phone,
        city: pick(row, CITY) || member.city,
        state: pick(row, STATE) || member.state,
        membership_status: membership,
        ...(renewal ? { renewal_due_at: renewal } : {}),
      })
      result.updated += 1
      return
    }
    const userId = id()
    const now = nowIso()
    const active = membership === 'active' || membership === 'waived'
    db.insertUser({
      id: userId,
      email,
      password_hash: null,
      role: 'member',
      status: 'invited',
      created_at: now,
      updated_at: now,
      last_login_at: null,
    })
    db.insertMember({
      user_id: userId,
      first_name: first,
      last_name: last,
      company: pick(row, COMPANY),
      title: pick(row, TITLE),
      network,
      chapter_id: chapter?.id ?? null,
      phone: pick(row, PHONE),
      city: pick(row, CITY),
      state: pick(row, STATE),
      linkedin: '',
      show_email: 0,
      show_phone: 0,
      show_in_directory: 1,
      membership_status: membership,
      renewal_due_at: renewal,
      bluepay_rebill_id: null,
      dues_paid_at: active ? now : null,
      reminder_sent_at: null,
      approved_at: active ? now : null,
      approved_by: null,
    })
    if (opts.sendInvites) queueInvite(db, opts.send, opts.publicUrl, userId, email, first)
    result.created += 1
  })
  return result
}

export function importEvents(db: Db, csv: string): ImportResult {
  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] }
  parseCsv(csv).forEach((row, index) => {
    const line = index + 2
    const title = pick(row, ['title', 'event', 'event name', 'name'])
    if (!title) {
      result.skipped += 1
      return
    }
    const starts = parseDate(pick(row, ['starts', 'start', 'starts at', 'date', 'start date']))
    if (!starts) {
      result.errors.push(`Line ${line}: "${title}" needs a start date.`)
      return
    }
    const type = parseEventType(pick(row, ['type', 'event type', 'kind']))
    const network = parseNetwork(pick(row, ['network', 'group']) || 'FEG')
    const chapterName = pick(row, ['chapter', 'chapter name'])
    const chapter = chapterName ? ensureChapter(db, network, chapterName, pick(row, ['state'])) : null
    const price = parseMoney(pick(row, ['price', 'fee', 'amount', 'cost']))
    const lunch = pick(row, ['lunch', 'lunch options', 'meal', 'meal options'])
    const status = /draft/i.test(pick(row, ['status'])) ? 'draft' : 'published'
    const now = nowIso()
    const eventId = id()
    db.insertEvent({
      id: eventId,
      title,
      type,
      chapter_id: chapter?.id ?? null,
      description: pick(row, ['description', 'details', 'notes']),
      location: pick(row, ['location', 'venue', 'where']),
      starts_at: starts,
      ends_at: parseDate(pick(row, ['ends', 'end', 'end date'])),
      capacity: parseOptionalInt(pick(row, ['capacity', 'seats'])),
      price_cents: price,
      status,
      created_at: now,
      updated_at: now,
    })
    splitList(lunch).forEach((label, sort) => {
      db.insertLunch({ id: id(), event_id: eventId, label, sort_order: sort })
    })
    result.created += 1
  })
  return result
}

export function importJobs(db: Db, csv: string): ImportResult {
  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] }
  parseCsv(csv).forEach((row) => {
    const title = pick(row, ['title', 'position', 'job title', 'opening'])
    const organization = pick(row, ['organization', 'organisation', 'company', 'employer'])
    if (!title || !organization) {
      result.skipped += 1
      return
    }
    const rawStatus = pick(row, ['status']).toLowerCase()
    const status = rawStatus === 'pending' || rawStatus === 'closed' || rawStatus === 'rejected' ? rawStatus : 'published'
    const now = nowIso()
    db.insertJob({
      id: id(),
      title,
      organization,
      location: pick(row, ['location', 'city']),
      category: pick(row, ['category', 'type']),
      description: pick(row, ['description', 'details', 'body']),
      contact_email: pick(row, ['contact email', 'email', 'contact']),
      url: pick(row, ['url', 'link', 'website']),
      status,
      posted_by: null,
      created_at: now,
      published_at: status === 'published' ? now : null,
    })
    result.created += 1
  })
  return result
}

export function queueInvite(db: Db, send: Mailer, publicUrl: string, userId: string, email: string, firstName: string) {
  const token = tokenPair()
  const expires = new Date(Date.now() + 14 * 86400000).toISOString()
  db.insertToken({ id: id(), user_id: userId, kind: 'invite', token_hash: token.hash, expires_at: expires })
  const link = `${publicUrl.replace(/\/$/, '')}/invite?token=${encodeURIComponent(token.raw)}`
  send({
    to: email,
    subject: 'Set your US FEG member password',
    text: `Hello ${firstName},\n\nUS FEG is moving off YourMembership. Your directory profile is ready. Set a password to sign in (this link works for 14 days):\n\n${link}\n\nYour Network is Your Net Worth.\n`,
  })
  return link
}

export function ensureChapter(db: Db, network: Network, name: string, state: string) {
  const found = db.findChapter(network, name)
  if (found) return found
  const row = { id: `${network.toLowerCase()}-${slug(name)}`.slice(0, 40), network, name, state, sort_order: 100 }
  const clash = db.getChapter(row.id)
  if (clash) row.id = `${row.id}-${id().slice(0, 4)}`
  db.insertChapter(row)
  return row
}

function parseNetwork(value: string): Network {
  return /leg/i.test(value) ? 'LEG' : 'FEG'
}

function parseMembership(value: string): MembershipStatus {
  const v = value.toLowerCase()
  if (v.includes('lapse') || v.includes('expir')) return 'lapsed'
  if (v.includes('cancel')) return 'cancelled'
  if (v.includes('waiv') || v.includes('comp')) return 'waived'
  if (v.includes('pending') || v.includes('prospect')) return 'pending'
  if (v.includes('active') || v.includes('current') || v === '') return value ? 'active' : 'pending'
  return 'active'
}

function parseEventType(value: string): EventType {
  const v = value.toLowerCase()
  if (v.includes('conf')) return 'conference'
  if (v.includes('work') || v.includes('cpe') || v.includes('course')) return 'workshop'
  return 'chapter_meeting'
}

function parseMoney(value: string) {
  if (!value) return 0
  const amount = Number(value.replace(/[$,]/g, ''))
  if (!Number.isFinite(amount) || amount < 0) return 0
  return Math.round(amount * 100)
}

function parseOptionalInt(value: string) {
  if (!value) return null
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : null
}

function splitList(value: string) {
  return value
    .split(/[|;]/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function parseDate(value: string) {
  if (!value) return null
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T16:00:00.000Z` : value
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

/** Used by tests that need a known password without going through the UI. */
export function hashForTests(password: string) {
  return hashPassword(password)
}
