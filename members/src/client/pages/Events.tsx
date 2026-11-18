import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../App'
import { ErrorNote, PageHero, Pill } from '../components/Shell'
import { api, eventKind, formatEventRange, money, type EventItem } from '../lib/api'

export default function Events({ detail = false }: { detail?: boolean }) {
  if (detail) return <EventDetail />
  return <EventList />
}

function EventList() {
  const [when, setWhen] = useState<'upcoming' | 'past'>('upcoming')
  const [events, setEvents] = useState<EventItem[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api<{ events: EventItem[] }>(`/api/events?when=${when}`)
      .then((data) => setEvents(data.events))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load events.'))
  }, [when])

  return (
    <>
      <PageHero eyebrow="Calendar" title="Events" subtitle="Chapter lunches, conferences, and workshops. Lunch orders are collected when a meeting has them." />
      <section className="container-x py-12">
        <div className="flex gap-2">
          {(['upcoming', 'past'] as const).map((value) => (
            <button key={value} type="button" onClick={() => setWhen(value)} className={when === value ? 'btn-primary px-4 py-2 capitalize' : 'btn-outline px-4 py-2 capitalize'}>
              {value}
            </button>
          ))}
        </div>
        <ErrorNote>{error}</ErrorNote>
        <div className="mt-6 grid gap-4">
          {events.length === 0 && <p className="text-sm text-slate-600">Nothing on this list.</p>}
          {events.map((event) => (
            <Link key={event.id} to={`/events/${event.id}`} className="card flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Pill>{eventKind(event.type)}</Pill>
                  {event.chapterName && <Pill tone="slate">{event.chapterName}</Pill>}
                  {event.myRegistration && <Pill tone="gold">{event.myRegistration.status === 'registered' ? 'Registered' : 'Payment due'}</Pill>}
                </div>
                <h2 className="mt-3 text-xl font-bold text-brand-navy">{event.title}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {formatEventRange(event.startsAt, event.endsAt)}
                  {event.location ? ` · ${event.location}` : ''}
                </p>
              </div>
              <p className="text-sm font-semibold text-brand-navy">{event.priceCents > 0 ? money(event.priceCents) : 'No fee'}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}

function EventDetail() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { user } = useAuth()
  const [event, setEvent] = useState<EventItem | null>(null)
  const [lunch, setLunch] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const canRegister = user && (user.role !== 'member' || user.status === 'active')

  function load() {
    api<{ event: EventItem }>(`/api/events/${id}`)
      .then((data) => {
        setEvent(data.event)
        setLunch(data.event.myRegistration?.lunchOptionId || data.event.lunchOptions[0]?.id || '')
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load this event.'))
  }

  useEffect(load, [id])

  async function register(submit: FormEvent) {
    submit.preventDefault()
    if (!event) return
    setBusy(true)
    setError('')
    try {
      const result = await api<{ checkout: boolean; checkoutPath: string | null }>(`/api/events/${event.id}/register`, {
        body: { lunchOptionId: lunch || undefined },
      })
      if (result.checkout && result.checkoutPath) {
        window.location.assign(result.checkoutPath)
        return
      }
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not register.')
    } finally {
      setBusy(false)
    }
  }

  async function cancel() {
    if (!event) return
    setError('')
    try {
      await api(`/api/events/${event.id}/cancel`, { method: 'POST', body: {} })
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel.')
    }
  }

  if (!event) {
    return (
      <section className="container-x py-16">
        <ErrorNote>{error || 'Loading…'}</ErrorNote>
      </section>
    )
  }

  const result = params.get('result')
  return (
    <>
      <PageHero eyebrow={eventKind(event.type)} title={event.title} subtitle={`${formatEventRange(event.startsAt, event.endsAt)}${event.location ? ` · ${event.location}` : ''}`} />
      <section className="container-x grid gap-8 py-12 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {result && (
            <p className={`mb-6 rounded-xl px-4 py-3 text-sm ${result === 'approved' ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}>
              Payment {result}.
            </p>
          )}
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{event.description}</p>
          <dl className="mt-8 grid gap-4 sm:grid-cols-3">
            <Info label="Fee" value={event.priceCents > 0 ? money(event.priceCents) : 'No fee'} />
            <Info label="Registered" value={event.capacity ? `${event.registeredCount} / ${event.capacity}` : String(event.registeredCount)} />
            <Info label="Chapter" value={event.chapterName || 'All chapters'} />
          </dl>
        </div>
        <aside className="card h-fit p-6">
          <ErrorNote>{error}</ErrorNote>
          {event.myRegistration?.status === 'registered' ? (
            <div className="space-y-4">
              <Pill tone="gold">You're registered</Pill>
              {event.myRegistration.lunchLabel && <p className="text-sm text-slate-700">Lunch order: {event.myRegistration.lunchLabel}</p>}
              <button type="button" className="btn-outline w-full" onClick={cancel}>
                Cancel registration
              </button>
            </div>
          ) : (
            <form onSubmit={register} className="space-y-4">
              <h2 className="text-lg font-bold text-brand-navy">{event.myRegistration ? 'Finish payment' : 'Register'}</h2>
              {event.lunchOptions.length > 0 && (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-semibold text-brand-navy">Lunch order</legend>
                  {event.lunchOptions.map((option) => (
                    <label key={option.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                      <input type="radio" name="lunch" value={option.id} checked={lunch === option.id} onChange={() => setLunch(option.id)} />
                      {option.label}
                    </label>
                  ))}
                </fieldset>
              )}
              {!canRegister && <p className="text-sm text-slate-600">Registration opens once your membership is active.</p>}
              <button className="btn-gold w-full" disabled={busy || !canRegister}>
                {busy ? 'Working…' : event.priceCents > 0 ? `Pay ${money(event.priceCents)}` : 'Register'}
              </button>
            </form>
          )}
        </aside>
      </section>
    </>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-brand-navy">{value}</dd>
    </div>
  )
}
