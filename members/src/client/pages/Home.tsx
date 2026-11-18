import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../App'
import { PageHero, Pill } from '../components/Shell'
import { api, eventKind, formatEventRange, formatWhen, fullName, money, type EventItem } from '../lib/api'

export default function Home() {
  const { user, member } = useAuth()
  const [events, setEvents] = useState<EventItem[]>([])

  useEffect(() => {
    api<{ events: EventItem[] }>('/api/events?when=upcoming')
      .then((data) => setEvents(data.events.slice(0, 3)))
      .catch(() => setEvents([]))
  }, [])

  const name = member ? fullName(member) : user?.email
  return (
    <>
      <PageHero
        eyebrow="Your Network is Your Net Worth"
        title={name ? `Welcome back, ${member?.firstName || name}` : 'Member home'}
        subtitle={
          member
            ? `${member.title ? `${member.title} · ` : ''}${member.company ? `${member.company} · ` : ''}US ${member.network}${member.chapterName ? ` · ${member.chapterName}` : ''}`
            : 'Staff tools are under Admin.'
        }
      />
      <section className="border-b border-slate-200 bg-white">
        <div className="container-x grid gap-4 py-8 sm:grid-cols-3">
          <Stat label="Membership" value={member?.membershipStatus || user?.role || '—'} />
          <Stat label="Renews" value={member?.renewalDueAt ? formatWhen(member.renewalDueAt).replace(/, \d{1,2}:\d{2}.*/, '') : '—'} />
          <Stat label="Next up" value={events[0] ? events[0].title : 'Nothing scheduled'} />
        </div>
      </section>
      <section className="container-x py-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Calendar</p>
            <h2 className="mt-2 text-2xl font-bold text-brand-navy">Upcoming</h2>
          </div>
          <Link to="/events" className="text-sm font-semibold text-brand-blue">
            All events →
          </Link>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {events.length === 0 && <p className="text-sm text-slate-600">No upcoming events yet.</p>}
          {events.map((event) => (
            <Link key={event.id} to={`/events/${event.id}`} className="card group flex flex-col p-7 transition hover:-translate-y-1 hover:shadow-lg">
              <span className="h-1 w-12 rounded-full bg-brand-gold" />
              <div className="mt-5 flex flex-wrap gap-2">
                <Pill>{eventKind(event.type)}</Pill>
                {event.priceCents > 0 ? <Pill tone="gold">{money(event.priceCents)}</Pill> : <Pill tone="slate">Included</Pill>}
              </div>
              <h3 className="mt-4 text-xl font-bold text-brand-navy">{event.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{formatEventRange(event.startsAt, event.endsAt)}</p>
              <p className="mt-1 flex-1 text-sm text-slate-500">{event.location}</p>
              <span className="mt-6 text-sm font-semibold text-brand-blue group-hover:text-brand-navy">View details →</span>
            </Link>
          ))}
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <Quick to="/directory/feg" title="FEG Directory" body="CFOs, controllers, and finance directors, by chapter." />
          <Quick to="/directory/leg" title="LEG Directory" body="A separate directory for US LEG members." />
          <Quick to="/careers" title="Career Center" body="Browse openings or submit one for Rod to publish." />
        </div>
      </section>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold capitalize text-brand-navy">{value}</p>
    </div>
  )
}

function Quick({ to, title, body }: { to: string; title: string; body: string }) {
  return (
    <Link to={to} className="card p-6 transition hover:-translate-y-1 hover:shadow-lg">
      <h3 className="text-lg font-bold text-brand-navy">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
    </Link>
  )
}
