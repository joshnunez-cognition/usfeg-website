import { useEffect, useState, type FormEvent } from 'react'
import { ErrorNote, Field, PageHero } from '../../components/Shell'
import { api, type LibraryFile } from '../../lib/api'
import AdminNav from './AdminNav'

export default function AdminFiles() {
  const [files, setFiles] = useState<LibraryFile[]>([])
  const [error, setError] = useState('')

  function load() {
    api<{ files: LibraryFile[] }>('/api/files')
      .then((data) => setFiles(data.files))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load files.'))
  }

  useEffect(load, [])

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setError('')
    const response = await fetch('/api/admin/files', { method: 'POST', body: new FormData(form), credentials: 'same-origin' })
    const data = (await response.json().catch(() => ({}))) as { error?: string }
    if (!response.ok) {
      setError(data.error || 'Upload failed.')
      return
    }
    form.reset()
    load()
  }

  async function remove(id: string) {
    if (!confirm('Remove this file from the library?')) return
    await api(`/api/admin/files/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <>
      <PageHero eyebrow="Admin" title="File library" subtitle="Active members can download these. Executables and HTML are rejected." />
      <AdminNav />
      <section className="container-x grid gap-8 py-8 lg:grid-cols-5">
        <form onSubmit={upload} className="card space-y-4 p-6 lg:col-span-2">
          <ErrorNote>{error}</ErrorNote>
          <Field label="Title">
            <input className="input" name="title" />
          </Field>
          <Field label="Folder">
            <input className="input" name="folder" placeholder="Chapter operations" />
          </Field>
          <Field label="Description">
            <textarea className="input min-h-24" name="description" />
          </Field>
          <Field label="File">
            <input className="input" type="file" name="file" required />
          </Field>
          <button className="btn-primary">Upload</button>
        </form>
        <ul className="space-y-3 lg:col-span-3">
          {files.map((file) => (
            <li key={file.id} className="card flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold text-brand-navy">{file.title}</p>
                <p className="text-sm text-slate-500">
                  {file.folder} · {file.filename}
                </p>
              </div>
              <button type="button" className="text-sm font-semibold text-red-700" onClick={() => remove(file.id)}>
                Delete
              </button>
            </li>
          ))}
          {files.length === 0 && <li className="text-sm text-slate-600">No files yet.</li>}
        </ul>
      </section>
    </>
  )
}
