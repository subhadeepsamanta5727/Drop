import { useEffect, useState } from 'react'
import { ArrowRight, BarChart3, Check, ChevronDown, FileCheck2, LockKeyhole, Menu, Sparkles, UploadCloud, X, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../services/api.js'

const workflow = [
  { number: '01', icon: UploadCloud, title: 'Admin publishes by category', text: 'The admin uploads daily subscription content or one-time category data into the right catalog.' },
  { number: '02', icon: FileCheck2, title: 'You choose your access', text: 'Subscribe for daily updates across the subscription feed, or purchase a specific category for one-time access.' },
  { number: '03', icon: Zap, title: 'Your dashboard stays current', text: 'Open your account to browse the daily feed or view the category data you have unlocked.' },
]

const fallbackPricingPlans = [
  { name: 'Monthly', price: '₹299', cycle: '/month', description: 'Ideal for personal monitoring and quick access to fresh updates.', features: ['Daily data access', 'Basic dashboard view', 'Email support'], popular: false },
  { name: '6 Months', price: '₹799', cycle: '/month', description: 'Built for users who want broader market coverage and regular updates.', features: ['Everything in Monthly', 'All-category access', 'Priority support'], popular: true },
  { name: 'Yearly', price: '₹1499', cycle: '/month', description: 'For power users tracking more data and faster decision-making.', features: ['Everything in 6 Months', 'Advanced reporting access', 'Premium support'], popular: false },
]

const getPlanLabel = (planCycle) => {
  switch (planCycle) {
    case 'MONTHLY':
      return 'Monthly'
    case 'SIX_MONTH':
      return '6 Months'
    case 'YEARLY':
      return 'Yearly'
    default:
      return 'Plan'
  }
}

const formatPrice = (priceInPaise) => {
  const amount = Number(priceInPaise || 0) / 100
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

const faqs = [
  { question: 'What can I access with a subscription?', answer: 'An active subscription lets you view the daily subscription data published by the admin in your dashboard.' },
  { question: 'How does one-time category access work?', answer: 'Choose a category package, complete payment, and view the data available for that category in the one-time data area.' },
  { question: 'Can I check for new data every day?', answer: 'Yes. Return to the subscriber dashboard to see the latest daily updates as they are published.' },
  { question: 'Who uploads the data?', answer: 'An authorized admin manages categories and uploads both subscription daily data and one-time category data.' },
]

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState(0)
  const [pricingPlans, setPricingPlans] = useState(fallbackPricingPlans)

  useEffect(() => {
    const loadPricingPlans = async () => {
      try {
        const response = await api.get('/payment/plans')
        const subscriptionPlans = (response.data?.data || []).filter(
          (plan) => plan.planType === 'SUBSCRIPTION' && plan.isActive
        )

        if (subscriptionPlans.length > 0) {
          const mappedPlans = subscriptionPlans
            .slice(0, 3)
            .map((plan, index) => ({
              name: getPlanLabel(plan.planCycle),
              price: formatPrice(plan.priceInPaise),
              cycle: '/month',
              description: index === 1
                ? 'Built for users who want broader market coverage and regular updates.'
                : 'Ideal for personal monitoring and quick access to fresh updates.',
              features: [
                'Daily data access',
                'All-category access',
                'Priority support',
              ],
              popular: index === 1,
            }))

          setPricingPlans(mappedPlans)
          return
        }
      } catch (error) {
        console.error('Unable to load subscription pricing:', error)
      }

      setPricingPlans(fallbackPricingPlans)
    }

    loadPricingPlans()
  }, [])

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7faff] text-[#10213f]">
      <section className="relative bg-[#071a37] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(40,184,188,0.26),transparent_26%),radial-gradient(circle_at_18%_82%,rgba(22,119,255,0.22),transparent_32%)]" />

        <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-3 lg:px-10" aria-label="Main navigation">
          <Link to="/" className="flex items-center gap-3" onClick={() => setMenuOpen(false)}>
            <img src="/bizdatapro-logo.svg" alt="BizDataPro" className="h-10 w-auto rounded bg-white px-2 py-1" />
          </Link>

          <div className={`${menuOpen ? 'absolute left-4 right-4 top-16 flex sm:left-6 sm:right-6' : 'hidden'} z-20 flex-col gap-4 rounded-2xl border border-blue-100 bg-white p-5 text-[#10213f] shadow-2xl shadow-blue-950/20 md:static md:flex md:flex-row md:items-center md:gap-5 md:border-0 md:bg-transparent md:p-0 md:text-white md:shadow-none`}>
            <a className="text-sm text-[#10213f] transition hover:text-[#1677ff] md:text-blue-100 md:hover:text-white" href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
            <a className="text-sm text-[#10213f] transition hover:text-[#1677ff] md:text-blue-100 md:hover:text-white" href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a>
            <a className="text-sm text-[#10213f] transition hover:text-[#1677ff] md:text-blue-100 md:hover:text-white" href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a>
            <Link className="text-sm text-[#10213f] transition hover:text-[#1677ff] md:text-blue-100 md:hover:text-white" to="/contact" onClick={() => setMenuOpen(false)}>Contact</Link>
            <Link className="rounded-xl border border-blue-200 px-4 py-2.5 text-center text-sm font-semibold transition hover:bg-blue-50 md:border-white/20 md:hover:bg-white/10" to="/login">Sign in</Link>
          </div>

          <button className="md:hidden" type="button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X /> : <Menu />}
          </button>
        </nav>

        <div className="relative mx-auto grid max-w-6xl items-center gap-4 px-6 pb-14 pt-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:px-10 lg:pb-16 lg:pt-12">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#1677ff]/30 bg-[#1677ff]/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#bfdbfe]"><Sparkles size={14} /> Daily data. Category access.</div>
            <h1 className="max-w-2xl text-4xl font-black leading-[0.98] tracking-[-0.055em] sm:text-5xl lg:text-6xl">Your data access, <span className="text-[#93c5fd]">organized.</span></h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-blue-100/75">BizDataPro gives subscribers a daily data feed and lets one-time buyers unlock exactly the category data they need.</p>

            <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link to="/register" className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1677ff] px-6 py-3.5 font-bold text-white transition hover:bg-[#2f8bff] sm:w-auto">Get started <ArrowRight size={18} className="transition group-hover:translate-x-1" /></Link>
              <a href="#how-it-works" className="inline-flex w-full items-center justify-center rounded-xl border border-white/20 px-6 py-3.5 font-semibold text-white transition hover:bg-white/10 sm:w-auto">See how it works</a>
            </div>

            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-sm text-blue-100/70">
              <span className="flex items-center gap-2"><Check size={16} className="text-[#93c5fd]" /> Secure access</span>
              <span className="flex items-center gap-2"><Check size={16} className="text-[#93c5fd]" /> One clear dashboard</span>
              <span className="flex items-center gap-2"><Check size={16} className="text-[#93c5fd]" /> Flexible packages</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[18rem] py-0 sm:aspect-square sm:max-w-xs lg:py-2">
            <div className="absolute left-8 top-0 h-24 w-24 rounded-full bg-[#1677ff]/20 blur-2xl" />
            <div className="absolute -bottom-2 right-2 h-32 w-32 rounded-full bg-[#1677ff]/25 blur-3xl" />
            <div className="absolute -inset-3 rounded-[2.25rem] border border-[#93c5fd]/20" />

            <div className="relative flex h-auto items-center rotate-0 rounded-[2rem] border border-white/20 bg-[#dcecff]/10 p-2.5 shadow-2xl backdrop-blur-sm sm:h-full sm:rotate-1 sm:p-3">
              <div className="overflow-hidden rounded-[1.5rem] bg-[#f6faff] text-[#10213f] shadow-xl">
                <div className="flex items-center justify-between border-b border-blue-100 bg-white px-5 py-4"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#1677ff] shadow-[0_0_0_4px_#dbeafe]" /><span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Live workspace</span></div><span className="text-xs font-semibold text-[#0f6ce5]">Updated today</span></div>
                <div className="grid grid-cols-2 gap-2 p-3 sm:gap-4 sm:p-5 sm:grid-cols-[1.15fr_0.85fr]">
                  <div className="rounded-2xl bg-[#071a37] p-3 text-white sm:p-5"><div className="flex items-start justify-between gap-1"><div><p className="text-[10px] text-blue-200 sm:text-xs">Subscription feed</p><p className="mt-1 text-lg font-black sm:mt-2 sm:text-2xl">Daily data</p></div><BarChart3 className="text-[#93c5fd]" size={18} /></div><div className="mt-5 flex h-16 items-end gap-1 sm:mt-8 sm:h-20 sm:gap-2">{[35, 52, 44, 68, 58, 82, 74, 94].map((height, index) => <span key={index} className={`flex-1 rounded-t-md ${index === 7 ? 'bg-[#93c5fd]' : 'bg-[#1677ff]/70'}`} style={{ height: `${height}%` }} />)}</div><div className="mt-2 flex justify-between text-[9px] text-blue-200 sm:mt-3 sm:text-[10px]"><span>Mon</span><span>Today</span></div></div>
                  <div className="space-y-2 sm:space-y-4"><div className="rounded-2xl bg-white p-3 shadow-sm sm:p-4"><p className="text-[10px] text-slate-500 sm:text-xs">Your access</p><div className="mt-2 flex items-center gap-1 sm:mt-3 sm:gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#dbeafe] text-[#0f6ce5] sm:h-8 sm:w-8"><Check size={14} /></span><span className="text-xs font-bold sm:text-sm">Active</span></div></div><div className="rounded-2xl bg-[#e9f1ff] p-3 sm:p-4"><p className="text-[10px] text-[#1677ff] sm:text-xs">One-time category</p><p className="mt-1 text-xs font-bold sm:mt-2 sm:text-sm">Market Signals</p><div className="mt-2 h-1.5 rounded-full bg-blue-200 sm:mt-3"><div className="h-1.5 w-4/5 rounded-full bg-[#1677ff]" /></div></div></div>
                </div>
                <div className="mx-5 mb-5 flex items-center justify-between rounded-xl border border-blue-100 bg-white px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Latest drop</p><p className="mt-1 text-sm font-bold">Category data is ready</p></div><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1677ff] text-white"><ArrowRight size={16} /></span></div>
              </div>
            </div>

            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-2xl border border-white/20 bg-white px-3 py-2.5 text-[#10213f] shadow-xl sm:-bottom-1 sm:left-0 sm:translate-x-0 sm:px-4 sm:py-3"><div className="flex items-center gap-2 sm:gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#dbeafe] text-[#0f6ce5]"><LockKeyhole size={16} /></span><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Protected</p><p className="text-xs font-bold">Your data access</p></div></div></div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-24 lg:px-10">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#1677ff]">A simpler path forward</p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.04em] sm:text-5xl">From curiosity to clarity in three steps.</h2>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {workflow.map(({ number, icon: Icon, title, text }) => (
            <article key={number} className="relative rounded-2xl border border-blue-100 bg-white p-7 shadow-[0_16px_40px_rgba(15,61,156,0.06)]">
              <span className="text-sm font-black text-[#1677ff]">{number}</span>
              <div className="mt-12 flex h-12 w-12 items-center justify-center rounded-xl bg-[#dbeafe] text-[#0f6ce5]"><Icon size={23} /></div>
              <h3 className="mt-6 text-xl font-bold">{title}</h3>
              <p className="mt-3 leading-7 text-slate-600">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="bg-[#eaf3ff] px-6 py-24 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#1677ff]">Pricing</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.04em] sm:text-5xl">Flexible subscription plans built for momentum.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">Choose the access that matches your pace and unlock the daily data you need without extra friction.</p>
          </div>

          <div className="mt-14 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
            {pricingPlans.map(({ name, price, cycle, description, features, popular }) => (
              <article
                key={name}
                className={`group relative min-w-[85%] snap-center overflow-hidden rounded-[28px] border p-6 shadow-[0_18px_50px_rgba(15,61,156,0.08)] transition-all duration-300 hover:-translate-y-2 hover:border-[#071a37] hover:shadow-[0_26px_56px_rgba(7,26,55,0.16)] md:min-w-0 ${popular ? 'border-[#071a37] bg-[#071a37] text-white' : 'border-[#dfeaff] bg-white text-slate-900'}`}
              >
                <div className={`absolute inset-x-0 top-0 h-1 ${popular ? 'bg-gradient-to-r from-[#6aa8ff] via-[#1677ff] to-[#93c5fd]' : 'bg-gradient-to-r from-[#dbeafe] via-[#cfe0ff] to-[#b8d4ff]'}`} />

                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-bold tracking-[-0.02em]">{name}</h3>
                  {popular && <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100">Popular</span>}
                </div>

                <p className={`mt-4 text-sm leading-6 ${popular ? 'text-blue-100' : 'text-slate-600'}`}>{description}</p>

                <div className="mt-6 flex items-end gap-2">
                  <span className="text-4xl font-black tracking-[-0.06em]">{price}</span>
                  <span className={`text-sm font-semibold ${popular ? 'text-blue-100' : 'text-slate-500'}`}>{cycle}</span>
                </div>

                <ul className="mt-6 space-y-3">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm">
                      <span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full ${popular ? 'bg-white/10 text-[#93c5fd]' : 'bg-[#dbeafe] text-[#0f6ce5]'}`}><Check size={12} /></span>
                      <span className={popular ? 'text-blue-100' : 'text-slate-700'}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/register"
                  className={`mt-8 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300 ${popular ? 'bg-white text-[#071a37] hover:bg-blue-50' : 'bg-[#071a37] text-white hover:bg-[#102b51]'}`}
                >
                  Choose {name}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-24 lg:grid-cols-[0.85fr_1.15fr] lg:px-10">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#1677ff]">How access works</p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.04em]">Two ways to get the data you need.</h2>
          <p className="mt-5 leading-7 text-slate-600">Admins keep both catalogs updated. You choose the access model that fits your work and use your dashboard to find the right category data.</p>
          <div className="mt-8 space-y-4">{['Subscribe for admin-published daily updates', 'Buy only the one-time category you need', 'Browse and download from your authorized dashboard'].map((item) => <p key={item} className="flex items-center gap-3 font-semibold"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#dbeafe] text-[#0f6ce5]"><Check size={15} /></span>{item}</p>)}</div>
        </div>

        <div id="faq" className="divide-y divide-blue-100 rounded-2xl border border-blue-100 bg-white px-6 shadow-[0_16px_40px_rgba(15,61,156,0.06)]">
          <p className="pt-6 text-sm font-bold uppercase tracking-[0.2em] text-[#1677ff]">Questions, answered</p>
          {faqs.map((faq, index) => (
            <div key={faq.question}>
              <button className="flex w-full items-center justify-between gap-5 py-6 text-left font-bold" type="button" onClick={() => setOpenFaq(openFaq === index ? -1 : index)}>{faq.question}<ChevronDown size={19} className={`shrink-0 text-[#1677ff] transition ${openFaq === index ? 'rotate-180' : ''}`} /></button>
              {openFaq === index && <p className="-mt-2 pb-6 leading-7 text-slate-600">{faq.answer}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-transparent px-6 py-20 text-[#071a37] lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#0f6ce5]">Start with the right access</p>
            <h2 className="mt-3 max-w-2xl text-4xl font-black tracking-[-0.04em] sm:text-5xl">Get daily updates or unlock one category at a time.</h2>
          </div>
          <Link to="/register" className="group inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#071a37] px-6 py-3.5 font-bold text-white transition hover:bg-[#102b51]">Create your account <ArrowRight size={18} className="transition group-hover:translate-x-1" /></Link>
        </div>
      </section>

      <footer className="bg-[#071a37] px-6 py-14 text-blue-100 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 border-b border-white/10 pb-12 md:grid-cols-[1.4fr_1fr_0.7fr]">
          <div>
            <img src="/bizdatapro-logo.svg" alt="BizDataPro" className="h-11 w-auto rounded bg-white px-2 py-1" />
            <p className="mt-5 max-w-sm text-sm leading-7 text-blue-200">Secure access to daily subscription data and category-specific one-time data, managed through one clear dashboard.</p>
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white">Visit us</h2>
            <address className="mt-4 max-w-xs text-sm not-italic leading-7 text-blue-200">GB-47, Rajdanga Main Road,<br />Sector G, East Kolkata Twp,<br />Kolkata, West Bengal 700107</address>
            <a className="mt-3 block text-sm text-[#93c5fd] hover:text-white" href="mailto:info@bizdatapro.com">info@bizdatapro.com</a>
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white">Explore</h2>
            <div className="mt-4 flex flex-col items-start gap-3 text-sm text-blue-200"><a className="hover:text-white" href="#how-it-works">How it works</a><a className="hover:text-white" href="#pricing">Pricing</a><a className="hover:text-white" href="#faq">FAQs</a><Link className="hover:text-white" to="/contact">Contact</Link><Link className="hover:text-white" to="/privacy-policy">Privacy policy</Link><Link className="hover:text-white" to="/payment-policy">Payment policy</Link></div>
          </div>
        </div>
      </footer>
    </main>
  )
}
