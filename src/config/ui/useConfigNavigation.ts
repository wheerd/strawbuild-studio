import { useNavigate } from 'react-router-dom'

export type ConfigTab =
  | 'materials'
  | 'layers'
  | 'ringbeams'
  | 'perimeter-walls'
  | 'interior-walls'
  | 'floors'
  | 'roofs'
  | 'openings'

export function useConfigNavigation() {
  const navigate = useNavigate()

  const navigateToConfig = async (tab: ConfigTab, itemId?: string) => {
    if (itemId) {
      await navigate(`/config/${tab}/${itemId}`)
    } else {
      await navigate(`/config/${tab}`)
    }
  }

  return { navigateToConfig }
}
