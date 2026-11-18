import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/server/app'
import { createTpsHash } from '../src/server/bluepay'
import type { Db } from '../src/server/db'
import { id, nowIso } from '../src/server/ids'
import { hashPassword } from '../src/server/passwords'

type Jar = { cookie: string }

const secret = 'test-secret-key'

describe('member flows', { concurrency: 1 }, () => {
  let server: Server
  let base: string
  let db: Db
  let dataDir: string

  before(async () => {
    dataDir = mkdtempSync(path.join(tmpdir(), 'usfeg-members-'))
    const app = createApp({
      dataDir,
      publicUrl: 'http://members.test',
      sessionSecret: 'session-secret',
      bluepay: {
        mode: 'mock',
        accountId: '123412341234',
        secretKey: secret,
        hashType: 'MD5',
        shpfHashType: 'MD5',
        publicUrl: 'http://members.test',
      },
      smtp: null,
      cronSecret: 'cron-secret',
      secureCookies: false,
      demo: false,
      seed: false,
    })
    db = app.locals.db as Db
    const now = nowIso()
    db.insertUser({
      id: 'admin-user',
      email: 'rod@usfeg.org',
      password_hash: hashPassword('admin-password-1'),
      role: 'admin',
      status: 'active',
      created_at: now,
      updated_at: now,
      last_login_at: null,
    })
    db.insertChapter({ id: 'feg-new-orleans', network: 'FEG', name: 'New Orleans', state: 'Louisiana', sort_order: 0 })
    db.insertChapter({ id: 'leg-new-orleans', network: 'LEG', name: 'New Orleans', state: 'Louisiana', sort_order: 0 })
    db.setSetting('dues_feg_cents', '49500')
    db.setSetting('dues_leg_cents', '49500')
    db.setSetting('rebilling_enabled', '1')
    db.setSetting('renewal_lead_days', '30')
    server = createServer(app)
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('no port')
    base = `http://127.0.0.1:${address.port}`
  })

  after(async () => {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())))
    db.close()
    rmSync(dataDir, { recursive: true, force: true })
  })

  it('charges dues through the sandbox, then requires approval before the directory', async () => {
    const admin = await login('rod@usfeg.org', 'admin-password-1')
    const signup = await call(jar(), 'POST', '/api/auth/signup', {
      email: 'new.member@example.com',
      password: 'member-password-1',
      firstName: 'New',
      lastName: 'Member',
      company: 'Member Co',
      title: 'CFO',
      network: 'FEG',
      chapterId: 'feg-new-orleans',
    })
    assert.equal(signup.status, 201)
    const start = await call(signup.jar, 'GET', signup.json.checkoutPath)
    assert.equal(start.status, 302)
    assert.match(String(start.headers.get('location')), /\/pay\/sandbox\//)

    const simulated = await call(signup.jar, 'POST', `/api/payments/${signup.json.paymentId}/simulate`)
    assert.equal(simulated.status, 200)
    assert.equal(simulated.json.status, 'approved')

    const me = await call(signup.jar, 'GET', '/api/auth/me')
    assert.equal(me.json.user.status, 'pending_approval')
    const blocked = await call(signup.jar, 'GET', '/api/directory?network=FEG')
    assert.equal(blocked.status, 403)

    const approved = await call(admin, 'POST', `/api/admin/members/${me.json.user.id}/approve`, {})
    assert.equal(approved.status, 200)
    const directory = await call(signup.jar, 'GET', '/api/directory?network=FEG')
    assert.equal(directory.status, 200)
    assert.equal(directory.json.members.some((member: { lastName: string }) => member.lastName === 'Member'), true)
    assert.equal(directory.json.members[0].email, null)

    const again = await call(signup.jar, 'POST', `/api/payments/${signup.json.paymentId}/simulate`)
    assert.equal(again.status, 400)
    const member = db.getMember(me.json.user.id)
    assert.ok(member?.renewal_due_at)
    const firstRenewal = member!.renewal_due_at
    const renewal = await call(signup.jar, 'POST', '/api/payments/dues', {})
    assert.equal(renewal.status, 201)
    const paid = await call(signup.jar, 'POST', `/api/payments/${renewal.json.paymentId}/simulate`)
    assert.equal(paid.json.status, 'approved')
    const extended = db.getMember(me.json.user.id)!.renewal_due_at!
    assert.ok(extended > firstRenewal!)

    const rebillId = db.getMember(me.json.user.id)!.bluepay_rebill_id!
    assert.ok(rebillId)
    const postback = sealed({
      MERCHANT: '123412341234',
      TRANSACTION_TYPE: 'SALE',
      AMOUNT: '495.00',
      MODE: 'TEST',
      CUSTOM_ID: '',
      RRNO: 'rebilltrans01',
      Result: 'APPROVED',
      REBID: rebillId,
    })
    const posted = await call(jar(), 'POST', '/api/payments/bluepay/postback', postback, { accept: 'application/json' })
    assert.equal(posted.status, 200)
    assert.equal(posted.json.duplicate, false)
    const replay = await call(jar(), 'POST', '/api/payments/bluepay/postback', postback, { accept: 'application/json' })
    assert.equal(replay.json.duplicate, true)
  })

  it('rejects a tampered return and a sandbox decline', async () => {
    const signup = await call(jar(), 'POST', '/api/auth/signup', {
      email: 'even.dues@example.com',
      password: 'member-password-1',
      firstName: 'Even',
      lastName: 'Dues',
      company: 'Even Co',
      title: 'Controller',
      network: 'FEG',
      chapterId: 'feg-new-orleans',
    })
    const admin = await login('rod@usfeg.org', 'admin-password-1')
    await call(admin, 'PATCH', '/api/admin/settings', {
      duesFegCents: 10000,
      duesLegCents: 49500,
      renewalLeadDays: 30,
      rebillingEnabled: true,
    })
    const declinedUser = await call(jar(), 'POST', '/api/auth/signup', {
      email: 'declined.dues@example.com',
      password: 'member-password-1',
      firstName: 'Dee',
      lastName: 'Clined',
      company: 'No Co',
      title: 'CFO',
      network: 'FEG',
      chapterId: 'feg-new-orleans',
    })
    const declined = await call(declinedUser.jar, 'POST', `/api/payments/${declinedUser.json.paymentId}/simulate`)
    assert.equal(declined.json.status, 'declined')
    const still = await call(declinedUser.jar, 'GET', '/api/auth/me')
    assert.equal(still.json.user.status, 'pending_payment')

    const forged = sealed({
      MERCHANT: '123412341234',
      TRANSACTION_TYPE: 'SALE',
      AMOUNT: '495.00',
      MODE: 'TEST',
      CUSTOM_ID: signup.json.paymentId,
      RRNO: 'forgedtrans01',
      Result: 'APPROVED',
      REBID: '',
    })
    forged.AMOUNT = '1.00'
    const rejected = await call(jar(), 'POST', '/api/payments/bluepay/return', forged, { accept: 'application/json' })
    assert.equal(rejected.status, 400)
    assert.equal(db.getPayment(signup.json.paymentId)?.status, 'pending')

    await call(admin, 'PATCH', '/api/admin/settings', {
      duesFegCents: 49500,
      duesLegCents: 49500,
      renewalLeadDays: 30,
      rebillingEnabled: true,
    })
  })

  it('registers a chapter lunch with an order and exports it', async () => {
    const admin = await login('rod@usfeg.org', 'admin-password-1')
    const member = await activeMember('lunch.member@example.com', 'Lunch', 'Guest')
    const created = await call(admin, 'POST', '/api/admin/events', {
      title: 'Chapter lunch',
      type: 'chapter_meeting',
      chapterId: 'feg-new-orleans',
      description: 'Monthly lunch',
      location: 'Downtown',
      startsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      priceCents: 0,
      status: 'published',
      lunchOptions: ['Grilled chicken', 'Vegetarian plate'],
    })
    assert.equal(created.status, 201)
    const central = await call(admin, 'POST', '/api/admin/events', {
      title: 'Central time check',
      type: 'chapter_meeting',
      chapterId: 'feg-new-orleans',
      description: 'Wall time is Central.',
      location: 'Downtown',
      startsAt: '2027-04-14T11:30',
      endsAt: '2027-04-14T13:00',
      priceCents: 0,
      status: 'published',
      lunchOptions: ['Salad'],
    })
    assert.equal(central.json.event.startsAt, '2027-04-14T16:30:00.000Z')
    assert.equal(central.json.event.endsAt, '2027-04-14T18:00:00.000Z')
    const eventId = created.json.event.id
    const missing = await call(member, 'POST', `/api/events/${eventId}/register`, {})
    assert.equal(missing.status, 400)
    const lunchId = created.json.event.lunchOptions[1].id
    const registered = await call(member, 'POST', `/api/events/${eventId}/register`, { lunchOptionId: lunchId })
    assert.equal(registered.status, 201)
    assert.equal(registered.json.checkout, false)
    const duplicate = await call(member, 'POST', `/api/events/${eventId}/register`, { lunchOptionId: lunchId })
    assert.equal(duplicate.status, 409)
    const csv = await call(admin, 'GET', `/api/admin/events/${eventId}/registrations.csv`)
    assert.equal(csv.status, 200)
    assert.match(csv.text, /Vegetarian plate/)
    assert.match(csv.text, /lunch.member@example.com/)
  })

  it('holds a paid conference registration until BluePay approves it', async () => {
    const admin = await login('rod@usfeg.org', 'admin-password-1')
    const member = await activeMember('conf.member@example.com', 'Conference', 'Guest')
    const created = await call(admin, 'POST', '/api/admin/events', {
      title: 'Fall Conference',
      type: 'conference',
      description: 'Annual conference',
      location: 'Higgins Hotel',
      startsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      priceCents: 17500,
      status: 'published',
      lunchOptions: [],
    })
    const eventId = created.json.event.id
    const pending = await call(member, 'POST', `/api/events/${eventId}/register`, {})
    assert.equal(pending.json.checkout, true)
    const detail = await call(member, 'GET', `/api/events/${eventId}`)
    assert.equal(detail.json.event.myRegistration.status, 'pending_payment')
    const paid = await call(member, 'POST', `/api/payments/${pending.json.checkoutPath.split('/').at(-2)}/simulate`)
    assert.equal(paid.json.status, 'approved')
    const after = await call(member, 'GET', `/api/events/${eventId}`)
    assert.equal(after.json.event.myRegistration.status, 'registered')
  })

  it('keeps FEG and LEG directories separate and honors privacy flags', async () => {
    const visible = await activeMember('visible.member@example.com', 'Visible', 'Person')
    const hidden = await activeMember('hidden.member@example.com', 'Hidden', 'Person')
    await call(hidden, 'PATCH', '/api/account', { showEmail: false, showPhone: false, showInDirectory: true, phone: '504-555-0100' })
    await call(visible, 'PATCH', '/api/account', { showEmail: true, showPhone: false })
    const leg = await activeMember('leg.member@example.com', 'Legal', 'Leader', 'LEG', 'leg-new-orleans')
    await call(leg, 'PATCH', '/api/account', { showEmail: true })
    const feg = await call(visible, 'GET', '/api/directory?network=FEG&q=Person')
    const names = feg.json.members.map((member: { lastName: string; email: string | null }) => `${member.lastName}:${member.email ?? ''}`)
    assert.ok(names.includes('Person:visible.member@example.com'))
    assert.ok(names.includes('Person:'))
    const legDir = await call(visible, 'GET', '/api/directory?network=LEG')
    assert.equal(legDir.json.members.some((member: { firstName: string }) => member.firstName === 'Legal'), true)
    assert.equal(legDir.json.members.some((member: { firstName: string }) => member.firstName === 'Visible'), false)
  })

  it('moderates jobs, stores files for members only, and imports CSV', async () => {
    const admin = await login('rod@usfeg.org', 'admin-password-1')
    const member = await activeMember('jobs.member@example.com', 'Jobs', 'Poster')
    const job = await call(member, 'POST', '/api/jobs', {
      title: 'Controller',
      organization: 'Test Bank',
      description: 'A member-submitted opening.',
      contactEmail: 'hr@example.com',
      location: 'New Orleans',
      category: 'Accounting',
    })
    assert.equal(job.json.job.status, 'pending')
    const listed = await call(member, 'GET', '/api/jobs')
    assert.equal(listed.json.jobs.some((item: { id: string; status: string }) => item.id === job.json.job.id && item.status === 'published'), false)
    await call(admin, 'PATCH', `/api/admin/jobs/${job.json.job.id}`, { status: 'published' })
    const published = await call(member, 'GET', '/api/jobs')
    assert.equal(published.json.jobs.some((item: { id: string }) => item.id === job.json.job.id), true)

    const form = new FormData()
    form.set('title', 'Host notes')
    form.set('folder', 'Chapter operations')
    form.set('file', new Blob(['hello members'], { type: 'text/plain' }), 'notes.txt')
    const uploaded = await fetch(base + '/api/admin/files', { method: 'POST', headers: { cookie: admin.cookie }, body: form })
    assert.equal(uploaded.status, 201)
    const file = (await uploaded.json()) as { file: { id: string } }
    const anon = await fetch(base + `/api/files/${file.file.id}/download`)
    assert.equal(anon.status, 401)
    const downloaded = await fetch(base + `/api/files/${file.file.id}/download`, { headers: { cookie: member.cookie } })
    assert.equal(downloaded.status, 200)
    assert.equal(await downloaded.text(), 'hello members')

    const csv = new FormData()
    csv.set('sendInvites', 'false')
    csv.set('file', new Blob(['Email,First Name,Last Name,Company,Network,Chapter,Status\nimported.person@example.com,Imported,Person,Import Co,FEG,Mobile,Active\n'], { type: 'text/csv' }), 'members.csv')
    const imported = await fetch(base + '/api/admin/import/members', { method: 'POST', headers: { cookie: admin.cookie }, body: csv })
    const importBody = (await imported.json()) as { created: number }
    assert.equal(imported.status, 200)
    assert.equal(importBody.created, 1)
    assert.equal(db.getUserByEmail('imported.person@example.com')?.status, 'invited')
    assert.ok(db.findChapter('FEG', 'Mobile'))
  })

  it('sends a password reset and an invite that sets a password', async () => {
    const admin = await login('rod@usfeg.org', 'admin-password-1')
    await activeMember('reset.member@example.com', 'Reset', 'Member')
    const forgot = await call(jar(), 'POST', '/api/auth/forgot', { email: 'reset.member@example.com' })
    assert.equal(forgot.status, 200)
    const mail = db.latestEmailTo('reset.member@example.com')
    const token = new URL(mail!.body.match(/https?:\/\/\S+/)![0]).searchParams.get('token')
    const reset = await call(jar(), 'POST', '/api/auth/reset', { token, password: 'new-password-1' })
    assert.equal(reset.status, 200)
    const oldLogin = await call(jar(), 'POST', '/api/auth/login', { email: 'reset.member@example.com', password: 'member-password-1' })
    assert.equal(oldLogin.status, 401)
    const newLogin = await call(jar(), 'POST', '/api/auth/login', { email: 'reset.member@example.com', password: 'new-password-1' })
    assert.equal(newLogin.status, 200)

    const invited = await call(admin, 'POST', '/api/admin/members', {
      email: 'invited.member@example.com',
      firstName: 'Invited',
      lastName: 'Member',
      network: 'FEG',
      chapterId: 'feg-new-orleans',
      membershipStatus: 'active',
      sendInvite: true,
    })
    assert.equal(invited.status, 201)
    const inviteMail = db.latestEmailTo('invited.member@example.com')
    const inviteToken = new URL(inviteMail!.body.match(/https?:\/\/\S+/)![0]).searchParams.get('token')
    const preview = await call(jar(), 'GET', `/api/auth/invite/${inviteToken}`)
    assert.equal(preview.json.email, 'invited.member@example.com')
    const accepted = await call(jar(), 'POST', '/api/auth/invite', { token: inviteToken, password: 'invite-password-1' })
    assert.equal(accepted.status, 200)
    const session = await call(accepted.jar, 'GET', '/api/auth/me')
    assert.equal(session.json.user.status, 'active')
  })

  it('lets staff run the day to day work but not change dues', async () => {
    const admin = await login('rod@usfeg.org', 'admin-password-1')
    const created = await call(admin, 'POST', '/api/admin/members', {
      email: 'staff.person@example.com',
      firstName: 'Staff',
      lastName: 'Person',
      network: 'FEG',
      membershipStatus: 'active',
      sendInvite: false,
    })
    await call(admin, 'PATCH', `/api/admin/members/${created.json.member.userId}`, { role: 'staff', status: 'active' })
    db.updateUser(created.json.member.userId, { password_hash: hashPassword('staff-password-1') })
    const staff = await login('staff.person@example.com', 'staff-password-1')
    const denied = await call(staff, 'PATCH', '/api/admin/settings', {
      duesFegCents: 100,
      duesLegCents: 100,
      renewalLeadDays: 30,
      rebillingEnabled: false,
    })
    assert.equal(denied.status, 403)
    const events = await call(staff, 'GET', '/api/admin/events')
    assert.equal(events.status, 200)
  })

  function jar(): Jar {
    return { cookie: '' }
  }

  async function login(email: string, password: string) {
    const result = await call(jar(), 'POST', '/api/auth/login', { email, password })
    assert.equal(result.status, 200, JSON.stringify(result.json))
    return result.jar
  }

  async function activeMember(email: string, first: string, last: string, network = 'FEG', chapterId = 'feg-new-orleans') {
    const now = nowIso()
    const userId = id()
    db.insertUser({
      id: userId,
      email,
      password_hash: hashPassword('member-password-1'),
      role: 'member',
      status: 'active',
      created_at: now,
      updated_at: now,
      last_login_at: null,
    })
    db.insertMember({
      user_id: userId,
      first_name: first,
      last_name: last,
      company: 'Test Co',
      title: 'CFO',
      network: network as 'FEG' | 'LEG',
      chapter_id: chapterId,
      phone: '',
      city: 'New Orleans',
      state: 'LA',
      linkedin: '',
      show_email: 0,
      show_phone: 0,
      show_in_directory: 1,
      membership_status: 'active',
      renewal_due_at: new Date(Date.now() + 200 * 86400000).toISOString(),
      bluepay_rebill_id: null,
      dues_paid_at: now,
      reminder_sent_at: null,
      approved_at: now,
      approved_by: 'admin-user',
    })
    return login(email, 'member-password-1')
  }

  async function call(jar: Jar, method: string, urlPath: string, body?: unknown, extra?: { accept?: string }) {
    const response = await fetch(base + urlPath, {
      method,
      headers: {
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(jar.cookie ? { cookie: jar.cookie } : {}),
        accept: extra?.accept ?? 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'manual',
    })
    const next = response.headers.getSetCookie?.() ?? []
    for (const cookie of next) {
      const pair = cookie.split(';')[0]
      if (pair.startsWith('usfeg_member=')) jar.cookie = pair
    }
    const text = await response.text()
    let json: any = {}
    try {
      json = text ? JSON.parse(text) : {}
    } catch {
      json = {}
    }
    return { status: response.status, json, text, headers: response.headers, jar }
  }
})

function sealed(fields: Record<string, string>): Record<string, string> {
  const def = 'MERCHANT TRANSACTION_TYPE AMOUNT MODE CUSTOM_ID RRNO Result REBID'
  let message = ''
  for (const name of def.split(' ')) message += fields[name] ?? ''
  return { ...fields, BP_STAMP_DEF: def, BP_STAMP: createTpsHash(secret, message, 'MD5') }
}
