import type { ConstructionGroup } from '@/construction/elements'
import type { Projection, RotationProjection, ZOrder } from '@/construction/geometry'
import { createSvgTransform } from '@/construction/geometry'
import type { ResolveMaterialFunction } from '@/construction/materials/material'

import { ConstructionElementShape } from './ConstructionElementShape'

export interface ConstructionGroupElementProps {
  group: ConstructionGroup
  projection?: Projection
  zOrder: ZOrder
  rotationProjection?: RotationProjection
  resolveMaterial: ResolveMaterialFunction
}

export function ConstructionGroupElement({
  group,
  projection,
  zOrder,
  rotationProjection,
  resolveMaterial
}: ConstructionGroupElementProps): React.JSX.Element {
  const sortedElements = [...group.children].sort(zOrder)
  return (
    <g transform={createSvgTransform(group.transform, projection, rotationProjection)}>
      {sortedElements.map(element =>
        'children' in element ? (
          <ConstructionGroupElement
            key={element.id}
            group={element}
            zOrder={zOrder}
            resolveMaterial={resolveMaterial}
          />
        ) : (
          <ConstructionElementShape key={element.id} element={element} resolveMaterial={resolveMaterial} />
        )
      )}
    </g>
  )
}
