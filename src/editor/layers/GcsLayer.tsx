import { useCallback } from 'react'
import type { RefObject } from 'react'

import { useGcsActions, useGcsDrag, useGcsLines, useGcsPoints, useGcsReady } from '@/editor/gcs/store'
import { useViewportActions, useZoom } from '@/editor/hooks/useViewportStore'
import { useSvgMouseTransform } from '@/editor/tools/system/hooks/useSvgMouseTransform'

interface GcsLayerProps {
  svgRef: RefObject<SVGSVGElement | null>
}

export function GcsLayer({ svgRef }: GcsLayerProps): React.JSX.Element {
  const points = useGcsPoints()
  const lines = useGcsLines()
  const drag = useGcsDrag()
  const actions = useGcsActions()
  const gcsReady = useGcsReady()
  const zoom = useZoom()
  const { stageToWorld } = useViewportActions()
  const mouseTransform = useSvgMouseTransform(svgRef)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGElement>, pointId: string) => {
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)

      const point = points[pointId]
      if (point.fixed) return

      const svgCoords = mouseTransform({ clientX: e.clientX, clientY: e.clientY })
      const worldCoords = stageToWorld(svgCoords)
      actions.startDrag(pointId, worldCoords[0], worldCoords[1])
    },
    [points, actions, stageToWorld, mouseTransform]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGElement>) => {
      if (!drag) {
        return
      }

      e.stopPropagation()
      const svgCoords = mouseTransform({ clientX: e.clientX, clientY: e.clientY })
      const worldCoords = stageToWorld(svgCoords)
      actions.updateDrag(worldCoords[0], worldCoords[1])
    },
    [drag, actions, stageToWorld, mouseTransform]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGElement>) => {
      if (!drag) {
        return
      }

      e.stopPropagation()
      e.currentTarget.releasePointerCapture(e.pointerId)
      actions.endDrag()
    },
    [drag, actions]
  )

  const handlePointerLeave = useCallback(() => {
    if (drag) {
      actions.endDrag()
    }
  }, [drag, actions])

  if (!gcsReady) {
    return <g data-layer="gcs-loading" />
  }

  return (
    <g
      data-layer="gcs"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      {lines.map(line => {
        const p1 = points[line.p1Id]
        const p2 = points[line.p2Id]
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!p1 || !p2) {
          return null
        }

        return (
          <line
            key={line.id}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke="currentColor"
            strokeWidth={2 / zoom}
            strokeLinecap="round"
            className="stroke-border-contrast pointer-events-none"
          />
        )
      })}

      {Object.entries(points).map(([id, point]) => (
        <g key={id}>
          <circle
            cx={point.x}
            cy={point.y}
            r={point.fixed ? 6 / zoom : 8 / zoom}
            fill={point.fixed ? 'hsl(var(--primary))' : 'hsl(var(--accent))'}
            stroke="currentColor"
            strokeWidth={2 / zoom}
            className={point.fixed ? 'cursor-not-allowed' : 'cursor-move'}
            onPointerDown={e => {
              handlePointerDown(e, id)
            }}
            data-point-id={id}
          />
          {drag?.pointId === id && (
            <circle
              cx={point.x}
              cy={point.y}
              r={12 / zoom}
              fill="none"
              stroke="currentColor"
              strokeWidth={1 / zoom}
              strokeDasharray="4 2"
              className="pointer-events-none"
            />
          )}
        </g>
      ))}
    </g>
  )
}
