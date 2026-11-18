import { randomBytes } from 'node:crypto'
import {
  allowlistedGatewayFields,
  amountToCents,
  buildHostedCheckoutUrl,
  buildMockGatewayResult,
  buildRefundPost,
  centsToAmount,
  maskAccount,
  verifyBpStamp,
  type BluePayConfig,
} from './bluepay'
import type { Db, EventRow, MemberJoined, PaymentPurpose, PaymentRow, UserRow } from './db'
import { HttpError } from './http'
import { addYears, id, nowIso, paymentId } from './ids'
import type { MailMessage } from './mail'
import { paymentOrderId, paymentSiteField, type SiteCode, type SiteDefinition } from '../shared/sites'

export type AppSettings = {
  duesCents: number
  renewalLeadDays: number
  rebillingEnabled: boolean
}

export function readSettings(db: Db): AppSettings {
  return {
    duesCents: Number(db.getSetting('dues_cents', '49500')),
    renewalLeadDays: Number(db.getSetting('renewal_lead_days', '30')),
    rebillingEnabled: db.getSetting('rebilling_enabled', '1') === '1',
  }
}

type Ctx = {
  db: Db
  site: SiteDefinition
  bluepay: BluePayConfig
  publicUrl: string
  send: (message: MailMessage) => void
}

function origin(publicUrl: string) {
  return publicUrl.replace(/\/$/, '')
}

export function returnUrl(publicUrl: string) {
  return `${origin(publicUrl)}/api/payments/bluepay/return`
}

export function browserPathFor(payment: PaymentRow, status: string, eventId?: string | null) {
  if (payment.purpose === 'event' && eventId) return `/events/${eventId}?payment=${payment.id}&result=${status}`
  return `/account?payment=${payment.id}&result=${status}`
}

export function createDuesPayment(ctx: Ctx, user: UserRow, purpose: Extract<PaymentPurpose, 'dues_signup' | 'dues_renewal'>) {
  const member = ctx.db.getMember(user.id)
  if (!member) throw new HttpError(400, 'Member profile is missing.')
  const existing = ctx.db.latestPendingDues(user.id)
  if (existing) return existing
  const settings = readSettings(ctx.db)
  const amount = settings.duesCents
  if (!Number.isInteger(amount) || amount <= 0) throw new HttpError(400, 'Dues are not configured. An admin needs to set them.')
  const row = newPayment(ctx, {
    user_id: user.id,
    purpose,
    registration_id: null,
    amount_cents: amount,
    status: 'pending',
    rebilling: settings.rebillingEnabled ? 1 : 0,
    bluepay_trans_id: null,
    bluepay_rebill_id: null,
    message: null,
    card_mask: null,
  })
  ctx.db.insertPayment(row)
  return row
}

export function startCheckout(ctx: Ctx, payment: PaymentRow) {
  if (payment.status !== 'pending') throw new HttpError(400, 'This payment is no longer open.')
  if (ctx.bluepay.mode === 'mock') {
    return { kind: 'redirect' as const, url: `${origin(ctx.publicUrl)}/pay/sandbox/${payment.id}` }
  }
  if (ctx.bluepay.mode !== 'TEST' && ctx.bluepay.mode !== 'LIVE') {
    throw new HttpError(500, 'BluePay mode is not configured.')
  }
  const url = buildHostedCheckoutUrl({
    accountId: ctx.bluepay.accountId,
    secretKey: ctx.bluepay.secretKey,
    hashType: ctx.bluepay.hashType,
    shpfHashType: ctx.bluepay.shpfHashType,
    mode: ctx.bluepay.mode,
    amount: centsToAmount(payment.amount_cents),
    returnUrl: returnUrl(ctx.publicUrl),
    customId: payment.id,
    customId2: paymentSiteField(ctx.site.code, payment.purpose),
    orderId: payment.order_id,
    invoiceId: payment.order_id,
    rebilling: payment.rebilling === 1,
    rebFirstDate: '1 YEAR',
    rebExpr: '1 YEAR',
    rebAmount: centsToAmount(payment.amount_cents),
    dba: ctx.site.shortName,
  })
  return { kind: 'redirect' as const, url }
}

export function simulatePayment(ctx: Ctx, payment: PaymentRow) {
  if (ctx.bluepay.mode !== 'mock') throw new HttpError(404, 'The sandbox simulator is only available in mock mode.')
  if (payment.status !== 'pending') throw new HttpError(400, 'This payment is no longer open.')
  const fields = buildMockGatewayResult({
    secretKey: ctx.bluepay.secretKey,
    hashType: ctx.bluepay.hashType,
    accountId: ctx.bluepay.accountId || 'mock-account',
    amount: centsToAmount(payment.amount_cents),
    customId: payment.id,
    transId: randomBytes(8).toString('hex'),
    rebilling: payment.rebilling === 1,
  })
  return applyGatewayResult(ctx, fields)
}

export type ApplyOutcome = {
  paymentId: string
  status: string
  duplicate: boolean
  purpose: string
  eventId: string | null
}

/**
 * Apply a sealed BluePay (or simulator) result. Idempotent on RRNO so a refresh
 * or a second postback cannot extend a membership twice.
 */
export function applyGatewayResult(ctx: Ctx, raw: Record<string, string>): ApplyOutcome {
  const fields = allowlistedGatewayFields(raw)
  if (!verifyBpStamp(ctx.bluepay.secretKey, fields, ctx.bluepay.hashType)) {
    throw new HttpError(400, 'Payment response could not be verified.')
  }
  if (fields.ORDER_ID && !fields.ORDER_ID.startsWith(`${ctx.site.code}-`)) {
    throw new HttpError(400, 'This payment belongs to the other member site.')
  }
  if (fields.CUSTOM_ID2 && siteTag(fields.CUSTOM_ID2) && siteTag(fields.CUSTOM_ID2) !== ctx.site.code) {
    throw new HttpError(400, 'This payment belongs to the other member site.')
  }
  const result = (fields.Result || '').toUpperCase()
  const approved = result === 'APPROVED'
  if (!approved && result !== 'DECLINED' && result !== 'ERROR' && result !== 'MISSING') {
    throw new HttpError(400, 'Unrecognized payment result.')
  }
  const rrno = fields.RRNO || fields.TRANS_ID || ''
  const rebid = fields.REBID || ''
  const customId = fields.CUSTOM_ID || ''
  const cardMask = maskAccount(fields.PAYMENT_ACCOUNT)
  const status = approved ? 'approved' : result === 'DECLINED' ? 'declined' : 'error'

  return ctx.db.transaction(() => {
    if (rrno) {
      const existing = ctx.db.getPaymentByTransId(rrno)
      if (existing) {
        return outcome(ctx, existing, true)
      }
    }

    const payment = customId ? ctx.db.getPayment(customId) : undefined
    if (payment?.status === 'pending') {
      ctx.db.updatePayment(payment.id, {
        status,
        bluepay_trans_id: rrno || null,
        bluepay_rebill_id: rebid || null,
        message: (fields.MESSAGE || result).slice(0, 300),
        card_mask: cardMask,
      })
      if (approved) fulfill(ctx, payment, rebid)
      const updated = ctx.db.getPayment(payment.id)!
      if (approved) sendReceipt(ctx, updated)
      return outcome(ctx, updated, false)
    }

    if (approved && rebid && rrno) {
      const member = ctx.db.getMemberByRebillId(rebid)
      if (member) {
        const cents = amountToCents(fields.AMOUNT) ?? readSettings(ctx.db).duesCents
        const created = newPayment(ctx, {
          user_id: member.user_id,
          purpose: 'dues_renewal',
          registration_id: null,
          amount_cents: cents,
          status: 'approved',
          rebilling: 1,
          bluepay_trans_id: rrno,
          bluepay_rebill_id: rebid,
          message: 'Automatic renewal',
          card_mask: cardMask,
        })
        ctx.db.insertPayment(created)
        extendRenewal(ctx.db, member.user_id, rebid)
        sendReceipt(ctx, created)
        return outcome(ctx, created, false)
      }
    }

    if (payment) return outcome(ctx, payment, true)
    throw new HttpError(404, 'Payment not found.')
  })
}

function outcome(ctx: Ctx, payment: PaymentRow, duplicate: boolean): ApplyOutcome {
  let eventId: string | null = null
  if (payment.registration_id) {
    eventId = ctx.db.getRegistrationById(payment.registration_id)?.event_id ?? null
  }
  return { paymentId: payment.id, status: payment.status, duplicate, purpose: payment.purpose, eventId }
}

function fulfill(ctx: Ctx, payment: PaymentRow, rebid: string) {
  if (payment.purpose === 'dues_signup' || payment.purpose === 'dues_renewal') {
    extendRenewal(ctx.db, payment.user_id, rebid, payment.purpose)
    return
  }
  if (payment.purpose === 'event' && payment.registration_id) {
    ctx.db.updateRegistration(payment.registration_id, { status: 'registered', payment_id: payment.id })
  }
}

function extendRenewal(db: Db, userId: string, rebid: string, purpose?: PaymentPurpose) {
  const member = db.getMember(userId)
  const user = db.getUserById(userId)
  if (!member || !user) return
  const now = nowIso()
  const base =
    purpose === 'dues_renewal' && member.renewal_due_at && member.renewal_due_at > now ? member.renewal_due_at : now
  const renewal = addYears(purpose === 'dues_signup' ? now : base, 1)
  const membership =
    purpose === 'dues_renewal' && (member.membership_status === 'active' || member.membership_status === 'lapsed')
      ? 'active'
      : member.membership_status
  db.updateMember(userId, {
    dues_paid_at: now,
    renewal_due_at: renewal,
    membership_status: membership,
    ...(rebid ? { bluepay_rebill_id: rebid } : {}),
  })
  if (purpose === 'dues_signup' && user.status === 'pending_payment') {
    db.updateUser(userId, { status: 'pending_approval' })
  }
  if (purpose === 'dues_renewal' && user.status !== 'suspended' && user.status !== 'pending_approval' && user.status !== 'invited') {
    if (membership === 'active') db.updateUser(userId, { status: 'active' })
  }
}

function sendReceipt(ctx: Ctx, payment: PaymentRow) {
  if (payment.status !== 'approved') return
  const user = ctx.db.getUserById(payment.user_id)
  if (!user) return
  const amount = centsToAmount(payment.amount_cents)
  const label =
    payment.purpose === 'event' ? 'event registration' : payment.purpose === 'dues_renewal' ? 'membership renewal' : 'membership dues'
  ctx.send({
    to: user.email,
    subject: `${ctx.site.shortName} payment received ($${amount})`,
    text: `We received your ${label} payment of $${amount}.\n\nReference: ${payment.id}\n\n${origin(ctx.publicUrl)}/account\n`,
  })
}

export function registerForEvent(ctx: Ctx, user: UserRow, eventId: string, lunchOptionId: string | null) {
  const event = ctx.db.getEvent(eventId)
  if (!event || event.status !== 'published') throw new HttpError(404, 'Event not found.')
  if (!ctx.db.getMember(user.id)) throw new HttpError(400, 'Add a member profile before registering.')
  if (user.role === 'member' && user.status !== 'active') {
    throw new HttpError(403, 'Your membership has to be active before you can register.')
  }
  if (new Date(event.starts_at).getTime() < Date.now()) throw new HttpError(400, 'Registration for this event is closed.')

  const options = ctx.db.listLunch(eventId)
  if (options.length && !lunchOptionId) throw new HttpError(400, 'Choose a lunch order.')
  if (lunchOptionId && !options.some((option) => option.id === lunchOptionId)) {
    throw new HttpError(400, 'That lunch order is not on this event.')
  }
  const lunch = options.length ? lunchOptionId : null
  const existing = ctx.db.getRegistration(eventId, user.id)
  if (existing?.status === 'registered') throw new HttpError(409, 'You are already registered.')

  if (existing?.status === 'pending_payment' && existing.payment_id) {
    const payment = ctx.db.getPayment(existing.payment_id)
    if (payment?.status === 'pending') {
      ctx.db.updateRegistration(existing.id, { lunch_option_id: lunch })
      return { registrationId: existing.id, payment, checkout: event.price_cents > 0 }
    }
  }

  const occupying = ctx.db.countOccupying(eventId)
  const alreadyHolding = existing?.status === 'pending_payment'
  if (event.capacity && occupying >= event.capacity && !alreadyHolding) {
    throw new HttpError(400, 'This event is full.')
  }

  const regId = existing?.id ?? id()
  if (event.price_cents > 0) {
    const payment = newPayment(ctx, {
      user_id: user.id,
      purpose: 'event',
      registration_id: regId,
      amount_cents: event.price_cents,
      status: 'pending',
      rebilling: 0,
      bluepay_trans_id: null,
      bluepay_rebill_id: null,
      message: null,
      card_mask: null,
    })
    const payId = payment.id
    ctx.db.transaction(() => {
      ctx.db.insertPayment(payment)
      if (existing) {
        ctx.db.updateRegistration(existing.id, {
          status: 'pending_payment',
          lunch_option_id: lunch,
          amount_cents: event.price_cents,
          payment_id: payId,
        })
      } else {
        ctx.db.insertRegistration({
          id: regId,
          event_id: eventId,
          user_id: user.id,
          lunch_option_id: lunch,
          status: 'pending_payment',
          amount_cents: event.price_cents,
          payment_id: payId,
          created_at: nowIso(),
        })
      }
    })
    return { registrationId: regId, payment, checkout: true }
  }

  ctx.db.transaction(() => {
    if (existing) {
      ctx.db.updateRegistration(existing.id, {
        status: 'registered',
        lunch_option_id: lunch,
        amount_cents: 0,
        payment_id: null,
      })
    } else {
      ctx.db.insertRegistration({
        id: regId,
        event_id: eventId,
        user_id: user.id,
        lunch_option_id: lunch,
        status: 'registered',
        amount_cents: 0,
        payment_id: null,
        created_at: nowIso(),
      })
    }
  })
  return { registrationId: regId, payment: null, checkout: false }
}

export function cancelRegistration(ctx: Ctx, user: UserRow, eventId: string) {
  const event = ctx.db.getEvent(eventId)
  if (!event) throw new HttpError(404, 'Event not found.')
  const registration = ctx.db.getRegistration(eventId, user.id)
  if (!registration || registration.status === 'cancelled') throw new HttpError(404, 'You are not registered.')
  if (new Date(event.starts_at).getTime() < Date.now()) throw new HttpError(400, 'This event has already started.')
  ctx.db.updateRegistration(registration.id, { status: 'cancelled' })
  return registration
}

export function compRegistration(ctx: Ctx, event: EventRow, userId: string, lunchOptionId: string | null) {
  const user = ctx.db.getUserById(userId)
  const member = ctx.db.getMember(userId)
  if (!user || !member) throw new HttpError(404, 'Member not found.')
  const options = ctx.db.listLunch(event.id)
  if (options.length && !lunchOptionId) throw new HttpError(400, 'Choose a lunch order.')
  if (lunchOptionId && !options.some((option) => option.id === lunchOptionId)) throw new HttpError(400, 'Unknown lunch order.')
  const existing = ctx.db.getRegistration(event.id, userId)
  if (existing?.status === 'registered') throw new HttpError(409, 'Already registered.')
  const regId = existing?.id ?? id()
  if (existing) {
    ctx.db.updateRegistration(existing.id, { status: 'registered', lunch_option_id: lunchOptionId, amount_cents: 0, payment_id: null })
  } else {
    ctx.db.insertRegistration({
      id: regId,
      event_id: event.id,
      user_id: userId,
      lunch_option_id: lunchOptionId,
      status: 'registered',
      amount_cents: 0,
      payment_id: null,
      created_at: nowIso(),
    })
  }
  return regId
}

export function recordManualPayment(ctx: Ctx, userId: string, purpose: PaymentPurpose, amountCents: number, note: string) {
  const user = ctx.db.getUserById(userId)
  const member = ctx.db.getMember(userId)
  if (!user || !member) throw new HttpError(404, 'Member not found.')
  if (!Number.isInteger(amountCents) || amountCents < 0) throw new HttpError(400, 'Amount is invalid.')
  const row = newPayment(ctx, {
    user_id: userId,
    purpose,
    registration_id: null,
    amount_cents: amountCents,
    status: 'approved',
    rebilling: 0,
    bluepay_trans_id: `manual-${id().slice(0, 12)}`,
    bluepay_rebill_id: null,
    message: note.slice(0, 300) || 'Recorded by admin',
    card_mask: null,
  })
  row.mode = 'manual'
  ctx.db.transaction(() => {
    ctx.db.insertPayment(row)
    if (purpose === 'dues_signup' || purpose === 'dues_renewal') extendRenewal(ctx.db, userId, '', purpose)
  })
  return row
}

export async function refundPayment(ctx: Ctx, payment: PaymentRow, poster?: (url: string, fields: Record<string, string>) => Promise<Record<string, string>>) {
  if (payment.status !== 'approved') throw new HttpError(400, 'Only an approved payment can be marked refunded.')
  if (ctx.bluepay.mode === 'mock' || payment.mode === 'manual' || !payment.bluepay_trans_id) {
    ctx.db.updatePayment(payment.id, { status: 'refunded', message: 'Marked refunded locally. Issue the refund in BluePay if a card was charged.' })
    return { status: 'refunded' as const, remote: false }
  }
  const post = buildRefundPost({
    accountId: ctx.bluepay.accountId,
    secretKey: ctx.bluepay.secretKey,
    hashType: ctx.bluepay.hashType,
    mode: ctx.bluepay.mode,
    rrno: payment.bluepay_trans_id,
    amount: centsToAmount(payment.amount_cents),
  })
  const send = poster ?? postForm
  const result = await send(post.url, post.fields)
  if (!verifyBpStamp(ctx.bluepay.secretKey, result, ctx.bluepay.hashType)) {
    throw new HttpError(502, 'BluePay refund response could not be verified. Nothing was changed.')
  }
  if ((result.Result || '').toUpperCase() !== 'APPROVED') {
    throw new HttpError(502, result.MESSAGE || 'BluePay did not approve the refund.')
  }
  ctx.db.updatePayment(payment.id, { status: 'refunded', message: 'Refunded in BluePay' })
  return { status: 'refunded' as const, remote: true }
}

async function postForm(url: string, fields: Record<string, string>) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields),
    redirect: 'manual',
  })
  const location = response.headers.get('location')
  if (!location) throw new HttpError(502, 'BluePay did not return a result.')
  const parsed = new URL(location, url)
  return Object.fromEntries(parsed.searchParams.entries())
}

export function sendRenewalReminders(ctx: Ctx) {
  const settings = readSettings(ctx.db)
  const now = nowIso()
  const until = new Date(Date.now() + settings.renewalLeadDays * 86400000).toISOString()
  const due = ctx.db.renewalsDue(until, now)
  for (const member of due) {
    const when = member.renewal_due_at ? member.renewal_due_at.slice(0, 10) : 'soon'
    const rebill = member.bluepay_rebill_id
      ? 'A card on file is scheduled to renew automatically. Use the link if you would rather pay manually.'
      : 'Use the link to pay your renewal.'
    ctx.send({
      to: member.email,
      subject: `${ctx.site.shortName} membership renewal`,
      text: `Hello ${member.first_name},\n\nYour ${ctx.site.shortName} membership renews on ${when}.\n${rebill}\n\n${origin(ctx.publicUrl)}/account\n\n${ctx.site.tagline}\n`,
    })
    ctx.db.updateMember(member.user_id, { reminder_sent_at: now })
  }
  return { sent: due.length }
}

function newPayment(
  ctx: Ctx,
  fields: Omit<PaymentRow, 'id' | 'order_id' | 'site_code' | 'mode' | 'created_at' | 'updated_at'>,
): PaymentRow {
  const payId = paymentId()
  const now = nowIso()
  return {
    ...fields,
    id: payId,
    order_id: paymentOrderId(ctx.site.code, payId),
    site_code: ctx.site.code,
    mode: ctx.bluepay.mode,
    created_at: now,
    updated_at: now,
  }
}

function siteTag(customId2: string): SiteCode | null {
  const tag = customId2.split(':')[0]
  return tag === 'FEG' || tag === 'LEG' ? tag : null
}

export function renewalPurpose(member: MemberJoined): 'dues_signup' | 'dues_renewal' {
  if (member.dues_paid_at || member.membership_status === 'active' || member.membership_status === 'lapsed') return 'dues_renewal'
  return 'dues_signup'
}
