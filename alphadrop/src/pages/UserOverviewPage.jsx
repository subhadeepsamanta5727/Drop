import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Download, ExternalLink, FileText, Layers3, Lock, ReceiptText, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '../components/ui/Header.jsx'
import { Sidebar } from '../components/ui/Sidebar.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../services/api.js'

const formatDate = (value) => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

const getDaysLeft = (expiresAt) => expiresAt
  ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000))
  : null

const getDownloadErrorMessage = async (error) => {
  if (error.response?.data instanceof Blob) {
    try {
      const payload = JSON.parse(await error.response.data.text())
      return payload.message || payload.error
    } catch {
      return null
    }
  }
  return error.response?.data?.message || error.response?.data?.error || null
}

export default function UserOverviewPage() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState({ recentData: [], releaseCount: 0, paymentCount: 0 })
  const [loadingData, setLoadingData] = useState(true)
  const [downloadingFile, setDownloadingFile] = useState('')

  useEffect(() => {
    let isCurrent = true

    const loadDashboard = async () => {
      setLoadingData(true)
      try {
        const [releases, payments] = await Promise.all([
          api.get('/dashboard/content', { params: { contentType: 'SUBSCRIPTION_DAILY', dateFilter: 'LAST_7_DAYS', page: 1, limit: 5 } }),
          api.get('/payment/my-payments'),
        ])
        if (!isCurrent) return

        const releaseData = releases.data?.data || {}
        setDashboard({
          recentData: releaseData.items || [],
          releaseCount: releaseData.pagination?.total || 0,
          paymentCount: payments.data?.data?.length || 0,
        })
      } catch (error) {
        if (isCurrent) toast.error(error.response?.data?.message || 'Unable to load dashboard summary')
      } finally {
        if (isCurrent) setLoadingData(false)
      }
    }

    loadDashboard()
    return () => { isCurrent = false }
  }, [])

  // The profile endpoint is the server-side source of truth for current entitlement.
  const subscriptionActive = Boolean(user?.hasActiveSubscription)
  const daysLeft = getDaysLeft(user?.subscription?.expiresAt)
  const summaryCards = [
    {
      title: 'Subscription', value: subscriptionActive ? 'Active' : 'Not active',
      detail: subscriptionActive ? (daysLeft === null ? 'Your subscriber access is ready.' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining`) : 'Unlock fresh subscriber data.',
      to: '/dashboard/packages', icon: subscriptionActive ? CheckCircle2 : Lock,
      iconClass: subscriptionActive ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-700',
      valueClass: subscriptionActive ? 'text-emerald-700' : 'text-slate-900', action: subscriptionActive ? 'Manage plan' : 'View plans',
    },
    {
      title: 'New releases', value: loadingData ? '—' : `${dashboard.releaseCount}`,
      detail: 'Published in the last 7 days.', to: '/dashboard/subscriber-data', icon: Layers3,
      iconClass: 'bg-violet-50 text-violet-600', valueClass: 'text-slate-900', action: 'Browse data',
    },
    {
      title: 'Payment history', value: loadingData ? '—' : `${dashboard.paymentCount}`,
      detail: dashboard.paymentCount === 1 ? 'Recorded purchase' : 'Recorded purchases', to: '/dashboard/payments', icon: ReceiptText,
      iconClass: 'bg-sky-50 text-sky-600', valueClass: 'text-slate-900', action: 'View payments',
    },
  ]

  const downloadFile = async (drop, file) => {
    const fileId = file._id || file.fileKey
    setDownloadingFile(fileId)
    try {
      const response = await api.get(`/dashboard/download/${drop._id}/${file._id}`, { responseType: 'blob' })
      const objectUrl = URL.createObjectURL(new Blob([response.data], { type: file.fileMimeType }))
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = file.originalFileName || file.label || 'attachment'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
      toast.success(`Downloaded: ${file.originalFileName || 'File'}`)
    } catch (error) {
      toast.error((await getDownloadErrorMessage(error)) || 'Unable to download file')
    } finally {
      setDownloadingFile('')
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#dbeafe_0,_transparent_28rem),linear-gradient(180deg,#f8fbff_0%,#edf6ff_100%)] p-4 text-slate-900 lg:p-6">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6 xl:flex-row">
        <Sidebar mode="USER" />
        <main className="min-w-0 flex-1">
          <Header title="Your dashboard" badge="AlphaDrop" subtitle="Your access, latest releases, and purchase activity in one place." />

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Account summary">
            {summaryCards.map(({ title, value, detail, to, icon: Icon, iconClass, valueClass, action }) => (
              <Link key={title} to={to} className="group relative overflow-hidden rounded-xl border border-blue-100 bg-white p-4 shadow-[0_8px_20px_rgba(15,61,156,0.07)] transition duration-200 hover:-translate-y-0.5 hover:border-[#0f6ce5] hover:shadow-[0_12px_26px_rgba(15,61,156,0.12)]">
                <div className="absolute right-0 top-0 h-16 w-16 -translate-y-7 translate-x-7 rounded-full bg-[#e8f2ff] transition group-hover:scale-125" />
                <div className="relative flex items-start justify-between gap-3">
                  <span className={`rounded-lg p-2 ${iconClass}`}><Icon size={17} /></span>
                  <ArrowRight size={16} className="mt-1 text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#0f6ce5]" />
                </div>
                <p className="relative mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{title}</p>
                <p className={`relative mt-1 text-xl font-bold tracking-tight ${valueClass}`}>{value}</p>
                <p className="relative mt-1 min-h-5 text-xs text-slate-500">{detail}</p>
                <p className="relative mt-3 text-xs font-bold text-[#0f6ce5]">{action}</p>
              </Link>
            ))}
          </section>

          <section className="mt-6 overflow-hidden rounded-3xl border border-white/80 bg-white shadow-[0_14px_35px_rgba(15,61,156,0.08)]">
            <div className="flex flex-col gap-4 border-b border-blue-100 bg-gradient-to-r from-blue-50/80 to-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-blue-700"><Sparkles size={16} /><span className="text-xs font-bold uppercase tracking-[0.16em]">Live content</span></div>
                <h2 className="mt-1 text-xl font-bold text-slate-900">Latest subscriber releases</h2>
                <p className="mt-1 text-xs text-slate-500">Content available from your subscription access period.</p>
              </div>
              <Link to="/dashboard/subscriber-data" className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-3.5 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-50"><CalendarDays size={14} /> View all releases</Link>
            </div>

            <div className="p-5">
              {!subscriptionActive ? (
                <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 p-8 text-center">
                  <Lock size={28} className="mx-auto text-amber-600" />
                  <p className="mt-3 text-sm font-semibold text-slate-700">Subscribe to view your daily data</p>
                  <p className="mt-1 text-xs text-slate-500">New releases are shown only when they fall within your entitled access window.</p>
                  <Link to="/dashboard/packages" className="primary-button mt-4 inline-flex px-4 py-2 text-xs">Explore plans</Link>
                </div>
              ) : loadingData ? (
                <div className="grid gap-3">{[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}</div>
              ) : dashboard.recentData.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-blue-200 bg-slate-50 p-8 text-center text-sm text-slate-500">No subscriber data was released in the latest seven days.</div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-blue-100">
                  <div className="hidden grid-cols-[1.7fr_.8fr_1.2fr_auto] gap-3 bg-blue-50/70 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 lg:grid">
                    <span>Release details</span><span>Category</span><span>Attached file</span><span className="text-center">Action</span>
                  </div>
                  <div className="divide-y divide-blue-50">
                  {dashboard.recentData.map((item) => (
                    <article key={item._id} className="grid gap-3 p-4 transition hover:bg-blue-50/40 lg:grid-cols-[1.7fr_.8fr_1.2fr_auto] lg:items-center lg:gap-3">
                      <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{item.title}</p><p className="mt-1 truncate text-xs text-slate-500">{item.notes || 'Subscriber daily data'} · Published {formatDate(item.publishedAt)}</p></div>
                      <div><p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 lg:hidden">Category</p><span className="inline-flex rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700">{item.category || 'GENERAL'}</span>{item.link && <a href={item.link} target="_blank" rel="noreferrer" title="Open reference link" className="ml-2 inline-flex align-middle text-blue-700 hover:text-blue-900"><ExternalLink size={13} /></a>}</div>
                      <div className="min-w-0"><p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 lg:hidden">Attached file</p><div className="flex flex-col gap-1">{(item.files || []).map((file) => <span key={file._id} className="flex min-w-0 items-center gap-1.5 text-xs text-slate-600" title={file.originalFileName || file.label}><FileText size={14} className="shrink-0 text-blue-500" /><span className="truncate">{file.originalFileName || file.label || 'Attachment'}</span></span>)}</div></div>
                      <div><p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 lg:hidden">Action</p><div className="flex flex-wrap gap-1.5 lg:justify-center">{(item.files || []).map((file) => <button key={file._id} type="button" onClick={() => downloadFile(item, file)} disabled={!item.hasAccess || downloadingFile === file._id} title={`Download ${file.originalFileName || file.label || 'attachment'}`} aria-label={`Download ${file.originalFileName || file.label || 'attachment'}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#0f6ce5] text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"><Download size={15} /></button>)}</div></div>
                    </article>
                  ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <div className="mt-5 flex items-center gap-2 text-xs text-slate-500"><Clock3 size={14} /> Summary refreshes when this dashboard opens.</div>
        </main>
      </div>
    </div>
  )
}
