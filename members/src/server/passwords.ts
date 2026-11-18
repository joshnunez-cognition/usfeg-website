import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const KEYLEN = 64

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, KEYLEN).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function verifyPassword(password: string, stored: string | null) {
  if (!stored) return false
  const [scheme, salt, hash] = stored.split('$')
  if (scheme !== 'scrypt' || !salt || !hash) return false
  const actual = scryptSync(password, salt, KEYLEN)
  const expected = Buffer.from(hash, 'hex')
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}

export function assertPassword(password: unknown): string {
  if (typeof password !== 'string' || password.length < 10) {
    throw new Error('Use at least 10 characters.')
  }
  if (password.length > 200) throw new Error('That password is too long.')
  return password
}
