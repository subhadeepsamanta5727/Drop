import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '../components/ui/Header.jsx'
import { Sidebar } from '../components/ui/Sidebar.jsx'
import api from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'

const getDaysLeft = (expiresAt) => {
  if (!expiresAt) return null
  const difference = new Date(expiresAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(difference / (1000 * 60 * 60 * 24)))
}

const loadRazorpayScript = () => new Promise((resolve) => {
  if (window.Razorpay) {
    resolve(true)
    return
  }

  const script = document.createElement('script')
  script.src = 'https://checkout.razorpay.com/v1/checkout.js'
  script.onload = () => resolve(true)
  script.onerror = () => resolve(false)
  document.body.appendChild(script)
})

export default function UserPackagesPage() {
  const { user, refreshUser } = useAuth()
  const [plans, setPlans] = useState([])
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [buyingId, setBuyingId] = useState(null)
  const [billingMode, setBillingMode] = useState('ONE_TIME')
  const [accessStatus, setAccessStatus] = useState({
    subscriptionActive: false,
    subscriptionExpiresAt: null,
    lifetimeActive: false,
    purchasedCategories: [],
  })

  const fetchCatalogData = async () => {
    try {
      const [plansResponse, packagesResponse, subscriptionResponse, profileResponse] = await Promise.all([
        api.get('/payment/plans'),
        api.get('/packages'),
        api.get('/dashboard/subscription'),
        api.get('/auth/me'),
      ])

      const activeSubscription = subscriptionResponse.data?.data || {}
      const profile = profileResponse.data?.data || {}
      const activeWindow = (activeSubscription.subscriptionWindows || [])
        .filter((window) => window.expiresAt && new Date(window.expiresAt).getTime() > Date.now())
        .sort((first, second) => new Date(first.expiresAt) - new Date(second.expiresAt))[0]

      const purchasedCats = Array.from(new Set([
        ...(profile.purchasedCategories || []).map((item) => String(item.category).toUpperCase()),
        ...(profile.lifetimeCategories || []).map((c) => String(c).toUpperCase())
      ]))

      setAccessStatus({
        subscriptionActive: Boolean(profile.hasActiveSubscription || activeSubscription.hasActiveSubscription),
        subscriptionExpiresAt: profile.subscription?.expiresAt || activeSubscription.activeSubscription?.expiresAt || activeWindow?.expiresAt || null,
        lifetimeActive: Boolean(profile.hasOneTimeAccess || purchasedCats.length > 0),
        purchasedCategories: purchasedCats,
      })

      setPlans(plansResponse.data?.data || [])
      setPackages(packagesResponse.data?.data || [])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load catalog')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCatalogData()
  }, [])

  const subscriptionPlans = Array.isArray(plans)
    ? plans.filter((plan) => plan.planType === 'SUBSCRIPTION' && plan.isActive)
    : []

  const subscriptionDaysLeft = getDaysLeft(accessStatus.subscriptionExpiresAt)

  // Subscription Pricing Cards
  const subscriptionCards = subscriptionPlans.slice(0, 4).map((plan, index) => ({
    name: plan.planCycle ? plan.planCycle.replace('_', ' ') : ['Starter', 'Growth', 'Pro', 'Elite'][index] || 'Plan',
    price: Number(plan.priceInPaise || 0) / 100,
    priceLabel: plan.planCycle === 'MONTHLY' ? '/mo' : '/cycle',
    features: [
      'Universal access to ALL categories',
      'Instant download on all daily content drops',
      'Continuous uninterrupted access',
    ],
    featured: index === 1,
    buttonText: accessStatus.subscriptionActive ? 'Extend Subscription' : 'Subscribe Now',
    _id: plan._id,
    planType: 'SUBSCRIPTION',
    planCycle: plan.planCycle,
  }))

  // One-Time Category Package Cards
  const categoryCards = packages.map((pkg, index) => {
    const isOwned = accessStatus.purchasedCategories.includes(pkg.category?.toUpperCase())
    const priceVal = pkg.price || (pkg.priceInPaise ? Number(pkg.priceInPaise) / 100 : 499)

    return {
      name: pkg.title || `${pkg.category} Pass`,
      category: pkg.category,
      price: priceVal,
      priceLabel: '/lifetime',
      description: pkg.description || `Lifetime permanent access to the ${pkg.category} library.`,
      features: [
        `Lifetime access to all ${pkg.category} files`,
        'Never expires — pay once, keep forever',
        'Includes all past and future daily drops',
      ],
      featured: index === 0,
      isOwned: isOwned || accessStatus.subscriptionActive,
      isSpecificallyOwned: isOwned,
      buttonText: isOwned
        ? 'Owned (Lifetime Access)'
        : accessStatus.subscriptionActive
        ? 'Unlocked via Subscription'
        : 'Buy Category Access',
      _id: pkg._id,
      planType: 'ONE_TIME_PACKAGE',
    }
  })

  const handlePurchase = async (card) => {
    if (card.isSpecificallyOwned) {
      toast.info(`You already own the ${card.category} category package!`)
      return
    }

    setBuyingId(card._id)
    try {
      let endpoint = '/payment/create-order'
      let payload = {}

      if (card.planType === 'ONE_TIME_PACKAGE') {
        endpoint = '/payment/create-category-order'
        payload = { packageId: card._id, category: card.category }
      } else {
        endpoint = '/payment/create-order'
        payload = { planType: 'SUBSCRIPTION', planCycle: card.planCycle }
      }

      const response = await api.post(endpoint, payload)
      const orderData = response.data?.data

      if (!orderData?.order?.id) {
        throw new Error('Payment order was not created')
      }

      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error('Razorpay checkout failed to load')
      }

      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_1DP5mmOlF5G5ag'

      const razorpay = new window.Razorpay({
        key: razorpayKey,
        amount: Number(orderData.amountInPaise || 0),
        currency: orderData.currency || 'INR',
        name: 'AlphaDrop',
        description: card.planType === 'ONE_TIME_PACKAGE'
          ? `Unlock ${card.category} Lifetime Package`
          : 'AlphaDrop Subscription',
        order_id: orderData.order.id,
        handler: async (paymentResponse) => {
          try {
            await api.post('/payment/verify', {
              razorpayOrderId: paymentResponse.razorpay_order_id,
              razorpayPaymentId: paymentResponse.razorpay_payment_id,
              razorpaySignature: paymentResponse.razorpay_signature,
              type: card.planType,
              category: card.category,
              planCycle: card.planCycle,
              amountInPaise: orderData.amountInPaise,
            })

            toast.success(
              card.planType === 'ONE_TIME_PACKAGE'
                ? `You now have permanent access to ${card.category}!`
                : 'Subscription activated successfully!'
            )

            if (refreshUser) await refreshUser()
            await fetchCatalogData()
          } catch (verifyErr) {
            toast.error(verifyErr.response?.data?.message || 'Payment verification failed')
          }
        },
        prefill: {
          name: user?.name || 'AlphaDrop User',
          email: user?.email || 'user@alphadrop.com',
        },
        theme: {
          color: '#0f6ce5',
        },
        modal: {
          ondismiss: () => {
            toast.info('Payment cancelled.')
          },
        },
      })

      razorpay.open()
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Unable to create order')
    } finally {
      setBuyingId(null)
    }
  }

  const activeCards = billingMode === 'ONE_TIME' ? categoryCards : subscriptionCards

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#edf6ff_100%)] p-4 text-slate-900 lg:p-6">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6 xl:flex-row">
        <Sidebar mode="USER" />

        <main className="min-w-0 flex-1">
          <Header
            title="Monetization & Plans"
            badge="Hybrid Catalog"
            subtitle="Choose between one-time category packages or full all-access subscriptions."
          />

          <div className="mx-auto max-w-[1100px] px-2 py-4">
            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              <article className="rounded-xl border border-blue-100/80 bg-blue-50/70 px-4 py-3 shadow-sm backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Subscription</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {accessStatus.subscriptionActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${accessStatus.subscriptionActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {accessStatus.subscriptionActive
                      ? subscriptionDaysLeft === null ? 'End date unavailable' : `${subscriptionDaysLeft} days remaining`
                      : 'Purchase required'}
                  </span>
                </div>
              </article>

              <article className="rounded-xl border border-blue-100/80 bg-blue-50/70 px-4 py-3 shadow-sm backdrop-blur-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">One-Time Access</p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {accessStatus.purchasedCategories.length} active categor{accessStatus.purchasedCategories.length === 1 ? 'y' : 'ies'}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {accessStatus.purchasedCategories.length ? accessStatus.purchasedCategories.map((category) => (
                    <span key={category} className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold uppercase text-blue-700">
                      {category}
                    </span>
                  )) : (
                    <span className="text-xs text-slate-500">None yet</span>
                  )}
                </div>
              </article>
            </div>

            <div className="mb-6 flex flex-col gap-4 border-b border-blue-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-950">
                  {billingMode === 'ONE_TIME' ? 'One-Time Category Packages' : 'Subscription Plans'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {billingMode === 'ONE_TIME'
                    ? `${accessStatus.purchasedCategories.length} categories unlocked · Lifetime access`
                    : accessStatus.subscriptionActive
                    ? `${subscriptionDaysLeft === null ? 'Active subscription' : `${subscriptionDaysLeft} days remaining`} · Full catalog access`
                    : 'Full catalog access during your billing period'}
                </p>
              </div>

              <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setBillingMode('ONE_TIME')}
                  className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                    billingMode === 'ONE_TIME'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  One-Time Packages
                </button>
                <button
                  type="button"
                  onClick={() => setBillingMode('MONTHLY')}
                  className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                    billingMode === 'MONTHLY'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Subscriptions
                </button>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Loading catalog...</div>
            ) : activeCards.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-blue-200 bg-white/70 p-12 text-center text-sm text-slate-600">
                No {billingMode === 'ONE_TIME' ? 'one-time category packages' : 'subscription plans'} available right now.
              </div>
            ) : (
              <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:thin]">
                {activeCards.map((card) => {
                  const isAlreadyOwned = card.isSpecificallyOwned
                  return (
                    <div
                      key={card._id || card.name}
                      className={"relative flex min-w-[280px] snap-start flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:min-w-[320px] " + (
                        isAlreadyOwned
                          ? 'border-emerald-300'
                          : card.featured
                          ? 'border-blue-300'
                          : 'border-slate-200 hover:border-blue-300'
                      )}
                    >
                      {isAlreadyOwned ? (
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full border border-emerald-300 bg-emerald-100 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                          Active Entitlement
                        </div>
                      ) : card.featured ? (
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full border border-blue-200 bg-blue-100 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-800">
                          Recommended
                        </div>
                      ) : null}

                      <div>
                        {card.category && (
                          <span className="inline-block rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                            {card.category}
                          </span>
                        )}

                        <h4 className="mt-2 text-xl font-bold text-slate-900">{card.name}</h4>
                        {card.description && (
                          <p className="mt-1 text-xs text-slate-500 line-clamp-2">{card.description}</p>
                        )}

                        <div className="my-5 flex items-baseline gap-1">
                          <span className="text-3xl font-bold text-slate-900">₹{card.price}</span>
                          <span className="text-xs font-semibold text-slate-400">{card.priceLabel}</span>
                        </div>

                        <ul className="space-y-2.5 text-xs text-slate-600">
                          {card.features.map((feature, fIdx) => (
                            <li key={fIdx} className="flex items-start gap-2">
                              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[#0f6ce5]">
                                <Check size={11} />
                              </span>
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-6 pt-4 border-t border-blue-50">
                        <button
                          type="button"
                          onClick={() => handlePurchase(card)}
                          disabled={isAlreadyOwned || buyingId === card._id}
                          className={`w-full rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition ${
                            isAlreadyOwned
                              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 cursor-default'
                              : 'primary-button'
                          }`}
                        >
                          {buyingId === card._id ? 'Processing...' : card.buttonText}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
