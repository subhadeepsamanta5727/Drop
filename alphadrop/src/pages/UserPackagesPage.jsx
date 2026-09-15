import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/ui/Header.jsx'
import { Sidebar } from '../components/ui/Sidebar.jsx'
import api from '../services/api.js'

const formatPrice = (value) => `₹${Number(value || 0) / 100}`

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
  const navigate = useNavigate()
  const [plans, setPlans] = useState([])
  const [ownedPlans, setOwnedPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [buyingId, setBuyingId] = useState(null)
  const [billingMode, setBillingMode] = useState('MONTHLY')
  const [accessStatus, setAccessStatus] = useState({
    subscriptionActive: false,
    subscriptionExpiresAt: null,
    lifetimeActive: false,
  })

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const [plansResponse, userPaymentsResponse, subscriptionResponse, oneTimeResponse] = await Promise.all([
          api.get('/payment/plans'),
          api.get('/payment/my-payments'),
          api.get('/dashboard/subscription'),
          api.get('/dashboard/onetime'),
        ])

        const payments = userPaymentsResponse.data?.data || []
        const activeSubscription = subscriptionResponse.data?.data || {}
        const activeWindow = (activeSubscription.subscriptionWindows || [])
          .filter((window) => window.expiresAt && new Date(window.expiresAt).getTime() > Date.now())
          .sort((first, second) => new Date(first.expiresAt) - new Date(second.expiresAt))[0]

        setAccessStatus({
          subscriptionActive: Boolean(activeSubscription.hasActiveSubscription),
          subscriptionExpiresAt: activeSubscription.activeSubscription?.expiresAt || activeWindow?.expiresAt || null,
          lifetimeActive: Boolean(oneTimeResponse.data?.data?.hasOneTimeAccess),
        })

        const mappedPlans = payments.map((payment) => ({
          id: payment._id,
          title: payment.planCycle || payment.category || 'General',
          type: payment.paymentType === 'SUBSCRIPTION' ? 'Subscription' : 'One-time',
          status: payment.status,
          amount: `₹${Number(payment.amountInPaise || 0) / 100}`,
          date: new Date(payment.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
        }))

        if (activeSubscription.hasActiveSubscription && activeSubscription.activeSubscription) {
          mappedPlans.unshift({
            id: `active-${activeSubscription.activeSubscription._id}`,
            title: activeSubscription.activeSubscription.planCycle || 'Active plan',
            type: 'Active subscription',
            status: 'ACTIVE',
            amount: `₹${Number(activeSubscription.activeSubscription.amountInPaise || 0) / 100}`,
            date: new Date(activeSubscription.activeSubscription.startsAt).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }),
          })
        }

        setPlans(plansResponse.data?.data || [])
        setOwnedPlans(mappedPlans)
      } catch (error) {
        toast.error(error.response?.data?.message || 'Unable to load plans')
      } finally {
        setLoading(false)
      }
    }

    fetchPlans()
  }, [])

  const subscriptionPlans = Array.isArray(plans)
    ? plans.filter((plan) => plan.planType === 'SUBSCRIPTION' && plan.isActive)
    : []

  const oneTimePlans = Array.isArray(plans)
    ? plans.filter((plan) => plan.planType === 'ONE_TIME' && plan.isActive)
    : []

  const subscriptionDaysLeft = getDaysLeft(accessStatus.subscriptionExpiresAt)

  const pricingCards = billingMode === 'MONTHLY'
    ? subscriptionPlans.slice(0, 4).map((plan, index) => ({
        name: plan.planCycle ? plan.planCycle.replace('_', ' ') : ['Starter', 'Growth', 'Pro', 'Elite'][index] || 'Plan',
        price: Number(plan.priceInPaise || 0) / 100,
        priceLabel: plan.planCycle === 'MONTHLY' ? '/mo' : '/cycle',
        features: [
          'Priority access to premium updates',
          'Full member dashboard support',
          'Flexible content entitlement windows',
        ],
        featured: index === 2,
        button: 'Purchase',
        _id: plan._id,
      }))
    : oneTimePlans.slice(0, 4).map((plan, index) => ({
        name: plan.category ? plan.category : ['Crypto', 'Stocks', 'Forex', 'General'][index] || 'Plan',
        price: Number(plan.priceInPaise || 0) / 100,
        priceLabel: '/one-time',
        features: [
          'Lifetime access for selected category',
          'Full vault unlock with instant access',
          'Permanent premium content rights',
        ],
        featured: index === 2,
        button: 'Purchase',
        _id: plan._id,
      }))

  const handlePurchase = async (plan) => {
    const selectedPlan = plans.find((item) => item._id === plan._id)

    if (!selectedPlan) {
      toast.success('Plan selected')
      return
    }

    setBuyingId(selectedPlan._id)
    try {
      const payload = selectedPlan.planType === 'SUBSCRIPTION'
        ? { planType: 'SUBSCRIPTION', planCycle: selectedPlan.planCycle }
        : { planType: 'ONE_TIME', category: selectedPlan.category }

      const response = await api.post('/payment/create-order', payload)
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
        description: `${selectedPlan.planType === 'SUBSCRIPTION' ? 'Subscription' : 'One-time'} plan purchase`,
        order_id: orderData.order.id,
        handler: async (paymentResponse) => {
          toast.success('Payment successful. Redirecting to payment history.')
          navigate('/dashboard/payments', { replace: true })
          console.log('Razorpay success', paymentResponse)
        },
        prefill: {
          name: 'AlphaDrop User',
          email: 'user@alphadrop.com',
        },
        theme: {
          color: '#0f6ce5',
        },
        modal: {
          ondismiss: () => {
            toast.info('Payment cancelled. You can try again anytime.')
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

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#edf6ff_100%)] p-4 text-slate-900 lg:p-6">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6 xl:flex-row">
        <Sidebar mode="USER" />

        <main className="min-w-0 flex-1">
          <Header title="Choose Packages" badge="Pricing" subtitle="Select monthly access or lifetime category passes." />

          <div className="mx-auto max-w-[980px] px-2 py-6">
            <div className="mb-8 grid gap-4 md:grid-cols-2">
              <article className={`rounded-2xl border bg-white p-5 shadow-[0_12px_28px_rgba(15,61,156,0.06)] transition ${billingMode === 'MONTHLY' ? 'border-[#0f6ce5] ring-2 ring-blue-100' : 'border-blue-100 hover:border-blue-300'}`}>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0f6ce5]">Account access</p>
                    <h2 className="mt-1 text-2xl font-bold text-slate-900">Subscription</h2>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${accessStatus.subscriptionActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {accessStatus.subscriptionActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="mt-6 text-lg font-semibold text-[#0f6ce5]">
                  {accessStatus.subscriptionActive
                    ? `Days left: ${subscriptionDaysLeft === null ? 'N/A' : subscriptionDaysLeft}`
                    : 'Days left: 0'}
                </p>
                <button type="button" onClick={() => setBillingMode('MONTHLY')} disabled={accessStatus.subscriptionActive} className="primary-button mt-6 w-full py-2.5 text-xs uppercase tracking-[0.12em] disabled:cursor-default disabled:opacity-80">
                  {accessStatus.subscriptionActive ? 'Active' : 'View subscription plans'}
                </button>
              </article>

              <article className={`rounded-2xl border bg-white p-5 shadow-[0_12px_28px_rgba(15,61,156,0.06)] transition ${billingMode === 'ONE_TIME' ? 'border-[#0f6ce5] ring-2 ring-blue-100' : 'border-blue-100 hover:border-blue-300'}`}>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0f6ce5]">Account access</p>
                    <h2 className="mt-1 text-2xl font-bold text-slate-900">One-time</h2>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${accessStatus.lifetimeActive ? 'bg-blue-100 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                    {accessStatus.lifetimeActive ? 'Unlocked' : 'Locked'}
                  </span>
                </div>
                <p className="mt-6 text-lg font-semibold text-[#0f6ce5]">
                  {accessStatus.lifetimeActive ? 'Lifetime access enabled' : 'No lifetime access'}
                </p>
                <button type="button" onClick={() => setBillingMode('ONE_TIME')} disabled={accessStatus.lifetimeActive} className={`${accessStatus.lifetimeActive ? 'primary-button' : 'secondary-button'} mt-6 w-full py-2.5 text-xs uppercase tracking-[0.12em] disabled:cursor-default disabled:opacity-80`}>
                  {accessStatus.lifetimeActive ? 'Unlocked' : 'View one-time plans'}
                </button>
              </article>
            </div>

            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-2xl font-bold text-slate-900">Purchase a plan</h2>
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Choose your access</span>
            </div>

            <div className="mx-auto mb-10 flex w-full max-w-[320px] items-center rounded-xl border border-blue-100 bg-blue-50 p-1 shadow-inner shadow-blue-100/60">
              {[
                { value: 'MONTHLY', label: 'Subscription' },
                { value: 'ONE_TIME', label: 'One-time' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setBillingMode(option.value)}
                  className={`flex-1 rounded-lg px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] transition-all duration-200 ${
                    billingMode === option.value
                      ? 'bg-gradient-to-r from-[#0f6ce5] to-[#0c2d64] text-white shadow-sm hover:brightness-105'
                      : 'text-slate-500 hover:bg-white hover:text-blue-800'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
              {pricingCards.length === 0 ? (
                <div className="lg:col-span-4 rounded-3xl border border-dashed border-blue-200 bg-white/70 p-8 text-center text-sm text-slate-600">
                  No {billingMode === 'MONTHLY' ? 'subscription' : 'one-time'} plans are available right now. Add plans from the admin panel to enable pricing here.
                </div>
              ) : (
                pricingCards.map((card) => (
                <div
                  key={card.name}
                    className={`relative rounded-[26px] border bg-white p-5 shadow-[0_18px_40px_rgba(15,61,156,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_25px_50px_rgba(15,108,229,0.16)] ${
                    card.featured
                      ? 'border-[#0f6ce5]/70 ring-2 ring-blue-200/80 shadow-[0_25px_50px_rgba(15,108,229,0.18)]'
                      : 'border-blue-100 hover:border-blue-300'
                  }`}
                >
                  {card.featured && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-amber-700">
                      Recommended
                    </div>
                  )}

                  <div className="mb-6 text-center text-xl font-semibold text-slate-700">{card.name}</div>
                  <div className="mb-6 flex items-end justify-center gap-1 text-slate-900">
                    <span className="text-4xl font-black tracking-[-0.08em]">₹{card.price}</span>
                    <span className="pb-1 text-xs font-medium text-slate-500">{card.priceLabel}</span>
                  </div>

                  <ul className="space-y-3">
                    {card.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3 text-sm text-slate-700">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-[#0f6ce5]">
                          <Check size={12} />
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => handlePurchase({ _id: card._id || card.name })}
                    className={`mt-7 w-full rounded-xl border px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                      card.featured
                        ? 'border-[#0f6ce5] bg-gradient-to-r from-[#0f6ce5] to-[#0c2d64] text-white shadow-lg shadow-blue-500/20 hover:brightness-110'
                        : 'border-blue-200 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800'
                    }`}
                  >
                    {buyingId === (card._id || card.name) ? 'Processing...' : card.button}
                  </button>
                </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
