import { useRoofsOfActiveStorey } from '@/building/store'
import { useViewMode } from '@/editor/hooks/useViewMode'
import { SvgRoofGhostShape } from '@/editor/shapes/RoofGhostShape'
import { RoofShape } from '@/editor/shapes/RoofShape'

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
