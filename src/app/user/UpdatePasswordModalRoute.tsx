import { useLocation, useNavigate } from 'react-router-dom'

import { UpdatePasswordModal } from './UpdatePasswordModal'

export function UpdatePasswordModalRoute(): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()

  const state = location.state as { backgroundLocation?: Location } | null
  const backgroundLocation = state?.backgroundLocation

  const handleOpenChange = (open: boolean): void => {
    if (!open) {
      void navigate(backgroundLocation?.pathname ?? '/', { replace: true })
    }
  }

  return <UpdatePasswordModal isOpen onOpenChange={handleOpenChange} />
}
