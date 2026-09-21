import { ArrowLeft, CreditCard, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const sections = [
  {
    title: '1. Payment Methods',
    text: 'All payments for subscriptions, plans, and digital products on BizDataPro are processed through Razorpay. Upon purchase, a Razorpay order is generated and payment is completed through Razorpay’s secure checkout interface before access is activated. We do not store card information directly on our servers.',
  },
  {
    title: '2. Billing and Invoices',
    text: 'By placing an order, the User confirms that they are authorized to use the selected payment method and agree to pay the full amount displayed during checkout. The applicable amount, billing cycle, and invoice details are recorded against the User account and may be reviewed from the dashboard after successful payment.',
  },
  {
    title: '3. Order Acceptance and Access',
    text: 'Orders are accepted only after successful payment confirmation from Razorpay. Access to premium content, subscriptions, or downloadable materials is granted only after the payment is verified and the corresponding order status is marked as successful.',
  },
  {
    title: '4. Refunds and Cancellations',
    text: 'Refunds, if any, are evaluated solely in accordance with the applicable purchase type and the platform’s service policy. Digital subscriptions, access packages, and downloadable content are generally non-refundable once the service has been activated, delivered, or accessed. Subscription cancellations take effect in accordance with the selected billing plan and renewal cycle, unless otherwise communicated by BizDataPro.',
  },
  {
    title: '5. Subscription Renewal',
    text: 'Recurring subscriptions renew automatically through Razorpay based on the selected billing interval unless cancelled prior to the renewal date. Renewal charges are processed using the saved Razorpay payment method and the User remains responsible for ensuring the payment method remains valid and active.',
  },
  {
    title: '6. Security and Verification',
    text: 'BizDataPro uses Razorpay’s secure payment infrastructure and signature-based verification to safeguard transactions. We reserve the right to refuse or cancel any order where payment verification fails, the transaction is suspected to be fraudulent, or the service cannot be lawfully provided.',
  },
]

export default function PaymentPolicyPage() {
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
          <div className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">Payment Policy</div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_22px_50px_rgba(15,23,42,0.06)] sm:p-10">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-700">Billing</p>
              <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] text-slate-900">Payment Policy</h1>
            </div>
          </div>

          <p className="mb-8 text-base leading-7 text-slate-600">
            This Payment Policy sets out the terms governing payments, service access, renewals, and refunds for services provided by BizDataPro. By purchasing a plan or subscription through Razorpay, User agrees to comply with the billing and transaction terms below.
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
              <span className="font-semibold">Important notice</span>
            </div>
            <p className="text-sm leading-7 text-slate-700">
              BizDataPro reserves the right to amend this Payment Policy at any time. Continued use of the platform after such amendments are posted constitutes acceptance of the revised terms and conditions.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
