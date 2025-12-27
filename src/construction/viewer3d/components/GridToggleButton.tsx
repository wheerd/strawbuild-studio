import { FrameIcon } from '@radix-ui/react-icons'
import { IconButton } from '@radix-ui/themes'

import { useGrid3DActions, useShowGrid3D } from '@/construction/viewer3d/hooks/useGrid3D'

export function GridToggleButton(): React.JSX.Element {
  const showGrid = useShowGrid3D()
  const { toggleGrid } = useGrid3DActions()

  return (
    <IconButton
      size="1"
      variant={showGrid ? 'solid' : 'outline'}
      title={showGrid ? 'Hide Grid' : 'Show Grid'}
      onClick={toggleGrid}
    >
      <FrameIcon />
    </IconButton>
  )
}
