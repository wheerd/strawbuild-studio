import { useMemo } from 'react'

import type { ConstraintInput } from '@/building/model'
import { nodeInsidePointId, nodeSidePointId } from '@/editor/gcs/constraintTranslator'
import { useGcsBuildingConstraints, useGcsPoints } from '@/editor/gcs/store'
import { useZoom } from '@/editor/hooks/useViewportStore'
import { useFormatters } from '@/shared/i18n/useFormatters'

interface AnnotationEntry {
  key: string
  constraint: ConstraintInput
}

export function ConstraintAnnotations(): React.JSX.Element {
  const buildingConstraints = useGcsBuildingConstraints()
  const points = useGcsPoints()
  const zoom = useZoom()
  const { formatLength } = useFormatters()

  const entries: AnnotationEntry[] = useMemo(
    () => Object.entries(buildingConstraints).map(([key, c]) => ({ key, constraint: c })),
    [buildingConstraints]
  )

  return (
    <g data-layer="constraint-annotations" className="pointer-events-none">
      {entries.map(({ key, constraint }) => {
        switch (constraint.type) {
          case 'distance':
            return (
              <DistanceAnnotation
                key={key}
                constraint={constraint}
                points={points}
                zoom={zoom}
                formatLength={formatLength}
              />
            )
          case 'horizontal':
            return <HorizontalAnnotation key={key} constraint={constraint} points={points} zoom={zoom} />
          case 'vertical':
            return <VerticalAnnotation key={key} constraint={constraint} points={points} zoom={zoom} />
          case 'colinear':
            return <ColinearAnnotation key={key} constraint={constraint} points={points} zoom={zoom} />
          default:
            // Perpendicular, parallel, and angle annotations are not yet rendered
            // because they require wall line endpoint data not available in the constraint.
            return null
        }
      })}
    </g>
  )
}

// --- Shared types ---

type PointLookup = Record<string, { x: number; y: number } | undefined>

// --- Distance annotation ---

interface DistanceAnnotationProps {
  constraint: Extract<ConstraintInput, { type: 'distance' }>
  points: PointLookup
  zoom: number
  formatLength: (value: number) => string
}

function DistanceAnnotation({
  constraint,
  points,
  zoom,
  formatLength
}: DistanceAnnotationProps): React.JSX.Element | null {
  const p1 = points[nodeSidePointId(constraint.nodeA, constraint.side)]
  const p2 = points[nodeSidePointId(constraint.nodeB, constraint.side)]
  if (!p1 || !p2) return null

  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 0.001) return null

  // Perpendicular offset direction
  const nx = -dy / len
  const ny = dx / len
  const offset = 60 / zoom

  // Tick size
  const tickSize = 6 / zoom

  // Dimension line endpoints (offset from the actual wall)
  const ox1 = p1.x + nx * offset
  const oy1 = p1.y + ny * offset
  const ox2 = p2.x + nx * offset
  const oy2 = p2.y + ny * offset

  // Midpoint of dimension line for label
  const omx = (ox1 + ox2) / 2
  const omy = (oy1 + oy2) / 2

  // Angle for text rotation
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI
  if (angle > 90) angle -= 180
  if (angle < -90) angle += 180

  const fontSize = 14 / zoom
  const sw = 1.5 / zoom
  const label = formatLength(constraint.length)

  return (
    <g>
      {/* Extension lines */}
      <line x1={p1.x} y1={p1.y} x2={ox1} y2={oy1} stroke="var(--color-primary)" strokeWidth={sw * 0.5} opacity={0.4} />
      <line x1={p2.x} y1={p2.y} x2={ox2} y2={oy2} stroke="var(--color-primary)" strokeWidth={sw * 0.5} opacity={0.4} />

      {/* Dimension line */}
      <line x1={ox1} y1={oy1} x2={ox2} y2={oy2} stroke="var(--color-primary)" strokeWidth={sw} strokeLinecap="round" />

      {/* End ticks */}
      <line
        x1={ox1 - nx * tickSize}
        y1={oy1 - ny * tickSize}
        x2={ox1 + nx * tickSize}
        y2={oy1 + ny * tickSize}
        stroke="var(--color-primary)"
        strokeWidth={sw}
        strokeLinecap="round"
      />
      <line
        x1={ox2 - nx * tickSize}
        y1={oy2 - ny * tickSize}
        x2={ox2 + nx * tickSize}
        y2={oy2 + ny * tickSize}
        stroke="var(--color-primary)"
        strokeWidth={sw}
        strokeLinecap="round"
      />

      {/* Label */}
      <text
        x={omx}
        y={omy}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--color-primary)"
        fontSize={fontSize}
        fontFamily="sans-serif"
        transform={`rotate(${angle}, ${omx}, ${omy}) scale(1, -1) translate(0, ${-2 * omy})`}
      >
        {label}
      </text>
    </g>
  )
}

// --- Horizontal annotation ---

interface HVAnnotationProps {
  constraint: Extract<ConstraintInput, { type: 'horizontal' }> | Extract<ConstraintInput, { type: 'vertical' }>
  points: PointLookup
  zoom: number
}

function HorizontalAnnotation({ constraint, points, zoom }: HVAnnotationProps): React.JSX.Element | null {
  const p1 = points[nodeInsidePointId(constraint.nodeA)]
  const p2 = points[nodeInsidePointId(constraint.nodeB)]
  if (!p1 || !p2) return null

  const mx = (p1.x + p2.x) / 2
  const my = (p1.y + p2.y) / 2
  const fontSize = 14 / zoom

  return (
    <text
      x={mx}
      y={my}
      textAnchor="middle"
      dominantBaseline="central"
      fill="var(--color-accent)"
      fontSize={fontSize}
      fontWeight="bold"
      fontFamily="sans-serif"
      transform={`scale(1, -1) translate(0, ${-2 * my})`}
    >
      H
    </text>
  )
}

// --- Vertical annotation ---

function VerticalAnnotation({ constraint, points, zoom }: HVAnnotationProps): React.JSX.Element | null {
  const p1 = points[nodeInsidePointId(constraint.nodeA)]
  const p2 = points[nodeInsidePointId(constraint.nodeB)]
  if (!p1 || !p2) return null

  const mx = (p1.x + p2.x) / 2
  const my = (p1.y + p2.y) / 2
  const fontSize = 14 / zoom

  return (
    <text
      x={mx}
      y={my}
      textAnchor="middle"
      dominantBaseline="central"
      fill="var(--color-accent)"
      fontSize={fontSize}
      fontWeight="bold"
      fontFamily="sans-serif"
      transform={`scale(1, -1) translate(0, ${-2 * my})`}
    >
      V
    </text>
  )
}

// --- Colinear annotation ---

interface ColinearAnnotationProps {
  constraint: Extract<ConstraintInput, { type: 'colinear' }>
  points: PointLookup
  zoom: number
}

function ColinearAnnotation({ constraint, points, zoom }: ColinearAnnotationProps): React.JSX.Element | null {
  const pA = points[nodeSidePointId(constraint.nodeA, constraint.side)]
  const pB = points[nodeSidePointId(constraint.nodeB, constraint.side)]
  const pC = points[nodeSidePointId(constraint.nodeC, constraint.side)]
  if (!pA || !pB || !pC) return null

  const r = 3 / zoom
  const sw = 1.5 / zoom

  return (
    <g>
      {/* Line through the three points */}
      <line
        x1={pA.x}
        y1={pA.y}
        x2={pC.x}
        y2={pC.y}
        stroke="var(--color-muted-foreground)"
        strokeWidth={sw}
        strokeDasharray={`${4 / zoom} ${3 / zoom}`}
        opacity={0.6}
      />
      {/* Dots at each point */}
      <circle cx={pA.x} cy={pA.y} r={r} fill="var(--color-muted-foreground)" opacity={0.8} />
      <circle cx={pB.x} cy={pB.y} r={r} fill="var(--color-muted-foreground)" opacity={0.8} />
      <circle cx={pC.x} cy={pC.y} r={r} fill="var(--color-muted-foreground)" opacity={0.8} />
    </g>
  )
}
