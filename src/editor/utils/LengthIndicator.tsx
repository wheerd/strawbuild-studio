import { useMemo, useRef } from 'react'

import { useViewportState } from '@/editor/hooks/useViewportStore'
import {
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

interface LengthIndicatorProps {
  startPoint: Vec2
  endPoint: Vec2
  label?: string
  offset?: number
  color?: string
  fontSize?: number
  strokeWidth?: number
}

const BASE_FONT_SIZE = 60
const BASE_STROKE_WIDTH = 5

export function LengthIndicator({
  startPoint,
  endPoint,
  label,
  offset = 50,
  color,
  fontSize = BASE_FONT_SIZE,
  strokeWidth = BASE_STROKE_WIDTH
}: LengthIndicatorProps): React.JSX.Element {
  const { formatLength } = useFormatters()
  const textRef = useRef<SVGTextElement>(null)
  const { zoom } = useViewportState()

  const clampedScale = 0.2 / Math.max(0.02, Math.min(0.4, zoom))
  const scaledFontSize = fontSize * clampedScale
  let scaledOffset = offset * clampedScale
  const scaledStrokeWidth = strokeWidth * clampedScale

  const actualColor = color ?? 'var(--color-foreground)'

  const measurementVector = subVec2(endPoint, startPoint)
  const measurementLength = distVec2(startPoint, endPoint)
  let dir = normVec2(measurementVector)

  const measurementAngle = measurementLength > 0 ? dirAngle(startPoint, endPoint) : 0
  let angleDegrees = (measurementAngle * 180) / Math.PI

  if (angleDegrees > 90) {
    ;[endPoint, startPoint] = [startPoint, endPoint]
    dir = scaleVec2(dir, -1)
    scaledOffset = -scaledOffset
    angleDegrees -= 180
  } else if (angleDegrees < -90) {
    ;[endPoint, startPoint] = [startPoint, endPoint]
    dir = scaleVec2(dir, -1)
    scaledOffset = -scaledOffset
    angleDegrees += 180
  }

  const displayLabel = label ?? formatLength(measurementLength)
  const lines = displayLabel.split('\n')
  const lineCount = lines.length
  const longestLineLength = lines.reduce((max, line) => Math.max(max, line.length), 0)

  const maxTextWidth = measurementLength / 3
  const estimatedTextWidth = displayLabel.length * scaledFontSize * 0.6
  const calculatedFontSize =
    estimatedTextWidth > maxTextWidth
      ? Math.max(12, scaledFontSize * (maxTextWidth / estimatedTextWidth))
      : scaledFontSize

  const textSize: { width: number; height: number } = useMemo(() => {
    if (textRef.current) {
      return textRef.current.getBBox()
    }
    return { width: longestLineLength * calculatedFontSize * 0.6, height: lineCount * calculatedFontSize }
  }, [textRef.current, displayLabel, calculatedFontSize])

  const connectionStrokeWidth = scaledStrokeWidth / 2
  const actualEndMarkerSize = textSize.height

  const perpendicular = measurementLength > 0 ? perpendicularCCW(dir) : ZERO_VEC2

  const offsetStartPoint = scaleAddVec2(startPoint, perpendicular, scaledOffset)
  const offsetEndPoint = scaleAddVec2(endPoint, perpendicular, scaledOffset)

  const lineMidpoint = midpoint(offsetStartPoint, offsetEndPoint)

  const endMarkerDirection = scaleVec2(perpendicular, actualEndMarkerSize / 2)

  const leftEndpoint = scaleAddVec2(lineMidpoint, dir, -textSize.width * 0.6)
  const rightEndpoint = scaleAddVec2(lineMidpoint, dir, textSize.width * 0.6)

  const verticalOffset = ((lines.length - 1) * scaledFontSize * 1.2) / 2

  return (
    <g pointerEvents="none">
      <line
        x1={offsetStartPoint[0]}
        y1={offsetStartPoint[1]}
        x2={leftEndpoint[0]}
        y2={leftEndpoint[1]}
        stroke={actualColor}
        strokeWidth={scaledStrokeWidth}
        strokeLinecap="butt"
      />
      <line
        x1={rightEndpoint[0]}
        y1={rightEndpoint[1]}
        x2={offsetEndPoint[0]}
        y2={offsetEndPoint[1]}
        stroke={actualColor}
        strokeWidth={scaledStrokeWidth}
        strokeLinecap="butt"
      />

      <line
        x1={startPoint[0]}
        y1={startPoint[1]}
        x2={offsetStartPoint[0]}
        y2={offsetStartPoint[1]}
        stroke={actualColor}
        strokeWidth={connectionStrokeWidth}
        strokeLinecap="butt"
        opacity={0.5}
      />
      <line
        x1={endPoint[0]}
        y1={endPoint[1]}
        x2={offsetEndPoint[0]}
        y2={offsetEndPoint[1]}
        stroke={actualColor}
        strokeWidth={connectionStrokeWidth}
        strokeLinecap="butt"
        opacity={0.5}
      />

      <line
        x1={offsetStartPoint[0] - endMarkerDirection[0]}
        y1={offsetStartPoint[1] - endMarkerDirection[1]}
        x2={offsetStartPoint[0] + endMarkerDirection[0]}
        y2={offsetStartPoint[1] + endMarkerDirection[1]}
        stroke={actualColor}
        strokeWidth={scaledStrokeWidth}
        strokeLinecap="butt"
      />
      <line
        x1={offsetEndPoint[0] - endMarkerDirection[0]}
        y1={offsetEndPoint[1] - endMarkerDirection[1]}
        x2={offsetEndPoint[0] + endMarkerDirection[0]}
        y2={offsetEndPoint[1] + endMarkerDirection[1]}
        stroke={actualColor}
        strokeWidth={scaledStrokeWidth}
        strokeLinecap="butt"
      />

      <g
        className="text select-none"
        transform={`translate(${lineMidpoint[0]} ${lineMidpoint[1]}) rotate(${angleDegrees}) scale(1, -1)`}
      >
        <text
          ref={textRef}
          y={0}
          fontSize={calculatedFontSize}
          fontFamily="Arial"
          fontWeight="bold"
          fill={actualColor}
          textAnchor="middle"
          dominantBaseline="central"
          transform={`translate(0 ${-verticalOffset})`}
          style={{
            filter: 'drop-shadow(0 0 0.1em var(--color-background))'
          }}
        >
          {lines.map((line, index) => (
            <tspan key={`line-${index}`} x={0} dy={index === 0 ? 0 : `1.2em`}>
              {line}
            </tspan>
          ))}
        </text>
      </g>
    </g>
  )
}
