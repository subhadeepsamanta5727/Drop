import { Lock, ShieldCheck, Sparkles, Unlock } from 'lucide-react'

export function Header({
  title,
  badge,
  subtitle,
  showAccessStatus = false,
  accessLabel = 'Inactive',
  lifetimeLabel,
  lifetimeActive = false,
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-[#dfeeff] bg-white/90 px-4 py-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="min-w-0">
        <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#0f6ce5]">
          <Sparkles size={12} />
          {badge}
        </p>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </div>

      {showAccessStatus && lifetimeLabel && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <div className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${showAccessStatus && accessLabel !== 'Inactive' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
            <ShieldCheck size={14} />
            <span>Subscription: {accessLabel}</span>
          </div>
          <div className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${lifetimeActive ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
            {lifetimeActive ? <Unlock size={14} /> : <Lock size={14} />}
            <span>Lifetime: {lifetimeLabel}</span>
          </div>
        </div>
      )}
    </header>
  )
}
