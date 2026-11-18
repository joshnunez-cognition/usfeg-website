import { createHash, randomBytes } from 'node:crypto'

export function nowIso() {
  return new Date().toISOString()
}

export function addDays(iso: string, days: number) {
  const date = new Date(iso)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString()
}

export function addYears(iso: string, years: number) {
  const date = new Date(iso)
  date.setUTCFullYear(date.getUTCFullYear() + years)
  return date.toISOString()
}

export function id() {
  return randomBytes(12).toString('hex')
}

/** BluePay CUSTOM_ID is limited to 16 characters. */
export function paymentId() {
  return randomBytes(6).toString('hex')
}

export function tokenPair() {
  const raw = randomBytes(32).toString('base64url')
  const hash = createHash('sha256').update(raw).digest('hex')
  return { raw, hash }
}

export function hashToken(raw: string) {
  return createHash('sha256').update(raw).digest('hex')
}

export function slug(value: string) {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return base || 'item'
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 200
}
