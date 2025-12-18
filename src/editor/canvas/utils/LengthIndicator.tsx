import type Konva from 'konva'
import { useMemo, useRef } from 'react'
import { Group, Line, Text } from 'react-konva/lib/ReactKonvaCore'

import { type Vec2, distVec2, newVec2, normVec2, scaleAddVec2, scaleVec2, subVec2 } from '@/shared/geometry'
import { angle, midpoint, perpendicularCCW } from '@/shared/geometry'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'
import { formatLength } from '@/shared/utils/formatting'

interface LengthIndicatorProps {
  startPoint: Vec2
  endPoint: Vec2
  label?: string
  offset?: number
  color?: string
  fontSize?: number
  strokeWidth?: number
}

export function LengthIndicator({
  startPoint,
  endPoint,
  label,
  offset = 50,
  color,
  fontSize = 40,
  strokeWidth = 10
}: LengthIndicatorProps): React.JSX.Element {
  const theme = useCanvasTheme()
  const textRef = useRef<Konva.Text>(null)
  const actualColor = color ?? theme.textSecondary

  // Calculate the measurement vector and length
  const measurementVector = subVec2(endPoint, startPoint)
  const measurementLength = distVec2(startPoint, endPoint)
  let dir = normVec2(measurementVector)

  // Calculate text rotation angle
  const measurementAngle = measurementLength > 0 ? angle(startPoint, endPoint) : 0
  let angleDegrees = (measurementAngle * 180) / Math.PI

  // Keep text readable (between -90 and +90 degrees)
  if (angleDegrees > 90) {
    ;[endPoint, startPoint] = [startPoint, endPoint]
    dir = scaleVec2(dir, -1)
    offset = -offset
    angleDegrees -= 180
  } else if (angleDegrees < -90) {
    ;[endPoint, startPoint] = [startPoint, endPoint]
    dir = scaleVec2(dir, -1)
    offset = -offset
    angleDegrees += 180
  }

  // Auto-generate label if not provided
  const displayLabel = label ?? formatLength(measurementLength)

  // Calculate optimal font size (max 1/3 of line width)
  const maxTextWidth = measurementLength / 3
  const estimatedTextWidth = displayLabel.length * fontSize * 0.6 // Rough estimate
  const scaledFontSize =
    estimatedTextWidth > maxTextWidth ? Math.max(12, fontSize * (maxTextWidth / estimatedTextWidth)) : fontSize

  const textSize: { width: number; height: number } = useMemo(() => {
    if (textRef?.current) {
      return textRef.current.measureSize(displayLabel)
    }
    // Fallback estimate if ref not available yet
    return { width: displayLabel.length * scaledFontSize * 0.6, height: scaledFontSize }
  }, [textRef?.current, displayLabel, scaledFontSize])

  // Fixed line widths and sizes
  const connectionStrokeWidth = strokeWidth / 2
  const actualEndMarkerSize = textSize.height

  // Get the perpendicular vector for offset
  const perpendicular = measurementLength > 0 ? perpendicularCCW(dir) : newVec2(0, 0)

  // Calculate offset positions
  const offsetStartPoint = scaleAddVec2(startPoint, perpendicular, offset)
  const offsetEndPoint = scaleAddVec2(endPoint, perpendicular, offset)

  const lineMidpoint = midpoint(offsetStartPoint, offsetEndPoint)

  // Calculate end marker positions (perpendicular to measurement line)
  const endMarkerDirection = scaleVec2(perpendicular, actualEndMarkerSize / 2)

  const leftEndpoint = scaleAddVec2(lineMidpoint, dir, -textSize.width * 0.6)
  const rightEndpoint = scaleAddVec2(lineMidpoint, dir, textSize.width * 0.6)

  return (
    <Group listening={false}>
      {/* Main dimension line */}
      <Line
        points={[offsetStartPoint[0], offsetStartPoint[1], leftEndpoint[0], leftEndpoint[1]]}
        stroke={actualColor}
        strokeWidth={strokeWidth}
        lineCap="butt"
        listening={false}
      />
      <Line
        points={[rightEndpoint[0], rightEndpoint[1], offsetEndPoint[0], offsetEndPoint[1]]}
        stroke={actualColor}
        strokeWidth={strokeWidth}
        lineCap="butt"
        listening={false}
      />

      {/* Connection lines from measurement points to dimension line */}
      <Line
        points={[startPoint[0], startPoint[1], offsetStartPoint[0], offsetStartPoint[1]]}
        stroke={actualColor}
        strokeWidth={connectionStrokeWidth}
        lineCap="butt"
        opacity={0.5}
        listening={false}
      />
      <Line
        points={[endPoint[0], endPoint[1], offsetEndPoint[0], offsetEndPoint[1]]}
        stroke={actualColor}
        strokeWidth={connectionStrokeWidth}
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
        stroke={actualColor}
        strokeWidth={strokeWidth}
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
        stroke={actualColor}
        strokeWidth={strokeWidth}
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
        fill={actualColor}
        align="center"
        verticalAlign="middle"
        width={measurementLength}
        offsetY={scaledFontSize / 2}
        rotation={angleDegrees}
        scaleY={-1}
        shadowColor={theme.white}
        shadowBlur={4}
        shadowOpacity={0.8}
        listening={false}
      />
    </Group>
  )
}
