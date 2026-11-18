import { useEffect, useState, type FormEvent } from 'react'
import { ErrorNote, Field, PageHero } from '../../components/Shell'
import { api, money } from '../../lib/api'
import AdminNav from './AdminNav'

type Settings = { duesCents: number; renewalLeadDays: number; rebillingEnabled: boolean }

export default function AdminSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    api<Settings>('/api/admin/settings').then(setSettings).catch((err) => setError(err instanceof Error ? err.message : 'Could not load settings.'))
  }, [])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError('')
    try {
      const next = await api<Settings>('/api/admin/settings', {
        method: 'PATCH',
        body: {
          duesCents: Math.round(Number(form.get('dues')) * 100),
          renewalLeadDays: Number(form.get('lead')),
          rebillingEnabled: form.get('rebill') === 'on',
        },
      })
      setSettings(next)
      setNote('Saved. Dues amounts are placeholders until Rod confirms the real schedule.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.')
    }
  }

  async function remind() {
    setError('')
    try {
      const result = await api<{ sent: number }>('/api/admin/renewals/send', { method: 'POST', body: {} })
      setNote(`Queued ${result.sent} renewal reminder${result.sent === 1 ? '' : 's'}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reminders.')
    }
  }

  async function addChapter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError('')
    try {
      await api('/api/admin/chapters', { body: { name: form.get('name'), state: form.get('state') } })
      event.currentTarget.reset()
      setNote('Chapter added.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the chapter.')
    }
  }

  async function upload(kind: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const response = await fetch(`/api/admin/import/${kind}`, { method: 'POST', body: new FormData(event.currentTarget), credentials: 'same-origin' })
    const data = (await response.json().catch(() => ({}))) as { error?: string; created?: number; updated?: number }
    if (!response.ok) {
      setError(data.error || 'Import failed.')
      return
    }
    setNote(`Imported ${kind}: ${data.created ?? 0} created, ${data.updated ?? 0} updated.`)
    event.currentTarget.reset()
  }

  return (
    <>
      <PageHero eyebrow="Admin" title="Settings and import" subtitle="Dues, renewal reminders, chapters, and YourMembership CSV imports." />
      <AdminNav />
      <section className="container-x grid gap-8 py-8 lg:grid-cols-2">
        <div className="space-y-4">
          <ErrorNote>{error}</ErrorNote>
          {note && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{note}</p>}
          {settings && (
            <form onSubmit={save} className="card space-y-4 p-6">
              <h2 className="font-bold text-brand-navy">Dues</h2>
              <p className="text-sm text-slate-600">Currently {money(settings.duesCents)}. Use an odd whole-dollar amount while testing BluePay.</p>
              <Field label="Annual dues (USD)">
                <input className="input" name="dues" type="number" min="0" step="0.01" defaultValue={(settings.duesCents / 100).toFixed(2)} />
              </Field>
              <Field label="Remind this many days before renewal">
                <input className="input" name="lead" type="number" min="1" max="180" defaultValue={settings.renewalLeadDays} />
              </Field>
              <label className="flex items-center gap-3 text-sm font-semibold text-brand-navy">
                <input type="checkbox" name="rebill" defaultChecked={settings.rebillingEnabled} className="h-4 w-4 accent-brand-navy" />
                Ask BluePay to rebill dues yearly
              </label>
              <button className="btn-primary">Save settings</button>
            </form>
          )}
          <div className="card p-6">
            <h2 className="font-bold text-brand-navy">Renewal reminders</h2>
            <p className="mt-2 text-sm text-slate-600">Sends email to members inside the reminder window who have not been reminded in the last 14 days. A daily cron can call the same job.</p>
            <button type="button" className="btn-outline mt-4" onClick={remind}>
              Send reminders now
            </button>
          </div>
        </div>
        <div className="space-y-4">
          <form onSubmit={addChapter} className="card space-y-4 p-6">
            <h2 className="font-bold text-brand-navy">Add a chapter</h2>
            <Field label="Name">
              <input className="input" name="name" required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="State">
                <input className="input" name="state" />
              </Field>
            </div>
            <button className="btn-outline">Add chapter</button>
          </form>
          <Import kind="members" title="Import members" hint="Columns such as Email, First Name, Last Name, Company, Title, Network, Chapter, Status, Renewal Date. New people are invited to set a password." onSubmit={upload} />
          <Import kind="events" title="Import events" hint="Title, Type, Starts, Chapter, Price, Lunch Options separated by |." onSubmit={upload} />
          <Import kind="jobs" title="Import jobs" hint="Title, Organization, Location, Description, Contact Email, Status." onSubmit={upload} />
        </div>
      </section>
    </>
  )
}

function Import({ kind, title, hint, onSubmit }: { kind: string; title: string; hint: string; onSubmit: (kind: string, event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form onSubmit={(event) => onSubmit(kind, event)} className="card space-y-3 p-6">
      <h2 className="font-bold text-brand-navy">{title}</h2>
      <p className="text-sm text-slate-600">{hint}</p>
      <input className="input" type="file" name="file" accept=".csv,text/csv" required />
      {kind === 'members' && (
        <label className="block text-sm font-semibold text-brand-navy">
          Invites
          <select className="input" name="sendInvites" defaultValue="true">
            <option value="true">Email a set-password link</option>
            <option value="false">Import without email</option>
          </select>
        </label>
      )}
      <button className="btn-outline">Import CSV</button>
    </form>
  )
}
