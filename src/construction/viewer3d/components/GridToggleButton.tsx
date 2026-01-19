import { FrameIcon } from '@radix-ui/react-icons'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useGrid3DActions, useShowGrid3D } from '@/construction/viewer3d/hooks/useGrid3D'

export function GridToggleButton(): React.JSX.Element {
  const { t } = useTranslation('viewer')
  const showGrid = useShowGrid3D()
  const { toggleGrid } = useGrid3DActions()

  return (
    <Button
      variant={showGrid ? 'default' : 'outline'}
      size="icon"
      className="h-8 w-8"
      title={showGrid ? t($ => $.grid.hide) : t($ => $.grid.show)}
      onClick={toggleGrid}
    >
      <FrameIcon />
    </Button>
  )
}
