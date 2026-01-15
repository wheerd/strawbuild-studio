import { useRoofsOfActiveStorey } from '@/building/store'
import { SvgRoofGhostShape } from '@/editor/canvas/shapes/RoofGhostShape'
import { RoofShape } from '@/editor/canvas/shapes/RoofShape'
import { useViewMode } from '@/editor/hooks/useViewMode'

export function RoofLayer(): React.JSX.Element | null {
  const roofs = useRoofsOfActiveStorey()
  const mode = useViewMode()

  // In walls mode, only show dashed outlines
  if (mode === 'walls') {
    if (roofs.length === 0) {
      return null
    }

    return (
      <g data-layer="roofs">
        {roofs.map(roof => (
          <SvgRoofGhostShape key={roof.id} roof={roof} />
        ))}
      </g>
    )
  }

  // In roofs mode, show full details
  if (mode === 'roofs') {
    return (
      <g data-layer="roofs">
        {roofs.map(roof => (
          <RoofShape key={roof.id} roof={roof} />
        ))}
      </g>
    )
  }

  // In floors mode, don't show roofs
  return null
}
