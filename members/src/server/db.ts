import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { nowIso } from './ids'

const SCHEMA = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT,
  role TEXT NOT NULL CHECK(role IN ('member','staff','admin')),
  status TEXT NOT NULL CHECK(status IN ('invited','pending_payment','pending_approval','active','suspended')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('reset','invite')),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chapters (
  id TEXT PRIMARY KEY,
  network TEXT NOT NULL CHECK(network IN ('FEG','LEG')),
  name TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(network, name)
);

CREATE TABLE IF NOT EXISTS members (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  network TEXT NOT NULL CHECK(network IN ('FEG','LEG')),
  chapter_id TEXT REFERENCES chapters(id),
  phone TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  linkedin TEXT NOT NULL DEFAULT '',
  show_email INTEGER NOT NULL DEFAULT 0,
  show_phone INTEGER NOT NULL DEFAULT 0,
  show_in_directory INTEGER NOT NULL DEFAULT 1,
  membership_status TEXT NOT NULL CHECK(membership_status IN ('pending','active','lapsed','cancelled','waived')),
  renewal_due_at TEXT,
  bluepay_rebill_id TEXT,
  dues_paid_at TEXT,
  reminder_sent_at TEXT,
  approved_at TEXT,
  approved_by TEXT
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('chapter_meeting','conference','workshop')),
  chapter_id TEXT REFERENCES chapters(id),
  description TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  capacity INTEGER,
  price_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('draft','published','cancelled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lunch_options (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  purpose TEXT NOT NULL CHECK(purpose IN ('dues_signup','dues_renewal','event')),
  registration_id TEXT,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending','approved','declined','error','refunded')),
  mode TEXT NOT NULL,
  rebilling INTEGER NOT NULL DEFAULT 0,
  bluepay_trans_id TEXT,
  bluepay_rebill_id TEXT,
  message TEXT,
  card_mask TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lunch_option_id TEXT REFERENCES lunch_options(id),
  status TEXT NOT NULL CHECK(status IN ('pending_payment','registered','cancelled')),
  amount_cents INTEGER NOT NULL DEFAULT 0,
  payment_id TEXT REFERENCES payments(id),
  created_at TEXT NOT NULL,
  UNIQUE(event_id, user_id)
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  organization TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK(status IN ('pending','published','closed','rejected')),
  posted_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  folder TEXT NOT NULL DEFAULT 'General',
  filename TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  uploaded_by TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  "key" TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_outbox (
  id TEXT PRIMARY KEY,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_trans ON payments(bluepay_trans_id);
CREATE INDEX IF NOT EXISTS idx_registrations_event ON registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_members_rebill ON members(bluepay_rebill_id);
`

export type Role = 'member' | 'staff' | 'admin'
export type UserStatus = 'invited' | 'pending_payment' | 'pending_approval' | 'active' | 'suspended'
export type Network = 'FEG' | 'LEG'
export type MembershipStatus = 'pending' | 'active' | 'lapsed' | 'cancelled' | 'waived'
export type EventType = 'chapter_meeting' | 'conference' | 'workshop'
export type PaymentPurpose = 'dues_signup' | 'dues_renewal' | 'event'
export type PaymentStatus = 'pending' | 'approved' | 'declined' | 'error' | 'refunded'

export type UserRow = {
  id: string
  email: string
  password_hash: string | null
  role: Role
  status: UserStatus
  created_at: string
  updated_at: string
  last_login_at: string | null
}

export type MemberRow = {
  user_id: string
  first_name: string
  last_name: string
  company: string
  title: string
  network: Network
  chapter_id: string | null
  phone: string
  city: string
  state: string
  linkedin: string
  show_email: number
  show_phone: number
  show_in_directory: number
  membership_status: MembershipStatus
  renewal_due_at: string | null
  bluepay_rebill_id: string | null
  dues_paid_at: string | null
  reminder_sent_at: string | null
  approved_at: string | null
  approved_by: string | null
}

export type MemberJoined = MemberRow & {
  email: string
  role: Role
  user_status: UserStatus
  chapter_name: string | null
  chapter_state: string | null
}

export type ChapterRow = { id: string; network: Network; name: string; state: string; sort_order: number }

export type EventRow = {
  id: string
  title: string
  type: EventType
  chapter_id: string | null
  description: string
  location: string
  starts_at: string
  ends_at: string | null
  capacity: number | null
  price_cents: number
  status: 'draft' | 'published' | 'cancelled'
  created_at: string
  updated_at: string
}

export type LunchRow = { id: string; event_id: string; label: string; sort_order: number }

export type RegistrationRow = {
  id: string
  event_id: string
  user_id: string
  lunch_option_id: string | null
  status: 'pending_payment' | 'registered' | 'cancelled'
  amount_cents: number
  payment_id: string | null
  created_at: string
}

export type PaymentRow = {
  id: string
  user_id: string
  purpose: PaymentPurpose
  registration_id: string | null
  amount_cents: number
  status: PaymentStatus
  mode: string
  rebilling: number
  bluepay_trans_id: string | null
  bluepay_rebill_id: string | null
  message: string | null
  card_mask: string | null
  created_at: string
  updated_at: string
}

export type JobRow = {
  id: string
  title: string
  organization: string
  location: string
  category: string
  description: string
  contact_email: string
  url: string
  status: 'pending' | 'published' | 'closed' | 'rejected'
  posted_by: string | null
  created_at: string
  published_at: string | null
}

export type FileRow = {
  id: string
  title: string
  description: string
  folder: string
  filename: string
  stored_name: string
  mime: string
  size: number
  uploaded_by: string | null
  created_at: string
}

type SqlValue = string | number | null | bigint

export class Db {
  sql: DatabaseSync

  constructor(filename: string) {
    if (filename !== ':memory:') mkdirSync(path.dirname(filename), { recursive: true })
    this.sql = new DatabaseSync(filename)
    this.sql.exec(SCHEMA)
  }

  close() {
    this.sql.close()
  }

  transaction<T>(fn: () => T): T {
    this.sql.exec('BEGIN IMMEDIATE')
    try {
      const result = fn()
      this.sql.exec('COMMIT')
      return result
    } catch (err) {
      try {
        this.sql.exec('ROLLBACK')
      } catch {
        /* already closed */
      }
      throw err
    }
  }

  private get<T>(query: string, ...params: SqlValue[]): T | undefined {
    return this.sql.prepare(query).get(...params) as T | undefined
  }

  private all<T>(query: string, ...params: SqlValue[]): T[] {
    return this.sql.prepare(query).all(...params) as T[]
  }

  private run(query: string, ...params: SqlValue[]) {
    return this.sql.prepare(query).run(...params)
  }

  userCount() {
    const row = this.get<{ n: number }>('SELECT COUNT(*) AS n FROM users')
    return Number(row?.n ?? 0)
  }

  insertUser(row: UserRow) {
    this.run(
      `INSERT INTO users (id, email, password_hash, role, status, created_at, updated_at, last_login_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      row.id,
      row.email,
      row.password_hash,
      row.role,
      row.status,
      row.created_at,
      row.updated_at,
      row.last_login_at,
    )
  }

  getUserById(id: string) {
    return this.get<UserRow>('SELECT * FROM users WHERE id = ?', id)
  }

  getUserByEmail(email: string) {
    return this.get<UserRow>('SELECT * FROM users WHERE email = ?', email)
  }

  updateUser(id: string, fields: Partial<Pick<UserRow, 'email' | 'password_hash' | 'role' | 'status' | 'last_login_at'>>) {
    const next = { ...fields, updated_at: nowIso() }
    this.assign('users', 'id', id, next, ['email', 'password_hash', 'role', 'status', 'last_login_at', 'updated_at'])
  }

  insertSession(id: string, userId: string, expiresAt: string) {
    this.run('INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)', id, userId, expiresAt, nowIso())
  }

  getSession(id: string) {
    return this.get<{ id: string; user_id: string; expires_at: string }>('SELECT * FROM sessions WHERE id = ?', id)
  }

  deleteSession(id: string) {
    this.run('DELETE FROM sessions WHERE id = ?', id)
  }

  deleteSessionsForUser(userId: string) {
    this.run('DELETE FROM sessions WHERE user_id = ?', userId)
  }

  insertToken(row: { id: string; user_id: string; kind: 'reset' | 'invite'; token_hash: string; expires_at: string }) {
    this.run(
      'INSERT INTO tokens (id, user_id, kind, token_hash, expires_at, used_at, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?)',
      row.id,
      row.user_id,
      row.kind,
      row.token_hash,
      row.expires_at,
      nowIso(),
    )
  }

  getTokenByHash(hash: string) {
    return this.get<{
      id: string
      user_id: string
      kind: 'reset' | 'invite'
      token_hash: string
      expires_at: string
      used_at: string | null
    }>('SELECT * FROM tokens WHERE token_hash = ?', hash)
  }

  markTokenUsed(id: string) {
    this.run('UPDATE tokens SET used_at = ? WHERE id = ?', nowIso(), id)
  }

  insertChapter(row: ChapterRow) {
    this.run(
      'INSERT INTO chapters (id, network, name, state, sort_order) VALUES (?, ?, ?, ?, ?)',
      row.id,
      row.network,
      row.name,
      row.state,
      row.sort_order,
    )
  }

  getChapter(id: string) {
    return this.get<ChapterRow>('SELECT * FROM chapters WHERE id = ?', id)
  }

  findChapter(network: string, name: string) {
    return this.get<ChapterRow>('SELECT * FROM chapters WHERE network = ? AND name = ? COLLATE NOCASE', network, name)
  }

  listChapters(network?: string) {
    if (network) return this.all<ChapterRow>('SELECT * FROM chapters WHERE network = ? ORDER BY state, sort_order, name', network)
    return this.all<ChapterRow>('SELECT * FROM chapters ORDER BY network, state, sort_order, name')
  }

  insertMember(row: MemberRow) {
    this.run(
      `INSERT INTO members (
        user_id, first_name, last_name, company, title, network, chapter_id, phone, city, state, linkedin,
        show_email, show_phone, show_in_directory, membership_status, renewal_due_at, bluepay_rebill_id,
        dues_paid_at, reminder_sent_at, approved_at, approved_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      row.user_id,
      row.first_name,
      row.last_name,
      row.company,
      row.title,
      row.network,
      row.chapter_id,
      row.phone,
      row.city,
      row.state,
      row.linkedin,
      row.show_email,
      row.show_phone,
      row.show_in_directory,
      row.membership_status,
      row.renewal_due_at,
      row.bluepay_rebill_id,
      row.dues_paid_at,
      row.reminder_sent_at,
      row.approved_at,
      row.approved_by,
    )
  }

  getMember(userId: string) {
    return this.get<MemberJoined>(
      `${MEMBER_SELECT} WHERE m.user_id = ?`,
      userId,
    )
  }

  getMemberByRebillId(rebillId: string) {
    return this.get<MemberRow>('SELECT * FROM members WHERE bluepay_rebill_id = ?', rebillId)
  }

  updateMember(userId: string, fields: Partial<MemberRow>) {
    this.assign('members', 'user_id', userId, fields, [
      'first_name',
      'last_name',
      'company',
      'title',
      'network',
      'chapter_id',
      'phone',
      'city',
      'state',
      'linkedin',
      'show_email',
      'show_phone',
      'show_in_directory',
      'membership_status',
      'renewal_due_at',
      'bluepay_rebill_id',
      'dues_paid_at',
      'reminder_sent_at',
      'approved_at',
      'approved_by',
    ])
  }

  listMembers(opts: { q?: string; network?: string; status?: string; limit?: number } = {}) {
    const where: string[] = []
    const params: SqlValue[] = []
    if (opts.network) {
      where.push('m.network = ?')
      params.push(opts.network)
    }
    if (opts.status) {
      where.push('u.status = ?')
      params.push(opts.status)
    }
    if (opts.q) {
      const like = `%${opts.q.replace(/[%_]/g, '')}%`
      where.push(`(m.first_name LIKE ? OR m.last_name LIKE ? OR m.company LIKE ? OR m.title LIKE ? OR u.email LIKE ? OR (m.first_name || ' ' || m.last_name) LIKE ?)`)
      params.push(like, like, like, like, like, like)
    }
    const sql = `${MEMBER_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY m.last_name, m.first_name LIMIT ?`
    params.push(opts.limit ?? 500)
    return this.all<MemberJoined>(sql, ...params)
  }

  listDirectory(opts: { network: string; q?: string; chapterId?: string }) {
    const where = [
      'm.network = ?',
      'm.show_in_directory = 1',
      "m.membership_status IN ('active','waived')",
      "u.status = 'active'",
    ]
    const params: SqlValue[] = [opts.network]
    if (opts.chapterId) {
      where.push('m.chapter_id = ?')
      params.push(opts.chapterId)
    }
    if (opts.q) {
      const like = `%${opts.q.replace(/[%_]/g, '')}%`
      where.push(`(m.first_name LIKE ? OR m.last_name LIKE ? OR m.company LIKE ? OR m.title LIKE ? OR (m.first_name || ' ' || m.last_name) LIKE ?)`)
      params.push(like, like, like, like, like)
    }
    return this.all<MemberJoined>(`${MEMBER_SELECT} WHERE ${where.join(' AND ')} ORDER BY m.last_name, m.first_name`, ...params)
  }

  insertEvent(row: EventRow) {
    this.run(
      `INSERT INTO events (id, title, type, chapter_id, description, location, starts_at, ends_at, capacity, price_cents, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      row.id,
      row.title,
      row.type,
      row.chapter_id,
      row.description,
      row.location,
      row.starts_at,
      row.ends_at,
      row.capacity,
      row.price_cents,
      row.status,
      row.created_at,
      row.updated_at,
    )
  }

  getEvent(id: string) {
    return this.get<EventRow & { chapter_name: string | null }>(
      `SELECT e.*, c.name AS chapter_name FROM events e LEFT JOIN chapters c ON c.id = e.chapter_id WHERE e.id = ?`,
      id,
    )
  }

  updateEvent(id: string, fields: Partial<EventRow>) {
    this.assign('events', 'id', id, { ...fields, updated_at: nowIso() }, [
      'title',
      'type',
      'chapter_id',
      'description',
      'location',
      'starts_at',
      'ends_at',
      'capacity',
      'price_cents',
      'status',
      'updated_at',
    ])
  }

  listEvents(opts: { status?: string; when?: 'upcoming' | 'past' | 'all'; now?: string } = {}) {
    const where: string[] = []
    const params: SqlValue[] = []
    if (opts.status) {
      where.push('e.status = ?')
      params.push(opts.status)
    }
    const now = opts.now ?? nowIso()
    if (opts.when === 'upcoming') {
      where.push('e.starts_at >= ?')
      params.push(now)
    } else if (opts.when === 'past') {
      where.push('e.starts_at < ?')
      params.push(now)
    }
    const sql = `SELECT e.*, c.name AS chapter_name FROM events e LEFT JOIN chapters c ON c.id = e.chapter_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY e.starts_at ${opts.when === 'past' ? 'DESC' : 'ASC'}`
    return this.all<EventRow & { chapter_name: string | null }>(sql, ...params)
  }

  insertLunch(row: LunchRow) {
    this.run(
      'INSERT INTO lunch_options (id, event_id, label, sort_order) VALUES (?, ?, ?, ?)',
      row.id,
      row.event_id,
      row.label,
      row.sort_order,
    )
  }

  listLunch(eventId: string) {
    return this.all<LunchRow>('SELECT * FROM lunch_options WHERE event_id = ? ORDER BY sort_order, label', eventId)
  }

  deleteUnusedLunch(eventId: string, keepIds: string[]) {
    const options = this.listLunch(eventId)
    for (const option of options) {
      if (keepIds.includes(option.id)) continue
      const used = this.get<{ n: number }>('SELECT COUNT(*) AS n FROM registrations WHERE lunch_option_id = ?', option.id)
      if (Number(used?.n ?? 0) === 0) this.run('DELETE FROM lunch_options WHERE id = ?', option.id)
    }
  }

  insertRegistration(row: RegistrationRow) {
    this.run(
      `INSERT INTO registrations (id, event_id, user_id, lunch_option_id, status, amount_cents, payment_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      row.id,
      row.event_id,
      row.user_id,
      row.lunch_option_id,
      row.status,
      row.amount_cents,
      row.payment_id,
      row.created_at,
    )
  }

  getRegistration(eventId: string, userId: string) {
    return this.get<RegistrationRow>('SELECT * FROM registrations WHERE event_id = ? AND user_id = ?', eventId, userId)
  }

  getRegistrationById(id: string) {
    return this.get<RegistrationRow>('SELECT * FROM registrations WHERE id = ?', id)
  }

  updateRegistration(id: string, fields: Partial<Pick<RegistrationRow, 'lunch_option_id' | 'status' | 'amount_cents' | 'payment_id'>>) {
    this.assign('registrations', 'id', id, fields, ['lunch_option_id', 'status', 'amount_cents', 'payment_id'])
  }

  countOccupying(eventId: string) {
    const row = this.get<{ n: number }>(
      `SELECT COUNT(*) AS n FROM registrations WHERE event_id = ? AND status IN ('registered','pending_payment')`,
      eventId,
    )
    return Number(row?.n ?? 0)
  }

  listRegistrations(eventId: string) {
    return this.all<
      RegistrationRow & {
        email: string
        first_name: string
        last_name: string
        company: string
        title: string
        network: Network
        chapter_name: string | null
        lunch_label: string | null
      }
    >(
      `SELECT r.*, u.email, m.first_name, m.last_name, m.company, m.title, m.network, c.name AS chapter_name, l.label AS lunch_label
       FROM registrations r
       JOIN users u ON u.id = r.user_id
       JOIN members m ON m.user_id = r.user_id
       LEFT JOIN chapters c ON c.id = m.chapter_id
       LEFT JOIN lunch_options l ON l.id = r.lunch_option_id
       WHERE r.event_id = ?
       ORDER BY r.created_at`,
      eventId,
    )
  }

  insertPayment(row: PaymentRow) {
    this.run(
      `INSERT INTO payments (
        id, user_id, purpose, registration_id, amount_cents, status, mode, rebilling,
        bluepay_trans_id, bluepay_rebill_id, message, card_mask, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      row.id,
      row.user_id,
      row.purpose,
      row.registration_id,
      row.amount_cents,
      row.status,
      row.mode,
      row.rebilling,
      row.bluepay_trans_id,
      row.bluepay_rebill_id,
      row.message,
      row.card_mask,
      row.created_at,
      row.updated_at,
    )
  }

  getPayment(id: string) {
    return this.get<PaymentRow>('SELECT * FROM payments WHERE id = ?', id)
  }

  getPaymentByTransId(transId: string) {
    return this.get<PaymentRow>('SELECT * FROM payments WHERE bluepay_trans_id = ?', transId)
  }

  updatePayment(id: string, fields: Partial<PaymentRow>) {
    this.assign('payments', 'id', id, { ...fields, updated_at: nowIso() }, [
      'status',
      'bluepay_trans_id',
      'bluepay_rebill_id',
      'message',
      'card_mask',
      'registration_id',
      'updated_at',
    ])
  }

  latestPendingDues(userId: string) {
    return this.get<PaymentRow>(
      `SELECT * FROM payments WHERE user_id = ? AND purpose IN ('dues_signup','dues_renewal') AND status = 'pending' ORDER BY created_at DESC LIMIT 1`,
      userId,
    )
  }

  listPayments(opts: { userId?: string; limit?: number } = {}) {
    if (opts.userId) {
      return this.all<PaymentRow>('SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', opts.userId, opts.limit ?? 100)
    }
    return this.all<PaymentRow & { email: string }>(
      `SELECT p.*, u.email FROM payments p JOIN users u ON u.id = p.user_id ORDER BY p.created_at DESC LIMIT ?`,
      opts.limit ?? 200,
    )
  }

  insertJob(row: JobRow) {
    this.run(
      `INSERT INTO jobs (id, title, organization, location, category, description, contact_email, url, status, posted_by, created_at, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      row.id,
      row.title,
      row.organization,
      row.location,
      row.category,
      row.description,
      row.contact_email,
      row.url,
      row.status,
      row.posted_by,
      row.created_at,
      row.published_at,
    )
  }

  getJob(id: string) {
    return this.get<JobRow>('SELECT * FROM jobs WHERE id = ?', id)
  }

  updateJob(id: string, fields: Partial<JobRow>) {
    this.assign('jobs', 'id', id, fields, [
      'title',
      'organization',
      'location',
      'category',
      'description',
      'contact_email',
      'url',
      'status',
      'published_at',
    ])
  }

  listJobs(opts: { status?: string; postedBy?: string } = {}) {
    const where: string[] = []
    const params: SqlValue[] = []
    if (opts.status) {
      where.push('status = ?')
      params.push(opts.status)
    }
    if (opts.postedBy) {
      where.push('posted_by = ?')
      params.push(opts.postedBy)
    }
    return this.all<JobRow>(
      `SELECT * FROM jobs ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC`,
      ...params,
    )
  }

  insertFile(row: FileRow) {
    this.run(
      `INSERT INTO files (id, title, description, folder, filename, stored_name, mime, size, uploaded_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      row.id,
      row.title,
      row.description,
      row.folder,
      row.filename,
      row.stored_name,
      row.mime,
      row.size,
      row.uploaded_by,
      row.created_at,
    )
  }

  getFile(id: string) {
    return this.get<FileRow>('SELECT * FROM files WHERE id = ?', id)
  }

  deleteFile(id: string) {
    this.run('DELETE FROM files WHERE id = ?', id)
  }

  listFiles() {
    return this.all<FileRow>('SELECT * FROM files ORDER BY folder, title')
  }

  getSetting(key: string, fallback: string) {
    const row = this.get<{ value: string }>('SELECT value FROM settings WHERE "key" = ?', key)
    return row?.value ?? fallback
  }

  setSetting(key: string, value: string) {
    this.run('INSERT INTO settings ("key", value) VALUES (?, ?) ON CONFLICT("key") DO UPDATE SET value = excluded.value', key, value)
  }

  insertEmail(row: { to: string; subject: string; body: string }) {
    this.run(
      'INSERT INTO email_outbox (id, to_email, subject, body, created_at) VALUES (?, ?, ?, ?, ?)',
      randomEmailId(),
      row.to,
      row.subject,
      row.body,
      nowIso(),
    )
  }

  latestEmailTo(email: string) {
    return this.get<{ to_email: string; subject: string; body: string; created_at: string }>(
      'SELECT * FROM email_outbox WHERE to_email = ? ORDER BY created_at DESC LIMIT 1',
      email,
    )
  }

  summary() {
    const count = (sql: string, ...params: SqlValue[]) => Number(this.get<{ n: number }>(sql, ...params)?.n ?? 0)
    return {
      active: count(`SELECT COUNT(*) AS n FROM users WHERE status = 'active' AND role = 'member'`),
      pendingApproval: count(`SELECT COUNT(*) AS n FROM users WHERE status = 'pending_approval'`),
      pendingPayment: count(`SELECT COUNT(*) AS n FROM users WHERE status = 'pending_payment'`),
      invited: count(`SELECT COUNT(*) AS n FROM users WHERE status = 'invited'`),
      lapsed: count(`SELECT COUNT(*) AS n FROM members WHERE membership_status = 'lapsed'`),
      jobsPending: count(`SELECT COUNT(*) AS n FROM jobs WHERE status = 'pending'`),
      upcomingEvents: count(`SELECT COUNT(*) AS n FROM events WHERE status = 'published' AND starts_at >= ?`, nowIso()),
    }
  }

  renewalsDue(withinIso: string, now: string) {
    return this.all<MemberJoined>(
      `${MEMBER_SELECT}
       WHERE m.membership_status IN ('active','lapsed')
         AND u.status = 'active'
         AND m.renewal_due_at IS NOT NULL
         AND m.renewal_due_at <= ?
         AND (m.reminder_sent_at IS NULL OR m.reminder_sent_at < ?)
       ORDER BY m.renewal_due_at`,
      withinIso,
      new Date(new Date(now).getTime() - 14 * 86400000).toISOString(),
    )
  }

  private assign(table: string, idColumn: string, id: string, fields: object, allowed: string[]) {
    const bag = fields as Record<string, SqlValue | undefined>
    const keys = allowed.filter((key) => Object.prototype.hasOwnProperty.call(bag, key) && bag[key] !== undefined)
    if (!keys.length) return
    const sql = `UPDATE ${table} SET ${keys.map((key) => `${key} = ?`).join(', ')} WHERE ${idColumn} = ?`
    this.run(sql, ...keys.map((key) => bag[key] as SqlValue), id)
  }
}

const MEMBER_SELECT = `
SELECT m.*, u.email, u.role, u.status AS user_status, c.name AS chapter_name, c.state AS chapter_state
FROM members m
JOIN users u ON u.id = m.user_id
LEFT JOIN chapters c ON c.id = m.chapter_id
`

function randomEmailId() {
  return `m_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`
}
