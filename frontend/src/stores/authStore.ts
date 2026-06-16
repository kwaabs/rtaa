import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Session, User } from '@supabase/gotrue-js'
import { gotrue } from '@/lib/gotrue'

interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
  setSession: (session: Session | null) => void
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  signInWithOAuth: (provider: 'google' | 'azure' | 'github') => Promise<void>
}

export const authStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      user: null,
      loading: true,

      setSession: (session) =>
        set({ session, user: session?.user ?? null, loading: false }),

      signIn: async (email, password) => {
        const { data, error } = await gotrue.signInWithPassword({ email, password })
        if (error) throw error
        set({ session: data.session, user: data.user, loading: false })
      },

      signUp: async (email, password) => {
        const { data, error } = await gotrue.signUp({ email, password })
        if (error) throw error
        set({ session: data.session, user: data.user ?? null, loading: false })
      },

      signOut: async () => {
        await gotrue.signOut()
        set({ session: null, user: null, loading: false })
      },

      signInWithOAuth: async (provider) => {
        // GoTrue OAuth redirects the browser; no return value to capture here.
        const { error } = await gotrue.signInWithOAuth({
          provider: provider as Parameters<typeof gotrue.signInWithOAuth>[0]['provider'],
          options: { redirectTo: window.location.origin + '/' },
        })
        if (error) throw error
      },
    }),
    {
      name: 'rtaa-auth',
      partialize: (s) => ({ session: s.session, user: s.user }),
    },
  ),
)

// Alias so components can import either name
export const useAuthStore = authStore
