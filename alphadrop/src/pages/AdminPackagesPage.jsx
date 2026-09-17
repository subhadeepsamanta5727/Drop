import { useEffect, useState } from 'react'
import { Layers, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '../components/ui/Header.jsx'
import { Sidebar } from '../components/ui/Sidebar.jsx'
import api from '../services/api.js'

const emptyPackageForm = {
  title: '',
  category: '',
  price: 499,
  description: '',
  thumbnail: '',
  isActive: true,
}

const emptySubscriptionForm = {
  planCycle: 'MONTHLY',
  priceInPaise: 99900,
  currency: 'INR',
  isActive: true,
}

export default function AdminPackagesPage() {
  const [activeTab, setActiveTab] = useState('PACKAGES') // 'PACKAGES' or 'SUBSCRIPTIONS'

  // Package state
  const [packages, setPackages] = useState([])
  const [packageForm, setPackageForm] = useState(emptyPackageForm)
  const [editingPackageId, setEditingPackageId] = useState(null)

  // Subscription state
  const [subscriptions, setSubscriptions] = useState([])
  const [subForm, setSubForm] = useState(emptySubscriptionForm)
  const [editingSubId, setEditingSubId] = useState(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const loadData = async () => {
    try {
      const [packagesRes, pricingRes] = await Promise.all([
        api.get('/packages/all'),
        api.get('/admin/pricing'),
      ])
      setPackages(packagesRes.data?.data || [])
      const subList = (pricingRes.data?.data || []).filter((p) => p.planType === 'SUBSCRIPTION')
      setSubscriptions(subList)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load catalog')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [])

  // Handle Package Form Submission
  const handlePackageSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const payload = {
        title: packageForm.title.trim(),
        category: packageForm.category.toUpperCase().trim(),
        price: Number(packageForm.price),
        description: packageForm.description.trim(),
        thumbnail: packageForm.thumbnail.trim(),
        isActive: packageForm.isActive,
      }

      if (editingPackageId) {
        await api.put(`/packages/${editingPackageId}`, payload)
        toast.success('Package updated successfully!')
      } else {
        await api.post('/packages', payload)
        toast.success('Package created successfully!')
      }

      setPackageForm(emptyPackageForm)
      setEditingPackageId(null)
      await loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save package')
    } finally {
      setSaving(false)
    }
  }

  // Handle Subscription Form Submission
  const handleSubSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const payload = {
        planType: 'SUBSCRIPTION',
        planCycle: subForm.planCycle,
        priceInPaise: Number(subForm.priceInPaise),
        currency: subForm.currency || 'INR',
        isActive: subForm.isActive,
      }

      if (editingSubId) {
        await api.put(`/admin/pricing/${editingSubId}`, payload)
        toast.success('Subscription plan updated!')
      } else {
        await api.post('/admin/pricing', payload)
        toast.success('Subscription plan created!')
      }

      setSubForm(emptySubscriptionForm)
      setEditingSubId(null)
      await loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save plan')
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePackage = async (id, title) => {
    if (!window.confirm(`Delete package "${title}"?`)) return
    setDeletingId(id)

    try {
      await api.delete(`/packages/${id}`)
      toast.success('Package deleted')
      if (editingPackageId === id) {
        setPackageForm(emptyPackageForm)
        setEditingPackageId(null)
      }
      await loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete package')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteSub = async (id) => {
    if (!window.confirm('Delete this subscription pricing plan?')) return
    setDeletingId(id)

    try {
      await api.delete(`/admin/pricing/${id}`)
      toast.success('Plan deleted')
      if (editingSubId === id) {
        setSubForm(emptySubscriptionForm)
        setEditingSubId(null)
      }
      await loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete plan')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#edf6ff_100%)] p-4 text-zinc-900 lg:p-6">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6 xl:flex-row">
        <Sidebar mode="ADMIN" />

        <main className="min-w-0 flex-1">
          <Header
            title="Monetization & Package Management"
            badge="Hybrid Catalog"
            subtitle="Configure one-time category packages and recurring subscription tiers."
          />

          {/* Model Switcher Tabs */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex rounded-2xl border border-blue-200 bg-blue-50/80 p-1">
              <button
                type="button"
                onClick={() => setActiveTab('PACKAGES')}
                className={`rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition ${
                  activeTab === 'PACKAGES'
                    ? 'bg-gradient-to-r from-[#0f6ce5] to-[#0c2d64] text-white shadow-md'
                    : 'text-blue-800 hover:bg-white'
                }`}
              >
                One-Time Category Packages ({packages.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('SUBSCRIPTIONS')}
                className={`rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition ${
                  activeTab === 'SUBSCRIPTIONS'
                    ? 'bg-gradient-to-r from-[#0f6ce5] to-[#0c2d64] text-white shadow-md'
                    : 'text-blue-800 hover:bg-white'
                }`}
              >
                Subscription Tiers ({subscriptions.length})
              </button>
            </div>
          </div>

          {activeTab === 'PACKAGES' ? (
            /* One-Time Category Package Management */
            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              {/* Form */}
              <form onSubmit={handlePackageSubmit} className="glass-panel rounded-3xl p-6">
                <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0f6ce5]">
                  <Layers size={16} />
                  {editingPackageId ? 'Edit Category Package' : 'Create Category Package'}
                </div>

                <div className="space-y-4">
                  <label className="block text-sm text-slate-700">
                    Package Title *
                    <input
                      name="title"
                      required
                      placeholder="e.g. Crypto Alpha Vault"
                      value={packageForm.title}
                      onChange={(e) => setPackageForm((c) => ({ ...c, title: e.target.value }))}
                      className="mt-1.5 w-full rounded-xl border border-blue-100 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition duration-200 focus:border-[#0f6ce5] focus:ring-4 focus:ring-blue-100"
                    />
                  </label>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block text-sm text-slate-700">
                      Category Key / Slug *
                      <input
                        name="category"
                        required
                        placeholder="e.g. CRYPTO"
                        value={packageForm.category}
                        onChange={(e) => setPackageForm((c) => ({ ...c, category: e.target.value.toUpperCase() }))}
                        className="mt-1.5 w-full rounded-xl border border-blue-100 bg-slate-50 px-3 py-2.5 font-bold uppercase tracking-wide text-blue-800 outline-none transition duration-200 focus:border-[#0f6ce5] focus:ring-4 focus:ring-blue-100"
                      />
                    </label>

                    <label className="block text-sm text-slate-700">
                      Price in INR (₹) *
                      <input
                        type="number"
                        min="1"
                        required
                        value={packageForm.price}
                        onChange={(e) => setPackageForm((c) => ({ ...c, price: e.target.value }))}
                        className="mt-1.5 w-full rounded-xl border border-blue-100 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition duration-200 focus:border-[#0f6ce5] focus:ring-4 focus:ring-blue-100"
                      />
                    </label>
                  </div>

                  <label className="block text-sm text-slate-700">
                    Description
                    <textarea
                      rows={3}
                      placeholder="Lifetime entitlement details for buyers..."
                      value={packageForm.description}
                      onChange={(e) => setPackageForm((c) => ({ ...c, description: e.target.value }))}
                      className="mt-1.5 w-full rounded-xl border border-blue-100 bg-slate-50 px-3 py-2 text-slate-900 outline-none transition duration-200 focus:border-[#0f6ce5] focus:ring-4 focus:ring-blue-100"
                    />
                  </label>

                  <label className="block text-sm text-slate-700">
                    Thumbnail Image URL
                    <input
                      placeholder="https://..."
                      value={packageForm.thumbnail}
                      onChange={(e) => setPackageForm((c) => ({ ...c, thumbnail: e.target.value }))}
                      className="mt-1.5 w-full rounded-xl border border-blue-100 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition duration-200 focus:border-[#0f6ce5] focus:ring-4 focus:ring-blue-100"
                    />
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/40 px-3 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={packageForm.isActive}
                      onChange={(e) => setPackageForm((c) => ({ ...c, isActive: e.target.checked }))}
                      className="h-4 w-4 accent-[#0f6ce5]"
                    />
                    <span>Active for purchase in catalog</span>
                  </label>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="primary-button flex-1 text-xs font-bold uppercase tracking-wider disabled:opacity-70"
                  >
                    {saving ? 'Saving...' : editingPackageId ? 'Update Package' : 'Create Package'}
                  </button>
                  {editingPackageId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPackageId(null)
                        setPackageForm(emptyPackageForm)
                      }}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              {/* Package List */}
              <div className="glass-panel rounded-3xl p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">Current Packages</h3>
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    {packages.length} Catalog Items
                  </span>
                </div>

                {loading ? (
                  <div className="p-8 text-center text-sm text-slate-500">Loading catalog...</div>
                ) : packages.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-blue-200 p-8 text-center text-sm text-slate-500">
                    No packages created yet. Use the form to add one.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[38rem] overflow-y-auto pr-1">
                    {packages.map((pkg) => (
                      <div
                        key={pkg._id}
                        className="rounded-2xl border border-blue-100 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-white"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-700">
                              {pkg.category}
                            </span>
                            <h4 className="mt-1.5 text-base font-bold text-slate-900">{pkg.title}</h4>
                            <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{pkg.description}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-black text-slate-900">₹{pkg.price}</span>
                            <span className="block text-[10px] text-slate-400">lifetime</span>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-blue-100 pt-3 text-xs">
                          <span className={`font-semibold ${pkg.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {pkg.isActive ? '● Active' : '○ Disabled'}
                          </span>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPackageId(pkg._id)
                                setPackageForm({
                                  title: pkg.title,
                                  category: pkg.category,
                                  price: pkg.price,
                                  description: pkg.description || '',
                                  thumbnail: pkg.thumbnail || '',
                                  isActive: pkg.isActive,
                                })
                              }}
                              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePackage(pkg._id, pkg.title)}
                              disabled={deletingId === pkg._id}
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Recurring Subscription Pricing Management */
            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <form onSubmit={handleSubSubmit} className="glass-panel rounded-3xl p-6">
                <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0f6ce5]">
                  <Sparkles size={16} />
                  {editingSubId ? 'Edit Subscription Tier' : 'Add Subscription Tier'}
                </div>

                <div className="space-y-4">
                  <label className="block text-sm text-slate-700">
                    Cycle
                    <select
                      name="planCycle"
                      value={subForm.planCycle}
                      onChange={(e) => setSubForm((c) => ({ ...c, planCycle: e.target.value }))}
                      className="mt-1.5 w-full rounded-xl border border-blue-100 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition duration-200 focus:border-[#0f6ce5] focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="MONTHLY">Monthly</option>
                      <option value="SIX_MONTH">6 Month</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </label>

                  <label className="block text-sm text-slate-700">
                    Price in Paise (e.g. 99900 = ₹999)
                    <input
                      type="number"
                      min="1"
                      value={subForm.priceInPaise}
                      onChange={(e) => setSubForm((c) => ({ ...c, priceInPaise: e.target.value }))}
                      className="mt-1.5 w-full rounded-xl border border-blue-100 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition duration-200 focus:border-[#0f6ce5] focus:ring-4 focus:ring-blue-100"
                    />
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/40 px-3 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={subForm.isActive}
                      onChange={(e) => setSubForm((c) => ({ ...c, isActive: e.target.checked }))}
                      className="h-4 w-4 accent-[#0f6ce5]"
                    />
                    <span>Active subscription plan</span>
                  </label>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="primary-button flex-1 text-xs font-bold uppercase tracking-wider disabled:opacity-70"
                  >
                    {saving ? 'Saving...' : editingSubId ? 'Update Tier' : 'Save Tier'}
                  </button>
                  {editingSubId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSubId(null)
                        setSubForm(emptySubscriptionForm)
                      }}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              {/* Subscriptions List */}
              <div className="glass-panel rounded-3xl p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">Configured Subscription Tiers</h3>
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    {subscriptions.length} Tiers
                  </span>
                </div>

                <div className="space-y-3">
                  {subscriptions.map((sub) => (
                    <div
                      key={sub._id}
                      className="rounded-2xl border border-blue-100 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-white"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-slate-900">{sub.planCycle} Subscription</h4>
                          <p className="text-xs text-slate-500">Universal access to all categories</p>
                        </div>
                        <div className="text-right font-black text-slate-900">
                          ₹{Number(sub.priceInPaise || 0) / 100}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-blue-100 pt-3 text-xs">
                        <span className={sub.isActive ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
                          {sub.isActive ? '● Active' : '○ Disabled'}
                        </span>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSubId(sub._id)
                              setSubForm({
                                planCycle: sub.planCycle,
                                priceInPaise: sub.priceInPaise,
                                currency: sub.currency || 'INR',
                                isActive: sub.isActive,
                              })
                            }}
                            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSub(sub._id)}
                            disabled={deletingId === sub._id}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
