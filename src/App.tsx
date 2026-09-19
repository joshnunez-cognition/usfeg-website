import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import About from './pages/About'
import Founder from './pages/Founder'
import Chapters from './pages/Chapters'
import Conference from './pages/Conference'
import WhyUsFeg from './pages/WhyUsFeg'
import Partners from './pages/Partners'
import TeamGleason from './pages/TeamGleason'

function NotFound() {
  return (
    <section className="container-x py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="h-display mt-3">Page not found</h1>
      <Link to="/" className="btn-primary mt-8">
        Back to home
      </Link>
    </section>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about-us" element={<About />} />
          <Route path="/from-the-founder" element={<Founder />} />
          <Route path="/join-us-feg" element={<Chapters />} />
          <Route path="/conference" element={<Conference />} />
          <Route path="/team-3" element={<WhyUsFeg />} />
          <Route path="/team-4" element={<Partners />} />
          <Route path="/teamgleason" element={<TeamGleason />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
