import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Header } from '../components/ui/Header.jsx'
import { Sidebar } from '../components/ui/Sidebar.jsx'
import api from '../services/api.js'

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'USER',
  hasActiveSubscription: false,
  hasOneTimeAccess: false,
}

const formatDate = (value) => new Date(value).toLocaleDateString('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  const loadUsers = async () => {
    try {
      const response = await api.get('/admin/users')
      setUsers(response.data?.data || [])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)

    try {
      if (editingId) {
        await api.put(`/admin/users/${editingId}`, {
          hasActiveSubscription: form.hasActiveSubscription,
          hasOneTimeAccess: form.hasOneTimeAccess,
        })
        toast.success('User updated successfully')
      } else {
        await api.post('/admin/users', {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          hasActiveSubscription: form.hasActiveSubscription,
          hasOneTimeAccess: form.hasOneTimeAccess,
        })
        toast.success('User created successfully')
      }

      setForm(emptyForm)
      setEditingId(null)
      await loadUsers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save user')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (user) => {
    setEditingId(user._id)
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      hasActiveSubscription: !!user.hasActiveSubscription,
      hasOneTimeAccess: !!user.hasOneTimeAccess,
    })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user?')) return

    try {
      await api.delete(`/admin/users/${id}`)
      toast.success('User deleted successfully')
      if (editingId === id) {
        setEditingId(null)
        setForm(emptyForm)
      }
      await loadUsers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to delete user')
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#edf6ff_100%)] p-4 text-zinc-900 lg:p-6">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6 xl:flex-row">
        <Sidebar mode="ADMIN" />

        <main className="min-w-0 flex-1">
          <Header title="Users Ledger" badge="Members" subtitle="Role access, subscriptions, and lifetime entitlements." />

          <div className="grid gap-6">
            <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-5">
              <h2 className="mb-5 text-xl font-semibold text-slate-900">{editingId ? 'Edit user' : 'Add user'}</h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="block text-sm text-slate-700">
                  Name
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    readOnly={Boolean(editingId)}
                    disabled={Boolean(editingId)}
                    className="mt-1.5 w-full rounded-xl border border-blue-100 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition duration-200 focus:border-[#0f6ce5] focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </label>

                <label className="block text-sm text-slate-700">
                  Email
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    readOnly={Boolean(editingId)}
                    disabled={Boolean(editingId)}
                    className="mt-1.5 w-full rounded-xl border border-blue-100 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition duration-200 focus:border-[#0f6ce5] focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </label>

                {!editingId && (
                  <label className="block text-sm text-slate-700">
                    Password
                    <input type="password" name="password" value={form.password} onChange={handleChange} className="mt-1.5 w-full rounded-xl border border-blue-100 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition duration-200 focus:border-[#0f6ce5] focus:ring-4 focus:ring-blue-100" />
                  </label>
                )}

                <label className="block text-sm text-slate-700">
                  Role
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    disabled={Boolean(editingId)}
                    className="mt-1.5 w-full rounded-xl border border-blue-100 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition duration-200 focus:border-[#0f6ce5] focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </label>

              </div>

              <div className="mt-5 flex gap-3">
                <button type="submit" disabled={saving} className="primary-button flex-1 disabled:opacity-70">
                  {saving ? 'Saving...' : editingId ? 'Update user' : 'Save user'}
                </button>
                {editingId && (
                  <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm) }} className="secondary-button">
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="glass-panel rounded-3xl p-5">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">All users</h2>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                  {users.length} records
                </span>
              </div>

              {loading ? (
                <div className="text-sm text-slate-500">Loading user list…</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm text-slate-700">
                    <thead className="border-b border-blue-100 text-slate-500">
                      <tr>
                        <th className="pb-3 pr-4 font-medium">Name</th>
                        <th className="pb-3 pr-4 font-medium">Email</th>
                        <th className="pb-3 pr-4 font-medium">Role</th>
                        <th className="pb-3 pr-4 font-medium">Subscription</th>
                        <th className="pb-3 pr-4 font-medium">Lifetime</th>
                        <th className="pb-3 pr-4 font-medium">Joined</th>
                        <th className="pb-3 pr-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user._id} className="border-b border-blue-50 align-top">
                          <td className="py-3 pr-4 font-medium text-slate-900">{user.name}</td>
                          <td className="py-3 pr-4">{user.email}</td>
                          <td className="py-3 pr-4">
                            <span className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${user.role === 'ADMIN' ? 'bg-[#0f6ce5]/10 text-[#0f6ce5]' : 'bg-emerald-100 text-emerald-700'}`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-slate-600">{user.hasActiveSubscription ? 'Active' : 'None'}</td>
                          <td className="py-3 pr-4 text-slate-600">{user.hasOneTimeAccess ? 'Unlocked' : 'Locked'}</td>
                          <td className="py-3 pr-4 text-slate-500">{formatDate(user.createdAt)}</td>
                          <td className="py-3 pr-4">
                            <div className="flex gap-2">
                              <button type="button" onClick={() => handleEdit(user)} className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 transition duration-200 hover:bg-blue-100">Edit</button>
                              <button type="button" onClick={() => handleDelete(user._id)} className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-medium text-red-600 transition duration-200 hover:bg-red-100">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
