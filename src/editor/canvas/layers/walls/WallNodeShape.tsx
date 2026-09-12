import type { WallNodeId } from '@/building/model/ids'
import { useWallNodeById } from '@/building/store'
import { BidirectionalArrow, Arrow } from '@/editor/canvas/components/Arrow'
import { useSelectionStore } from '@/editor/canvas/state/selectionStore'
import { scaleAddVec2 } from '@/shared/geometry'
import { MATERIAL_COLORS } from '@/shared/theme/colors'
import { polygonToSvgPath } from '@/shared/utils/svg'

const NODE_RADIUS = 50

export function WallNodeShape({ nodeId }: { nodeId: WallNodeId }): React.JSX.Element {
  const node = useWallNodeById(nodeId)
  const isSelected = useSelectionStore(state => state.isCurrentSelection(nodeId))

  const fillColor = MATERIAL_COLORS.strawbale

  const pathD = node.boundary ? polygonToSvgPath(node.boundary) : undefined

  return (
    <g data-entity-id={node.id} data-entity-type="wall-node" data-parent-ids={JSON.stringify([node.perimeterId])}>
      {pathD && <path d={pathD} fill={fillColor} className="stroke-border-contrast stroke-10" />}
      <circle
        cx={node.center[0]}
        cy={node.center[1]}
        r={NODE_RADIUS}
        fill="var(--color-background)"
        fillOpacity={0.5}
        stroke="var(--color-border-contrast)"
        strokeOpacity={0.5}
        strokeWidth={10}
      />
      {isSelected && node.type === 'inner' && node.constructedBy && (
        <ConstructionArrow node={node} />
      )}
    </g>
  )
}

function ConstructionArrow({ node }: { node: Extract<ReturnType<typeof useWallNodeById>, { type: 'inner' }> }): React.JSX.Element | null {
  const constructingIncident = node.incidentWalls.find(incident => incident.id === node.constructedBy)
  if (!constructingIncident) return null

  const hasColinearConstruction = node.constructedWithColinear != null
  const arrowDirection = constructingIncident.direction

  if (hasColinearConstruction) {
    return (
      <BidirectionalArrow
        center={node.center}
        direction={arrowDirection}
        length={180}
        color="var(--color-white)"
        strokeWidth={24}
      />
    )
  }

  return (
    <Arrow
      arrowStart={node.center}
      arrowEnd={scaleAddVec2(node.center, arrowDirection, 180)}
      color="var(--color-white)"
      strokeWidth={24}
    />
  )
}
