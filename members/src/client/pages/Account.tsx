import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../App'
import { ErrorNote, Field, PageHero, Pill } from '../components/Shell'
import { api, formatDay, formatWhen, money, type Payment } from '../lib/api'

type AccountPayload = {
  payments: Payment[]
  duesCents: number | null
  renewalLeadDays: number
}

export default function Account() {
  const { user, member, refresh } = useAuth()
  const [params] = useSearchParams()
  const [data, setData] = useState<AccountPayload | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  function load() {
    api<AccountPayload>('/api/account')
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load the account.'))
  }

  useEffect(() => {
    refresh().catch(() => {})
    load()
  }, [refresh])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!member) return
    const form = new FormData(event.currentTarget)
    setError('')
    setSaved(false)
    try {
      await api('/api/account', {
        method: 'PATCH',
        body: {
          company: form.get('company'),
          title: form.get('title'),
          phone: form.get('phone'),
          city: form.get('city'),
          state: form.get('state'),
          linkedin: form.get('linkedin'),
          showEmail: form.get('showEmail') === 'on',
          showPhone: form.get('showPhone') === 'on',
          showInDirectory: form.get('showInDirectory') === 'on',
        },
      })
      await refresh()
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.')
    }
  }

  async function payDues() {
    setError('')
    try {
      const result = await api<{ checkoutPath: string }>('/api/payments/dues', { body: {} })
      window.location.assign(result.checkoutPath)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start payment.')
    }
  }

  const dueSoon = member?.renewalDueAt ? new Date(member.renewalDueAt).getTime() - Date.now() < (data?.renewalLeadDays ?? 30) * 86400000 : false
  const owes =
    user?.status === 'pending_payment' ||
    (user?.status === 'active' && !!member && (member.membershipStatus === 'lapsed' || dueSoon))
  const result = params.get('result')

  return (
    <>
      <PageHero eyebrow="Account" title={member ? `${member.firstName} ${member.lastName}` : user?.email || 'Account'} subtitle="Profile, privacy, and membership payments." />
      <section className="container-x grid gap-8 py-12 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {result && (
            <p className={`rounded-xl px-4 py-3 text-sm ${result === 'approved' ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}>
              Payment {result}.
            </p>
          )}
          <ErrorNote>{error}</ErrorNote>
          {saved && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Saved.</p>}
          {member ? (
            <form onSubmit={save} className="card space-y-4 p-7">
              <h2 className="text-lg font-bold text-brand-navy">Profile</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Company">
                  <input className="input" name="company" defaultValue={member.company} />
                </Field>
                <Field label="Title">
                  <input className="input" name="title" defaultValue={member.title} />
                </Field>
                <Field label="Phone">
                  <input className="input" name="phone" defaultValue={member.phone} />
                </Field>
                <Field label="LinkedIn">
                  <input className="input" name="linkedin" defaultValue={member.linkedin} />
                </Field>
                <Field label="City">
                  <input className="input" name="city" defaultValue={member.city} />
                </Field>
                <Field label="State">
                  <input className="input" name="state" defaultValue={member.state} />
                </Field>
              </div>
              <div className="space-y-2 text-sm">
                <Check name="showInDirectory" label="Show me in the member directory" defaultChecked={member.showInDirectory} />
                <Check name="showEmail" label="Show my email to other members" defaultChecked={member.showEmail} />
                <Check name="showPhone" label="Show my phone to other members" defaultChecked={member.showPhone} />
              </div>
              <p className="text-xs text-slate-500">Chapter and network changes go through Rod, the same way a nomination does.</p>
              <button className="btn-primary">Save profile</button>
            </form>
          ) : (
            <div className="card p-7">
              <h2 className="text-lg font-bold text-brand-navy">Staff account</h2>
              <p className="mt-2 text-sm text-slate-600">{user?.email}</p>
            </div>
          )}
        </div>
        <aside className="space-y-6 lg:col-span-2">
          <div className="card p-6">
            <p className="eyebrow">Membership</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Pill>{member?.membershipStatus || user?.status}</Pill>
              {member && <Pill tone="gold">US {member.network}</Pill>}
            </div>
            <p className="mt-4 text-sm text-slate-600">Renews {formatDay(member?.renewalDueAt)}</p>
            {member?.rebillScheduled && <p className="mt-2 text-sm text-slate-600">A card is scheduled for automatic renewal through BluePay.</p>}
            {data?.duesCents != null && <p className="mt-2 text-sm text-slate-600">Annual dues {money(data.duesCents)}.</p>}
            {owes && (
              <button type="button" className="btn-gold mt-5 w-full" onClick={payDues}>
                {user?.status === 'pending_payment' ? 'Pay dues' : 'Pay renewal'}
              </button>
            )}
          </div>
          <div className="card p-6">
            <h2 className="text-lg font-bold text-brand-navy">Payments</h2>
            <ul className="mt-4 space-y-3">
              {(data?.payments ?? []).length === 0 && <li className="text-sm text-slate-600">No payments yet.</li>}
              {data?.payments.map((payment) => (
                <li key={payment.id} className="border-b border-slate-100 pb-3 text-sm last:border-0">
                  <p className="font-semibold text-brand-navy">
                    {money(payment.amountCents)} · {payment.purpose.replaceAll('_', ' ')}
                  </p>
                  <p className="text-slate-500">
                    {payment.status} · {formatWhen(payment.createdAt)}
                    {payment.cardMask ? ` · ${payment.cardMask}` : ''}
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

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-brand-navy" />
      {label}
    </label>
  )
}
