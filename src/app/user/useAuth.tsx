import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { getAuthErrorMessage, getAuthErrorMessageFromCode } from './authErrors'
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

    // Check for error in URL hash (e.g., expired link)
    const hashError = hashParams.get('error')
    const hashErrorCode = hashParams.get('error_code')

    if (hashError && hashErrorCode) {
      toast.error(getAuthErrorMessageFromCode(hashErrorCode, t), {
        duration: Infinity,
        closeButton: true,
        id: 'auth-error'
      })
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      setUser(null)
      setLoading(false)
      return
    }

    const hasHashToken = hash.includes('access_token')
    const hashType = hashParams.get('type')

    void supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        toast.error(getAuthErrorMessage(error, t), {
          duration: Infinity,
          closeButton: true,
          id: 'auth-error'
        })
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
        setUser(null)
        setLoading(false)
        return
      }

      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? ''
        })

        if (hasHashToken) {
          if (hashType === 'recovery') {
            void navigate('/auth/update-password', {
              state: { backgroundLocation: { ...location, pathname: '/', search: '', hash: '' } },
              replace: true
            })
          } else {
            toast.success(
              t($ => $.auth.confirmationSuccess),
              { id: 'auth-success' }
            )
          }
          window.history.replaceState(null, '', window.location.pathname + window.location.search)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
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
