import { useEffect, useState } from 'react'
import { Edit, Layers, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '../components/ui/Header.jsx'
import { Sidebar } from '../components/ui/Sidebar.jsx'
import api from '../services/api.js'

const emptyForm = {
  title: '',
  category: '',
  categoryType: 'SUBSCRIPTION_DAILY',
  note: '',
  price: 499,
  isActive: true,
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadCategories = async () => {
    try {
      const response = await api.get('/categories/all')
      setCategories(response.data?.data || [])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load categories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category.toUpperCase().trim(),
        categoryType: form.categoryType,
        note: form.note.trim(),
        price: Number(form.price),
        isActive: form.isActive,
      }
      if (editingId) {
        await api.put(`/categories/${editingId}`, payload)
        toast.success('Category updated')
      } else {
        await api.post('/categories', payload)
        toast.success('Category created')
      }
      setForm(emptyForm)
      setEditingId(null)
      await loadCategories()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save category')
    } finally {
      setSaving(false)
    }
  }

  const removeCategory = async (category) => {
    if (!window.confirm(`Delete ${category.title}?`)) return
    try {
      await api.delete(`/categories/${category._id}`)
      toast.success('Category deleted')
      await loadCategories()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to delete category')
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#edf6ff_100%)] p-4 text-slate-900 lg:p-6">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6 xl:flex-row">
        <Sidebar mode="ADMIN" />
        <main className="min-w-0 flex-1">
          <Header
            title="Data Category Management"
            badge="Two Catalogs"
            subtitle="Manage subscriber daily-data categories and one-time lifetime categories separately."
          />

          <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-6">
              <div className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0f6ce5]">
                <Plus size={16} />
                {editingId ? 'Update Category' : 'Create Category'}
              </div>
              <div className="space-y-4">
                <label className="block text-sm text-slate-700">Title *
                  <input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-blue-100 bg-slate-50 px-3 py-2.5" />
                </label>
                <label className="block text-sm text-slate-700">Category Key *
                  <input required value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value.toUpperCase() }))} className="mt-1.5 w-full rounded-xl border border-blue-100 bg-slate-50 px-3 py-2.5 font-bold uppercase" />
                </label>
                <label className="block text-sm text-slate-700">Category Type *
                  <select value={form.categoryType} onChange={(event) => setForm((current) => ({ ...current, categoryType: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-blue-100 bg-slate-50 px-3 py-2.5">
                    <option value="SUBSCRIPTION_DAILY">Subscriber Daily Data</option>
                    <option value="ONE_TIME_CATEGORY">One-Time Category Data</option>
                  </select>
                </label>
                {form.categoryType === 'ONE_TIME_CATEGORY' && (
                  <label className="block text-sm text-slate-700">Lifetime Price (INR) *
                    <input type="number" min="1" required value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-blue-100 bg-slate-50 px-3 py-2.5" />
                  </label>
                )}
                <label className="block text-sm text-slate-700">Note
                  <textarea rows={3} value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-blue-100 bg-slate-50 px-3 py-2.5" />
                </label>
              </div>
              <div className="mt-5 flex gap-3">
                <button disabled={saving} className="primary-button flex-1">{saving ? 'Saving...' : editingId ? 'Update Category' : 'Create Category'}</button>
                {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm) }} className="rounded-xl border px-4">Cancel</button>}
              </div>
            </form>

            <section className="glass-panel rounded-3xl p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-bold">Category Catalog</h2>
                <Layers size={20} className="text-blue-600" />
              </div>
              {loading ? <p className="text-sm text-slate-500">Loading categories...</p> : (
                <div className="space-y-3">
                  {categories.map((category) => (
                    <article key={category._id} className="rounded-2xl border border-blue-100 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold uppercase text-blue-700">{category.categoryType === 'ONE_TIME_CATEGORY' ? 'One-Time' : 'Subscriber'}</span>
                          <h3 className="mt-2 font-bold">{category.title}</h3>
                          <p className="text-xs font-semibold uppercase text-slate-500">{category.category}</p>
                          <p className="mt-1 text-sm text-slate-500">{category.note || 'No note added.'}</p>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" title="Edit category" onClick={() => { setForm({ title: category.title, category: category.category, categoryType: category.categoryType, note: category.note || '', price: category.price || 499, isActive: category.isActive }); setEditingId(category._id) }} className="rounded-lg border p-2 text-blue-700"><Edit size={15} /></button>
                          <button type="button" title="Delete category" onClick={() => removeCategory(category)} className="rounded-lg border border-red-200 p-2 text-red-600"><Trash2 size={15} /></button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
