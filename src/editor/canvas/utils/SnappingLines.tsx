import React from 'react'
import { Group, Line } from 'react-konva/lib/ReactKonvaCore'

import { useStageHeight, useStageWidth, useZoom } from '@/editor/hooks/useViewportStore'
import type { SnapResult } from '@/editor/services/snapping/types'
import { eqVec2, newVec2 } from '@/shared/geometry'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'

interface SnappingLinesProps {
  snapResult: SnapResult | null | undefined
}

export function SnappingLines({ snapResult }: SnappingLinesProps): React.JSX.Element | null {
  const zoom = useZoom()
  const theme = useCanvasTheme()
  const stageWidth = useStageWidth()
  const stageHeight = useStageHeight()

  if (!snapResult?.lines?.length) {
    return null
  }

  // Calculate zoom-responsive values
  const scaledSnapLineWidth = Math.max(1, 2 / zoom)
  const lineExtend = (Math.max(stageWidth, stageHeight) * 2) / zoom

  return (
    <Group>
      {snapResult.lines.map((line, index) => {
        const color = eqVec2(line.direction, newVec2(0, 1))
          ? theme.gridVertical
          : eqVec2(line.direction, newVec2(1, 0))
            ? theme.gridHorizontal
            : theme.primary
        return (
          <Line
            key={`snap-line-${index}`}
            points={[
              line.point[0] - lineExtend * line.direction[0],
              line.point[1] - lineExtend * line.direction[1],
              line.point[0] + lineExtend * line.direction[0],
              line.point[1] + lineExtend * line.direction[1]
            ]}
            stroke={color}
            strokeWidth={scaledSnapLineWidth}
            opacity={0.5}
            listening={false}
          />
        )
      })}
    </Group>
  )
}
