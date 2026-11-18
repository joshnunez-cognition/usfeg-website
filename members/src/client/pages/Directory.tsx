import { useEffect, useState } from 'react'
import { ErrorNote, PageHero } from '../components/Shell'
import { api, type Chapter, type DirectoryMember } from '../lib/api'

export default function Directory({ network }: { network: 'FEG' | 'LEG' }) {
  const [q, setQ] = useState('')
  const [chapterId, setChapterId] = useState('')
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [members, setMembers] = useState<DirectoryMember[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api<{ chapters: Chapter[] }>('/api/chapters')
      .then((data) => setChapters(data.chapters.filter((chapter) => chapter.network === network)))
      .catch(() => setChapters([]))
  }, [network])

  useEffect(() => {
    const params = new URLSearchParams({ network })
    if (q.trim()) params.set('q', q.trim())
    if (chapterId) params.set('chapterId', chapterId)
    api<{ members: DirectoryMember[] }>(`/api/directory?${params}`)
      .then((data) => {
        setMembers(data.members)
        setError('')
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Directory is unavailable.'))
  }, [network, q, chapterId])

  const title = network === 'FEG' ? 'US FEG Directory' : 'US LEG Directory'
  return (
    <>
      <PageHero
        eyebrow={network === 'FEG' ? 'Financial executives' : 'US LEG'}
        title={title}
        subtitle="Visible to active members. Email and phone appear only when that member has chosen to share them."
      />
      <section className="container-x py-12">
        <div className="grid gap-3 sm:grid-cols-[1fr_16rem]">
          <input className="input mt-0" placeholder="Search name, company, or title" value={q} onChange={(event) => setQ(event.target.value)} />
          <select className="input mt-0" value={chapterId} onChange={(event) => setChapterId(event.target.value)}>
            <option value="">All chapters</option>
            {chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.name}, {chapter.state}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {members.length === 0 && !error && <p className="text-sm text-slate-600">No members match.</p>}
          {members.map((member) => (
            <article key={member.id} className="card p-6">
              <p className="text-lg font-bold text-brand-navy">
                {member.firstName} {member.lastName}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {member.title}
                {member.title && member.company ? ', ' : ''}
                {member.company}
              </p>
              <p className="mt-3 text-sm text-brand-blue">
                {member.chapterName || 'Chapter not set'}
                {member.city ? ` · ${member.city}` : ''}
                {member.state ? `, ${member.state}` : ''}
              </p>
              <div className="mt-3 space-y-1 text-sm">
                {member.email && (
                  <a className="block text-brand-navy underline decoration-brand-gold underline-offset-4" href={`mailto:${member.email}`}>
                    {member.email}
                  </a>
                )}
                {member.phone && (
                  <a className="block text-brand-navy" href={`tel:${member.phone}`}>
                    {member.phone}
                  </a>
                )}
                {!member.email && !member.phone && <p className="text-slate-500">Contact details are private.</p>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
