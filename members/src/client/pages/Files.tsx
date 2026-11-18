import { useEffect, useState } from 'react'
import { ErrorNote, PageHero } from '../components/Shell'
import { api, type LibraryFile } from '../lib/api'

export default function Files() {
  const [files, setFiles] = useState<LibraryFile[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api<{ files: LibraryFile[] }>('/api/files')
      .then((data) => setFiles(data.files))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load files.'))
  }, [])

  const folders = [...new Set(files.map((file) => file.folder))]
  return (
    <>
      <PageHero eyebrow="Library" title="Member files" subtitle="Documents Rod has shared with active members. Downloads stay behind the login." />
      <section className="container-x py-12">
        <ErrorNote>{error}</ErrorNote>
        {files.length === 0 && !error && <p className="text-sm text-slate-600">No files yet.</p>}
        <div className="space-y-8">
          {folders.map((folder) => (
            <div key={folder}>
              <h2 className="text-lg font-bold text-brand-navy">{folder}</h2>
              <ul className="mt-3 divide-y divide-slate-200 rounded-2xl border border-slate-200">
                {files
                  .filter((file) => file.folder === folder)
                  .map((file) => (
                    <li key={file.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                      <div>
                        <p className="font-semibold text-brand-navy">{file.title}</p>
                        {file.description && <p className="mt-1 text-sm text-slate-600">{file.description}</p>}
                      </div>
                      <a className="btn-outline px-4 py-2" href={`/api/files/${file.id}/download`}>
                        Download
                      </a>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
