import React from 'react'

import type { Vec2 } from '@/shared/geometry'

interface SvgMeasurementIndicatorProps {
  startPoint: Vec2 // SVG coordinates [x, y]
  endPoint: Vec2 // SVG coordinates [x, y]
  label: string
  offset?: number // SVG units offset
  color?: string
  fontSize?: number
  strokeWidth?: number
  className?: string
}

export function SvgMeasurementIndicator({
  startPoint,
  endPoint,
  label,
  className,
  offset = 50,
  color = 'var(--color-primary)',
  fontSize = 40,
  strokeWidth = 10
}: SvgMeasurementIndicatorProps): React.JSX.Element {
  // Calculate measurement vector and length
  const dx = endPoint[0] - startPoint[0]
  const dy = endPoint[1] - startPoint[1]
  const length = Math.sqrt(dx * dx + dy * dy)

  if (length === 0) {
    return <g />
  }

  // Normalize direction vector
  const dirX = dx / length
  const dirY = dy / length

  // Calculate perpendicular vector for offset
  const perpX = -dirY
  const perpY = dirX

  // Calculate offset positions using offset parameter
  const offsetStartX = startPoint[0] + perpX * offset
  const offsetStartY = startPoint[1] + perpY * offset
  const offsetEndX = endPoint[0] + perpX * offset
  const offsetEndY = endPoint[1] + perpY * offset

  // Calculate text angle for rotation
  let textAngle = (Math.atan2(dy, dx) * 180) / Math.PI

  // Keep text readable
  if (textAngle > 90) {
    textAngle -= 180
  } else if (textAngle < -90) {
    textAngle += 180
  }

  // Calculate text position (middle of offset line)
  const textX = (offsetStartX + offsetEndX) / 2
  const textY = (offsetStartY + offsetEndY) / 2

  // Calculate end marker size and positions
  const endMarkerSize = fontSize / 2
  const endMarkerDirection = [perpX, perpY]

  // Calculate connection line stroke width
  const connectionStrokeWidth = strokeWidth / 2

  // Calculate line gap for text similar to canvas version
  let actualFontSize = fontSize
  let gapHalfWidth = label.length * actualFontSize * 0.6 * 0.6
  while (gapHalfWidth >= length / 3) {
    actualFontSize *= 0.9
    const estimatedTextWidth = label.length * actualFontSize * 0.6
    gapHalfWidth = estimatedTextWidth * 0.6
  }

  // Calculate left and right endpoints for line gap
  const leftEndpointX = textX - gapHalfWidth * dirX
  const leftEndpointY = textY - gapHalfWidth * dirY
  const rightEndpointX = textX + gapHalfWidth * dirX
  const rightEndpointY = textY + gapHalfWidth * dirY

  return (
    <g className={className}>
      {/* Connection lines from measurement points to dimension line */}

      <line
        x1={startPoint[0]}
        y1={startPoint[1]}
        x2={offsetStartX}
        y2={offsetStartY}
        stroke={color}
        strokeWidth={connectionStrokeWidth}
        opacity={0.5}
      />
      <line
        x1={endPoint[0]}
        y1={endPoint[1]}
        x2={offsetEndX}
        y2={offsetEndY}
        stroke={color}
        strokeWidth={connectionStrokeWidth}
        opacity={0.5}
      />

      {/* Main dimension line with gap for text */}
      <line
        x1={offsetStartX}
        y1={offsetStartY}
        x2={leftEndpointX}
        y2={leftEndpointY}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <line
        x1={rightEndpointX}
        y1={rightEndpointY}
        x2={offsetEndX}
        y2={offsetEndY}
        stroke={color}
        strokeWidth={strokeWidth}
      />

      {/* End markers */}
      <line
        x1={offsetStartX - endMarkerDirection[0] * endMarkerSize}
        y1={offsetStartY - endMarkerDirection[1] * endMarkerSize}
        x2={offsetStartX + endMarkerDirection[0] * endMarkerSize}
        y2={offsetStartY + endMarkerDirection[1] * endMarkerSize}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <line
        x1={offsetEndX - endMarkerDirection[0] * endMarkerSize}
        y1={offsetEndY - endMarkerDirection[1] * endMarkerSize}
        x2={offsetEndX + endMarkerDirection[0] * endMarkerSize}
        y2={offsetEndY + endMarkerDirection[1] * endMarkerSize}
        stroke={color}
        strokeWidth={strokeWidth}
      />

      {/* Label text */}
      <g className="text" transform={`translate( ${textX} ${textY}) rotate(${textAngle})`}>
        <text
          x={0}
          y={0}
          fontSize={actualFontSize}
          fontFamily="Arial"
          fontWeight="bold"
          fill={color}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            filter: 'drop-shadow(2px 2px 4px rgba(255, 255, 255, 0.8))'
          }}
        >
          {label}
        </text>
      </g>
    </g>
  )
}
