import { useActiveStoreyId } from '@/building/store'
import { useFloorPlanForStorey } from '@/editor/plan-overlay/store'

export function PlanImageLayer({ placement }: { placement: 'under' | 'over' }): React.JSX.Element | null {
  const activeStoreyId = useActiveStoreyId()
  const plan = useFloorPlanForStorey(activeStoreyId)

  if (plan?.placement !== placement || !plan.image.url) {
    return null
  }

  const mmPerPixel = plan.calibration.mmPerPixel
  const worldWidth = plan.image.width * mmPerPixel
  const worldHeight = plan.image.height * mmPerPixel
  const worldX = plan.origin.world.x - plan.origin.image.x * mmPerPixel
  const worldY = plan.origin.world.y + plan.origin.image.y * mmPerPixel

  return (
    <g data-layer={`plan-image-${placement}`} className="pointer-events-none" opacity={plan.opacity}>
      <image
        href={plan.image.url}
        x={worldX}
        y={worldY}
        width={worldWidth}
        height={worldHeight}
        transform={`scale(1, -1) translate(0, ${-2 * worldY - worldHeight})`}
        crossOrigin="anonymous"
      />
    </g>
  )
}
