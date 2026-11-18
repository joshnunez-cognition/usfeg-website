import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorNote, Field, PageHero, Pill } from '../../components/Shell'
import { defaultChapterLunchInputs, toCentralInput } from '../../../shared/central'
import { api, eventKind, formatEventRange, money, type Chapter, type EventItem } from '../../lib/api'
import AdminNav from './AdminNav'

type Registration = {
  id: string
  userId: string
  name: string
  email: string
  company: string
  lunch: string | null
  status: string
  amountCents: number
}

export default function AdminEvents() {
  const { id } = useParams()
  if (id) return <EventEditor id={id} />
  return <EventList />
}

function EventList() {
  const [events, setEvents] = useState<EventItem[]>([])

  useEffect(() => {
    api<{ events: EventItem[] }>('/api/admin/events').then((data) => setEvents(data.events)).catch(() => setEvents([]))
  }, [])

  return (
    <>
      <PageHero eyebrow="Admin" title="Events" subtitle="Chapter lunches collect a lunch order. Conferences and workshops can take a BluePay payment." />
      <AdminNav />
      <section className="container-x py-8">
        <Link to="/admin/events/new" className="btn-gold">
          New event
        </Link>
        <div className="mt-6 grid gap-3">
          {events.map((event) => (
            <Link key={event.id} to={`/admin/events/${event.id}`} className="card flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Pill>{eventKind(event.type)}</Pill>
                  <Pill tone="slate">{event.status}</Pill>
                </div>
                <h2 className="mt-2 text-lg font-bold text-brand-navy">{event.title}</h2>
                <p className="text-sm text-slate-600">{formatEventRange(event.startsAt, event.endsAt)}</p>
              </div>
              <p className="text-sm font-semibold text-brand-navy">
                {event.registeredCount} registered · {event.priceCents ? money(event.priceCents) : 'No fee'}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}

function EventEditor({ id }: { id: string }) {
  const creating = id === 'new'
  const lunchDefault = creating ? defaultChapterLunchInputs() : null
  const [event, setEvent] = useState<EventItem | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [error, setError] = useState('')
  const [eventType, setEventType] = useState(creating ? 'chapter_meeting' : 'conference')
  const [startsAt, setStartsAt] = useState(lunchDefault?.startsAt ?? '')
  const [endsAt, setEndsAt] = useState(lunchDefault?.endsAt ?? '')
  const navigate = useNavigate()

  useEffect(() => {
    api<{ chapters: Chapter[] }>('/api/chapters').then((data) => setChapters(data.chapters)).catch(() => setChapters([]))
    if (creating) return
    api<{ event: EventItem }>(`/api/events/${id}`).then((data) => setEvent(data.event)).catch((err) => setError(err instanceof Error ? err.message : 'Not found.'))
    api<{ registrations: Registration[] }>(`/api/admin/events/${id}/registrations`)
      .then((data) => setRegistrations(data.registrations))
      .catch(() => setRegistrations([]))
  }, [creating, id])

  useEffect(() => {
    if (!event) return
    setEventType(event.type)
    setStartsAt(toCentralInput(event.startsAt))
    setEndsAt(toCentralInput(event.endsAt))
  }, [event])

  function changeType(next: string) {
    setEventType(next)
    if (next === 'chapter_meeting' && !startsAt && !endsAt) {
      const times = defaultChapterLunchInputs()
      setStartsAt(times.startsAt)
      setEndsAt(times.endsAt)
    }
  }

  async function save(submit: FormEvent<HTMLFormElement>) {
    submit.preventDefault()
    const form = new FormData(submit.currentTarget)
    const dollars = Number(form.get('price') || 0)
    const lunch = String(form.get('lunch') || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    const body = {
      title: form.get('title'),
      type: eventType,
      chapterId: form.get('chapterId') || null,
      description: form.get('description'),
      location: form.get('location'),
      startsAt,
      endsAt: endsAt || null,
      capacity: form.get('capacity') ? Number(form.get('capacity')) : null,
      priceCents: Math.round(dollars * 100),
      status: form.get('status'),
      lunchOptions: lunch,
    }
    setError('')
    try {
      const path = creating ? '/api/admin/events' : `/api/admin/events/${id}`
      const data = await api<{ event: EventItem }>(path, { method: creating ? 'POST' : 'PATCH', body })
      setEvent(data.event)
      if (creating) navigate(`/admin/events/${data.event.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.')
    }
  }

  const current = event
  return (
    <>
      <PageHero eyebrow="Admin" title={creating && !current ? 'New event' : current?.title || 'Event'} subtitle="Times are Central (America/Chicago). Lunch options are one per line. A price above zero sends the member to BluePay." />
      <AdminNav />
      <section className="container-x grid gap-8 py-8 lg:grid-cols-5">
        <form key={current?.id || 'new'} onSubmit={save} className="card space-y-4 p-6 lg:col-span-3">
          <ErrorNote>{error}</ErrorNote>
          <Field label="Title">
            <input className="input" name="title" required defaultValue={current?.title} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type">
              <select className="input" name="type" value={eventType} onChange={(change) => changeType(change.target.value)}>
                <option value="chapter_meeting">Chapter lunch</option>
                <option value="conference">Conference</option>
                <option value="workshop">Workshop</option>
              </select>
            </Field>
            <Field label="Status">
              <select className="input" name="status" defaultValue={current?.status || 'published'}>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </Field>
            <Field label="Chapter">
              <select className="input" name="chapterId" defaultValue={current?.chapterId || ''}>
                <option value="">All chapters</option>
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.network} · {chapter.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Price (USD)">
              <input className="input" name="price" type="number" min="0" step="0.01" defaultValue={current ? (current.priceCents / 100).toFixed(2) : '0.00'} />
            </Field>
            <Field label="Starts (Central)">
              <input className="input" name="startsAt" type="datetime-local" required value={startsAt} onChange={(change) => setStartsAt(change.target.value)} />
            </Field>
            <Field label="Ends (Central)">
              <input className="input" name="endsAt" type="datetime-local" value={endsAt} onChange={(change) => setEndsAt(change.target.value)} />
            </Field>
            <Field label="Capacity">
              <input className="input" name="capacity" type="number" min="1" defaultValue={current?.capacity ?? ''} />
            </Field>
            <Field label="Location">
              <input className="input" name="location" defaultValue={current?.location} />
            </Field>
          </div>
          <Field label="Description">
            <textarea className="input min-h-28" name="description" defaultValue={current?.description} />
          </Field>
          <Field label="Lunch orders (one per line)">
            <textarea className="input min-h-28" name="lunch" defaultValue={current?.lunchOptions.map((option) => option.label).join('\n')} placeholder={'Grilled chicken\nShrimp pasta\nVegetarian plate'} />
          </Field>
          <p className="text-xs text-slate-500">In BluePay test mode, an odd whole-dollar price is approved and an even one is declined. $175 approves. $100 declines.</p>
          <button className="btn-primary">{creating ? 'Create event' : 'Save event'}</button>
        </form>
        <aside className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold text-brand-navy">Registrations</h2>
              {!creating && (
                <a className="text-sm font-semibold text-brand-blue" href={`/api/admin/events/${id}/registrations.csv`}>
                  Export CSV
                </a>
              )}
            </div>
            <ul className="mt-4 space-y-3 text-sm">
              {registrations.length === 0 && <li className="text-slate-500">No one yet.</li>}
              {registrations.map((row) => (
                <li key={row.id} className="border-b border-slate-100 pb-3">
                  <p className="font-semibold text-brand-navy">{row.name}</p>
                  <p className="text-slate-500">
                    {row.email} · {row.status}
                    {row.lunch ? ` · ${row.lunch}` : ''}
                    {row.amountCents ? ` · ${money(row.amountCents)}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>
    </>
  )
}

