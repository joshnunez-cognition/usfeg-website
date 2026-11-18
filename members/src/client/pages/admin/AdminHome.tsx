import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHero } from '../../components/Shell'
import { api, formatWhen, money, type Payment } from '../../lib/api'
import AdminNav from './AdminNav'

type Summary = {
  active: number
  pendingApproval: number
  pendingPayment: number
  invited: number
  lapsed: number
  jobsPending: number
  upcomingEvents: number
  recentPayments: Payment[]
}

export default function AdminHome() {
  const [summary, setSummary] = useState<Summary | null>(null)

  useEffect(() => {
    api<Summary>('/api/admin/summary').then(setSummary).catch(() => setSummary(null))
  }, [])

  const stats = summary
    ? [
        ['Active members', String(summary.active)],
        ['Awaiting approval', String(summary.pendingApproval)],
        ['Dues unpaid', String(summary.pendingPayment)],
        ['Invited', String(summary.invited)],
        ['Jobs to review', String(summary.jobsPending)],
        ['Upcoming events', String(summary.upcomingEvents)],
      ]
    : []

  return (
    <>
      <PageHero eyebrow="Admin" title="Run the member site" subtitle="Members, events, jobs, files, and BluePay payments. This replaces the YourMembership admin." />
      <AdminNav />
      <section className="container-x py-10">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {stats.map(([label, value]) => (
            <div key={label} className="card px-4 py-5 text-center">
              <p className="text-3xl font-bold text-brand-navy">{value}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <h2 className="text-lg font-bold text-brand-navy">Needs a look</h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link className="font-semibold text-brand-blue" to="/admin/members">
                  {summary?.pendingApproval ?? 0} members waiting for approval
                </Link>
              </li>
              <li>
                <Link className="font-semibold text-brand-blue" to="/admin/jobs">
                  {summary?.jobsPending ?? 0} job posts to publish
                </Link>
              </li>
              <li>
                <Link className="font-semibold text-brand-blue" to="/admin/settings">
                  {summary?.lapsed ?? 0} lapsed memberships
                </Link>
              </li>
            </ul>
          </div>
          <div className="card p-6">
            <h2 className="text-lg font-bold text-brand-navy">Recent payments</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {(summary?.recentPayments ?? []).map((payment) => (
                <li key={payment.id} className="flex justify-between gap-3">
                  <span>
                    {money(payment.amountCents)} · {payment.purpose.replaceAll('_', ' ')}
                    <span className="block text-slate-500">{payment.email || payment.status}</span>
                  </span>
                  <span className="text-slate-500">{formatWhen(payment.createdAt)}</span>
                </li>
              ))}
              {(summary?.recentPayments ?? []).length === 0 && <li className="text-slate-500">No payments yet.</li>}
            </ul>
          </div>
        </div>
      </section>
    </>
  )
}
