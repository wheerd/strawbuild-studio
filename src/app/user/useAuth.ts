import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useAuthActions } from './store'
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient'

export function useAuth() {
  const { setUser, setLoading } = useAuthActions()
  const { t } = useTranslation('common')

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    const supabase = getSupabaseClient()

    const hasHashToken = window.location.hash.includes('access_token')

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? ''
        })

        if (hasHashToken) {
          toast.success(t($ => $.auth.confirmationSuccess))
          window.history.replaceState(null, '', window.location.pathname + window.location.search)
        }
      } else {
        setUser(null)
      }
    })

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? ''
        })
      } else {
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [setUser, setLoading, t])
}
