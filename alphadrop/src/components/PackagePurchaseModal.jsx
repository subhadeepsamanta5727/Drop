import { useState } from 'react'
import { Check, Lock, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import api from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'

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

export default function PackagePurchaseModal({ isOpen, onClose, pkg, onSuccess }) {
  const { user, refreshUser } = useAuth()
  const [purchasing, setPurchasing] = useState(false)

  if (!isOpen || !pkg) return null

  const formattedPrice = pkg.price ? `₹${pkg.price}` : '₹499'
  const categoryName = (pkg.category || 'GENERAL').toUpperCase()

  const handleBuy = async () => {
    setPurchasing(true)
    try {
      const response = await api.post('/payment/create-category-order', {
        category: categoryName,
        packageId: pkg._id
      })

      const orderData = response.data?.data
      if (!orderData?.order?.id) {
        throw new Error('Could not initiate order with payment gateway.')
      }

      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error('Razorpay checkout failed to load. Check your connection.')
      }

      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_1DP5mmOlF5G5ag'

      const razorpay = new window.Razorpay({
        key: razorpayKey,
        amount: Number(orderData.amountInPaise || 0),
        currency: orderData.currency || 'INR',
        name: 'AlphaDrop',
        description: `Unlock ${pkg.title || categoryName} Package`,
        order_id: orderData.order.id,
        handler: async (paymentResponse) => {
          try {
            await api.post('/payment/verify', {
              razorpayOrderId: paymentResponse.razorpay_order_id,
              razorpayPaymentId: paymentResponse.razorpay_payment_id,
              razorpaySignature: paymentResponse.razorpay_signature,
              type: 'ONE_TIME_PACKAGE',
              category: categoryName,
              amountInPaise: orderData.amountInPaise
            })

            toast.success(`Success! You have permanently unlocked the ${categoryName} package.`)
            if (refreshUser) await refreshUser()
            if (onSuccess) onSuccess(categoryName)
            onClose()
          } catch (verifyErr) {
            toast.error(verifyErr.response?.data?.message || 'Payment verification failed.')
          }
        },
        prefill: {
          name: user?.name || 'AlphaDrop Member',
          email: user?.email || 'member@alphadrop.com',
        },
        theme: {
          color: '#0f6ce5',
        },
        modal: {
          ondismiss: () => {
            toast.info('Checkout cancelled.')
          },
        },
      })

      razorpay.open()
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Payment setup failed')
    } finally {
      setPurchasing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-blue-200 bg-white p-6 shadow-2xl shadow-blue-950/20 sm:p-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
        >
          <X size={18} />
        </button>

        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-800">
          <Lock size={13} />
          One-Time Category Package
        </div>

        <h3 className="text-2xl font-bold text-slate-950">{pkg.title || `${categoryName} Alpha Pass`}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {pkg.description || `Get lifetime access to all files and future daily data published under the ${categoryName} category.`}
        </p>

        <div className="my-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">One-Time Lifetime Price</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-slate-900">{formattedPrice}</span>
              <span className="text-xs text-slate-500">/ forever</span>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-xs text-slate-700">
            <li className="flex items-center gap-2">
              <Check size={14} className="text-[#0f6ce5]" />
              <span>Full lifetime access to <strong>{categoryName}</strong> dataset drops</span>
            </li>
            <li className="flex items-center gap-2">
              <Check size={14} className="text-[#0f6ce5]" />
              <span>Direct high-speed downloads with no recurring fee</span>
            </li>
            <li className="flex items-center gap-2">
              <Check size={14} className="text-[#0f6ce5]" />
              <span>Entitlement verified instantly in your account</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 sm:flex-1"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleBuy}
            disabled={purchasing}
            className="primary-button flex items-center justify-center gap-2 sm:flex-2 disabled:opacity-75"
          >
            <Sparkles size={16} />
            <span>{purchasing ? 'Preparing Checkout...' : `Buy ${categoryName} Access (${formattedPrice})`}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
