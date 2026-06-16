import { useRef, useState, useEffect } from 'react'
import { LogOut, Map, User, ChevronDown, Sun, Moon, Monitor } from 'lucide-react'
import { authStore } from '@/stores/authStore'
import { useAppConfig } from '@/hooks/useMeta'
import { useThemeStore, type Theme } from '@/stores/themeStore'

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: 'light',  label: 'Light',  icon: <Sun size={14} /> },
  { value: 'dark',   label: 'Dark',   icon: <Moon size={14} /> },
  { value: 'system', label: 'System', icon: <Monitor size={14} /> },
]

export default function Header() {
  const { user, signOut } = authStore()
  const { data: config } = useAppConfig()
  const title = config?.['app.title'] ?? 'rTAA Map'
  const { theme, setTheme } = useThemeStore()

  const [open, setOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <header
      className="flex-shrink-0 h-[var(--header-height)] flex items-center px-4 gap-3 z-20"
      style={{ background: 'var(--header-bg)', borderBottom: '1px solid var(--header-border)' }}
    >
      {/* Logo / title */}
      <div className="flex items-center gap-2 font-semibold" style={{ color: 'var(--header-text)' }}>
        <Map className="w-5 h-5 text-brand-400" />
        <span className="text-sm">{title}</span>
      </div>

      <div className="flex-1" />

      {/* User menu dropdown */}
      <div className="relative" ref={dropRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition"
          style={{
            color: 'var(--header-muted)',
            background: open ? 'var(--header-hover-bg)' : 'transparent',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--header-hover-bg)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = open ? 'var(--header-hover-bg)' : 'transparent' }}
        >
          <User className="w-3.5 h-3.5" />
          {user && <span className="hidden sm:inline max-w-[180px] truncate">{user.email}</span>}
          <ChevronDown
            className="w-3.5 h-3.5 transition-transform"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </button>

        {open && (
          <div
            className="absolute right-0 top-full mt-1.5 w-64 rounded-xl shadow-xl border z-50 overflow-hidden"
            style={{
              background: 'var(--dropdown-bg)',
              borderColor: 'var(--dropdown-border)',
              color: 'var(--dropdown-text)',
            }}
          >
            {/* User info */}
            {user && (
              <div
                className="px-4 py-3"
                style={{ borderBottom: '1px solid var(--dropdown-divider)' }}
              >
                <p className="text-xs font-medium" style={{ color: 'var(--dropdown-text)' }}>Signed in as</p>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--dropdown-muted)' }}>{user.email}</p>
              </div>
            )}

            {/* Theme control */}
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--dropdown-divider)' }}>
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--dropdown-muted)' }}>
                Appearance
              </p>
              <div className="flex gap-1">
                {THEME_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-[11px] font-medium transition border"
                    style={{
                      background: theme === opt.value ? 'var(--header-hover-bg)' : 'transparent',
                      borderColor: theme === opt.value ? 'var(--dropdown-border)' : 'transparent',
                      color: theme === opt.value ? 'var(--dropdown-text)' : 'var(--dropdown-muted)',
                      outline: theme === opt.value ? '2px solid #0ea5e9' : 'none',
                      outlineOffset: '1px',
                    }}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sign out */}
            <div className="p-2">
              <button
                onClick={() => { setOpen(false); signOut() }}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition"
                style={{ color: '#ef4444' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
