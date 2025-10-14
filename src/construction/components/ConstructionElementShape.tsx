import { ExtrudedPolygonShape } from '@/construction/components/ExtrudedPolygonShape'
import type { ConstructionElement } from '@/construction/elements'
import type { CutFunction, Projection, RotationProjection } from '@/construction/geometry'
import { createSvgTransform } from '@/construction/geometry'

import { CuboidShape } from './CuboidShape'
import { CutCuboidShape } from './CutCuboidShape'
import { getConstructionElementClasses } from './cssHelpers'

export interface ConstructionElementShapeProps {
  element: ConstructionElement
  projection: Projection
  rotationProjection: RotationProjection
  aboveCut?: CutFunction
  showDebugMarkers?: boolean
  className?: string
}

export function ConstructionElementShape({
  element,
  projection,
  rotationProjection,
  showDebugMarkers = false,
  className,
  aboveCut
}: ConstructionElementShapeProps): React.JSX.Element {
  // Generate CSS classes using helper - styling handled by CSS
  const combinedClassName = getConstructionElementClasses(element, aboveCut, className)

  // Delegate to appropriate shape component
  switch (element.shape.type) {
    case 'cuboid':
      return (
        <g
          className={combinedClassName}
          transform={createSvgTransform(element.transform, projection, rotationProjection)}
        >
          <CuboidShape shape={element.shape} projection={projection} showDebugMarkers={showDebugMarkers} />
        </g>
      )
    case 'cut-cuboid':
      return (
        <g
          className={combinedClassName}
          transform={createSvgTransform(element.transform, projection, rotationProjection)}
        >
          <CutCuboidShape shape={element.shape} projection={projection} showDebugMarkers={showDebugMarkers} />
        </g>
      )
    case 'polygon':
      return (
        <g
          className={combinedClassName}
          transform={createSvgTransform(element.transform, projection, rotationProjection)}
        >
          <ExtrudedPolygonShape shape={element.shape} projection={projection} showDebugMarkers={showDebugMarkers} />
        </g>
      )
    default:
      throw new Error(`Unsupported shape type: ${(element.shape as { type: string }).type}`)
  }
}
