import { ChevronRight, CreditCard, DollarSign, FolderUp, Layers, LayoutDashboard, ListTree, MoreVertical } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'

const adminItems = [
  { label: 'Dashboard Overview', to: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Package Management', to: '/admin/packages', icon: CreditCard },
  { label: 'Data Categories', to: '/admin/categories', icon: ListTree },
  { label: 'Payments & Transactions', to: '/admin/payments', icon: DollarSign },
  { label: 'Upload Daily Data', to: '/admin/upload', icon: FolderUp },
  { label: 'Upload One-Time Data', to: '/admin/upload-one-time', icon: FolderUp },
]

const userItems = [
  { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Subscriber Daily Data', to: '/dashboard/subscriber-data', icon: FolderUp },
  { label: 'One-Time Data', to: '/dashboard/one-time-data', icon: Layers },
  { label: 'Plan', to: '/dashboard/packages', icon: CreditCard },
  { label: 'Payment', to: '/dashboard/payments', icon: DollarSign },
]

export function Sidebar({ mode = 'ADMIN' }) {
  const items = mode === 'ADMIN' ? adminItems : userItems
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const profileTitle = user?.role === 'ADMIN' ? 'Admin Profile' : 'User Profile'
  const profileName = user?.name || (mode === 'ADMIN' ? 'AlphaDrop Admin' : 'AlphaDrop User')
  const profileEmail = user?.email || (mode === 'ADMIN' ? 'admin@alphadrop.com' : 'user@alphadrop.com')

  return (
    <aside className="flex w-full shrink-0 flex-col justify-between overflow-hidden rounded-xl bg-gradient-to-b from-[#071a37] to-[#0c2d64] p-3 text-white shadow-[0_18px_36px_rgba(7,26,55,0.22)] sm:p-4 xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)] xl:w-[252px]">
      <div>
        <div className="mb-5 flex items-center gap-3 px-2 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#5aa7ff] to-[#0f6ce5] text-lg font-black text-white shadow-lg shadow-blue-950/30">
            AD
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xl font-bold tracking-tight text-white">AlphaDrop</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-blue-200">Control panel</div>
          </div>
          <button
            type="button"
            onClick={() => setIsMenuOpen((current) => !current)}
            aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMenuOpen}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-blue-100 transition hover:bg-white/10 xl:hidden"
          >
            <MoreVertical size={20} />
          </button>
        </div>

        <nav className={`${isMenuOpen ? 'grid' : 'hidden'} grid-cols-1 gap-1 sm:grid-cols-2 xl:block xl:space-y-1`}>
          {items.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setIsMenuOpen(false)}
              end
              className={({ isActive }) => `sidebar-link min-w-0 border border-transparent transition-all duration-200 hover:-translate-x-0.5 hover:border-[#5aa7ff] hover:bg-[#0f6ce5]/35 hover:text-white hover:shadow-[0_8px_18px_rgba(90,167,255,0.18)] ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span className="min-w-0 break-words">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className={`${isMenuOpen ? 'block' : 'hidden'} mt-6 rounded-xl border border-white/10 bg-white/5 p-3 xl:block`}>
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-sm font-semibold text-white">
            {profileName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'AD'}
          </div>
          <div>
            <div className="text-sm font-medium text-white">{profileTitle}</div>
            <div className="max-w-[170px] break-all text-xs text-slate-400">{profileEmail}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-blue-100 transition hover:bg-white/10"
        >
          <span>Logout</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </aside>
  )
}
