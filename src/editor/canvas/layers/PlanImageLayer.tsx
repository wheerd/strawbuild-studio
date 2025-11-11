import 'konva/lib/shapes/Image'
import { Image as KonvaImage, Layer } from 'react-konva/lib/ReactKonvaCore'
import useImage from 'use-image'

import { useActiveStoreyId } from '@/building/store'
import { useFloorPlanForStorey } from '@/editor/plan-overlay/store'

interface PlanImageLayerProps {
  placement: 'under' | 'over'
}

export function PlanImageLayer({ placement }: PlanImageLayerProps): React.JSX.Element | null {
  const activeStoreyId = useActiveStoreyId()
  const plan = useFloorPlanForStorey(activeStoreyId)

  const [image] = useImage(plan?.image.url ?? '', 'anonymous')

  if (!plan || plan.placement !== placement || !image) {
    return null
  }

  const mmPerPixel = plan.calibration.mmPerPixel
  const worldWidth = plan.image.width * mmPerPixel
  const worldHeight = plan.image.height * mmPerPixel
  const worldX = plan.origin.world.x - plan.origin.image.x * mmPerPixel
  const worldY = plan.origin.world.y + plan.origin.image.y * mmPerPixel

  return (
    <Layer name={`plan-image-${placement}`} listening={false} opacity={plan.opacity}>
      <KonvaImage
        image={image}
        x={worldX}
        y={worldY}
        width={worldWidth}
        height={worldHeight}
        scaleY={-1}
        listening={false}
      />
    </Layer>
  )
}
