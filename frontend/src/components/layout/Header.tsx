import { LogOut, Map, User } from 'lucide-react'
import { authStore } from '@/stores/authStore'
import { useAppConfig } from '@/hooks/useMeta'

export default function Header() {
  const { user, signOut } = authStore()
  const { data: config } = useAppConfig()
  const title = config?.['app.title'] ?? 'rTAA Map'

  return (
    <header className="flex-shrink-0 h-[var(--header-height)] flex items-center px-4 gap-3
                       bg-gray-900 border-b border-white/10 z-20">
      <div className="flex items-center gap-2 text-white font-semibold">
        <Map className="w-5 h-5 text-brand-400" />
        <span className="text-sm">{title}</span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        {user && (
          <span className="text-xs text-gray-400 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            {user.email}
          </span>
        )}
        <button
          onClick={() => signOut()}
          className="btn-ghost text-xs text-gray-400 hover:text-white py-1"
          title="Sign out"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </header>
  )
}
