/**
 * Event times are America/Chicago wall-clock times. The database stores the
 * matching UTC instant so "has this started?" stays a simple comparison.
 * Admin forms and CSV imports without a zone are read as Central time.
 */

export const EVENT_TIME_ZONE = 'America/Chicago'
export const EVENT_TIME_LABEL = 'CT'

type Wall = { year: number; month: number; day: number; hour: number; minute: number }

function wallInZone(date: Date, timeZone: string): Wall {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  const map: Record<string, string> = {}
  for (const part of formatted.formatToParts(date)) map[part.type] = part.value
  let hour = Number(map.hour)
  if (hour === 24) hour = 0
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour,
    minute: Number(map.minute),
  }
}

/** How far ahead of UTC the zone's wall clock is, at this instant. Chicago is negative. */
function zoneOffsetMs(utcMs: number, timeZone: string) {
  const wall = wallInZone(new Date(utcMs), timeZone)
  const wallAsUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, 0)
  return wallAsUtc - utcMs
}

export function centralWallToDate(year: number, month: number, day: number, hour: number, minute: number) {
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0)
  let utc = wallAsUtc - zoneOffsetMs(wallAsUtc, EVENT_TIME_ZONE)
  const second = wallAsUtc - zoneOffsetMs(utc, EVENT_TIME_ZONE)
  if (second !== utc) utc = second
  return new Date(utc)
}

export function centralWallToIso(year: number, month: number, day: number, hour: number, minute: number) {
  return centralWallToDate(year, month, day, hour, minute).toISOString()
}

/** "Wed, Nov 25, 2026, 11:30 AM CT" */
export function formatEventWhen(iso: string | null | undefined) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
  return `${formatted} ${EVENT_TIME_LABEL}`
}

/** Same-day events read "Wed, Nov 25, 2026, 11:30 AM – 1:00 PM CT". */
export function formatEventRange(start: string | null | undefined, end?: string | null) {
  const startText = formatEventWhen(start)
  if (!end || startText === '—') return startText
  const endDate = new Date(end)
  if (Number.isNaN(endDate.getTime())) return startText
  const endClock = new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  }).format(endDate)
  const startDay = toCentralInput(start).slice(0, 10)
  const endDay = toCentralInput(end).slice(0, 10)
  if (startDay && startDay === endDay) return startText.replace(/ CT$/, ` – ${endClock} CT`)
  return `${startText} – ${formatEventWhen(end)}`
}

/** Value for an `<input type="datetime-local">` showing Central time. */
export function toCentralInput(iso: string | null | undefined) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const wall = wallInZone(date, EVENT_TIME_ZONE)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${wall.year}-${pad(wall.month)}-${pad(wall.day)}T${pad(wall.hour)}:${pad(wall.minute)}`
}

/**
 * Accept a zoned instant (`...Z` or `±hh:mm`) or a zone-less Central wall time
 * (`YYYY-MM-DD` or `YYYY-MM-DDTHH:mm`). A date alone is 11:30 AM Central.
 */
export function parseEventInstant(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/[zZ]$/.test(trimmed) || /[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const date = new Date(trimmed)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/)
  if (!match) return null
  const hour = match[4] !== undefined ? Number(match[4]) : 11
  const minute = match[5] !== undefined ? Number(match[5]) : 30
  return centralWallToIso(Number(match[1]), Number(match[2]), Number(match[3]), hour, minute)
}

function addCalendarDays(year: number, month: number, day: number, days: number) {
  const shifted = new Date(Date.UTC(year, month - 1, day + days))
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() }
}

function weekday(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

/**
 * Next Central wall time on `weekday` (0 = Sunday), at least `minDaysAhead`
 * calendar days from now, skipping months (1–12) in `skipMonths`.
 */
export function upcomingCentral(opts: { weekday: number; hour: number; minute: number; minDaysAhead: number; skipMonths: number[]; from?: Date }) {
  const from = opts.from ?? new Date()
  const today = wallInZone(from, EVENT_TIME_ZONE)
  let cursor = addCalendarDays(today.year, today.month, today.day, opts.minDaysAhead)
  for (let i = 0; i < 400; i++) {
    if (!opts.skipMonths.includes(cursor.month) && weekday(cursor.year, cursor.month, cursor.day) === opts.weekday) {
      return centralWallToIso(cursor.year, cursor.month, cursor.day, opts.hour, opts.minute)
    }
    cursor = addCalendarDays(cursor.year, cursor.month, cursor.day, 1)
  }
  throw new Error('No upcoming Central date matched.')
}

/** Same calendar day in Central, different clock time. */
export function sameCentralDay(iso: string, hour: number, minute: number) {
  const wall = wallInZone(new Date(iso), EVENT_TIME_ZONE)
  return centralWallToIso(wall.year, wall.month, wall.day, hour, minute)
}
