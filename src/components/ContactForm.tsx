import { useState, type FormEvent } from 'react'
import { contact } from '../data/site'

const formspreeId = import.meta.env.VITE_FORMSPREE_ID as string | undefined

type Status = 'idle' | 'sending' | 'sent' | 'error'

export default function ContactForm({ dark = true }: { dark?: boolean }) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!formspreeId) {
      const subject = encodeURIComponent('Contact from usfeg.org')
      const body = encodeURIComponent(`From: ${email}\n\n${message}`)
      window.location.href = `mailto:${contact.email}?subject=${subject}&body=${body}`
      setStatus('sent')
      return
    }
    setStatus('sending')
    try {
      const res = await fetch(`https://formspree.io/f/${formspreeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, message }),
      })
      setStatus(res.ok ? 'sent' : 'error')
    } catch {
      setStatus('error')
    }
  }

  const inputCls = dark
    ? 'w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:border-brand-gold focus:outline-none'
    : 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-brand-ink placeholder:text-slate-400 focus:border-brand-navy focus:outline-none'

  if (status === 'sent') {
    return (
      <p className={`rounded-xl px-4 py-3 text-sm ${dark ? 'bg-white/10 text-white' : 'bg-slate-100 text-brand-navy'}`}>
        Thanks for submitting!
      </p>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block">
        <span className="sr-only">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email here*"
          className={inputCls}
        />
      </label>
      <label className="block">
        <span className="sr-only">Message</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How can we help? (optional)"
          rows={3}
          className={inputCls}
        />
      </label>
      <button type="submit" disabled={status === 'sending'} className="btn-gold w-full disabled:opacity-60">
        {status === 'sending' ? 'Sending…' : 'Submit'}
      </button>
      {status === 'error' && (
        <p className="text-sm text-red-300">
          Something went wrong. Email us directly at{' '}
          <a className="underline" href={`mailto:${contact.email}`}>
            {contact.email}
          </a>
          .
        </p>
      )}
    </form>
  )
}
