import { useEffect, useState, type FormEvent } from 'react'
import { ErrorNote, Field, PageHero, Pill } from '../../components/Shell'
import { api, formatWhen, money, type Payment } from '../../lib/api'
import AdminNav from './AdminNav'

export default function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [error, setError] = useState('')
  const [note, setNote] = useState('')

  function load() {
    api<{ payments: Payment[] }>('/api/admin/payments')
      .then((data) => setPayments(data.payments))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load payments.'))
  }

  useEffect(load, [])

  async function manual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const dollars = Number(form.get('amount') || 0)
    setError('')
    try {
      await api('/api/admin/payments/manual', {
        body: {
          userId: form.get('userId'),
          purpose: form.get('purpose'),
          amountCents: Math.round(dollars * 100),
          note: form.get('note'),
        },
      })
      setNote('Payment recorded.')
      event.currentTarget.reset()
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record the payment.')
    }
  }

  async function refund(id: string) {
    if (!confirm('Mark this payment refunded? In mock mode this updates our record only. In TEST/LIVE it asks BluePay to refund.')) return
    setError('')
    try {
      await api(`/api/admin/payments/${id}/refund`, { method: 'POST', body: {} })
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refund failed.')
    }
  }

  return (
    <>
      <PageHero eyebrow="Admin" title="Payments" subtitle="Dues, renewals, and event fees. Card numbers stay on BluePay." />
      <AdminNav />
      <section className="container-x space-y-8 py-8">
        <div className="overflow-x-auto">
          <ErrorNote>{error}</ErrorNote>
          <table className="mt-4 w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-2">When</th>
                <th>Who</th>
                <th>Order</th>
                <th>What</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-t border-slate-100 align-top">
                  <td className="py-3 whitespace-nowrap">{formatWhen(payment.createdAt)}</td>
                  <td className="max-w-[12rem] break-all py-3 pr-3">{payment.email || payment.userId}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{payment.orderId}</td>
                  <td>
                    <Pill tone={payment.status === 'approved' ? 'navy' : 'gold'}>{payment.status}</Pill>
                    <span className="ml-2 capitalize">{payment.purpose.replaceAll('_', ' ')}</span>
                  </td>
                  <td>{money(payment.amountCents)}</td>
                  <td>
                    {payment.status === 'approved' && (
                      <button type="button" className="text-sm font-semibold text-brand-blue" onClick={() => refund(payment.id)}>
                        Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form onSubmit={manual} className="card max-w-xl space-y-4 p-6">
          <h2 className="font-bold text-brand-navy">Record a check or wire</h2>
          {note && <p className="text-sm text-emerald-800">{note}</p>}
          <Field label="Member user id">
            <input className="input" name="userId" required />
          </Field>
          <Field label="Purpose">
            <select className="input" name="purpose" defaultValue="dues_signup">
              <option value="dues_signup">New member dues</option>
              <option value="dues_renewal">Renewal</option>
            </select>
          </Field>
          <Field label="Amount (USD)">
            <input className="input" name="amount" type="number" min="0" step="0.01" required />
          </Field>
          <Field label="Note">
            <input className="input" name="note" placeholder="Check 1042" />
          </Field>
          <button className="btn-primary w-full">Record payment</button>
        </form>
      </section>
    </>
  )
}
