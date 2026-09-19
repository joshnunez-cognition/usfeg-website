const features = [
  {
    title: 'Who We Are',
    body: 'A short introduction to USFEG, our mission, and the people behind it.',
  },
  {
    title: 'What We Do',
    body: 'An overview of our programs, services, and the impact we aim to make.',
  },
  {
    title: 'Get Involved',
    body: 'Ways to participate, partner, or support the work we do.',
  },
]

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <header className="border-b border-slate-200">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="#" className="text-xl font-bold tracking-tight">
            USFEG
          </a>
          <ul className="hidden gap-8 text-sm font-medium text-slate-600 sm:flex">
            <li><a href="#about" className="hover:text-slate-900">About</a></li>
            <li><a href="#features" className="hover:text-slate-900">What We Do</a></li>
            <li><a href="#contact" className="hover:text-slate-900">Contact</a></li>
          </ul>
          <a
            href="#contact"
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Get in touch
          </a>
        </nav>
      </header>

      <main className="flex-1">
        <section id="about" className="bg-gradient-to-b from-blue-50 to-white">
          <div className="mx-auto max-w-6xl px-6 py-24 text-center sm:py-32">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Welcome to USFEG
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
              Our new website is on the way. In the meantime, learn a little about
              who we are and how to reach us.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <a
                href="#features"
                className="rounded-md bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"
              >
                Learn more
              </a>
              <a
                href="#contact"
                className="rounded-md border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Contact us
              </a>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-8 sm:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-lg border border-slate-200 p-6">
                <h2 className="text-lg font-semibold">{f.title}</h2>
                <p className="mt-2 text-sm text-slate-600">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="contact" className="bg-slate-900 text-white">
          <div className="mx-auto max-w-6xl px-6 py-20 text-center">
            <h2 className="text-3xl font-bold">Get in touch</h2>
            <p className="mt-4 text-slate-300">
              Questions or want to work with us? We would love to hear from you.
            </p>
            <a
              href="mailto:info@usfeg.org"
              className="mt-8 inline-block rounded-md bg-white px-6 py-3 font-semibold text-slate-900 hover:bg-slate-100"
            >
              info@usfeg.org
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200">
        <div className="mx-auto max-w-6xl px-6 py-6 text-sm text-slate-500">
          &copy; {new Date().getFullYear()} USFEG. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
