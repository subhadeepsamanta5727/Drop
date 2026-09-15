import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Header } from '../components/ui/Header.jsx'
import { Sidebar } from '../components/ui/Sidebar.jsx'
import api from '../services/api.js'

const emptyForm = {
  planType: 'SUBSCRIPTION',
  planCycle: 'MONTHLY',
  category: 'CRYPTO',
  priceInPaise: 99900,
  currency: 'INR',
  isActive: true,
}

const formatMoney = (value) => `₹${Number(value || 0) / 100}`

export default function AdminPackagesPage() {
  const [form, setForm] = useState(emptyForm)
  const [pricing, setPricing] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const loadPricing = async () => {
    try {
      const response = await api.get('/admin/pricing')
      setPricing(response.data?.data || [])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load pricing plan list')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPricing()
  }, [])

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)

    try {
      const payload = {
        ...form,
        priceInPaise: Number(form.priceInPaise),
      }

      if (editingId) {
        await api.put(`/admin/pricing/${editingId}`, payload)
        toast.success('Plan updated successfully')
      } else {
        await api.post('/admin/pricing', payload)
        toast.success('Pricing updated successfully')
      }

      setForm(emptyForm)
      setEditingId(null)
      await loadPricing()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save pricing plan')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item) => {
    setEditingId(item._id)
    setForm({
      planType: item.planType,
      planCycle: item.planType === 'SUBSCRIPTION' ? item.planCycle || 'MONTHLY' : 'MONTHLY',
      category: item.planType === 'ONE_TIME' ? item.category || 'CRYPTO' : 'CRYPTO',
      priceInPaise: item.priceInPaise,
      currency: item.currency || 'INR',
      isActive: item.isActive,
    })
  }

  const handleDelete = async (id) => {
    const plan = pricing.find((item) => item._id === id)
    const planName = plan
      ? (plan.planType === 'SUBSCRIPTION' ? plan.planCycle : plan.category || 'General')
      : 'this plan'

    const confirmed = window.confirm(`Delete ${planName} plan? This action cannot be undone.`)
    if (!confirmed) return

    setDeletingId(id)

    try {
      await api.delete(`/admin/pricing/${id}`)
      toast.success('Plan deleted successfully')
      if (editingId === id) {
        setForm(emptyForm)
        setEditingId(null)
      }
      await loadPricing()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to delete pricing plan')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#edf6ff_100%)] p-4 text-zinc-900 lg:p-6">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6 xl:flex-row">
        <Sidebar mode="ADMIN" />

        <main className="min-w-0 flex-1">
          <Header title="Package Management" badge="Plans" subtitle="Set subscription tiers and one-time access pricing." />

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-5">
              <h2 className="mb-5 text-xl font-semibold text-slate-900">{editingId ? 'Edit plan' : 'Create / update plan'}</h2>

              <div className="space-y-4">
                <label className="block text-sm text-slate-700">
                  Plan type
                  <select name="planType" value={form.planType} onChange={handleChange} className="mt-1.5 w-full rounded-xl border border-blue-100 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition duration-200 focus:border-[#0f6ce5] focus:ring-4 focus:ring-blue-100">
                    <option value="SUBSCRIPTION">Subscription</option>
                    <option value="ONE_TIME">One-time</option>
                  </select>
                </label>

                {form.planType === 'SUBSCRIPTION' ? (
                  <label className="block text-sm text-slate-700">
                    Cycle
                    <select name="planCycle" value={form.planCycle} onChange={handleChange} className="mt-1.5 w-full rounded-xl border border-blue-100 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition duration-200 focus:border-[#0f6ce5] focus:ring-4 focus:ring-blue-100">
                      <option value="MONTHLY">Monthly</option>
                      <option value="SIX_MONTH">6 Month</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </label>
                ) : (
                  <label className="block text-sm text-slate-700">
                    Category
                    <select name="category" value={form.category} onChange={handleChange} className="mt-1.5 w-full rounded-xl border border-blue-100 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition duration-200 focus:border-[#0f6ce5] focus:ring-4 focus:ring-blue-100">
                      <option value="CRYPTO">Crypto</option>
                      <option value="STOCKS">Stocks</option>
                      <option value="FOREX">Forex</option>
                      <option value="GENERAL">General</option>
                    </select>
                  </label>
                )}

                <label className="block text-sm text-slate-700">
                  Price in paise
                  <input type="number" min="1" name="priceInPaise" value={form.priceInPaise} onChange={handleChange} className="mt-1.5 w-full rounded-xl border border-blue-100 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition duration-200 focus:border-[#0f6ce5] focus:ring-4 focus:ring-blue-100" />
                </label>

                <label className="block text-sm text-slate-700">
                  Currency
                  <input name="currency" value={form.currency} onChange={handleChange} className="mt-1.5 w-full rounded-xl border border-blue-100 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition duration-200 focus:border-[#0f6ce5] focus:ring-4 focus:ring-blue-100" />
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/40 px-3 py-3 text-sm text-slate-700">
                  <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} className="h-4 w-4 accent-[#0f6ce5]" />
                  Active plan
                </label>
              </div>

              <div className="mt-5 flex gap-3">
                <button type="submit" disabled={saving} className="primary-button flex-1 disabled:opacity-70">
                  {saving ? 'Saving...' : editingId ? 'Update plan' : 'Save plan'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null)
                      setForm(emptyForm)
                    }}
                    className="secondary-button"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="glass-panel rounded-3xl p-5">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Current pricing</h2>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                  {pricing.length} plans
                </span>
              </div>

              {loading ? (
                <div className="text-sm text-slate-500">Loading pricing…</div>
              ) : (
                <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-2 [scrollbar-color:#93c5fd_transparent] [scrollbar-width:thin]">
                  {pricing.map((item) => (
                    <div key={`${item.planType}-${item.planCycle || item.category}-${item._id}`} className="rounded-2xl border border-blue-100 bg-slate-50 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_12px_24px_rgba(15,108,229,0.08)]">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm uppercase tracking-[0.18em] text-slate-500">{item.planType}</div>
                          <div className="mt-1 text-lg font-semibold text-slate-900">
                            {item.planType === 'SUBSCRIPTION' ? item.planCycle : item.category || 'General'}
                          </div>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${item.isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                          {item.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                        <span>Price</span>
                        <span className="font-semibold text-slate-900">{formatMoney(item.priceInPaise)}</span>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="flex-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition duration-200 hover:bg-blue-100"
                        >
                          Update
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item._id)}
                          disabled={deletingId === item._id}
                          className="flex-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition duration-200 hover:bg-red-100 disabled:opacity-60"
                        >
                          {deletingId === item._id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
