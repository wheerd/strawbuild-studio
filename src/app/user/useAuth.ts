import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { useAuthActions } from './store'
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient'

export function useAuth() {
  const { setUser, setLoading } = useAuthActions()
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    const supabase = getSupabaseClient()

    const hash = window.location.hash
    const hashParams = new URLSearchParams(hash.slice(1))
    const hasHashToken = hash.includes('access_token')
    const hashType = hashParams.get('type')

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? ''
        })

        if (hasHashToken) {
          if (hashType === 'recovery') {
            // Password reset flow - navigate to update-password modal
            void navigate('/auth/update-password', {
              state: { backgroundLocation: { ...location, pathname: '/', search: '', hash: '' } },
              replace: true
            })
          } else {
            // Email confirmation flow - show success toast
            toast.success(t($ => $.auth.confirmationSuccess))
          }
          // Clean hash from URL
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
  }, [setUser, setLoading, t, navigate, location])
}
