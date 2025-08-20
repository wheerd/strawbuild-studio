import React from 'react'
import { Layer, Circle } from 'react-konva'
import { useShowSnapPreview, useSnapPreviewPoint, useActiveTool } from '@/components/FloorPlanEditor/hooks/useEditorStore'

export function SelectionLayer (): React.JSX.Element {
  const showSnapPreview = useShowSnapPreview()
  const snapPreviewPoint = useSnapPreviewPoint()
  const activeTool = useActiveTool()

  return (
    <Layer name='selection'>
      {showSnapPreview && (snapPreviewPoint != null) && activeTool === 'wall' && (
        <Circle
          x={snapPreviewPoint.x}
          y={snapPreviewPoint.y}
          radius={8}
          fill='transparent'
          stroke='#007acc'
          strokeWidth={2}
          listening={false}
        />
      )}
    </Layer>
  )
}
