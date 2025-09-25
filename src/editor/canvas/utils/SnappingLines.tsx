import React from 'react'
import { Group, Line } from 'react-konva/lib/ReactKonvaCore'

import { useStageHeight, useStageWidth, useZoom } from '@/editor/hooks/useViewportStore'
import type { SnapResult } from '@/editor/services/snapping/types'
import { COLORS } from '@/shared/theme/colors'

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

  const lines = snapResult.lines.map(l => [
    l.point[0] - lineExtend * l.direction[0],
    l.point[1] - lineExtend * l.direction[1],
    l.point[0] + lineExtend * l.direction[0],
    l.point[1] + lineExtend * l.direction[1]
  ])

  return (
    <Group>
      {lines.map((line, index) => (
        <Line
          key={`snap-line-${index}`}
          points={line}
          stroke={COLORS.snapping.lines}
          strokeWidth={scaledSnapLineWidth}
          opacity={0.5}
          listening={false}
        />
      ))}
    </Group>
  )
}
