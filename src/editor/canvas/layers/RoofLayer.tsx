import { Layer } from 'react-konva/lib/ReactKonvaCore'

import { useRoofsOfActiveStorey } from '@/building/store'
import { RoofGhostShape } from '@/editor/canvas/shapes/RoofGhostShape'
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
      <Layer name="roofs">
        {roofs.map(roof => (
          <RoofGhostShape key={roof.id} roof={roof} />
        ))}
      </Layer>
    )
  }

  // In roofs mode, show full details
  if (mode === 'roofs') {
    return (
      <Layer name="roofs">
        {roofs.map(roof => (
          <RoofShape key={roof.id} roof={roof} />
        ))}
      </Layer>
    )
  }

  // In floors mode, don't show roofs
  return null
}
