import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { LayoutDashboard, UtensilsCrossed, ClipboardList, QrCode, LogOut } from 'lucide-react'

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/menu',      icon: UtensilsCrossed, label: 'Menú'      },
  { to: '/admin/orders',    icon: ClipboardList,   label: 'Pedidos'   },
  { to: '/admin/tables',    icon: QrCode,          label: 'Mesas'     },
]

export default function AdminLayout({ children }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/admin')
  }

  return (
    <div className="flex min-h-screen bg-neutral-950">
      {/* Sidebar */}
      <aside className="w-16 md:w-56 flex flex-col bg-neutral-900 border-r border-neutral-800 shrink-0">
        {/* Logo */}
        <div className="p-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gold-500 flex items-center justify-center shrink-0">
              <UtensilsCrossed size={16} className="text-neutral-900" />
            </div>
            <span className="hidden md:block font-semibold text-sm text-white truncate">
              {profile?.restaurants?.name ?? 'Carta Virtual'}
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-gold-500/10 text-gold-400'
                    : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              <span className="hidden md:block">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sign out */}
        <div className="p-2 border-t border-neutral-800">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <LogOut size={18} className="shrink-0" />
            <span className="hidden md:block">Salir</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
