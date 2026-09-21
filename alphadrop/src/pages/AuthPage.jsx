import { useMemo, useState } from 'react'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext.jsx'
import logo from '../assets/BDPlogo.png'
import api, { setStoredToken } from '../services/api.js'
import heroImage from '../assets/hero.png'

export default function AuthPage({ mode: initialMode = 'login' }) {
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const [mode, setMode] = useState(initialMode)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)

  const title = useMemo(() => (mode === 'login' ? 'Welcome back' : 'Create account'), [mode])
  const subtitle = useMemo(
    () =>
      mode === 'login'
        ? 'Sign in to continue your publishing journey.'
        : 'Create your account to start publishing smarter.',
    [mode],
  )

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (mode === 'register' && form.password !== form.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setSubmitLoading(true)

    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register'
      const payload = mode === 'login'
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password }

      const response = await api.post(endpoint, payload)
      const { token, user } = response.data?.data || {}

      if (!token || !user) {
        throw new Error('Invalid authentication response')
      }

      setStoredToken(token)
      setUser({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        hasActiveSubscription: user.hasActiveSubscription,
        hasOneTimeAccess: user.hasOneTimeAccess,
      })

      toast.success(mode === 'login' ? 'Login successful' : 'Registration successful')
      navigate(user.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Authentication failed')
    } finally {
      setSubmitLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#edf6ff_0%,#dbeafe_48%,#f8fbff_100%)] px-4 py-10">
      <div className="w-full max-w-[1100px] overflow-hidden rounded-[28px] border border-blue-200 bg-white shadow-[0_30px_80px_rgba(15,61,156,0.16)]">
        <div className="grid min-h-0 lg:min-h-[760px] lg:grid-cols-[1.08fr_0.92fr]">
          <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[#06152f] via-[#0b2859] to-[#0f6ce5] p-8 lg:flex lg:flex-col lg:justify-between">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,transparent_58%,rgba(125,211,252,0.12)_58%,rgba(125,211,252,0.12)_59%,transparent_59%,transparent_100%)]" />

            <div className="relative z-10 rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-blue-950/20">
              <div className="mb-12 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-200/20 bg-blue-400/20 text-lg font-black text-blue-100 shadow-inner shadow-blue-200/10">
                  A
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.26em] text-blue-200">BizDataPro</div>
                  <div className="text-lg font-semibold tracking-tight text-white">Premium Access</div>
                </div>
              </div>

              <div className="space-y-7">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/20 bg-blue-300/10 px-3 py-1.5 text-xs font-medium text-blue-100">
                  <ShieldCheck size={14} className="text-blue-200" />
                  Smart entitlement dashboard
                </div>

                <h1 className="max-w-md text-4xl font-black leading-[1.05] tracking-[-0.07em] text-white">
                  One access. <span className="text-blue-200">All value.</span>
                </h1>
                <p className="max-w-md text-sm leading-7 text-blue-100/75">
                  Manage subscriptions, lifetime category passes, and daily content delivery from a single platform built for modern content access.
                </p>

                <div className="flex justify-center py-2">
                  <img
                    src={heroImage}
                    alt="BizDataPro content platform"
                    className="h-36 w-44 object-contain drop-shadow-[0_18px_24px_rgba(96,165,250,0.35)]"
                  />
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-8 space-y-3">
              {['Fast approvals', 'Queue-aware subscriptions', 'One-time lifetime vaults'].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#06152f]/35 px-3 py-3 text-sm text-blue-50 shadow-lg shadow-blue-950/10">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-400/20 text-blue-200">
                    ✓
                  </div>
                  {item}
                </div>
              ))}
            </div>
          </aside>

          <section className="flex items-center justify-center bg-white p-6 sm:p-8 lg:p-10">
            <div className="w-full max-w-[440px]">
              <div className="mb-8 flex items-center justify-between">
                <img src={logo} alt="BizDataPro" className="h-12 w-auto max-w-[250px] object-contain object-left" />
                <button className="text-sm font-medium text-zinc-500">Home</button>
              </div>

              <div className="mb-8">
                <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-blue-700">Account access</p>
                <h2 className="mt-3 text-4xl font-black tracking-[-0.06em] text-zinc-900">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{subtitle}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {mode === 'register' && (
                  <label className="block text-sm font-medium text-zinc-700">
                    Full name
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      className="mt-1.5 w-full rounded-xl border border-blue-100 bg-blue-50/40 px-3.5 py-2.5 text-base text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      placeholder="John Doe"
                    />
                  </label>
                )}

                <label className="block text-sm font-medium text-zinc-700">
                  Email
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="mt-1.5 w-full rounded-xl border border-blue-100 bg-blue-50/40 px-3.5 py-2.5 text-base text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    placeholder="alex@example.com"
                  />
                </label>

                <label className="block text-sm font-medium text-zinc-700">
                  Password
                  <div className="relative mt-1.5">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-blue-100 bg-blue-50/40 px-3.5 py-2.5 pr-11 text-base text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>

                {mode === 'register' && (
                  <label className="block text-sm font-medium text-zinc-700">
                    Confirm password
                    <div className="relative mt-1.5">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-blue-100 bg-blue-50/40 px-3.5 py-2.5 pr-11 text-base text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        placeholder="Confirm password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((value) => !value)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </label>
                )}

                <button type="submit" disabled={submitLoading} className="w-full rounded-xl bg-gradient-to-r from-[#0f6ce5] to-[#0c2d64] px-4 py-3 text-base font-bold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-105 disabled:opacity-70">
                  {submitLoading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
                </button>

                {mode === 'login' && (
                  <p className="pt-1 text-center text-sm text-zinc-600">
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      className="font-semibold text-blue-700 underline-offset-4 hover:underline"
                      onClick={() => navigate('/register')}
                    >
                      Register
                    </button>
                  </p>
                )}
              </form>

              <div className="mt-6 border-t border-zinc-200 pt-4">
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-zinc-500">
                  <button type="button" onClick={() => navigate('/payment-policy')} className="transition hover:text-blue-700">Payment Policy</button>
                  <button type="button" onClick={() => navigate('/privacy-policy')} className="transition hover:text-blue-700">Privacy Policy</button>
                  <button type="button" onClick={() => navigate('/contact')} className="transition hover:text-blue-700">Contact Us</button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
