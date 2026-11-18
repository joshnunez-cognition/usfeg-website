import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../App'
import { ErrorNote } from '../components/Shell'
import { api, money, sandboxWillApprove, type Payment } from '../lib/api'

export default function SandboxPay() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, loading, refresh } = useAuth()
  const [payment, setPayment] = useState<Payment | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!loading && !user) navigate('/login')
  }, [loading, user, navigate])

  useEffect(() => {
    if (!id) return
    api<{ payment: Payment }>(`/api/payments/${id}`)
      .then((data) => setPayment(data.payment))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load the payment.'))
  }, [id])

  async function pay() {
    if (!payment) return
    setBusy(true)
    setError('')
    try {
      const result = await api<{ status: string; next: string }>(`/api/payments/${payment.id}/simulate`, { method: 'POST', body: {} })
      await refresh()
      navigate(result.next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed.')
      setBusy(false)
    }
  }

  const approves = payment ? sandboxWillApprove(payment.amountCents) : false
  return (
    <section className="bg-slate-100 py-16">
      <div className="mx-auto w-full max-w-lg px-5">
        <div className="card overflow-hidden">
          <div className="bg-brand-navy px-6 py-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold-light">BluePay sandbox</p>
            <h1 className="mt-2 text-2xl font-bold">Test payment</h1>
          </div>
          <div className="space-y-4 p-6">
            <p className="text-sm leading-relaxed text-slate-600">
              Card numbers are not collected here. In TEST and LIVE mode this step is BluePay’s hosted form at secure.bluepay.com. This simulator follows BluePay’s sandbox rule: odd whole-dollar amounts are approved, even amounts are declined.
            </p>
            <ErrorNote>{error}</ErrorNote>
            {payment && (
              <>
                <p className="text-3xl font-bold text-brand-navy">{money(payment.amountCents)}</p>
                <p className="text-sm capitalize text-slate-600">{payment.purpose.replaceAll('_', ' ')}</p>
                <p className={`rounded-xl px-4 py-3 text-sm ${approves ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}>
                  {approves ? 'This amount will be approved.' : 'This amount will be declined, the same way BluePay TEST mode declines an even dollar amount.'}
                </p>
                <button type="button" className="btn-gold w-full" onClick={pay} disabled={busy || payment.status !== 'pending'}>
                  {payment.status !== 'pending' ? `Already ${payment.status}` : busy ? 'Contacting sandbox…' : 'Complete sandbox payment'}
                </button>
              </>
            )}
            <Link to="/account" className="block text-center text-sm font-semibold text-brand-blue">
              Back to account
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
