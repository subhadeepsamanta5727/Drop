import { Lock, ShieldCheck, Sparkles, Unlock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'

export function Header({
  title,
  badge,
  subtitle,
  showAccessStatus = false,
  accessLabel = 'Inactive',
  lifetimeLabel,
  lifetimeActive = false,
}) {
  const { user } = useAuth()
  const userSection = user?.role === 'USER'
  const subscriptionExpiresAt = user?.subscription?.expiresAt ? new Date(user.subscription.expiresAt) : null
  const subscriptionIsActive = Boolean(
    user?.hasActiveSubscription ||
    (user?.subscription?.status === 'active' && subscriptionExpiresAt && subscriptionExpiresAt > new Date())
  )
  const subscriptionDaysLeft = subscriptionExpiresAt
    ? Math.max(0, Math.ceil((subscriptionExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null
  const resolvedAccessLabel = userSection
    ? subscriptionIsActive
      ? subscriptionDaysLeft === null ? 'Active' : `Active (${subscriptionDaysLeft} days left)`
      : 'Inactive'
    : accessLabel
  const resolvedLifetimeLabel = userSection
    ? `${user?.purchasedCategories?.length || 0} Categories`
    : lifetimeLabel
  const shouldShowAccessStatus = showAccessStatus || userSection

  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-[#dfeeff] bg-white/90 px-4 py-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="min-w-0">
        <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#0f6ce5]">
          <Sparkles size={12} />
          {badge}
        </p>
        <h1 className="break-words text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl break-words text-sm text-slate-600">{subtitle}</p>}
      </div>

      {shouldShowAccessStatus && resolvedLifetimeLabel && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <div className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${resolvedAccessLabel !== 'Inactive' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
            <ShieldCheck size={14} />
            <span className="break-words">Subscription: {resolvedAccessLabel}</span>
          </div>
          <div className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${userSection ? resolvedLifetimeLabel !== '0 Categories' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-500' : lifetimeActive ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
            {resolvedLifetimeLabel !== '0 Categories' ? <Unlock size={14} /> : <Lock size={14} />}
            <span className="break-words">Lifetime: {resolvedLifetimeLabel}</span>
          </div>
        </div>
      )}
    </header>
  )
}
