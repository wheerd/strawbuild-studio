import { usePerimetersOfActiveStorey } from '@/building/store'
import { useGcsLines, useGcsPerimeterRegistry, useGcsPoints } from '@/editor/gcs/store'
import { useZoom } from '@/editor/hooks/useViewportStore'

export function GcsLayer(): React.JSX.Element {
  const registry = useGcsPerimeterRegistry()
  const points = useGcsPoints()
  const lines = useGcsLines()
  const zoom = useZoom()

  const perimeters = usePerimetersOfActiveStorey()
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const filteredPoints = perimeters.flatMap(p => registry[p.id]?.pointIds ?? []).map(p => points[p])
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const filteredLines = new Set(perimeters.flatMap(p => registry[p.id]?.lineIds ?? []))

  return (
    <g data-layer="gcs">
      {lines
        .filter(l => filteredLines.has(l.id))
        .map(line => {
          const p1 = points[line.p1_id]
          const p2 = points[line.p2_id]

          return (
            <line
              key={line.id}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={
                line.id.endsWith('_ref')
                  ? 'var(--color-primary)'
                  : line.id.endsWith('_proj')
                    ? 'var(--color-muted-foreground)'
                    : 'var(--color-foreground)'
              }
              strokeWidth={2 / zoom}
              strokeLinecap="round"
              className="pointer-events-none"
            />
          )
        })}

      {filteredPoints
        .filter(p => !p.id.startsWith('virt_'))
        .map(point => {
          return (
            <g key={point.id}>
              <circle
                cx={point.x}
                cy={point.y}
                r={point.fixed ? 6 / zoom : 8 / zoom}
                fill={point.id.endsWith('_ref') ? 'var(--color-primary)' : 'var(--color-accent)'}
                stroke="var(--color-border)"
                strokeWidth={2 / zoom}
              />
            </g>
          )
        })}
    </g>
  )
}
