import { useEffect, useState } from 'react'
import { ErrorNote, PageHero, Pill } from '../../components/Shell'
import { api, formatDay, type Job } from '../../lib/api'
import AdminNav from './AdminNav'

export default function AdminJobs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [error, setError] = useState('')

  function load() {
    api<{ jobs: Job[] }>('/api/admin/jobs')
      .then((data) => setJobs(data.jobs))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load jobs.'))
  }

  useEffect(load, [])

  async function setStatus(id: string, status: string) {
    setError('')
    try {
      await api(`/api/admin/jobs/${id}`, { method: 'PATCH', body: { status } })
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the job.')
    }
  }

  return (
    <>
      <PageHero eyebrow="Admin" title="Career center" subtitle="Member submissions stay pending until you publish them." />
      <AdminNav />
      <section className="container-x space-y-4 py-8">
        <ErrorNote>{error}</ErrorNote>
        {jobs.map((job) => (
          <article key={job.id} className="card p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-brand-navy">{job.title}</h2>
              <Pill tone={job.status === 'published' ? 'navy' : 'gold'}>{job.status}</Pill>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {job.organization}
              {job.location ? ` · ${job.location}` : ''} · {formatDay(job.createdAt)}
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{job.description}</p>
            <p className="mt-2 text-sm text-slate-500">{job.contactEmail}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {job.status !== 'published' && (
                <button type="button" className="btn-gold px-4 py-2" onClick={() => setStatus(job.id, 'published')}>
                  Publish
                </button>
              )}
              {job.status !== 'rejected' && (
                <button type="button" className="btn-outline px-4 py-2" onClick={() => setStatus(job.id, 'rejected')}>
                  Reject
                </button>
              )}
              {job.status === 'published' && (
                <button type="button" className="btn-outline px-4 py-2" onClick={() => setStatus(job.id, 'closed')}>
                  Close
                </button>
              )}
            </div>
          </article>
        ))}
        {jobs.length === 0 && <p className="text-sm text-slate-600">No job posts.</p>}
      </section>
    </>
  )
}
