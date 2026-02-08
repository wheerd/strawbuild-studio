import { useGcsLines, useGcsPoints } from '@/editor/gcs/store'
import { useZoom } from '@/editor/hooks/useViewportStore'

export function GcsLayer(): React.JSX.Element {
  const points = useGcsPoints()
  const lines = useGcsLines()
  const zoom = useZoom()

  return (
    <g data-layer="gcs">
      {lines.map(line => {
        const p1 = points[line.p1_id]
        const p2 = points[line.p2_id]

        return (
          <line
            key={line.id}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={line.id.endsWith('_ref') ? 'var(--color-primary)' : 'var(--color-foreground)'}
            strokeWidth={2 / zoom}
            strokeLinecap="round"
            className="pointer-events-none"
          />
        )
      })}

      {Object.entries(points)
        .filter(([id]) => !id.startsWith('virt_'))
        .map(([id, point]) => {
          return (
            <g key={id}>
              <circle
                cx={point.x}
                cy={point.y}
                r={point.fixed ? 6 / zoom : 8 / zoom}
                fill={id.endsWith('_ref') ? 'var(--color-primary)' : 'var(--color-accent)'}
                stroke="var(--color-border)"
                strokeWidth={2 / zoom}
                className={point.fixed ? 'cursor-not-allowed' : 'cursor-move'}
                data-point-id={id}
              />
            </g>
          )
        })}
    </g>
  )
}
