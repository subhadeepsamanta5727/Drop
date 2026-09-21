import { ArrowLeft, Mail, MapPin, Phone } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api.js'

const initialForm = {
  name: '',
  email: '',
  phone: '',
  message: '',
}

export default function ContactPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitted(false)
    setIsSubmitting(true)

    try {
      await api.post('/contact', form)
      setSubmitted(true)
      setForm(initialForm)
    } catch (submitError) {
      setError(submitError.response?.data?.message || 'Unable to send your message right now. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
          >
            <ArrowLeft size={16} />
            Back to login
          </button>
          <div className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">Contact Us</div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="grid gap-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_22px_50px_rgba(15,23,42,0.06)] lg:grid-cols-[0.9fr_1.1fr] lg:p-10">
          <aside className="rounded-3xl bg-gradient-to-br from-[#06152f] via-[#0b2859] to-[#0f6ce5] p-7 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-200">Support</p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.06em]">Let’s talk</h1>
            <p className="mt-3 text-sm leading-7 text-blue-100/85">
              Need help with subscriptions, access, or platform support? Send us a message and we’ll respond as soon as possible.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <Mail className="mt-0.5 h-5 w-5 text-blue-200" />
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-blue-200">Email</div>
                  <div className="mt-1 text-sm">info@bizdatapro.com</div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <Phone className="mt-0.5 h-5 w-5 text-blue-200" />
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-blue-200">Phone</div>
                  <div className="mt-1 text-sm">+91 98765 43210</div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <MapPin className="mt-0.5 h-5 w-5 text-blue-200" />
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-blue-200">Office</div>
                  <div className="mt-1 text-sm">GB-47, Rajdanga Main Road, Sector G, East Kolkata Twp, Kolkata, West Bengal 700107</div>
                </div>
              </div>
            </div>
          </aside>

          <div>
            <h2 className="text-2xl font-black tracking-[-0.05em] text-slate-900">Send us a message</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Tell us about your query and we’ll get back to you shortly.</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Name
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="mt-1.5 w-full rounded-xl border border-blue-100 bg-blue-50/40 px-3.5 py-2.5 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    placeholder="Your name"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Email
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="mt-1.5 w-full rounded-xl border border-blue-100 bg-blue-50/40 px-3.5 py-2.5 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    placeholder="you@example.com"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                Phone
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="mt-1.5 w-full rounded-xl border border-blue-100 bg-blue-50/40 px-3.5 py-2.5 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  placeholder="Optional"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Message
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="mt-1.5 w-full rounded-xl border border-blue-100 bg-blue-50/40 px-3.5 py-2.5 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  placeholder="How can we help?"
                />
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-gradient-to-r from-[#0f6ce5] to-[#0c2d64] px-4 py-3 text-base font-bold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Sending...' : 'Send message'}
              </button>

              {submitted && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Your message has been sent successfully. We will get back to you soon.
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
