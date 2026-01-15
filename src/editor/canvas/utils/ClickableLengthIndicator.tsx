import { useMemo, useRef, useState } from 'react'

import {
  type Length,
  type Vec2,
  ZERO_VEC2,
  dirAngle,
  distVec2,
  midpoint,
  normVec2,
  perpendicularCCW,
  scaleAddVec2,
  scaleVec2,
  subVec2
} from '@/shared/geometry'
import { useFormatters } from '@/shared/i18n/useFormatters'

interface ClickableLengthIndicatorProps {
  startPoint: Vec2
  endPoint: Vec2
  label?: string
  offset?: number
  color?: string
  fontSize?: number
  strokeWidth?: number
  onClick: (currentMeasurement: Length) => void
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
  const { formatLength } = useFormatters()
  const textRef = useRef<SVGTextElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  // Calculate the measurement vector and length
  const measurementVector = subVec2(endPoint, startPoint)
  const measurementLength = distVec2(startPoint, endPoint)
  let dir = normVec2(measurementVector)

  // Calculate text rotation angle
  const measurementAngle = measurementLength > 0 ? dirAngle(startPoint, endPoint) : 0
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
    if (textRef.current) {
      return textRef.current.getBBox()
    }
    // Fallback estimate if ref not available yet
    return { width: displayLabel.length * scaledFontSize * 0.6, height: scaledFontSize }
  }, [textRef.current, displayLabel, scaledFontSize])

  // Fixed line widths and sizes
  const connectionStrokeWidth = strokeWidth / 2
  const actualEndMarkerSize = textSize.height

  // Get the perpendicular vector for offset
  const perpendicular = measurementLength > 0 ? perpendicularCCW(dir) : ZERO_VEC2

  // Calculate offset positions
  const offsetStartPoint = scaleAddVec2(startPoint, perpendicular, offset)
  const offsetEndPoint = scaleAddVec2(endPoint, perpendicular, offset)

  const lineMidpoint = midpoint(offsetStartPoint, offsetEndPoint)

  // Calculate end marker positions (perpendicular to measurement line)
  const endMarkerDirection = scaleVec2(perpendicular, actualEndMarkerSize / 2)

  const leftEndpoint = scaleAddVec2(lineMidpoint, dir, -textSize.width * 0.6)
  const rightEndpoint = scaleAddVec2(lineMidpoint, dir, textSize.width * 0.6)

  // Visual feedback colors
  const actualColor = color ?? 'var(--color-text-secondary)'
  const displayColor = isHovered ? 'var(--color-primary)' : actualColor

  const handleClick = () => {
    onClick(measurementLength)
  }

  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
  }

  // Build hit area polygon points
  const hitAreaPoints = [
    `${offsetStartPoint[0] - endMarkerDirection[0]},${offsetStartPoint[1] - endMarkerDirection[1]}`,
    `${offsetStartPoint[0] + endMarkerDirection[0]},${offsetStartPoint[1] + endMarkerDirection[1]}`,
    `${offsetEndPoint[0] + endMarkerDirection[0]},${offsetEndPoint[1] + endMarkerDirection[1]}`,
    `${offsetEndPoint[0] - endMarkerDirection[0]},${offsetEndPoint[1] - endMarkerDirection[1]}`
  ].join(' ')

  const displayStrokeWidth = isHovered ? strokeWidth + 2 : strokeWidth

  return (
    <g
      style={{ cursor: 'pointer' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Invisible hit area covering the entire indicator */}
      <polygon points={hitAreaPoints} fill="transparent" stroke="transparent" />

      {/* Main dimension line */}
      <line
        x1={offsetStartPoint[0]}
        y1={offsetStartPoint[1]}
        x2={leftEndpoint[0]}
        y2={leftEndpoint[1]}
        stroke={displayColor}
        strokeWidth={displayStrokeWidth}
        strokeLinecap="butt"
      />
      <line
        x1={rightEndpoint[0]}
        y1={rightEndpoint[1]}
        x2={offsetEndPoint[0]}
        y2={offsetEndPoint[1]}
        stroke={displayColor}
        strokeWidth={displayStrokeWidth}
        strokeLinecap="butt"
      />

      {/* Connection lines from measurement points to dimension line */}
      <line
        x1={startPoint[0]}
        y1={startPoint[1]}
        x2={offsetStartPoint[0]}
        y2={offsetStartPoint[1]}
        stroke={displayColor}
        strokeWidth={connectionStrokeWidth}
        strokeLinecap="butt"
        opacity={0.5}
      />
      <line
        x1={endPoint[0]}
        y1={endPoint[1]}
        x2={offsetEndPoint[0]}
        y2={offsetEndPoint[1]}
        stroke={displayColor}
        strokeWidth={connectionStrokeWidth}
        strokeLinecap="butt"
        opacity={0.5}
      />

      {/* End markers (small perpendicular lines) */}
      <line
        x1={offsetStartPoint[0] - endMarkerDirection[0]}
        y1={offsetStartPoint[1] - endMarkerDirection[1]}
        x2={offsetStartPoint[0] + endMarkerDirection[0]}
        y2={offsetStartPoint[1] + endMarkerDirection[1]}
        stroke={displayColor}
        strokeWidth={displayStrokeWidth}
        strokeLinecap="butt"
      />
      <line
        x1={offsetEndPoint[0] - endMarkerDirection[0]}
        y1={offsetEndPoint[1] - endMarkerDirection[1]}
        x2={offsetEndPoint[0] + endMarkerDirection[0]}
        y2={offsetEndPoint[1] + endMarkerDirection[1]}
        stroke={displayColor}
        strokeWidth={displayStrokeWidth}
        strokeLinecap="butt"
      />

      {/* Label text */}
      <g
        className="text"
        transform={`translate(${lineMidpoint[0]} ${lineMidpoint[1]}) rotate(${angleDegrees}) scale(1, -1)`}
      >
        <text
          ref={textRef}
          y={0}
          fontSize={scaledFontSize}
          fontFamily="Arial"
          fontWeight="bold"
          fill={displayColor}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            filter: 'drop-shadow(0 0 0.1em var(--gray-1))'
          }}
        >
          {displayLabel}
        </text>
      </g>
    </g>
  )
}
