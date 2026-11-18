import path from 'node:path'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import express, { type NextFunction, type Request, type Response } from 'express'
import {
  applyGatewayResult,
  browserPathFor,
  cancelRegistration,
  compRegistration,
  createDuesPayment,
  readSettings,
  recordManualPayment,
  refundPayment,
  registerForEvent,
  renewalPurpose,
  sendRenewalReminders,
  simulatePayment,
  startCheckout,
} from './billing'
import { centsToAmount, type BluePayConfig } from './bluepay'
import { toCsv } from './csv'
import type { Db, MemberJoined, UserRow } from './db'
import { Db as Database } from './db'
import {
  asyncRoute,
  clearSessionCookie,
  clientIp,
  HttpError,
  rateLimit,
  readCookie,
  setSessionCookie,
  stringMap,
  wantsJson,
} from './http'
import { addDays, id, isEmail, nowIso } from './ids'
import { hashToken, tokenPair } from './ids'
import { importEvents, importJobs, importMembers, queueInvite } from './importing'
import { createMailer, type SmtpConfig } from './mail'
import { assertPassword, hashPassword, verifyPassword } from './passwords'
import { parseEventInstant } from '../shared/central'
import type { SiteDefinition } from '../shared/sites'
import { DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD, DEMO_MEMBER_EMAIL, DEMO_MEMBER_PASSWORD, seedDatabase } from './seed'
import { assertStoredName, readMultipart } from './uploads'

export type AppConfig = {
  dataDir: string
  publicUrl: string
  sessionSecret: string
  bluepay: BluePayConfig
  smtp: SmtpConfig | null
  cronSecret: string
  secureCookies: boolean
  demo: boolean
  seed: boolean
  site: SiteDefinition
  /** Resolved URL of the other member site (localhost in dev, members.usleg.org in production). */
  siblingUrl: string
  staticDir?: string
  seedAdmin?: { email: string; password: string } | null
}

const COOKIE_FOR = (site: SiteDefinition) => `us${site.code.toLowerCase()}_member`

export function createApp(config: AppConfig) {
  const db = new Database(path.join(config.dataDir, 'usfeg.sqlite'))
  const uploadDir = path.join(config.dataDir, 'uploads')
  mkdirSync(uploadDir, { recursive: true })
  const send = createMailer(db, config.smtp)
  if (config.seed) {
    seedDatabase(db, uploadDir, config.site, {
      demo: config.demo,
      adminEmail: config.seedAdmin?.email,
      adminPassword: config.seedAdmin?.password,
    })
  }

  const ctx = { db, site: config.site, bluepay: config.bluepay, publicUrl: config.publicUrl, send }
  const cookieName = COOKIE_FOR(config.site)
  const app = express()
  app.disable('x-powered-by')
  app.locals.db = db
  app.locals.config = config
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.setHeader('X-Frame-Options', 'DENY')
    next()
  })
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: false, limit: '1mb' }))

  const auth = (req: Request) => loadAuth(db, req)
  const requireUser = (req: Request) => {
    const current = auth(req)
    if (!current) throw new HttpError(401, 'Sign in required.')
    return current
  }
  const requireActive = (req: Request) => {
    const current = requireUser(req)
    if (current.user.role === 'member' && current.user.status !== 'active') {
      throw new HttpError(403, 'Your membership is not active yet.')
    }
    return current
  }
  const requireStaff = (req: Request) => {
    const current = requireUser(req)
    if (current.user.role !== 'admin' && current.user.role !== 'staff') throw new HttpError(403, 'Staff access required.')
    return current
  }
  const requireAdmin = (req: Request) => {
    const current = requireUser(req)
    if (current.user.role !== 'admin') throw new HttpError(403, 'Admin access required.')
    return current
  }

  function openSession(res: Response, userId: string) {
    const sid = id()
    db.insertSession(sid, userId, addDays(nowIso(), 14))
    setSessionCookie(res, cookieName, sealSession(sid, config.sessionSecret), config.secureCookies, 14 * 24 * 3600)
  }

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      paymentMode: config.bluepay.mode,
      demo: config.demo,
      ...(config.demo
        ? {
            demoLogins: [
              { role: 'Admin', email: DEMO_ADMIN_EMAIL, password: DEMO_ADMIN_PASSWORD },
              { role: 'Member', email: DEMO_MEMBER_EMAIL[config.site.id], password: DEMO_MEMBER_PASSWORD },
            ],
          }
        : {}),
    })
  })

  app.get('/api/brand', (_req, res) => {
    const site = config.site
    res.json({
      id: site.id,
      code: site.code,
      name: site.name,
      shortName: site.shortName,
      tagline: site.tagline,
      logo: site.logo,
      logoText: site.logoText,
      colors: site.colors,
      publicSiteUrl: site.publicSiteUrl,
      publicSiteLabel: site.publicSiteLabel,
      domain: site.domain,
      contact: site.contact,
      sibling: { name: site.sibling.name, url: config.siblingUrl },
    })
  })

  app.get('/api/settings/public', (_req, res) => {
    const settings = readSettings(db)
    res.json({ duesCents: settings.duesCents, rebillingEnabled: settings.rebillingEnabled })
  })

  app.get('/api/chapters', (_req, res) => {
    res.json({ chapters: db.listChapters().map(presentChapter) })
  })

  app.post(
    '/api/auth/signup',
    asyncRoute((req, res) => {
      rateLimit(`signup:${clientIp(req)}`, 10, 15 * 60 * 1000)
      const email = str(req, 'email').toLowerCase()
      const password = passwordOrThrow(req.body?.password)
      const firstName = str(req, 'firstName')
      const lastName = str(req, 'lastName')
      const chapterId = str(req, 'chapterId')
      if (!isEmail(email)) throw new HttpError(400, 'Enter a valid email address.')
      if (!firstName || !lastName) throw new HttpError(400, 'Enter your first and last name.')
      const chapter = db.getChapter(chapterId)
      if (!chapter) throw new HttpError(400, 'Choose a chapter.')
      if (db.getUserByEmail(email)) throw new HttpError(409, 'An account with that email already exists.')
      const now = nowIso()
      const userId = id()
      db.insertUser({
        id: userId,
        email,
        password_hash: hashPassword(password),
        role: 'member',
        status: 'pending_payment',
        created_at: now,
        updated_at: now,
        last_login_at: now,
      })
      db.insertMember({
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
        company: str(req, 'company'),
        title: str(req, 'title'),
        chapter_id: chapter.id,
        phone: str(req, 'phone'),
        city: str(req, 'city'),
        state: str(req, 'state'),
        linkedin: '',
        show_email: 0,
        show_phone: 0,
        show_in_directory: 1,
        membership_status: 'pending',
        renewal_due_at: null,
        bluepay_rebill_id: null,
        dues_paid_at: null,
        reminder_sent_at: null,
        approved_at: null,
        approved_by: null,
      })
      const user = db.getUserById(userId)!
      const payment = createDuesPayment(ctx, user, 'dues_signup')
      openSession(res, userId)
      res.status(201).json({ checkoutPath: `/api/payments/${payment.id}/start`, paymentId: payment.id })
    }),
  )

  app.post(
    '/api/auth/login',
    asyncRoute((req, res) => {
      const email = str(req, 'email').toLowerCase()
      rateLimit(`login:${clientIp(req)}:${email}`, 8, 15 * 60 * 1000)
      const user = db.getUserByEmail(email)
      const password = typeof req.body?.password === 'string' ? req.body.password : ''
      if (!user || !verifyPassword(password, user.password_hash)) {
        throw new HttpError(401, 'Email or password is incorrect.')
      }
      if (user.status === 'suspended') throw new HttpError(403, 'This account is suspended.')
      if (!user.password_hash) throw new HttpError(400, 'Use the invite link to set a password first.')
      db.updateUser(user.id, { last_login_at: nowIso() })
      openSession(res, user.id)
      res.json({ user: presentUser(user), member: presentMember(db.getMember(user.id)) })
    }),
  )

  app.post('/api/auth/logout', (req, res) => {
    const sid = openSessionCookie(readCookie(req, cookieName), config.sessionSecret)
    if (sid) db.deleteSession(sid)
    clearSessionCookie(res, cookieName, config.secureCookies)
    res.json({ ok: true })
  })

  app.get('/api/auth/me', (req, res) => {
    const current = auth(req)
    if (!current) {
      res.json({ user: null, member: null })
      return
    }
    res.json({ user: presentUser(current.user), member: presentMember(current.member) })
  })

  app.post(
    '/api/auth/forgot',
    asyncRoute((req, res) => {
      const email = str(req, 'email').toLowerCase()
      rateLimit(`forgot:${clientIp(req)}`, 5, 15 * 60 * 1000)
      const user = isEmail(email) ? db.getUserByEmail(email) : undefined
      if (user && user.status !== 'suspended') {
        const member = db.getMember(user.id)
        const first = member?.first_name || 'there'
        if (!user.password_hash || user.status === 'invited') {
          queueInvite(db, send, config.publicUrl, user.id, user.email, first, config.site)
        } else {
          const token = tokenPair()
          db.insertToken({
            id: id(),
            user_id: user.id,
            kind: 'reset',
            token_hash: token.hash,
            expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
          })
          const link = `${config.publicUrl.replace(/\/$/, '')}/reset?token=${encodeURIComponent(token.raw)}`
          send({
            to: user.email,
            subject: `Reset your ${config.site.shortName} password`,
            text: `Hello ${first},\n\nSet a new password (this link works for one hour):\n\n${link}\n\nIf you did not ask for this, you can ignore the email.\n`,
          })
        }
      }
      res.json({ ok: true, message: 'If that email is on file, a link is on its way.' })
    }),
  )

  app.post(
    '/api/auth/reset',
    asyncRoute((req, res) => {
      const token = str(req, 'token')
      const password = passwordOrThrow(req.body?.password)
      acceptToken(db, token, 'reset', password)
      res.json({ ok: true })
    }),
  )

  app.get(
    '/api/auth/invite/:token',
    asyncRoute((req, res) => {
      const record = liveToken(db, req.params.token, 'invite')
      const user = db.getUserById(record.user_id)
      const member = user ? db.getMember(user.id) : undefined
      if (!user) throw new HttpError(400, 'This invite is no longer valid.')
      res.json({ email: user.email, firstName: member?.first_name ?? '' })
    }),
  )

  app.post(
    '/api/auth/invite',
    asyncRoute((req, res) => {
      const password = passwordOrThrow(req.body?.password)
      const record = acceptToken(db, str(req, 'token'), 'invite', password)
      openSession(res, record.userId)
      res.json({ ok: true })
    }),
  )

  app.get('/api/account', (req, res) => {
    const current = requireUser(req)
    const settings = readSettings(db)
    const payments = db.listPayments({ userId: current.user.id, limit: 50 })
    res.json({
      user: presentUser(current.user),
      member: presentMember(current.member),
      payments: payments.map(presentPayment),
      duesCents: current.member ? settings.duesCents : null,
      renewalLeadDays: settings.renewalLeadDays,
    })
  })

  app.patch('/api/account', (req, res) => {
    const current = requireUser(req)
    if (!current.member) throw new HttpError(400, 'This account has no member profile.')
    const patch: Record<string, string | number | null> = {}
    if (has(req, 'company')) patch.company = str(req, 'company')
    if (has(req, 'title')) patch.title = str(req, 'title')
    if (has(req, 'phone')) patch.phone = str(req, 'phone')
    if (has(req, 'city')) patch.city = str(req, 'city')
    if (has(req, 'state')) patch.state = str(req, 'state')
    if (has(req, 'linkedin')) patch.linkedin = str(req, 'linkedin')
    if (has(req, 'showEmail')) patch.show_email = bool(req, 'showEmail') ? 1 : 0
    if (has(req, 'showPhone')) patch.show_phone = bool(req, 'showPhone') ? 1 : 0
    if (has(req, 'showInDirectory')) patch.show_in_directory = bool(req, 'showInDirectory') ? 1 : 0
    db.updateMember(current.user.id, patch)
    res.json({ member: presentMember(db.getMember(current.user.id)) })
  })

  app.get('/api/events', (req, res) => {
    const current = requireUser(req)
    const when = req.query.when === 'past' || req.query.when === 'all' ? req.query.when : 'upcoming'
    const status = current.user.role === 'member' ? 'published' : undefined
    const events = db.listEvents({ when, status }).filter((event) => current.user.role !== 'member' || event.status === 'published')
    res.json({ events: events.map((event) => presentEvent(db, event, current.user.id, false)) })
  })

  app.get('/api/events/:id', (req, res) => {
    const current = requireUser(req)
    const event = db.getEvent(req.params.id)
    if (!event || (current.user.role === 'member' && event.status !== 'published')) throw new HttpError(404, 'Event not found.')
    res.json({ event: presentEvent(db, event, current.user.id, true) })
  })

  app.post('/api/events/:id/register', (req, res) => {
    const current = requireUser(req)
    const lunch = str(req, 'lunchOptionId') || null
    const result = registerForEvent(ctx, current.user, req.params.id, lunch)
    res.status(201).json({
      registrationId: result.registrationId,
      checkout: result.checkout,
      checkoutPath: result.payment ? `/api/payments/${result.payment.id}/start` : null,
    })
  })

  app.post('/api/events/:id/cancel', (req, res) => {
    const current = requireUser(req)
    cancelRegistration(ctx, current.user, req.params.id)
    res.json({ ok: true })
  })

  app.get('/api/directory', (req, res) => {
    requireActive(req)
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
    const chapterId = typeof req.query.chapterId === 'string' ? req.query.chapterId : ''
    const rows = db.listDirectory({ q, chapterId: chapterId || undefined })
    res.json({ members: rows.map(presentDirectory) })
  })

  app.get('/api/jobs', (req, res) => {
    const current = requireActive(req)
    const published = db.listJobs({ status: 'published' })
    const mine = db.listJobs({ postedBy: current.user.id }).filter((job) => job.status !== 'published')
    res.json({ jobs: [...published, ...mine].map(presentJob) })
  })

  app.get('/api/jobs/:id', (req, res) => {
    const current = requireActive(req)
    const job = db.getJob(req.params.id)
    if (!job) throw new HttpError(404, 'Job not found.')
    if (job.status !== 'published' && job.posted_by !== current.user.id && current.user.role === 'member') {
      throw new HttpError(404, 'Job not found.')
    }
    res.json({ job: presentJob(job) })
  })

  app.post('/api/jobs', (req, res) => {
    const current = requireActive(req)
    const title = str(req, 'title')
    const organization = str(req, 'organization')
    const description = str(req, 'description')
    const contact = str(req, 'contactEmail').toLowerCase()
    if (!title || !organization || !description) throw new HttpError(400, 'Title, organization, and description are required.')
    if (!isEmail(contact)) throw new HttpError(400, 'Enter a contact email.')
    const now = nowIso()
    const jobId = id()
    db.insertJob({
      id: jobId,
      title,
      organization,
      location: str(req, 'location'),
      category: str(req, 'category'),
      description,
      contact_email: contact,
      url: str(req, 'url'),
      status: 'pending',
      posted_by: current.user.id,
      created_at: now,
      published_at: null,
    })
    res.status(201).json({ job: presentJob(db.getJob(jobId)!) })
  })

  app.get('/api/files', (req, res) => {
    requireActive(req)
    res.json({ files: db.listFiles().map(presentFile) })
  })

  app.get('/api/files/:id/download', (req, res) => {
    requireActive(req)
    const file = db.getFile(req.params.id)
    if (!file) throw new HttpError(404, 'File not found.')
    assertStoredName(file.stored_name)
    const full = path.resolve(uploadDir, file.stored_name)
    if (!full.startsWith(path.resolve(uploadDir))) throw new HttpError(400, 'Bad file path.')
    res.download(full, file.filename)
  })

  app.get('/api/payments/:id', (req, res) => {
    const current = requireUser(req)
    const payment = db.getPayment(req.params.id)
    if (!payment || (payment.user_id !== current.user.id && current.user.role === 'member')) throw new HttpError(404, 'Payment not found.')
    res.json({
      payment: presentPayment(payment),
      sandbox: config.bluepay.mode === 'mock' ? { rule: 'Odd whole-dollar amounts are approved. Even amounts are declined. No card number is collected.' } : null,
    })
  })

  app.post('/api/payments/dues', (req, res) => {
    const current = requireUser(req)
    if (!current.member) throw new HttpError(400, 'This account has no member profile.')
    const purpose = renewalPurpose(current.member)
    const payment = createDuesPayment(ctx, current.user, purpose)
    res.status(201).json({ checkoutPath: `/api/payments/${payment.id}/start`, paymentId: payment.id })
  })

  app.get('/api/payments/:id/start', (req, res) => {
    const current = requireUser(req)
    const payment = ownedPayment(db, current.user, req.params.id)
    const checkout = startCheckout(ctx, payment)
    res.redirect(checkout.url)
  })

  app.post('/api/payments/:id/simulate', (req, res) => {
    const current = requireUser(req)
    const payment = ownedPayment(db, current.user, req.params.id)
    const applied = simulatePayment(ctx, payment)
    res.json({
      ...applied,
      next: browserPathFor(db.getPayment(applied.paymentId)!, applied.status, applied.eventId),
    })
  })

  const onReturn = asyncRoute((req, res) => {
    const fields = { ...stringMap(req.query), ...stringMap(req.body) }
    const applied = applyGatewayResult(ctx, fields)
    if (wantsJson(req)) {
      res.json(applied)
      return
    }
    const payment = db.getPayment(applied.paymentId)
    const next = payment ? browserPathFor(payment, applied.status, applied.eventId) : '/account'
    res.redirect(`${config.publicUrl.replace(/\/$/, '')}${next}`)
  })
  app.get('/api/payments/bluepay/return', onReturn)
  app.post('/api/payments/bluepay/return', onReturn)
  app.post('/api/payments/bluepay/postback', onReturn)

  app.get('/api/admin/summary', (req, res) => {
    requireStaff(req)
    const counts = db.summary()
    const recent = db.listPayments({ limit: 8 })
    res.json({ ...counts, recentPayments: recent.map(presentPayment) })
  })

  app.get('/api/admin/members', (req, res) => {
    requireStaff(req)
    const q = typeof req.query.q === 'string' ? req.query.q : ''
    const status = typeof req.query.status === 'string' ? req.query.status : ''
    res.json({ members: db.listMembers({ q, status: status || undefined }).map(presentAdminMember) })
  })

  app.get('/api/admin/members/:id', (req, res) => {
    requireStaff(req)
    const member = db.getMember(req.params.id)
    if (!member) throw new HttpError(404, 'Member not found.')
    res.json({ member: presentAdminMember(member), payments: db.listPayments({ userId: member.user_id, limit: 20 }).map(presentPayment) })
  })

  app.post(
    '/api/admin/members',
    asyncRoute((req, res) => {
      const actor = requireStaff(req)
      const email = str(req, 'email').toLowerCase()
      if (!isEmail(email)) throw new HttpError(400, 'Enter a valid email.')
      if (db.getUserByEmail(email)) throw new HttpError(409, 'That email is already on file.')
      const chapterId = str(req, 'chapterId')
      const chapter = chapterId ? db.getChapter(chapterId) : undefined
      if (chapterId && !chapter) throw new HttpError(400, 'Unknown chapter.')
      const role = str(req, 'role') === 'staff' && actor.user.role === 'admin' ? 'staff' : 'member'
      const now = nowIso()
      const userId = id()
      const membership = str(req, 'membershipStatus') === 'active' ? 'active' : 'pending'
      db.insertUser({
        id: userId,
        email,
        password_hash: null,
        role,
        status: 'invited',
        created_at: now,
        updated_at: now,
        last_login_at: null,
      })
      db.insertMember({
        user_id: userId,
        first_name: str(req, 'firstName') || 'Member',
        last_name: str(req, 'lastName'),
        company: str(req, 'company'),
        title: str(req, 'title'),
        chapter_id: chapter?.id ?? null,
        phone: str(req, 'phone'),
        city: '',
        state: '',
        linkedin: '',
        show_email: 0,
        show_phone: 0,
        show_in_directory: 1,
        membership_status: membership,
        renewal_due_at: str(req, 'renewalDueAt') || null,
        bluepay_rebill_id: null,
        dues_paid_at: membership === 'active' ? now : null,
        reminder_sent_at: null,
        approved_at: membership === 'active' ? now : null,
        approved_by: membership === 'active' ? actor.user.id : null,
      })
      if (bool(req, 'sendInvite') || req.body?.sendInvite === undefined) {
        queueInvite(db, send, config.publicUrl, userId, email, str(req, 'firstName') || 'there', config.site)
      }
      res.status(201).json({ member: presentAdminMember(db.getMember(userId)!) })
    }),
  )

  app.patch('/api/admin/members/:id', (req, res) => {
    const actor = requireStaff(req)
    const member = db.getMember(req.params.id)
    if (!member) throw new HttpError(404, 'Member not found.')
    if (actor.user.role !== 'admin' && member.role === 'admin') throw new HttpError(403, 'Only an admin can edit an admin.')
    const chapterRaw = has(req, 'chapterId') ? str(req, 'chapterId') : member.chapter_id || ''
    if (chapterRaw && !db.getChapter(chapterRaw)) throw new HttpError(400, 'Unknown chapter.')
    const patch: Record<string, string | number | null> = {}
    if (has(req, 'firstName')) patch.first_name = str(req, 'firstName') || member.first_name
    if (has(req, 'lastName')) patch.last_name = str(req, 'lastName')
    if (has(req, 'company')) patch.company = str(req, 'company')
    if (has(req, 'title')) patch.title = str(req, 'title')
    if (has(req, 'chapterId')) patch.chapter_id = chapterRaw || null
    if (has(req, 'phone')) patch.phone = str(req, 'phone')
    if (has(req, 'city')) patch.city = str(req, 'city')
    if (has(req, 'state')) patch.state = str(req, 'state')
    if (has(req, 'membershipStatus')) patch.membership_status = membershipOr(str(req, 'membershipStatus'), member.membership_status)
    if (has(req, 'renewalDueAt')) patch.renewal_due_at = str(req, 'renewalDueAt') || null
    if (has(req, 'showInDirectory')) patch.show_in_directory = bool(req, 'showInDirectory') ? 1 : 0
    db.updateMember(member.user_id, patch)
    const nextRole = str(req, 'role')
    const nextStatus = str(req, 'status')
    if (nextRole && actor.user.role === 'admin' && (nextRole === 'member' || nextRole === 'staff' || nextRole === 'admin')) {
      if (member.user_id === actor.user.id && nextRole !== 'admin') throw new HttpError(400, 'You cannot remove your own admin access.')
      db.updateUser(member.user_id, { role: nextRole })
    }
    if (nextStatus && ['invited', 'pending_payment', 'pending_approval', 'active', 'suspended'].includes(nextStatus)) {
      if (member.user_id === actor.user.id && nextStatus === 'suspended') throw new HttpError(400, 'You cannot suspend yourself.')
      db.updateUser(member.user_id, { status: nextStatus as UserRow['status'] })
      if (nextStatus === 'suspended') db.deleteSessionsForUser(member.user_id)
    }
    res.json({ member: presentAdminMember(db.getMember(member.user_id)!) })
  })

  app.post('/api/admin/members/:id/approve', (req, res) => {
    const actor = requireStaff(req)
    const member = db.getMember(req.params.id)
    if (!member) throw new HttpError(404, 'Member not found.')
    if (bool(req, 'waive')) db.updateMember(member.user_id, { membership_status: 'waived' })
    const fresh = db.getMember(member.user_id)!
    const paid = Boolean(fresh.dues_paid_at) || fresh.membership_status === 'waived' || fresh.membership_status === 'active'
    if (!paid) throw new HttpError(400, 'Record a dues payment, or waive dues, before approving.')
    const now = nowIso()
    db.updateMember(member.user_id, {
      membership_status: fresh.membership_status === 'waived' ? 'waived' : 'active',
      approved_at: now,
      approved_by: actor.user.id,
    })
    if (fresh.user_status !== 'suspended') db.updateUser(member.user_id, { status: 'active' })
    send({
      to: fresh.email,
      subject: `Your ${config.site.shortName} membership is approved`,
      text: `Hello ${fresh.first_name},\n\nYour ${config.site.shortName} membership is approved. Sign in:\n\n${config.publicUrl.replace(/\/$/, '')}/\n\n${config.site.tagline}\n`,
    })
    res.json({ member: presentAdminMember(db.getMember(member.user_id)!) })
  })

  app.post('/api/admin/members/:id/invite', (req, res) => {
    requireStaff(req)
    const member = db.getMember(req.params.id)
    if (!member) throw new HttpError(404, 'Member not found.')
    queueInvite(db, send, config.publicUrl, member.user_id, member.email, member.first_name, config.site)
    res.json({ ok: true })
  })

  app.post('/api/admin/chapters', (req, res) => {
    requireStaff(req)
    const name = str(req, 'name')
    const state = str(req, 'state')
    if (!name) throw new HttpError(400, 'Chapter name is required.')
    if (db.findChapter(name)) throw new HttpError(409, 'That chapter already exists.')
    const chapterId = `ch-${id().slice(0, 8)}`
    db.insertChapter({ id: chapterId, name, state, sort_order: 100 })
    res.status(201).json({ chapter: presentChapter(db.getChapter(chapterId)!) })
  })

  app.get('/api/admin/events', (req, res) => {
    requireStaff(req)
    res.json({ events: db.listEvents({ when: 'all' }).map((event) => presentEvent(db, event, '', true)) })
  })

  app.post('/api/admin/events', (req, res) => {
    requireStaff(req)
    const saved = saveEvent(db, null, req)
    res.status(201).json({ event: presentEvent(db, db.getEvent(saved)!, '', true) })
  })

  app.patch('/api/admin/events/:id', (req, res) => {
    requireStaff(req)
    if (!db.getEvent(req.params.id)) throw new HttpError(404, 'Event not found.')
    saveEvent(db, req.params.id, req)
    res.json({ event: presentEvent(db, db.getEvent(req.params.id)!, '', true) })
  })

  app.put('/api/admin/events/:id/lunch-options', (req, res) => {
    requireStaff(req)
    if (!db.getEvent(req.params.id)) throw new HttpError(404, 'Event not found.')
    const labels = Array.isArray(req.body?.labels) ? req.body.labels.map((label: unknown) => String(label).trim()).filter(Boolean) : []
    replaceLunch(db, req.params.id, labels)
    res.json({ event: presentEvent(db, db.getEvent(req.params.id)!, '', true) })
  })

  app.get('/api/admin/events/:id/registrations', (req, res) => {
    requireStaff(req)
    if (!db.getEvent(req.params.id)) throw new HttpError(404, 'Event not found.')
    res.json({ registrations: db.listRegistrations(req.params.id).map(presentRegistration) })
  })

  app.get('/api/admin/events/:id/registrations.csv', (req, res) => {
    requireStaff(req)
    const event = db.getEvent(req.params.id)
    if (!event) throw new HttpError(404, 'Event not found.')
    const rows = db.listRegistrations(event.id).map((row) => [
      `${row.first_name} ${row.last_name}`.trim(),
      row.email,
      row.company,
      row.title,
      row.chapter_name ?? '',
      row.lunch_label ?? '',
      row.status,
      centsToAmount(row.amount_cents),
      row.created_at,
    ])
    const csv = toCsv(['Name', 'Email', 'Company', 'Title', 'Chapter', 'Lunch order', 'Status', 'Amount', 'Registered'], rows)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="registrations-${event.id}.csv"`)
    res.send(csv)
  })

  app.post('/api/admin/events/:id/registrations', (req, res) => {
    requireStaff(req)
    const event = db.getEvent(req.params.id)
    if (!event) throw new HttpError(404, 'Event not found.')
    const regId = compRegistration(ctx, event, str(req, 'userId'), str(req, 'lunchOptionId') || null)
    res.status(201).json({ registrationId: regId })
  })

  app.post('/api/admin/registrations/:id/cancel', (req, res) => {
    requireStaff(req)
    const registration = db.getRegistrationById(req.params.id)
    if (!registration) throw new HttpError(404, 'Registration not found.')
    db.updateRegistration(registration.id, { status: 'cancelled' })
    res.json({ ok: true })
  })

  app.get('/api/admin/jobs', (req, res) => {
    requireStaff(req)
    const status = typeof req.query.status === 'string' ? req.query.status : ''
    res.json({ jobs: db.listJobs(status ? { status } : {}).map(presentJob) })
  })

  app.patch('/api/admin/jobs/:id', (req, res) => {
    requireStaff(req)
    const job = db.getJob(req.params.id)
    if (!job) throw new HttpError(404, 'Job not found.')
    const status = str(req, 'status')
    if (!['pending', 'published', 'closed', 'rejected'].includes(status)) throw new HttpError(400, 'Unknown job status.')
    db.updateJob(job.id, {
      status: status as 'pending' | 'published' | 'closed' | 'rejected',
      published_at: status === 'published' ? job.published_at || nowIso() : job.published_at,
    })
    res.json({ job: presentJob(db.getJob(job.id)!) })
  })

  app.post(
    '/api/admin/files',
    asyncRoute(async (req, res) => {
      const actor = requireStaff(req)
      const parsed = await readMultipart(req, uploadDir)
      if (!parsed.file || !parsed.file.storedName) throw new HttpError(400, 'Choose a file.')
      const fileId = id()
      db.insertFile({
        id: fileId,
        title: parsed.fields.title || parsed.file.filename,
        description: parsed.fields.description || '',
        folder: parsed.fields.folder || 'General',
        filename: parsed.file.filename,
        stored_name: parsed.file.storedName,
        mime: parsed.file.mime,
        size: parsed.file.size,
        uploaded_by: actor.user.id,
        created_at: nowIso(),
      })
      res.status(201).json({ file: presentFile(db.getFile(fileId)!) })
    }),
  )

  app.delete('/api/admin/files/:id', (req, res) => {
    requireStaff(req)
    const file = db.getFile(req.params.id)
    if (!file) throw new HttpError(404, 'File not found.')
    db.deleteFile(file.id)
    res.json({ ok: true })
  })

  app.get('/api/admin/payments', (req, res) => {
    requireStaff(req)
    res.json({ payments: db.listPayments({ limit: 200 }).map(presentPayment) })
  })

  app.post('/api/admin/payments/manual', (req, res) => {
    requireStaff(req)
    const purpose = str(req, 'purpose')
    if (purpose !== 'dues_signup' && purpose !== 'dues_renewal' && purpose !== 'event') {
      throw new HttpError(400, 'Unknown payment purpose.')
    }
    const amount = int(req, 'amountCents')
    if (amount === null) throw new HttpError(400, 'Amount is required.')
    const payment = recordManualPayment(ctx, str(req, 'userId'), purpose, amount, str(req, 'note'))
    res.status(201).json({ payment: presentPayment(payment) })
  })

  app.post(
    '/api/admin/payments/:id/refund',
    asyncRoute(async (req, res) => {
      requireStaff(req)
      const payment = db.getPayment(req.params.id)
      if (!payment) throw new HttpError(404, 'Payment not found.')
      const result = await refundPayment(ctx, payment)
      res.json(result)
    }),
  )

  app.get('/api/admin/settings', (req, res) => {
    requireStaff(req)
    res.json(readSettings(db))
  })

  app.patch('/api/admin/settings', (req, res) => {
    requireAdmin(req)
    const dues = int(req, 'duesCents')
    const lead = int(req, 'renewalLeadDays')
    if (dues === null || dues < 0) throw new HttpError(400, 'Dues amount is invalid.')
    if (lead === null || lead < 1 || lead > 180) throw new HttpError(400, 'Reminder window must be between 1 and 180 days.')
    db.setSetting('dues_cents', String(dues))
    db.setSetting('renewal_lead_days', String(lead))
    db.setSetting('rebilling_enabled', bool(req, 'rebillingEnabled') ? '1' : '0')
    res.json(readSettings(db))
  })

  app.post('/api/admin/renewals/send', (req, res) => {
    requireStaff(req)
    res.json(sendRenewalReminders(ctx))
  })

  app.post(
    '/api/cron/renewals',
    asyncRoute((req, res) => {
      const header = req.headers.authorization || ''
      if (!config.cronSecret || header !== `Bearer ${config.cronSecret}`) throw new HttpError(401, 'Unauthorized.')
      res.json(sendRenewalReminders(ctx))
    }),
  )

  app.post(
    '/api/admin/import/:kind',
    asyncRoute(async (req, res) => {
      requireStaff(req)
      const parsed = await readMultipart(req, null)
      const csv = parsed.file?.text || ''
      if (!csv.trim()) throw new HttpError(400, 'Upload a CSV file.')
      const kind = req.params.kind
      const result =
        kind === 'members'
          ? importMembers(db, csv, { sendInvites: inviteFlag(parsed.fields.sendInvites), publicUrl: config.publicUrl, send, site: config.site })
          : kind === 'events'
            ? importEvents(db, csv, config.site.code)
            : kind === 'jobs'
              ? importJobs(db, csv, config.site.code)
              : null
      if (!result) throw new HttpError(404, 'Unknown import.')
      res.json(result)
    }),
  )

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found.' })
  })

  if (config.staticDir) {
    app.use(express.static(config.staticDir))
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next()
      res.sendFile(path.join(config.staticDir!, 'index.html'), (err) => {
        if (err) next(err)
      })
    })
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message })
      return
    }
    console.error(err)
    res.status(500).json({ error: 'Something went wrong.' })
  })

  return app
}

function loadAuth(db: Db, req: Request) {
  const sid = openSessionCookie(readCookie(req, COOKIE_FOR(req.app.locals.config.site as SiteDefinition)), req.app.locals.config.sessionSecret as string)
  if (!sid) return null
  const session = db.getSession(sid)
  if (!session) return null
  if (session.expires_at < nowIso()) {
    db.deleteSession(session.id)
    return null
  }
  const user = db.getUserById(session.user_id)
  if (!user || user.status === 'suspended') return null
  return { user, member: db.getMember(user.id) ?? null }
}

function ownedPayment(db: Db, user: UserRow, paymentId: string) {
  const payment = db.getPayment(paymentId)
  if (!payment) throw new HttpError(404, 'Payment not found.')
  if (payment.user_id !== user.id && user.role === 'member') throw new HttpError(404, 'Payment not found.')
  return payment
}

function acceptToken(db: Db, raw: string, kind: 'reset' | 'invite', password: string) {
  const record = liveToken(db, raw, kind)
  const user = db.getUserById(record.user_id)
  if (!user) throw new HttpError(400, 'This link is no longer valid.')
  db.updateUser(user.id, { password_hash: hashPassword(password) })
  db.markTokenUsed(record.id)
  db.deleteSessionsForUser(user.id)
  if (kind === 'invite') {
    const member = db.getMember(user.id)
    const active = member && (member.membership_status === 'active' || member.membership_status === 'waived')
    db.updateUser(user.id, { status: active ? 'active' : member?.dues_paid_at ? 'pending_approval' : 'pending_payment' })
  }
  return { userId: user.id }
}

function liveToken(db: Db, raw: string, kind: 'reset' | 'invite') {
  if (!raw) throw new HttpError(400, 'This link is missing a token.')
  const record = db.getTokenByHash(hashToken(raw))
  if (!record || record.kind !== kind || record.used_at || record.expires_at < nowIso()) {
    throw new HttpError(400, 'This link has expired. Ask for a new one.')
  }
  return record
}

function saveEvent(db: Db, eventId: string | null, req: Request) {
  const title = str(req, 'title')
  const type = str(req, 'type')
  const startsAt = str(req, 'startsAt')
  if (!title) throw new HttpError(400, 'Title is required.')
  if (type !== 'chapter_meeting' && type !== 'conference' && type !== 'workshop') throw new HttpError(400, 'Unknown event type.')
  const startsIso = parseEventInstant(startsAt)
  if (!startsIso) throw new HttpError(400, 'Start date is required. Enter it in Central time.')
  const endsRaw = str(req, 'endsAt')
  const endsIso = endsRaw ? parseEventInstant(endsRaw) : null
  if (endsRaw && !endsIso) throw new HttpError(400, 'End date is invalid. Enter it in Central time.')
  const price = int(req, 'priceCents') ?? 0
  if (price < 0) throw new HttpError(400, 'Price cannot be negative.')
  const capacityRaw = req.body?.capacity
  const capacity = capacityRaw === null || capacityRaw === '' || capacityRaw === undefined ? null : int(req, 'capacity')
  const requested = str(req, 'status')
  const status: 'draft' | 'published' | 'cancelled' = requested === 'draft' || requested === 'cancelled' ? requested : 'published'
  const chapterId = str(req, 'chapterId') || null
  if (chapterId && !db.getChapter(chapterId)) throw new HttpError(400, 'Unknown chapter.')
  const now = nowIso()
  if (!eventId) {
    eventId = id()
    db.insertEvent({
      id: eventId,
      title,
      type,
      chapter_id: chapterId,
      description: str(req, 'description'),
      location: str(req, 'location'),
      starts_at: startsIso,
      ends_at: endsIso,
      capacity,
      price_cents: price,
      status,
      created_at: now,
      updated_at: now,
    })
  } else {
    db.updateEvent(eventId, {
      title,
      type,
      chapter_id: chapterId,
      description: str(req, 'description'),
      location: str(req, 'location'),
      starts_at: startsIso,
      ends_at: endsIso,
      capacity,
      price_cents: price,
      status,
    })
  }
  if (Array.isArray(req.body?.lunchOptions)) {
    replaceLunch(
      db,
      eventId,
      req.body.lunchOptions.map((label: unknown) => String(label).trim()).filter(Boolean),
    )
  }
  return eventId
}

function replaceLunch(db: Db, eventId: string, labels: string[]) {
  const current = db.listLunch(eventId)
  const keep: string[] = []
  labels.forEach((label, index) => {
    const found = current.find((option) => option.label.toLowerCase() === label.toLowerCase())
    if (found) {
      keep.push(found.id)
      return
    }
    const lunchId = id()
    db.insertLunch({ id: lunchId, event_id: eventId, label, sort_order: index })
    keep.push(lunchId)
  })
  db.deleteUnusedLunch(eventId, keep)
}

function inviteFlag(value: string | undefined) {
  if (!value) return true
  return !['false', '0', 'no', 'off'].includes(value.toLowerCase())
}

function passwordOrThrow(value: unknown) {
  try {
    return assertPassword(value)
  } catch (err) {
    throw new HttpError(400, err instanceof Error ? err.message : 'Invalid password.')
  }
}

function sealSession(sid: string, secret: string) {
  const sig = createHmac('sha256', secret).update(sid).digest('hex').slice(0, 24)
  return `${sid}.${sig}`
}

function openSessionCookie(raw: string, secret: string) {
  const dot = raw.lastIndexOf('.')
  if (dot <= 0) return ''
  const sid = raw.slice(0, dot)
  const sig = raw.slice(dot + 1)
  const expected = createHmac('sha256', secret).update(sid).digest('hex').slice(0, 24)
  const left = Buffer.from(sig)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !timingSafeEqual(left, right)) return ''
  return sid
}

function has(req: Request, key: string) {
  return Boolean(req.body) && Object.prototype.hasOwnProperty.call(req.body, key)
}

function str(req: Request, key: string) {
  const value = req.body?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

function int(req: Request, key: string) {
  const value = req.body?.[key]
  if (typeof value === 'number' && Number.isInteger(value)) return value
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return Number(value.trim())
  return null
}

function bool(req: Request, key: string) {
  const value = req.body?.[key]
  return value === true || value === 1 || value === '1' || value === 'true'
}

function membershipOr(value: string, fallback: MemberJoined['membership_status']) {
  if (value === 'pending' || value === 'active' || value === 'lapsed' || value === 'cancelled' || value === 'waived') return value
  return fallback
}

function presentUser(user: UserRow) {
  return { id: user.id, email: user.email, role: user.role, status: user.status }
}

function presentMember(member: MemberJoined | null | undefined) {
  if (!member) return null
  return {
    userId: member.user_id,
    firstName: member.first_name,
    lastName: member.last_name,
    company: member.company,
    title: member.title,
    chapterId: member.chapter_id,
    chapterName: member.chapter_name,
    phone: member.phone,
    city: member.city,
    state: member.state,
    linkedin: member.linkedin,
    showEmail: member.show_email === 1,
    showPhone: member.show_phone === 1,
    showInDirectory: member.show_in_directory === 1,
    membershipStatus: member.membership_status,
    renewalDueAt: member.renewal_due_at,
    duesPaidAt: member.dues_paid_at,
    rebillScheduled: Boolean(member.bluepay_rebill_id),
  }
}

function presentAdminMember(member: MemberJoined) {
  return {
    ...presentMember(member),
    email: member.email,
    role: member.role,
    userStatus: member.user_status,
  }
}

function presentDirectory(member: MemberJoined) {
  return {
    id: member.user_id,
    firstName: member.first_name,
    lastName: member.last_name,
    company: member.company,
    title: member.title,
    chapterName: member.chapter_name,
    city: member.city,
    state: member.state,
    email: member.show_email ? member.email : null,
    phone: member.show_phone ? member.phone : null,
    linkedin: member.linkedin || null,
  }
}

function presentChapter(chapter: { id: string; name: string; state: string }) {
  return { id: chapter.id, name: chapter.name, state: chapter.state }
}

function presentEvent(db: Db, event: { id: string; title: string; type: string; chapter_id: string | null; chapter_name?: string | null; description: string; location: string; starts_at: string; ends_at: string | null; capacity: number | null; price_cents: number; status: string }, userId: string, _detail: boolean) {
  const options = db.listLunch(event.id)
  const reg = userId ? db.getRegistration(event.id, userId) : undefined
  const lunch = reg?.lunch_option_id ? options.find((option) => option.id === reg.lunch_option_id) : undefined
  return {
    id: event.id,
    title: event.title,
    type: event.type,
    chapterId: event.chapter_id,
    chapterName: event.chapter_name ?? null,
    description: event.description,
    location: event.location,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    capacity: event.capacity,
    priceCents: event.price_cents,
    status: event.status,
    registeredCount: db.countOccupying(event.id),
    lunchOptions: options.map((option) => ({ id: option.id, label: option.label })),
    myRegistration:
      reg && reg.status !== 'cancelled'
        ? { id: reg.id, status: reg.status, lunchOptionId: reg.lunch_option_id, lunchLabel: lunch?.label ?? null }
        : null,
  }
}

function presentPayment(payment: { id: string; user_id: string; purpose: string; amount_cents: number; status: string; mode: string; rebilling: number; order_id?: string; site_code?: string; bluepay_rebill_id?: string | null; message: string | null; card_mask: string | null; created_at: string; email?: string }) {
  return {
    id: payment.id,
    userId: payment.user_id,
    email: payment.email,
    purpose: payment.purpose,
    amountCents: Number(payment.amount_cents),
    status: payment.status,
    mode: payment.mode,
    orderId: payment.order_id ?? null,
    siteCode: payment.site_code ?? null,
    rebilling: Number(payment.rebilling) === 1,
    rebillId: payment.bluepay_rebill_id ?? null,
    message: payment.message,
    cardMask: payment.card_mask,
    createdAt: payment.created_at,
  }
}

function presentJob(job: { id: string; title: string; organization: string; location: string; category: string; description: string; contact_email: string; url: string; status: string; posted_by: string | null; created_at: string }) {
  return {
    id: job.id,
    title: job.title,
    organization: job.organization,
    location: job.location,
    category: job.category,
    description: job.description,
    contactEmail: job.contact_email,
    url: job.url,
    status: job.status,
    postedBy: job.posted_by,
    createdAt: job.created_at,
  }
}

function presentFile(file: { id: string; title: string; description: string; folder: string; filename: string; mime: string; size: number; created_at: string }) {
  return {
    id: file.id,
    title: file.title,
    description: file.description,
    folder: file.folder,
    filename: file.filename,
    mime: file.mime,
    size: file.size,
    createdAt: file.created_at,
  }
}

function presentRegistration(row: {
  id: string
  status: string
  amount_cents: number
  created_at: string
  email: string
  first_name: string
  last_name: string
  company: string
  title: string
  chapter_name: string | null
  lunch_label: string | null
  user_id: string
}) {
  return {
    id: row.id,
    userId: row.user_id,
    name: `${row.first_name} ${row.last_name}`.trim(),
    email: row.email,
    company: row.company,
    title: row.title,
    chapterName: row.chapter_name,
    lunch: row.lunch_label,
    status: row.status,
    amountCents: row.amount_cents,
    createdAt: row.created_at,
  }
}
