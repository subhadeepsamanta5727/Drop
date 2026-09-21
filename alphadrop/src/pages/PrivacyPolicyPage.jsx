import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const sections = [
  {
    title: '1. Information We Collect',
    text: 'We collect information you provide during account registration, purchases, subscriptions, and support interactions. This may include your name, email address, billing details, and any content you access or upload.',
  },
  {
    title: '2. How We Use Your Information',
    text: 'Your information is used to create and manage your account, deliver services, process payments, provide support, improve the platform, and communicate important updates regarding your subscription or account.',
  },
  {
    title: '3. Data Security',
    text: 'We use reasonable technical and organizational safeguards to protect your personal information. However, no online system can be guaranteed completely secure, so we encourage you to keep your credentials confidential.',
  },
  {
    title: '4. Third-Party Services',
    text: 'We may use trusted third-party services for hosting, payment processing, analytics, and support tools. Those providers process information only as needed to fulfill the services we request from them.',
  },
  {
    title: '5. Your Rights',
    text: 'You may request access to, correction of, or deletion of your personal data where applicable by law. You may also manage notification preferences and account settings from your dashboard.',
  },
]

export default function PrivacyPolicyPage() {
  const navigate = useNavigate()

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
          <div className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">Privacy Policy</div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_22px_50px_rgba(15,23,42,0.06)] sm:p-10">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-700">Privacy</p>
              <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] text-slate-900">Privacy Policy</h1>
            </div>
          </div>

          <p className="mb-8 text-base leading-7 text-slate-600">
            Your privacy matters to us. This Privacy Policy explains what information we collect, how we use it, and what protections are in place when you use BizDataPro.
          </p>

          <div className="space-y-6">
            {sections.map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="mb-2 text-lg font-bold text-slate-900">{item.title}</h2>
                <p className="text-sm leading-7 text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <div className="mb-2 flex items-center gap-2 text-blue-800">
              <ShieldCheck className="h-5 w-5" />
              <span className="font-semibold">Your consent</span>
            </div>
            <p className="text-sm leading-7 text-slate-700">
              By continuing to use our platform, you agree to the collection and processing of your personal data in accordance with this policy and applicable privacy laws.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
