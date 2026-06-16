import { useEffect } from 'react'
import { gotrue } from '@/lib/gotrue'
import { authStore } from '@/stores/authStore'

/** Initialises the auth session from storage and subscribes to GoTrue events. */
export function useAuthInit() {
  const setSession = authStore((s) => s.setSession)

  useEffect(() => {
    // Load persisted session
    gotrue.getSession().then(({ data }) => {
      setSession(data.session)
    })

    // Subscribe to auth state changes
    const { data: listener } = gotrue.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => listener.subscription.unsubscribe()
  }, [setSession])
}
