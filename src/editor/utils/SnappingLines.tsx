import React from 'react'

import { useStageHeight, useStageWidth, useZoom } from '@/editor/hooks/useViewportStore'
import type { SnapResult } from '@/editor/services/snapping/types'
import { eqVec2, newVec2 } from '@/shared/geometry'

interface SnappingLinesProps {
  snapResult: SnapResult | null | undefined
}

export function SnappingLines({ snapResult }: SnappingLinesProps): React.JSX.Element | null {
  const zoom = useZoom()
  const stageWidth = useStageWidth()
  const stageHeight = useStageHeight()

  if (!snapResult?.lines?.length) {
    return null
  }

  // Calculate zoom-responsive values
  const scaledSnapLineWidth = Math.max(1, 2 / zoom)
  const lineExtend = (Math.max(stageWidth, stageHeight) * 2) / zoom

  return (
    <g pointerEvents="none">
      {snapResult.lines.map((line, index) => {
        const color = eqVec2(line.direction, newVec2(0, 1))
          ? 'var(--color-red-800)'
          : eqVec2(line.direction, newVec2(1, 0))
            ? 'var(--color-green-800)'
            : 'var(--color-primary-900)'
        return (
          <line
            key={`snap-line-${index}`}
            x1={line.point[0] - lineExtend * line.direction[0]}
            y1={line.point[1] - lineExtend * line.direction[1]}
            x2={line.point[0] + lineExtend * line.direction[0]}
            y2={line.point[1] + lineExtend * line.direction[1]}
            stroke={color}
            strokeWidth={scaledSnapLineWidth}
            opacity={0.5}
          />
        )
      })}
    </g>
  )
}
