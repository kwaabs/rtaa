import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authStore } from '@/stores/authStore'
import { Map, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

const OAUTH_PROVIDERS = [
  {
    id: 'google' as const,
    name: 'Google',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
  },
  {
    id: 'azure' as const,
    name: 'Microsoft',
    icon: (
      <svg viewBox="0 0 23 23" className="w-4 h-4">
        <path fill="#f35325" d="M1 1h10v10H1z"/>
        <path fill="#81bc06" d="M12 1h10v10H12z"/>
        <path fill="#05a6f0" d="M1 12h10v10H1z"/>
        <path fill="#ffba08" d="M12 12h10v10H12z"/>
      </svg>
    ),
  },
  {
    id: 'github' as const,
    name: 'GitHub',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
      </svg>
    ),
  },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOAuthLoading] = useState<string | null>(null)

  const { signIn, signInWithOAuth } = authStore()

  // Public endpoint — no auth required. Returns { google: true/false, ... }
  const { data: enabledProviders } = useQuery<Record<string, boolean>>({
    queryKey: ['meta', 'auth-providers'],
    queryFn: () => api.get('/api/v1/meta/auth-providers'),
    staleTime: 60_000,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth = async (providerId: 'google' | 'azure' | 'github') => {
    setOAuthLoading(providerId)
    setError(null)
    try {
      await signInWithOAuth(providerId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth sign-in failed')
      setOAuthLoading(null)
    }
  }

  const activeOAuthProviders = OAUTH_PROVIDERS.filter(p => enabledProviders?.[p.id] === true)

  return (
    <div className="h-full flex items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 mb-4">
            <Map className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">rTAA Map</h1>
          <p className="mt-1 text-sm text-gray-400">Sign in to your account</p>
        </div>

        {/* OAuth buttons */}
        {activeOAuthProviders.length > 0 && (
          <div className="space-y-2">
            {activeOAuthProviders.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleOAuth(p.id)}
                disabled={oauthLoading !== null}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
              >
                {oauthLoading === p.id ? <Loader2 size={16} className="animate-spin" /> : p.icon}
                Continue with {p.name}
              </button>
            ))}
            <div className="flex items-center gap-3 text-gray-600 py-1">
              <hr className="flex-1 border-gray-800" />
              <span className="text-xs">or</span>
              <hr className="flex-1 border-gray-800" />
            </div>
          </div>
        )}

        {/* Email / password form */}
        <form onSubmit={handleSubmit} className="card panel gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Email</label>
            <input
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Password</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 rounded-md px-3 py-2">{error}</p>
          )}

          <button type="submit" className="btn-primary w-full justify-center py-2" disabled={loading}>
            {loading ? 'Please wait…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-600">
          Contact your system administrator to request access.
        </p>
      </div>
    </div>
  )
}
