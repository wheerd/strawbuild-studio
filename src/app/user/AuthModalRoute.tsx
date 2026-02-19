import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { AuthModal } from './AuthModal'
import type { AuthView } from './types'

const VALID_TABS: AuthView[] = ['sign-in', 'sign-up', 'forgot-password']

export function AuthModalRoute(): React.JSX.Element {
  const { tab } = useParams<{ tab: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  const state = location.state as { backgroundLocation?: Location } | null
  const backgroundLocation = state?.backgroundLocation

  const currentTab: AuthView = VALID_TABS.includes(tab as AuthView) ? (tab as AuthView) : 'sign-in'

  const handleOpenChange = (open: boolean): void => {
    if (!open) {
      void navigate(backgroundLocation?.pathname ?? '/', { replace: true })
    }
  }

  const handleTabChange = (newTab: AuthView): void => {
    void navigate(`/auth/${newTab}`, {
      state: { backgroundLocation },
      replace: true
    })
  }

  return <AuthModal isOpen onOpenChange={handleOpenChange} currentTab={currentTab} onTabChange={handleTabChange} />
}
