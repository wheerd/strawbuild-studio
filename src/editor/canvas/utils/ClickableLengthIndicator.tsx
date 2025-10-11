import type Konva from 'konva'
import { useMemo, useRef, useState } from 'react'
import { Group, Line, Text } from 'react-konva/lib/ReactKonvaCore'

import { add, angle, distance, midpoint, normalize, perpendicularCCW, scale, subtract } from '@/shared/geometry'
import type { Length, Vec2 } from '@/shared/geometry'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'
import { formatLength } from '@/shared/utils/formatLength'

interface ClickableLengthIndicatorProps {
  startPoint: Vec2
  endPoint: Vec2
  label?: string
  offset?: number
  color?: string
  fontSize?: number
  strokeWidth?: number
  onClick?: (currentMeasurement: Length) => void
}

export function ClickableLengthIndicator({
  startPoint,
  endPoint,
  label,
  offset = 50,
  color,
  fontSize = 40,
  strokeWidth = 10,
  onClick
}: ClickableLengthIndicatorProps): React.JSX.Element {
  const theme = useCanvasTheme()
  const textRef = useRef<Konva.Text>(null)
  const [isHovered, setIsHovered] = useState(false)

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
  const perpendicular = measurementLength > 0 ? perpendicularCCW(dir) : [0, 0]

  // Calculate offset positions
  const offsetStartPoint = add(startPoint, scale(perpendicular, offset))
  const offsetEndPoint = add(endPoint, scale(perpendicular, offset))

  const lineMidpoint = midpoint(offsetStartPoint, offsetEndPoint)

  // Calculate end marker positions (perpendicular to measurement line)
  const endMarkerDirection = scale(perpendicular, actualEndMarkerSize / 2)

  const leftEndpoint = add(lineMidpoint, scale(dir, -textSize.width * 0.6))
  const rightEndpoint = add(lineMidpoint, scale(dir, textSize.width * 0.6))

  // Visual feedback colors
  const actualColor = color ?? theme.textSecondary
  const displayColor = isHovered ? theme.primary : actualColor

  const handleClick = () => {
    if (onClick) {
      onClick(measurementLength)
    }
  }

  const handleMouseEnter = () => {
    if (onClick) {
      setIsHovered(true)
    }
  }

  const handleMouseLeave = () => {
    if (onClick) {
      setIsHovered(false)
    }
  }

  return (
    <Group listening={!!onClick} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onClick={handleClick}>
      {/* Invisible hit area covering the entire indicator */}
      {onClick && (
        <Line
          points={[
            offsetStartPoint[0] - endMarkerDirection[0],
            offsetStartPoint[1] - endMarkerDirection[1],
            offsetStartPoint[0] + endMarkerDirection[0],
            offsetStartPoint[1] + endMarkerDirection[1],
            offsetEndPoint[0] + endMarkerDirection[0],
            offsetEndPoint[1] + endMarkerDirection[1],
            offsetEndPoint[0] - endMarkerDirection[0],
            offsetEndPoint[1] - endMarkerDirection[1]
          ]}
          fill="transparent"
          stroke="transparent"
          closed
          listening
        />
      )}

      {/* Main dimension line */}
      <Line
        points={[offsetStartPoint[0], offsetStartPoint[1], leftEndpoint[0], leftEndpoint[1]]}
        stroke={displayColor}
        strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
        lineCap="butt"
        listening={!!onClick}
      />
      <Line
        points={[rightEndpoint[0], rightEndpoint[1], offsetEndPoint[0], offsetEndPoint[1]]}
        stroke={displayColor}
        strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
        lineCap="butt"
        listening={!!onClick}
      />

      {/* Connection lines from measurement points to dimension line */}
      <Line
        points={[startPoint[0], startPoint[1], offsetStartPoint[0], offsetStartPoint[1]]}
        stroke={displayColor}
        strokeWidth={connectionStrokeWidth}
        lineCap="butt"
        opacity={0.5}
        listening={!!onClick}
      />
      <Line
        points={[endPoint[0], endPoint[1], offsetEndPoint[0], offsetEndPoint[1]]}
        stroke={displayColor}
        strokeWidth={connectionStrokeWidth}
        lineCap="butt"
        opacity={0.5}
        listening={!!onClick}
      />

      {/* End markers (small perpendicular lines) */}
      <Line
        points={[
          offsetStartPoint[0] - endMarkerDirection[0],
          offsetStartPoint[1] - endMarkerDirection[1],
          offsetStartPoint[0] + endMarkerDirection[0],
          offsetStartPoint[1] + endMarkerDirection[1]
        ]}
        stroke={displayColor}
        strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
        lineCap="butt"
        listening={!!onClick}
      />
      <Line
        points={[
          offsetEndPoint[0] - endMarkerDirection[0],
          offsetEndPoint[1] - endMarkerDirection[1],
          offsetEndPoint[0] + endMarkerDirection[0],
          offsetEndPoint[1] + endMarkerDirection[1]
        ]}
        stroke={displayColor}
        strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
        lineCap="butt"
        listening={!!onClick}
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
        fill={displayColor}
        align="center"
        verticalAlign="middle"
        width={measurementLength}
        offsetY={scaledFontSize / 2}
        rotation={angleDegrees}
        scaleY={-1}
        shadowColor="white"
        shadowBlur={4}
        shadowOpacity={0.8}
        listening={!!onClick}
      />
    </Group>
  )
}
