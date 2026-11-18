import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

/**
 * BluePay (Fiserv) hosted checkout.
 *
 * Card numbers are entered on BluePay's Secure Hosted Payment Form (SHPF),
 * not on this server. We build the same sealed URL as the official PHP sample
 * (BluePay/BluePay-Sample-Code PHP/BluePay.php generateURL) and redirect the
 * browser to https://secure.bluepay.com/interfaces/shpf. BluePay posts the
 * charge to bp10emu and redirects back to our return URL with the result.
 *
 * The transaction tamper-proof seal and the response BP_STAMP follow the
 * bp10emu rules: hash(secret, concatenated field values) using the account's
 * configured hash. See Documentation/Interfaces/Inbound/BluePay_2.0_Redirect
 * and the known MD5 vector in tests/bluepay.test.ts.
 *
 * TEST-mode results on BluePay's sandbox (and in our local simulator) follow
 * the published rule: the whole-dollar portion of the amount is odd → APPROVED,
 * even → DECLINED. Cents are ignored. $495.00 approves; $100.00 declines.
 */

export const HASH_TYPES = ['MD5', 'SHA256', 'SHA512', 'HMAC_SHA256', 'HMAC_SHA512'] as const
export type HashType = (typeof HASH_TYPES)[number]

export type BluePayMode = 'mock' | 'TEST' | 'LIVE'

export type BluePayConfig = {
  mode: BluePayMode
  accountId: string
  secretKey: string
  hashType: HashType
  shpfHashType: HashType
  publicUrl: string
}

export function parseHashType(value: string | undefined, fallback: HashType): HashType {
  const upper = (value || '').toUpperCase()
  return (HASH_TYPES as readonly string[]).includes(upper) ? (upper as HashType) : fallback
}

export function createTpsHash(secretKey: string, message: string, hashType: HashType): string {
  switch (hashType) {
    case 'MD5':
      return createHash('md5').update(secretKey + message, 'utf8').digest('hex')
    case 'SHA256':
      return createHash('sha256').update(secretKey + message, 'utf8').digest('hex')
    case 'SHA512':
      return createHash('sha512').update(secretKey + message, 'utf8').digest('hex')
    case 'HMAC_SHA256':
      return createHmac('sha256', secretKey).update(message, 'utf8').digest('hex')
    case 'HMAC_SHA512':
      return createHmac('sha512', secretKey).update(message, 'utf8').digest('hex')
    default:
      throw new Error(`Unsupported BluePay hash type: ${hashType}`)
  }
}

/** Percent-encode the way the official PHP sample does: everything outside A–Z a–z 0–9. */
export function bluepayEncode(value: string) {
  let out = ''
  for (const char of value) {
    if (/[A-Za-z0-9]/.test(char)) out += char
    else out += `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`
  }
  return out
}

export function centsToAmount(cents: number) {
  return (cents / 100).toFixed(2)
}

export function amountToCents(amount: string | undefined) {
  if (!amount) return null
  const value = Number(amount)
  if (!Number.isFinite(value)) return null
  return Math.round(value * 100)
}

/**
 * BluePay TEST sandbox rule, documented on bp10emu: odd whole dollars approve,
 * even whole dollars decline. The local simulator uses the same rule so a
 * rehearsal matches what the sandbox will do once credentials are in place.
 */
export function sandboxApproves(amount: string) {
  const dollars = Math.trunc(Number(amount))
  return Number.isFinite(dollars) && dollars % 2 === 1
}

export type HostedCheckoutInput = {
  accountId: string
  secretKey: string
  hashType: HashType
  shpfHashType: HashType
  mode: 'TEST' | 'LIVE'
  amount: string
  returnUrl: string
  customId: string
  customId2?: string
  rebilling: boolean
  rebFirstDate?: string
  rebExpr?: string
  rebCycles?: string
  rebAmount?: string
  dba?: string
  formId?: string
}

/**
 * Full SHPF URL. Field order matches PHP BluePay::generateURL / calcURLResponse
 * with amount, rebilling, and both custom ids protected by the seal.
 */
export function buildHostedCheckoutUrl(input: HostedCheckoutInput) {
  if (input.customId.length > 16) throw new Error('BluePay CUSTOM_ID must be 16 characters or fewer.')
  const dba = input.dba ?? 'US Financial Executive Group'
  const formId = input.formId ?? 'mobileform01'
  const amex = 'amex.gif'
  const discover = 'discvr.gif'
  const doRebill = input.rebilling ? '1' : '0'
  const rebCycles = input.rebilling ? (input.rebCycles ?? '') : ''
  const rebAmount = input.rebilling ? (input.rebAmount ?? input.amount) : ''
  const rebExpr = input.rebilling ? (input.rebExpr ?? '1 YEAR') : ''
  const rebFirst = input.rebilling ? (input.rebFirstDate ?? '1 YEAR') : ''
  const custom1 = input.customId
  const custom2 = input.customId2 ?? ''
  const receiptUrl = input.returnUrl

  let tpsDef = 'MERCHANT APPROVED_URL DECLINED_URL MISSING_URL MODE TRANSACTION_TYPE TPS_DEF TPS_HASH_TYPE'
  tpsDef += ' AMOUNT'
  if (input.rebilling) tpsDef += ' REBILLING REB_CYCLES REB_AMOUNT REB_EXPR REB_FIRST_DATE'
  tpsDef += ' CUSTOM_ID CUSTOM_ID2'

  let tpsMessage =
    input.accountId + receiptUrl + receiptUrl + receiptUrl + input.mode + 'SALE' + tpsDef + input.hashType
  tpsMessage += input.amount
  if (input.rebilling) tpsMessage += doRebill + rebCycles + rebAmount + rebExpr + rebFirst
  tpsMessage += custom1 + custom2
  const tamper = createTpsHash(input.secretKey, tpsMessage, input.hashType)

  let shpfDef =
    'SHPF_FORM_ID SHPF_ACCOUNT_ID DBA TAMPER_PROOF_SEAL AMEX_IMAGE DISCOVER_IMAGE TPS_DEF TPS_HASH_TYPE SHPF_TPS_DEF SHPF_TPS_HASH_TYPE'
  shpfDef += ' AMOUNT'
  if (input.rebilling) shpfDef += ' REBILLING REB_CYCLES REB_AMOUNT REB_EXPR REB_FIRST_DATE'
  shpfDef += ' CUSTOM_ID CUSTOM_ID2'

  let shpfMessage =
    formId +
    input.accountId +
    dba +
    tamper +
    amex +
    discover +
    tpsDef +
    input.hashType +
    shpfDef +
    input.shpfHashType
  shpfMessage += input.amount
  if (input.rebilling) shpfMessage += doRebill + rebCycles + rebAmount + rebExpr + rebFirst
  shpfMessage += custom1 + custom2
  const shpfTps = createTpsHash(input.secretKey, shpfMessage, input.shpfHashType)

  const params: [string, string][] = [
    ['SHPF_FORM_ID', formId],
    ['SHPF_ACCOUNT_ID', input.accountId],
    ['SHPF_TPS_DEF', shpfDef],
    ['SHPF_TPS_HASH_TYPE', input.shpfHashType],
    ['SHPF_TPS', shpfTps],
    ['MODE', input.mode],
    ['TRANSACTION_TYPE', 'SALE'],
    ['DBA', dba],
    ['AMOUNT', input.amount],
    ['TAMPER_PROOF_SEAL', tamper],
    ['CUSTOM_ID', custom1],
    ['CUSTOM_ID2', custom2],
    ['REBILLING', doRebill],
    ['REB_CYCLES', rebCycles],
    ['REB_AMOUNT', rebAmount],
    ['REB_EXPR', rebExpr],
    ['REB_FIRST_DATE', rebFirst],
    ['AMEX_IMAGE', amex],
    ['DISCOVER_IMAGE', discover],
    ['REDIRECT_URL', receiptUrl],
    ['TPS_DEF', tpsDef],
    ['TPS_HASH_TYPE', input.hashType],
    ['CARD_TYPES', 'vi-mc-di-am'],
    // Asks bp10emu for a stamped response (BP_STAMP arrives at response version >= 1).
    ['RESPONSEVERSION', '3'],
  ]

  const query = params.map(([key, value]) => `${bluepayEncode(key)}=${bluepayEncode(value)}`).join('&')
  return `https://secure.bluepay.com/interfaces/shpf?${query}`
}

export function verifyBpStamp(secretKey: string, fields: Record<string, string>, hashType: HashType) {
  const stamp = fields.BP_STAMP || ''
  const def = fields.BP_STAMP_DEF || ''
  if (!stamp || !def) return false
  let message = ''
  for (const name of def.split(/\s+/)) {
    if (!name) continue
    message += fields[name] ?? ''
  }
  const expected = createTpsHash(secretKey, message, hashType)
  return safeEqualHex(expected, stamp)
}

function safeEqualHex(a: string, b: string) {
  const left = Buffer.from(a.toLowerCase(), 'utf8')
  const right = Buffer.from(b.toLowerCase(), 'utf8')
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

const STAMP_DEF = 'MERCHANT TRANSACTION_TYPE AMOUNT MODE CUSTOM_ID RRNO Result REBID'

/** Fields our return handler is willing to read. Anything else, including a PAN, is dropped. */
export function allowlistedGatewayFields(fields: Record<string, string>) {
  const keep = [
    'MERCHANT',
    'TRANSACTION_TYPE',
    'AMOUNT',
    'MODE',
    'CUSTOM_ID',
    'CUSTOM_ID2',
    'RRNO',
    'TRANS_ID',
    'Result',
    'MESSAGE',
    'REBID',
    'BP_STAMP',
    'BP_STAMP_DEF',
    'CARD_TYPE',
    'PAYMENT_ACCOUNT',
    'AUTH_CODE',
    'ORDER_ID',
  ]
  const out: Record<string, string> = {}
  for (const key of keep) {
    if (fields[key] !== undefined) out[key] = fields[key]
  }
  return out
}

/**
 * Last 4 only. If a full card number ever arrived (it should not), it is not stored.
 */
export function maskAccount(raw: string | undefined) {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 4) return null
  return `•••• ${digits.slice(-4)}`
}

export function buildMockGatewayResult(opts: {
  secretKey: string
  hashType: HashType
  accountId: string
  amount: string
  customId: string
  transId: string
  rebilling: boolean
}) {
  const approved = sandboxApproves(opts.amount)
  const fields: Record<string, string> = {
    MERCHANT: opts.accountId,
    TRANSACTION_TYPE: 'SALE',
    AMOUNT: opts.amount,
    MODE: 'TEST',
    CUSTOM_ID: opts.customId,
    RRNO: opts.transId,
    Result: approved ? 'APPROVED' : 'DECLINED',
    MESSAGE: approved ? 'APPROVED' : 'DECLINED',
    REBID: opts.rebilling && approved ? `RB${opts.transId.slice(0, 10)}` : '',
    PAYMENT_ACCOUNT: 'xxxxxxxxxxxx1111',
    CARD_TYPE: 'VISA',
    BP_STAMP_DEF: STAMP_DEF,
  }
  let message = ''
  for (const name of STAMP_DEF.split(' ')) message += fields[name] ?? ''
  fields.BP_STAMP = createTpsHash(opts.secretKey, message, opts.hashType)
  return fields
}

/** Direct bp10emu REFUND (no card data; uses the original transaction id). */
export function buildRefundPost(opts: {
  accountId: string
  secretKey: string
  hashType: HashType
  mode: 'TEST' | 'LIVE'
  rrno: string
  amount: string
}) {
  const tpsDef = 'MERCHANT TRANSACTION_TYPE RRNO MODE AMOUNT'
  const message = opts.accountId + 'REFUND' + opts.rrno + opts.mode + opts.amount
  const seal = createTpsHash(opts.secretKey, message, opts.hashType)
  return {
    url: 'https://secure.bluepay.com/interfaces/bp10emu',
    fields: {
      MERCHANT: opts.accountId,
      TRANSACTION_TYPE: 'REFUND',
      RRNO: opts.rrno,
      MODE: opts.mode,
      AMOUNT: opts.amount,
      RESPONSEVERSION: '3',
      TPS_DEF: tpsDef,
      TPS_HASH_TYPE: opts.hashType,
      TAMPER_PROOF_SEAL: seal,
    },
  }
}
