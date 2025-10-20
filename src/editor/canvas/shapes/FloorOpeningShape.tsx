import { useMemo } from 'react'
import { Group, Line } from 'react-konva/lib/ReactKonvaCore'

import type { FloorOpening } from '@/building/model/model'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'

interface FloorOpeningShapeProps {
  opening: FloorOpening
}

export function FloorOpeningShape({ opening }: FloorOpeningShapeProps): React.JSX.Element {
  const theme = useCanvasTheme()
  const points = opening.area.points.flatMap(point => [point[0], point[1]])
  // Pre-render a subtle diagonal hatch so openings stay visible against the floor.
  const hatchPattern = useMemo(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return null
    }

    const size = 400
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size

    const context = canvas.getContext('2d')
    if (!context) {
      return null
    }

    context.clearRect(0, 0, size, size)
    context.strokeStyle = theme.warning
    context.lineWidth = 20
    context.lineCap = 'round'

    const spacing = size / 2
    for (let offset = -size; offset <= size; offset += spacing) {
      context.beginPath()
      context.moveTo(offset, size)
      context.lineTo(offset + size, 0)
      context.stroke()
    }

    for (let offset = -size; offset <= size; offset += spacing) {
      context.beginPath()
      context.moveTo(offset, 0)
      context.lineTo(offset + size, size)
      context.stroke()
    }

    context.globalAlpha = 1

    const image = new window.Image()
    image.width = size
    image.height = size
    image.src = canvas.toDataURL()

    return image
  }, [theme.bgCanvas, theme.warning])

  return (
    <Group
      name={`floor-opening-${opening.id}`}
      entityId={opening.id}
      entityType="floor-opening"
      parentIds={[]}
      listening
    >
      <Line
        points={points}
        closed
        fill={hatchPattern ? undefined : theme.bgCanvas}
        fillPatternImage={hatchPattern ?? undefined}
        fillPatternRepeat="repeat"
        stroke={theme.warning}
        dash={[80, 40]}
        strokeWidth={10}
        listening
      />
    </Group>
  )
}
