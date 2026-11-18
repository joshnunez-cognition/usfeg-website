import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import Shell from './components/Shell'
import { api, type MemberProfile, type User } from './lib/api'
import { BrandProvider } from './lib/brand'
import Account from './pages/Account'
import AdminHome from './pages/admin/AdminHome'
import AdminEvents from './pages/admin/AdminEvents'
import AdminFiles from './pages/admin/AdminFiles'
import AdminJobs from './pages/admin/AdminJobs'
import AdminMembers from './pages/admin/AdminMembers'
import AdminPayments from './pages/admin/AdminPayments'
import AdminSettings from './pages/admin/AdminSettings'
import Careers from './pages/Careers'
import Directory from './pages/Directory'
import Events from './pages/Events'
import Files from './pages/Files'
import Home from './pages/Home'
import AuthPages from './pages/AuthPages'
import SandboxPay from './pages/SandboxPay'

type AuthState = {
  loading: boolean
  user: User | null
  member: MemberProfile | null
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('Auth is missing')
  return value
}

export default function App() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [member, setMember] = useState<MemberProfile | null>(null)

  const refresh = useCallback(async () => {
    const data = await api<{ user: User | null; member: MemberProfile | null }>('/api/auth/me')
    setUser(data.user)
    setMember(data.member)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh().catch(() => setLoading(false))
  }, [refresh])

  const logout = async () => {
    await api('/api/auth/logout', { method: 'POST', body: {} })
    setUser(null)
    setMember(null)
  }

  const auth = { loading, user, member, refresh, logout }

  return (
    <BrandProvider>
    <AuthContext.Provider value={auth}>
      <Shell user={user} member={member} onLogout={logout}>
        <Routes>
          <Route path="/login" element={<AuthPages mode="login" />} />
          <Route path="/join" element={<AuthPages mode="join" />} />
          <Route path="/forgot" element={<AuthPages mode="forgot" />} />
          <Route path="/reset" element={<AuthPages mode="reset" />} />
          <Route path="/invite" element={<AuthPages mode="invite" />} />
          <Route path="/pay/sandbox/:id" element={<SandboxPay />} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<Home />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:id" element={<Events detail />} />
            <Route path="/directory" element={<Directory />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/careers/new" element={<Careers compose />} />
            <Route path="/files" element={<Files />} />
            <Route path="/account" element={<Account />} />
          </Route>
          <Route element={<RequireStaff />}>
            <Route path="/admin" element={<AdminHome />} />
            <Route path="/admin/members" element={<AdminMembers />} />
            <Route path="/admin/members/:id" element={<AdminMembers />} />
            <Route path="/admin/events" element={<AdminEvents />} />
            <Route path="/admin/events/:id" element={<AdminEvents />} />
            <Route path="/admin/jobs" element={<AdminJobs />} />
            <Route path="/admin/files" element={<AdminFiles />} />
            <Route path="/admin/payments" element={<AdminPayments />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Route>
          <Route path="*" element={<Missing />} />
        </Routes>
      </Shell>
    </AuthContext.Provider>
    </BrandProvider>
  )
}

function RequireAuth() {
  const { loading, user } = useAuth()
  const location = useLocation()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

function RequireStaff() {
  const { loading, user } = useAuth()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'member') return <Navigate to="/" replace />
  return <Outlet />
}

function Missing() {
  return (
    <section className="container-x py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="h-display mt-3">Page not found</h1>
    </section>
  )
}

export function Loading() {
  return <p className="container-x py-16 text-sm text-slate-500">Loading…</p>
}
