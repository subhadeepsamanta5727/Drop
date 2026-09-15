import { useEffect, useState } from 'react'
import { Activity, ArrowUpRight, ChevronRight, CreditCard, Database, Upload, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Sidebar } from '../components/ui/Sidebar.jsx'
import { Header } from '../components/ui/Header.jsx'
import api from '../services/api.js'

const formatDate = (value) => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const isToday = (value) => {
  const date = new Date(value)
  const today = new Date()
  return date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate()
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ userCount: 0, subscriptionCount: 0, oneTimeCount: 0, contentCount: 0 })
  const [recentContent, setRecentContent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const [overviewResponse, contentResponse] = await Promise.all([
          api.get('/admin/overview'),
          api.get('/admin/daily-content'),
        ])

        setStats((current) => overviewResponse.data?.data || current)
        setRecentContent((contentResponse.data?.data || []).slice(0, 5))
      } catch (error) {
        toast.error(error.response?.data?.message || 'Unable to load overview')
      } finally {
        setLoading(false)
      }
    }

    fetchOverview()
  }, [])

  const kpis = [
    { label: 'Total users', value: stats.userCount, delta: '+12.8%', detail: 'vs last month', icon: Users, tone: 'bg-blue-50 text-blue-600' },
    { label: 'Active subscribers', value: stats.subscriptionCount, delta: '+7.4%', detail: 'new this month', icon: Activity, tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'One-time purchases', value: stats.oneTimeCount, delta: '+3.1%', detail: 'lifetime access', icon: CreditCard, tone: 'bg-amber-50 text-amber-600' },
    { label: 'Daily data drops', value: stats.contentCount, delta: '+18.2%', detail: 'published content', icon: Upload, tone: 'bg-violet-50 text-violet-600' },
  ]

  const todayUploads = recentContent.filter((content) => isToday(content.publishedAt))

  return (
    <div className="min-h-screen bg-[#f4f7fb] p-3 text-slate-900 sm:p-4 lg:p-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5 xl:flex-row">
        <Sidebar mode="ADMIN" />

        <main className="min-w-0 flex-1 overflow-hidden">
          <Header
            title="Welcome back"
            badge="Admin workspace"
            subtitle="Manage content delivery, member access, and payment activity at a glance."
            userText="AlphaDrop Admin"
            userMeta="System owner"
            initials="AD"
          />

          <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            {kpis.map(({ label, value, delta, detail, icon: Icon, tone }) => (
              <div key={label} className="rounded-2xl border border-[#dfeeff] bg-white p-5 shadow-[0_12px_28px_rgba(15,61,156,0.06)]">
                <div className="mb-5 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">{label}</span>
                  <div className={`rounded-xl p-2.5 ${tone}`}>
                    <Icon size={18} />
                  </div>
                </div>

                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-3xl font-bold tracking-tight text-slate-950">{loading ? '—' : value}</div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                      <ArrowUpRight size={14} />
                      {delta}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">{detail}</span>
                </div>
              </div>
            ))}
          </section>

          <section className="mt-5">
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Audience distribution</h2>
                  <button type="button" className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-slate-700">
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-5">
                  <div
                    className="relative h-28 w-28 shrink-0 rounded-full"
                    style={{ background: 'conic-gradient(#1278f3 0 42%, #7c3aed 42% 70%, #f59e0b 70% 87%, #22c55e 87% 100%)' }}
                  >
                    <div className="absolute inset-4 flex items-center justify-center rounded-full bg-white text-center text-xs font-bold text-slate-700">
                      {stats.contentCount}
                      <br />
                      <span className="text-[10px] font-medium text-slate-400">drops</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600">
                    <p><span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-[#1278f3]" />Subscribers</p>
                    <p><span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-violet-600" />One-time</p>
                    <p><span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-amber-500" />All access</p>
                    <p><span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-green-500" />New members</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <div className="mb-4 flex items-center gap-2">
                  <Database size={17} className="text-blue-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Latest uploads</h2>
                </div>

                <div className="space-y-3">
                  {todayUploads.length === 0 ? (
                    <p className="text-sm text-slate-400">No data uploaded yet.</p>
                  ) : (
                    todayUploads.map((content) => (
                      <div key={content._id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">{content.title}</p>
                          <p className="text-xs text-slate-400">{content.targetTier || 'Members'} · {formatDate(content.publishedAt)}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">
                          {content.files?.length || 0} files
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>

        </main>
      </div>
    </div>
  )
}
