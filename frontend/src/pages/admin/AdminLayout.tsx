import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { Layers, Map, Settings, ShieldCheck, LogOut, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { clsx } from 'clsx'

const NAV = [
  { to: 'layers',    icon: <Layers size={16} />,      label: 'Layer Configs' },
  { to: 'basemaps',  icon: <Map size={16} />,          label: 'Basemaps' },
  { to: 'config',    icon: <Settings size={16} />,     label: 'App Config' },
  { to: 'auth',      icon: <ShieldCheck size={16} />,  label: 'Auth Providers' },
]

export default function AdminLayout() {
  const { session, signOut } = useAuthStore()

  // Simple admin check — GoTrue app_metadata.role must be "admin"
  const meta = (session?.user as { app_metadata?: Record<string, string> })?.app_metadata
  if (!meta || meta['role'] !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-10 text-center max-w-sm">
          <ShieldCheck size={40} className="text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Admin Access Required</h2>
          <p className="text-sm text-gray-500">Your account does not have admin privileges. Contact a system administrator.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 flex flex-col border-r border-white/10 shrink-0">
        <div className="px-4 py-4 border-b border-white/10">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Admin Panel</div>
          <div className="text-xs text-gray-600 mt-0.5 truncate">{session?.user?.email}</div>
        </div>

        <nav className="flex-1 py-2">
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => clsx(
                'flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors',
                isActive
                  ? 'bg-blue-600/20 text-blue-300 border-r-2 border-blue-500'
                  : 'text-gray-400 hover:text-white hover:bg-white/5',
              )}
            >
              {icon}
              {label}
              <ChevronRight size={13} className="ml-auto opacity-30" />
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <NavLink to="/" className="flex items-center gap-2 text-xs text-gray-500 hover:text-white px-2 py-1.5 rounded">
            ← Back to Map
          </NavLink>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 px-2 py-1.5 rounded mt-1 w-full"
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
