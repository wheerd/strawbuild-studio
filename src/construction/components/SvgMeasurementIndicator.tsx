import React from 'react'

import { type Vec2 } from '@/shared/geometry'

export type LabelOrientation = 'parallel' | 'perpendicular' | 'outside-start' | 'outside-end'

export interface SvgMeasurementIndicatorProps {
  startPoint: Vec2 // SVG coordinates [x, y]
  endPoint: Vec2 // SVG coordinates [x, y]
  label: string
  offset?: number // SVG units offset
  labelOrientation?: LabelOrientation
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
  labelOrientation = 'parallel',
  color = 'var(--color-foreground)',
  fontSize = 40,
  strokeWidth = 10
}: SvgMeasurementIndicatorProps): React.JSX.Element {
  const lines = label.split('\n')
  const lineCount = lines.length
  const longestLineLength = lines.reduce((max, line) => Math.max(max, line.length), 0)

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
  const lineAngleRad = Math.atan2(dy, dx)
  let textAngleRad = lineAngleRad

  if (labelOrientation === 'perpendicular') {
    textAngleRad += Math.PI / 2
  }

  // Keep text readable
  while (textAngleRad > Math.PI / 2) {
    textAngleRad -= Math.PI
  }
  while (textAngleRad <= -Math.PI / 2) {
    textAngleRad += Math.PI
  }

  const textAngle = (textAngleRad * 180) / Math.PI

  // Calculate text position (middle of offset line)
  const textX =
    labelOrientation === 'outside-start'
      ? offsetStartX
      : labelOrientation === 'outside-end'
        ? offsetEndX
        : (offsetStartX + offsetEndX) / 2
  const textY =
    labelOrientation === 'outside-start'
      ? offsetStartY
      : labelOrientation === 'outside-end'
        ? offsetEndY
        : (offsetStartY + offsetEndY) / 2

  // Calculate end marker size and positions
  const endMarkerSize = fontSize / 2
  const endMarkerDirection = [perpX, perpY]

  // Calculate connection line stroke width
  const connectionStrokeWidth = strokeWidth / 2

  // Calculate line gap for text
  const TEXT_WIDTH_FACTOR = 0.6
  const GAP_FACTOR = 0.6
  const LINE_HEIGHT_FACTOR = 1.2
  const angleDelta = Math.atan2(Math.sin(textAngleRad - lineAngleRad), Math.cos(textAngleRad - lineAngleRad))

  const computeGapHalfWidth = (size: number): number => {
    if (lineCount === 0) {
      return 0
    }

    const estimatedTextWidth = longestLineLength * size * TEXT_WIDTH_FACTOR
    const estimatedTextHeight = size + (lineCount - 1) * size * LINE_HEIGHT_FACTOR
    const projectedLength =
      Math.abs(estimatedTextWidth * Math.cos(angleDelta)) + Math.abs(estimatedTextHeight * Math.sin(angleDelta))

    return projectedLength * GAP_FACTOR
  }

  let actualFontSize = fontSize
  let gapHalfWidth = computeGapHalfWidth(actualFontSize)
  if (labelOrientation !== 'outside-start' && labelOrientation !== 'outside-end') {
    while (gapHalfWidth >= length / 3) {
      actualFontSize *= 0.9
      gapHalfWidth = computeGapHalfWidth(actualFontSize)
    }
  } else {
    actualFontSize = fontSize * 0.8
    gapHalfWidth = 0
  }

  // Calculate left and right endpoints for line gap
  const leftEndpointX = textX - gapHalfWidth * dirX
  const leftEndpointY = textY - gapHalfWidth * dirY
  const rightEndpointX = textX + gapHalfWidth * dirX
  const rightEndpointY = textY + gapHalfWidth * dirY
  const verticalOffset = ((lineCount - 1) * actualFontSize * LINE_HEIGHT_FACTOR) / 2

  return (
    <g className={`measurement ${className}`}>
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
        x2={leftEndpointX}
        y2={leftEndpointY}
        stroke={color}
        strokeWidth={strokeWidth}
        opacity={0.2}
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
      <g className="text" transform={`translate(${textX} ${textY}) rotate(${textAngle})`}>
        <text
          y={0}
          fontSize={actualFontSize}
          fontWeight="bold"
          fill={color}
          textAnchor={
            labelOrientation === 'outside-start' ? 'end' : labelOrientation === 'outside-end' ? 'start' : 'middle'
          }
          dominantBaseline={
            labelOrientation === 'outside-start' || labelOrientation === 'outside-end' ? 'text-after-edge' : 'central'
          }
          transform={`translate(0 ${-verticalOffset})`}
        >
          {lines.map((line, index) => (
            <tspan
              key={`line-${index}`}
              x={
                labelOrientation === 'outside-start'
                  ? -strokeWidth
                  : labelOrientation === 'outside-end'
                    ? strokeWidth
                    : 0
              }
              dy={index === 0 ? 0 : `${LINE_HEIGHT_FACTOR}em`}
            >
              {line}
            </tspan>
          ))}
        </text>
      </g>
    </g>
  )
}
