import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Header } from '../components/ui/Header.jsx'
import { Sidebar } from '../components/ui/Sidebar.jsx'
import api from '../services/api.js'

const formatCurrency = (value) => `₹${Number(value || 0) / 100}`
const formatDate = (value) => new Date(value).toLocaleString('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  const loadPayments = async () => {
    try {
      const response = await api.get('/admin/payments')
      setPayments(response.data?.data || [])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load payment history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPayments()
  }, [])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this payment record?')) return

    try {
      await api.delete(`/admin/payments/${id}`)
      toast.success('Payment record deleted successfully')
      await loadPayments()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to delete payment record')
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#edf6ff_100%)] p-4 text-zinc-900 lg:p-6">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6 xl:flex-row">
        <Sidebar mode="ADMIN" />

        <main className="min-w-0 flex-1">
          <Header title="Payments & Transactions" badge="Ledger" subtitle="Razorpay orders, subscriptions, and lifetime access purchases." />

          <div className="glass-panel rounded-3xl p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Recent transactions</h2>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                {payments.length} entries
              </span>
            </div>

            {loading ? (
              <div className="text-sm text-slate-500">Loading transaction ledger…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-slate-700">
                  <thead className="border-b border-blue-100 text-slate-500">
                    <tr>
                      <th className="pb-3 pr-4 font-medium">User</th>
                      <th className="pb-3 pr-4 font-medium">Type</th>
                      <th className="pb-3 pr-4 font-medium">Plan</th>
                      <th className="pb-3 pr-4 font-medium">Amount</th>
                      <th className="pb-3 pr-4 font-medium">Status</th>
                      <th className="pb-3 pr-4 font-medium">Date</th>
                      <th className="pb-3 pr-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment._id} className="border-b border-blue-50 align-top">
                        <td className="py-3 pr-4 text-slate-900">{payment.userId || 'N/A'}</td>
                        <td className="py-3 pr-4">{payment.paymentType}</td>
                        <td className="py-3 pr-4">{payment.planCycle || payment.category || '—'}</td>
                        <td className="py-3 pr-4 font-semibold text-[#0f6ce5]">{formatCurrency(payment.amountInPaise)}</td>
                        <td className="py-3 pr-4">
                          <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-blue-700">
                            {payment.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-slate-500">{formatDate(payment.createdAt)}</td>
                        <td className="py-3 pr-4">
                          <button type="button" onClick={() => handleDelete(payment._id)} className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-600 transition duration-200 hover:bg-red-100">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
