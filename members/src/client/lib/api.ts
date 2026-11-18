export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(path, {
    method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
    credentials: 'same-origin',
    headers: {
      accept: 'application/json',
      ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const data = (await response.json().catch(() => ({}))) as { error?: string }
  if (!response.ok) throw new ApiError(response.status, data.error || 'Something went wrong.')
  return data as T
}

export type Role = 'member' | 'staff' | 'admin'

export type User = { id: string; email: string; role: Role; status: string }

export type MemberProfile = {
  userId: string
  firstName: string
  lastName: string
  company: string
  title: string
  network: 'FEG' | 'LEG'
  chapterId: string | null
  chapterName: string | null
  phone: string
  city: string
  state: string
  linkedin: string
  showEmail: boolean
  showPhone: boolean
  showInDirectory: boolean
  membershipStatus: string
  renewalDueAt: string | null
  duesPaidAt: string | null
  rebillScheduled: boolean
}

export type Chapter = { id: string; network: 'FEG' | 'LEG'; name: string; state: string }

export type LunchOption = { id: string; label: string }

export type EventItem = {
  id: string
  title: string
  type: 'chapter_meeting' | 'conference' | 'workshop'
  chapterId: string | null
  chapterName: string | null
  description: string
  location: string
  startsAt: string
  endsAt: string | null
  capacity: number | null
  priceCents: number
  status: string
  registeredCount: number
  lunchOptions: LunchOption[]
  myRegistration: { id: string; status: string; lunchOptionId: string | null; lunchLabel: string | null } | null
}

export type DirectoryMember = {
  id: string
  firstName: string
  lastName: string
  company: string
  title: string
  network: 'FEG' | 'LEG'
  chapterName: string | null
  city: string
  state: string
  email: string | null
  phone: string | null
  linkedin: string | null
}

export type Job = {
  id: string
  title: string
  organization: string
  location: string
  category: string
  description: string
  contactEmail: string
  url: string
  status: string
  postedBy: string | null
  createdAt: string
}

export type LibraryFile = {
  id: string
  title: string
  description: string
  folder: string
  filename: string
  mime: string
  size: number
  createdAt: string
}

export type Payment = {
  id: string
  userId: string
  email?: string
  purpose: string
  amountCents: number
  status: string
  mode: string
  rebilling: boolean
  rebillId: string | null
  message: string | null
  cardMask: string | null
  createdAt: string
}

export type AdminMember = MemberProfile & { email: string; role: Role; userStatus: string }

export function money(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export function formatWhen(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function formatDay(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso))
}

export function eventKind(type: string) {
  if (type === 'conference') return 'Conference'
  if (type === 'workshop') return 'Workshop'
  return 'Chapter lunch'
}

export function sandboxWillApprove(cents: number) {
  return Math.trunc(cents / 100) % 2 === 1
}

export function fullName(member: { firstName: string; lastName: string }) {
  return `${member.firstName} ${member.lastName}`.trim()
}
