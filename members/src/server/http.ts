import type { NextFunction, Request, Response } from 'express'

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function asyncRoute(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

const buckets = new Map<string, { n: number; reset: number }>()

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.reset < now) {
    buckets.set(key, { n: 1, reset: now + windowMs })
    return
  }
  bucket.n += 1
  if (bucket.n > limit) throw new HttpError(429, 'Too many attempts. Try again in a few minutes.')
}

export function clientIp(req: Request) {
  const header = process.env.CLIENT_IP_HEADER
  const forwarded = header ? req.headers[header.toLowerCase()] : undefined
  if (typeof forwarded === 'string' && forwarded) return forwarded
  return req.socket.remoteAddress || 'unknown'
}

export function readCookie(req: Request, name: string) {
  const raw = req.headers.cookie || ''
  for (const part of raw.split(';')) {
    const trimmed = part.trim()
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    if (trimmed.slice(0, eq) === name) return decodeURIComponent(trimmed.slice(eq + 1))
  }
  return ''
}

export function setSessionCookie(res: Response, name: string, value: string, secure: boolean, maxAgeSec: number) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${maxAgeSec}`,
  ]
  if (secure) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

export function clearSessionCookie(res: Response, name: string, secure: boolean) {
  setSessionCookie(res, name, '', secure, 0)
}

/** Coerce an Express query/body bag into a string map. Arrays keep the first value. */
export function stringMap(input: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (!input || typeof input !== 'object') return out
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value === 'string') out[key] = value
    else if (typeof value === 'number' && Number.isFinite(value)) out[key] = String(value)
    else if (Array.isArray(value) && typeof value[0] === 'string') out[key] = value[0]
  }
  return out
}

export function wantsJson(req: Request) {
  const accept = req.headers.accept || ''
  return accept.includes('application/json')
}
