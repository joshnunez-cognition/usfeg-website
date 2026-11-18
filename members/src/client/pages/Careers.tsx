import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ErrorNote, Field, PageHero, Pill } from '../components/Shell'
import { api, formatDay, type Job } from '../lib/api'

export default function Careers({ compose = false }: { compose?: boolean }) {
  if (compose) return <JobForm />
  return <JobList />
}

function JobList() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [open, setOpen] = useState<Job | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api<{ jobs: Job[] }>('/api/jobs')
      .then((data) => setJobs(data.jobs))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load jobs.'))
  }, [])

  return (
    <>
      <PageHero eyebrow="Career center" title="Openings" subtitle="Members submit openings. Rod publishes them before they appear for everyone." />
      <section className="container-x py-12">
        <div className="flex justify-end">
          <Link to="/careers/new" className="btn-gold">
            Submit an opening
          </Link>
        </div>
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
        <div className="mt-6 grid gap-4">
          {jobs.length === 0 && <p className="text-sm text-slate-600">No openings yet.</p>}
          {jobs.map((job) => (
            <button key={job.id} type="button" onClick={() => setOpen(job)} className="card p-6 text-left transition hover:shadow-md">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-brand-navy">{job.title}</h2>
                {job.status !== 'published' && <Pill tone="gold">{job.status}</Pill>}
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {job.organization}
                {job.location ? ` · ${job.location}` : ''}
                {job.category ? ` · ${job.category}` : ''}
              </p>
            </button>
          ))}
        </div>
        {open && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-navy-dark/50 p-4 sm:items-center" onClick={() => setOpen(null)}>
            <article className="card max-h-[80vh] w-full max-w-2xl overflow-y-auto p-7" onClick={(event) => event.stopPropagation()}>
              <p className="eyebrow">{open.organization}</p>
              <h3 className="mt-2 text-2xl font-bold text-brand-navy">{open.title}</h3>
              <p className="mt-2 text-sm text-slate-500">
                {open.location} · Posted {formatDay(open.createdAt)}
              </p>
              <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{open.description}</p>
              <p className="mt-5 text-sm">
                Contact{' '}
                <a className="font-semibold text-brand-blue" href={`mailto:${open.contactEmail}`}>
                  {open.contactEmail}
                </a>
              </p>
              <button type="button" className="btn-outline mt-6" onClick={() => setOpen(null)}>
                Close
              </button>
            </article>
          </div>
        )}
      </section>
    </>
  )
}

function JobForm() {
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      await api('/api/jobs', {
        body: {
          title: form.get('title'),
          organization: form.get('organization'),
          location: form.get('location'),
          category: form.get('category'),
          description: form.get('description'),
          contactEmail: form.get('contactEmail'),
          url: form.get('url'),
        },
      })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHero eyebrow="Career center" title="Submit an opening" subtitle="It stays pending until an admin publishes it." />
      <section className="container-x max-w-3xl py-12">
        {done ? (
          <div className="card p-8">
            <h2 className="text-2xl font-bold text-brand-navy">Submitted</h2>
            <p className="mt-3 text-sm text-slate-600">Rod will review it. You can see it on your career list marked pending.</p>
            <Link to="/careers" className="btn-primary mt-6">
              Back to openings
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="card space-y-4 p-7">
            <ErrorNote>{error}</ErrorNote>
            <Field label="Position">
              <input className="input" name="title" required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Organization">
                <input className="input" name="organization" required />
              </Field>
              <Field label="Location">
                <input className="input" name="location" />
              </Field>
            </div>
            <Field label="Category">
              <input className="input" name="category" placeholder="Accounting, Executive…" />
            </Field>
            <Field label="Description">
              <textarea className="input min-h-36" name="description" required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact email">
                <input className="input" type="email" name="contactEmail" required />
              </Field>
              <Field label="Link (optional)">
                <input className="input" name="url" />
              </Field>
            </div>
            <button className="btn-gold" disabled={busy}>
              {busy ? 'Submitting…' : 'Submit for review'}
            </button>
          </form>
        )}
      </section>
    </>
  )
}
