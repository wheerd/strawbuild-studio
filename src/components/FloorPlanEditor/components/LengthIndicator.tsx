import { Group, Line, Text } from 'react-konva'
import { distance, subtract, normalize, perpendicularCCW, add, scale, angle, midpoint } from '@/types/geometry'
import type { Vec2 } from '@/types/geometry'
import { useViewport } from '../hooks/useEditorStore'
import { useMemo, useRef } from 'react'
import type Konva from 'konva'

interface LengthIndicatorProps {
  startPoint: Vec2
  endPoint: Vec2
  label?: string
  offset?: number
  color?: string
  fontSize?: number
  endMarkerSize?: number
  listening?: boolean
  zoom?: number
}

export function LengthIndicator({
  startPoint,
  endPoint,
  label,
  offset = 1,
  color = '#333',
  fontSize = 40
}: LengthIndicatorProps): React.JSX.Element {
  const viewport = useViewport()
  const textRef = useRef<Konva.Text>(null)

  // Calculate the measurement vector and length
  const measurementVector = subtract(endPoint, startPoint)
  const measurementLength = distance(startPoint, endPoint)
  let dir = normalize(measurementVector)

  // Calculate text rotation angle
  const measurementAngle = measurementLength > 0 ? angle(startPoint, endPoint) : 0
  let angleDegrees = (measurementAngle * 180) / Math.PI

  // Keep text readable (between -90 and +90 degrees)
  if (angleDegrees > 90) {
    ;[endPoint, startPoint] = [startPoint, endPoint]
    dir = scale(dir, -1)
    offset = -offset
    angleDegrees -= 180
  } else if (angleDegrees < -90) {
    ;[endPoint, startPoint] = [startPoint, endPoint]
    dir = scale(dir, -1)
    offset = -offset
    angleDegrees += 180
  }

  // Auto-generate label if not provided
  const displayLabel = label ?? `${(measurementLength / 1000).toFixed(2)}m`

  const textSize: { width: number; height: number } = useMemo(() => {
    if (textRef?.current) {
      return textRef.current.measureSize(displayLabel)
    }
    return { width: 0, height: 0 }
  }, [textRef?.current, viewport.zoom])

  const approximateFontSizeLimit = measurementLength / 2 / displayLabel.length

  // Scale line widths and sizes based on zoom for consistent visual appearance
  const scaledStrokeWidth = Math.max(0.5, 2 / viewport.zoom)
  const scaledConnectionStrokeWidth = Math.max(0.3, 1 / viewport.zoom)
  const scaledFontSize = Math.max(20, Math.min(approximateFontSizeLimit, fontSize / viewport.zoom))
  const scaledEndMarkerSize = textSize.height

  // Get the perpendicular vector for offset
  const perpendicular = measurementLength > 0 ? perpendicularCCW(dir) : [0, 0]

  // Calculate offset positions
  const offsetStartPoint = add(startPoint, scale(perpendicular, offset * scaledFontSize))
  const offsetEndPoint = add(endPoint, scale(perpendicular, offset * scaledFontSize))

  const lineMidpoint = midpoint(offsetStartPoint, offsetEndPoint)

  // Calculate end marker positions (perpendicular to measurement line)
  const endMarkerDirection = scale(perpendicular, scaledEndMarkerSize / 2)

  const leftEndpoint = add(lineMidpoint, scale(dir, -textSize.width * 0.6))
  const rightEndpoint = add(lineMidpoint, scale(dir, textSize.width * 0.6))

  return (
    <Group listening={false}>
      {/* Main dimension line */}
      <Line
        points={[offsetStartPoint[0], offsetStartPoint[1], leftEndpoint[0], leftEndpoint[1]]}
        stroke={color}
        strokeWidth={scaledStrokeWidth}
        lineCap="butt"
        listening={false}
      />
      <Line
        points={[rightEndpoint[0], rightEndpoint[1], offsetEndPoint[0], offsetEndPoint[1]]}
        stroke={color}
        strokeWidth={scaledStrokeWidth}
        lineCap="butt"
        listening={false}
      />

      {/* Connection lines from measurement points to dimension line */}
      <Line
        points={[startPoint[0], startPoint[1], offsetStartPoint[0], offsetStartPoint[1]]}
        stroke={color}
        strokeWidth={scaledConnectionStrokeWidth}
        lineCap="butt"
        opacity={0.5}
        listening={false}
      />
      <Line
        points={[endPoint[0], endPoint[1], offsetEndPoint[0], offsetEndPoint[1]]}
        stroke={color}
        strokeWidth={scaledConnectionStrokeWidth}
        lineCap="butt"
        opacity={0.5}
        listening={false}
      />

      {/* End markers (small perpendicular lines) */}
      <Line
        points={[
          offsetStartPoint[0] - endMarkerDirection[0],
          offsetStartPoint[1] - endMarkerDirection[1],
          offsetStartPoint[0] + endMarkerDirection[0],
          offsetStartPoint[1] + endMarkerDirection[1]
        ]}
        stroke={color}
        strokeWidth={scaledStrokeWidth}
        lineCap="butt"
        listening={false}
      />
      <Line
        points={[
          offsetEndPoint[0] - endMarkerDirection[0],
          offsetEndPoint[1] - endMarkerDirection[1],
          offsetEndPoint[0] + endMarkerDirection[0],
          offsetEndPoint[1] + endMarkerDirection[1]
        ]}
        stroke={color}
        strokeWidth={scaledStrokeWidth}
        lineCap="butt"
        listening={false}
      />

      {/* Label text */}
      <Text
        ref={textRef}
        x={offsetStartPoint[0]}
        y={offsetStartPoint[1]}
        text={displayLabel}
        fontSize={scaledFontSize}
        fontFamily="Arial"
        fontStyle="bold"
        fill={color}
        align="center"
        verticalAlign="middle"
        width={measurementLength}
        offsetY={scaledFontSize / 2}
        rotation={angleDegrees}
        shadowColor="white"
        shadowBlur={4}
        shadowOpacity={0.8}
        listening={false}
      />
    </Group>
  )
}
