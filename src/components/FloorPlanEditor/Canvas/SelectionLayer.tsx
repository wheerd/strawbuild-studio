import React from 'react'
import { Layer, Circle } from 'react-konva'
import { useShowSnapPreview, useSnapPreviewPoint } from '../hooks/useEditorStore'

export function SelectionLayer (): React.JSX.Element {
  const showSnapPreview = useShowSnapPreview()
  const snapPreviewPoint = useSnapPreviewPoint()

  return (
    <Layer name='selection'>
      {showSnapPreview && (snapPreviewPoint != null) && (
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