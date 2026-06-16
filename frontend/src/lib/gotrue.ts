import { GoTrueClient } from '@supabase/gotrue-js'

const GOTRUE_URL = import.meta.env.VITE_GOTRUE_URL ?? 'http://localhost:9831'

export const gotrue = new GoTrueClient({
  url: GOTRUE_URL,
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
  storage: window.localStorage,
})
