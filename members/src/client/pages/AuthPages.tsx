import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../App'
import { ErrorNote, Field } from '../components/Shell'
import { api, money, type Chapter } from '../lib/api'

type Mode = 'login' | 'join' | 'forgot' | 'reset' | 'invite'

export default function AuthPages({ mode }: { mode: Mode }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  useEffect(() => {
    if (user && (mode === 'login' || mode === 'join')) navigate('/', { replace: true })
  }, [user, mode, navigate])

  return (
    <div className="grid lg:grid-cols-2">
      <section className="relative isolate overflow-hidden bg-brand-navy text-white">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-navy-dark via-brand-navy to-brand-blue" />
        <div className="container-x flex min-h-[280px] flex-col justify-end py-14 lg:min-h-[70vh] lg:py-20">
          <img src="/logo.svg" alt="" className="h-14 w-auto rounded-lg bg-white px-3 py-2" />
          <p className="eyebrow mt-8 text-brand-gold-light">Your Network is Your Net Worth</p>
          <h1 className="mt-4 max-w-md text-4xl font-bold tracking-tight sm:text-5xl">Member Site</h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-white/80">
            Chapter lunches, the FEG and LEG directories, the career center, and member files. Same network, same brand as usfeg.org.
          </p>
        </div>
      </section>
      <section className="flex items-center bg-white">
        <div className="container-x w-full max-w-xl py-12 lg:py-16">
          {mode === 'login' && <LoginForm />}
          {mode === 'join' && <JoinForm />}
          {mode === 'forgot' && <ForgotForm />}
          {mode === 'reset' && <ResetForm />}
          {mode === 'invite' && <InviteForm />}
        </div>
      </section>
    </div>
  )
}

function LoginForm() {
  const { refresh } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [demo, setDemo] = useState<{ role: string; email: string; password: string }[]>([])

  useEffect(() => {
    api<{ demo?: boolean; demoLogins?: { role: string; email: string; password: string }[] }>('/api/health')
      .then((health) => setDemo(health.demoLogins ?? []))
      .catch(() => setDemo([]))
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api('/api/auth/login', { body: { email, password } })
      await refresh()
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <p className="eyebrow">Welcome back</p>
        <h2 className="mt-2 text-3xl font-bold text-brand-navy">Sign in</h2>
      </div>
      <ErrorNote>{error}</ErrorNote>
      <Field label="Email">
        <input className="input" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </Field>
      <Field label="Password">
        <input className="input" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      </Field>
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
      <p className="text-sm text-slate-600">
        <Link className="font-semibold text-brand-blue" to="/forgot">
          Forgot your password?
        </Link>
        <span className="mx-2 text-slate-300">·</span>
        <Link className="font-semibold text-brand-blue" to="/join">
          Apply for membership
        </Link>
      </p>
      {demo.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <p className="font-semibold text-brand-navy">Local demo</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {demo.map((login) => (
              <button
                key={login.email}
                type="button"
                className="btn-outline px-4 py-2"
                onClick={() => {
                  setEmail(login.email)
                  setPassword(login.password)
                }}
              >
                Use {login.role.toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      )}
    </form>
  )
}

function JoinForm() {
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [dues, setDues] = useState<{ duesFegCents: number; duesLegCents: number } | null>(null)
  const [network, setNetwork] = useState<'FEG' | 'LEG'>('FEG')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<{ chapters: Chapter[] }>('/api/chapters').then((data) => setChapters(data.chapters)).catch(() => setChapters([]))
    api<{ duesFegCents: number; duesLegCents: number }>('/api/settings/public').then(setDues).catch(() => setDues(null))
  }, [])

  const choices = chapters.filter((chapter) => chapter.network === network)
  const fee = network === 'LEG' ? dues?.duesLegCents : dues?.duesFegCents

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      const result = await api<{ checkoutPath: string }>('/api/auth/signup', {
        body: {
          email: form.get('email'),
          password: form.get('password'),
          firstName: form.get('firstName'),
          lastName: form.get('lastName'),
          company: form.get('company'),
          title: form.get('title'),
          phone: form.get('phone'),
          network,
          chapterId: form.get('chapterId'),
        },
      })
      window.location.assign(result.checkoutPath)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the account.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <p className="eyebrow">Membership</p>
        <h2 className="mt-2 text-3xl font-bold text-brand-navy">Apply and pay dues</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Dues are collected at signup through BluePay. Rod approves the membership after payment. {fee ? `Current ${network} dues are ${money(fee)} a year.` : ''}
        </p>
      </div>
      <ErrorNote>{error}</ErrorNote>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name">
          <input className="input" name="firstName" required />
        </Field>
        <Field label="Last name">
          <input className="input" name="lastName" required />
        </Field>
      </div>
      <Field label="Email">
        <input className="input" type="email" name="email" autoComplete="email" required />
      </Field>
      <Field label="Password (10+ characters)">
        <input className="input" type="password" name="password" autoComplete="new-password" minLength={10} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company">
          <input className="input" name="company" />
        </Field>
        <Field label="Title">
          <input className="input" name="title" />
        </Field>
      </div>
      <Field label="Phone">
        <input className="input" name="phone" />
      </Field>
      <Field label="Network">
        <select className="input" value={network} onChange={(event) => setNetwork(event.target.value as 'FEG' | 'LEG')}>
          <option value="FEG">US FEG</option>
          <option value="LEG">US LEG</option>
        </select>
      </Field>
      <Field label="Chapter">
        <select className="input" name="chapterId" required defaultValue="">
          <option value="" disabled>
            Choose a chapter
          </option>
          {choices.map((chapter) => (
            <option key={chapter.id} value={chapter.id}>
              {chapter.name}, {chapter.state}
            </option>
          ))}
        </select>
      </Field>
      <button className="btn-gold w-full" disabled={busy}>
        {busy ? 'Sending you to payment…' : 'Continue to dues payment'}
      </button>
      <p className="text-sm text-slate-600">
        Already a member?{' '}
        <Link className="font-semibold text-brand-blue" to="/login">
          Sign in
        </Link>
      </p>
    </form>
  )
}

function ForgotForm() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = new FormData(event.currentTarget).get('email')
    setError('')
    try {
      await api('/api/auth/forgot', { body: { email } })
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the email.')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <p className="eyebrow">Account</p>
        <h2 className="mt-2 text-3xl font-bold text-brand-navy">Reset password</h2>
      </div>
      <ErrorNote>{error}</ErrorNote>
      {sent ? (
        <p className="text-sm leading-relaxed text-slate-600">If that email is on file, a link is on its way. Invited members get a set-password link instead.</p>
      ) : (
        <>
          <Field label="Email">
            <input className="input" type="email" name="email" required />
          </Field>
          <button className="btn-primary w-full">Email me a link</button>
        </>
      )}
      <Link className="text-sm font-semibold text-brand-blue" to="/login">
        Back to sign in
      </Link>
    </form>
  )
}

function ResetForm() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const password = new FormData(event.currentTarget).get('password')
    setError('')
    try {
      await api('/api/auth/reset', { body: { token: params.get('token'), password } })
      navigate('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset the password.')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <p className="eyebrow">Account</p>
        <h2 className="mt-2 text-3xl font-bold text-brand-navy">Choose a new password</h2>
      </div>
      <ErrorNote>{error}</ErrorNote>
      <Field label="New password">
        <input className="input" type="password" name="password" minLength={10} required />
      </Field>
      <button className="btn-primary w-full">Save password</button>
    </form>
  )
}

function InviteForm() {
  const [params] = useSearchParams()
  const { refresh } = useAuth()
  const navigate = useNavigate()
  const [preview, setPreview] = useState<{ email: string; firstName: string } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = params.get('token')
    if (!token) return
    api<{ email: string; firstName: string }>(`/api/auth/invite/${encodeURIComponent(token)}`)
      .then(setPreview)
      .catch((err) => setError(err instanceof Error ? err.message : 'This invite is not valid.'))
  }, [params])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const password = new FormData(event.currentTarget).get('password')
    setError('')
    try {
      await api('/api/auth/invite', { body: { token: params.get('token'), password } })
      await refresh()
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set the password.')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <p className="eyebrow">Welcome</p>
        <h2 className="mt-2 text-3xl font-bold text-brand-navy">{preview?.firstName ? `Hello, ${preview.firstName}` : 'Set your password'}</h2>
        {preview && <p className="mt-2 text-sm text-slate-600">{preview.email}</p>}
      </div>
      <ErrorNote>{error}</ErrorNote>
      <Field label="Password">
        <input className="input" type="password" name="password" minLength={10} required />
      </Field>
      <button className="btn-gold w-full">Save and sign in</button>
    </form>
  )
}
