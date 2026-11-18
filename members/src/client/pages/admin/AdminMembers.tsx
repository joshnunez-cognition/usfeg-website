import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorNote, Field, PageHero, Pill } from '../../components/Shell'
import { api, formatDay, type AdminMember, type Chapter } from '../../lib/api'
import AdminNav from './AdminNav'

export default function AdminMembers() {
  const { id } = useParams()
  if (id) return <MemberEditor id={id} />
  return <MemberList />
}

function MemberList() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [members, setMembers] = useState<AdminMember[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  function load() {
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    if (status) params.set('status', status)
    api<{ members: AdminMember[] }>(`/api/admin/members?${params}`)
      .then((data) => setMembers(data.members))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load members.'))
  }

  useEffect(load, [q, status])
  useEffect(() => {
    api<{ chapters: Chapter[] }>('/api/chapters').then((data) => setChapters(data.chapters)).catch(() => setChapters([]))
  }, [])

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError('')
    try {
      await api('/api/admin/members', {
        body: {
          email: form.get('email'),
          firstName: form.get('firstName'),
          lastName: form.get('lastName'),
          company: form.get('company'),
          title: form.get('title'),
          network: form.get('network'),
          chapterId: form.get('chapterId'),
          membershipStatus: form.get('membershipStatus'),
          sendInvite: true,
        },
      })
      setOpen(false)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the member.')
    }
  }

  return (
    <>
      <PageHero eyebrow="Admin" title="Members" subtitle="Approve applicants, invite people moving off YourMembership, and keep chapters current." />
      <AdminNav />
      <section className="container-x py-8">
        <div className="flex flex-wrap items-center gap-3">
          <input className="input mt-0 max-w-sm" placeholder="Search" value={q} onChange={(event) => setQ(event.target.value)} />
          <select className="input mt-0 w-auto" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Any status</option>
            {['invited', 'pending_payment', 'pending_approval', 'active', 'suspended'].map((value) => (
              <option key={value} value={value}>
                {value.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
          <button type="button" className="btn-gold" onClick={() => setOpen((value) => !value)}>
            Add member
          </button>
        </div>
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
        {open && (
          <form onSubmit={create} className="card mt-4 grid gap-4 p-6 md:grid-cols-2">
            <Field label="First name">
              <input className="input" name="firstName" required />
            </Field>
            <Field label="Last name">
              <input className="input" name="lastName" required />
            </Field>
            <Field label="Email">
              <input className="input" type="email" name="email" required />
            </Field>
            <Field label="Company">
              <input className="input" name="company" />
            </Field>
            <Field label="Title">
              <input className="input" name="title" />
            </Field>
            <Field label="Network">
              <select className="input" name="network" defaultValue="FEG">
                <option value="FEG">FEG</option>
                <option value="LEG">LEG</option>
              </select>
            </Field>
            <Field label="Chapter">
              <select className="input" name="chapterId" defaultValue="">
                <option value="">None yet</option>
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.network} · {chapter.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Membership">
              <select className="input" name="membershipStatus" defaultValue="active">
                <option value="active">Active (already paid in YM)</option>
                <option value="pending">Pending dues</option>
              </select>
            </Field>
            <div className="md:col-span-2">
              <button className="btn-primary">Create and email an invite</button>
            </div>
          </form>
        )}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-2">Name</th>
                <th>Network</th>
                <th>Chapter</th>
                <th>Account</th>
                <th>Renews</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.userId} className="border-t border-slate-100">
                  <td className="py-3">
                    <Link className="font-semibold text-brand-navy" to={`/admin/members/${member.userId}`}>
                      {member.firstName} {member.lastName}
                    </Link>
                    <span className="block text-slate-500">{member.email}</span>
                  </td>
                  <td>{member.network}</td>
                  <td>{member.chapterName || '—'}</td>
                  <td>
                    <Pill tone={member.userStatus === 'active' ? 'navy' : 'gold'}>{member.userStatus.replaceAll('_', ' ')}</Pill>
                  </td>
                  <td>{formatDay(member.renewalDueAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

function MemberEditor({ id }: { id: string }) {
  const [member, setMember] = useState<AdminMember | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [error, setError] = useState('')
  const [note, setNote] = useState('')

  function load() {
    api<{ member: AdminMember }>(`/api/admin/members/${id}`)
      .then((data) => setMember(data.member))
      .catch((err) => setError(err instanceof Error ? err.message : 'Not found.'))
  }

  useEffect(load, [id])
  useEffect(() => {
    api<{ chapters: Chapter[] }>('/api/chapters').then((data) => setChapters(data.chapters)).catch(() => setChapters([]))
  }, [])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!member) return
    const form = new FormData(event.currentTarget)
    const renewal = String(form.get('renewalDueAt') || '')
    setError('')
    try {
      const data = await api<{ member: AdminMember }>(`/api/admin/members/${id}`, {
        method: 'PATCH',
        body: {
          firstName: form.get('firstName'),
          lastName: form.get('lastName'),
          company: form.get('company'),
          title: form.get('title'),
          network: form.get('network'),
          chapterId: form.get('chapterId'),
          phone: form.get('phone'),
          city: form.get('city'),
          state: form.get('state'),
          membershipStatus: form.get('membershipStatus'),
          userStatus: undefined,
          status: form.get('status'),
          role: form.get('role'),
          renewalDueAt: renewal ? new Date(`${renewal}T12:00:00.000Z`).toISOString() : '',
          showInDirectory: form.get('showInDirectory') === 'on',
        },
      })
      setMember(data.member)
      setNote('Saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.')
    }
  }

  async function approve(waive: boolean) {
    setError('')
    try {
      const data = await api<{ member: AdminMember }>(`/api/admin/members/${id}/approve`, { body: { waive } })
      setMember(data.member)
      setNote(waive ? 'Approved and dues waived.' : 'Approved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not approve.')
    }
  }

  async function invite() {
    setError('')
    try {
      await api(`/api/admin/members/${id}/invite`, { method: 'POST', body: {} })
      setNote('Invite email queued.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the invite.')
    }
  }

  if (!member) {
    return (
      <section className="container-x py-16">
        <ErrorNote>{error || 'Loading…'}</ErrorNote>
      </section>
    )
  }

  return (
    <>
      <PageHero eyebrow={member.email} title={`${member.firstName} ${member.lastName}`} subtitle={`${member.role} · ${member.userStatus.replaceAll('_', ' ')}`} />
      <AdminNav />
      <section className="container-x grid gap-8 py-8 lg:grid-cols-3">
        <form onSubmit={save} className="card space-y-4 p-6 lg:col-span-2">
          <ErrorNote>{error}</ErrorNote>
          {note && <p className="text-sm text-emerald-800">{note}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name">
              <input className="input" name="firstName" defaultValue={member.firstName} />
            </Field>
            <Field label="Last name">
              <input className="input" name="lastName" defaultValue={member.lastName} />
            </Field>
            <Field label="Company">
              <input className="input" name="company" defaultValue={member.company} />
            </Field>
            <Field label="Title">
              <input className="input" name="title" defaultValue={member.title} />
            </Field>
            <Field label="Phone">
              <input className="input" name="phone" defaultValue={member.phone} />
            </Field>
            <Field label="City">
              <input className="input" name="city" defaultValue={member.city} />
            </Field>
            <Field label="State">
              <input className="input" name="state" defaultValue={member.state} />
            </Field>
            <Field label="Network">
              <select className="input" name="network" defaultValue={member.network}>
                <option value="FEG">FEG</option>
                <option value="LEG">LEG</option>
              </select>
            </Field>
            <Field label="Chapter">
              <select className="input" name="chapterId" defaultValue={member.chapterId || ''}>
                <option value="">None</option>
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.network} · {chapter.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Membership">
              <select className="input" name="membershipStatus" defaultValue={member.membershipStatus}>
                {['pending', 'active', 'lapsed', 'cancelled', 'waived'].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </Field>
            <Field label="Account status">
              <select className="input" name="status" defaultValue={member.userStatus}>
                {['invited', 'pending_payment', 'pending_approval', 'active', 'suspended'].map((value) => (
                  <option key={value} value={value}>
                    {value.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Role">
              <select className="input" name="role" defaultValue={member.role}>
                <option value="member">Member</option>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
            <Field label="Renewal date">
              <input className="input" type="date" name="renewalDueAt" defaultValue={member.renewalDueAt?.slice(0, 10) || ''} />
            </Field>
          </div>
          <label className="flex items-center gap-3 text-sm font-semibold text-brand-navy">
            <input type="checkbox" name="showInDirectory" defaultChecked={member.showInDirectory} className="h-4 w-4 accent-brand-navy" />
            Show in directory
          </label>
          <button className="btn-primary">Save</button>
        </form>
        <aside className="space-y-4">
          <div className="card space-y-3 p-6">
            <h2 className="font-bold text-brand-navy">Approval</h2>
            <p className="text-sm text-slate-600">Approve after dues are paid, or waive dues for a comp membership.</p>
            <button type="button" className="btn-gold w-full" onClick={() => approve(false)}>
              Approve
            </button>
            <button type="button" className="btn-outline w-full" onClick={() => approve(true)}>
              Waive dues and approve
            </button>
            <button type="button" className="btn-outline w-full" onClick={invite}>
              Send set-password invite
            </button>
          </div>
          <Link to="/admin/members" className="text-sm font-semibold text-brand-blue">
            ← All members
          </Link>
        </aside>
      </section>
    </>
  )
}
