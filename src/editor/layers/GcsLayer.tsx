import { useCallback, useMemo } from 'react'
import type { RefObject } from 'react'

import { useGcsActions, useGcsDrag, useGcsLines, useGcsPoints, useGcsVisualLines } from '@/editor/gcs/store'
import { useViewportActions, useZoom } from '@/editor/hooks/useViewportStore'
import { useSvgMouseTransform } from '@/editor/tools/system/hooks/useSvgMouseTransform'

interface GcsLayerProps {
  svgRef: RefObject<SVGSVGElement | null>
}

export function GcsLayer({ svgRef }: GcsLayerProps): React.JSX.Element {
  const points = useGcsPoints()
  const lines = useGcsLines()
  const visualLines = useGcsVisualLines()
  const drag = useGcsDrag()
  const actions = useGcsActions()
  const zoom = useZoom()
  const { stageToWorld } = useViewportActions()
  const mouseTransform = useSvgMouseTransform(svgRef)

  const cornerPoints = useMemo(() => {
    const corners: { id: string; point: { x: number; y: number } | undefined }[] = [
      { id: 'A_corner', point: points.A_corner },
      { id: 'B_corner', point: points.B_corner },
      { id: 'C_corner', point: points.C_corner },
      { id: 'D_corner', point: points.D_corner }
    ]
    return corners
  }, [points])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGElement>, pointId: string) => {
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)

      const point = points[pointId]
      if (!point || point.fixed) return

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

  return (
    <g
      data-layer="gcs"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      {lines.map(line => {
        const p1 = points[line.p1_id]
        const p2 = points[line.p2_id]
        if (p1 === undefined || p2 === undefined) {
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

      {Object.entries(points)
        .filter(([id]) => !id.startsWith('virt_'))
        .map(([id, point]) => {
          if (!point) return null

          return (
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
          )
        })}

      {visualLines.map(line => {
        const p1 = points[line.p1Id]
        const p2 = points[line.p2Id]
        if (p1 === undefined || p2 === undefined) {
          return null
        }

        return (
          <line
            key={line.id}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke="hsl(var(--muted))"
            strokeWidth={1 / zoom}
            strokeLinecap="round"
            className="stroke-border-contrast pointer-events-none opacity-50"
          />
        )
      })}

      {cornerPoints.map(({ id, point }) => {
        if (!point) {
          return null
        }

        return (
          <circle
            key={id}
            cx={point.x}
            cy={point.y}
            r={5 / zoom}
            fill="hsl(var(--primary))"
            stroke="none"
            className="pointer-events-none"
          />
        )
      })}
    </g>
  )
}
