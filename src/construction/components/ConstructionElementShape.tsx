import type { ConstructionElement, ResolveMaterialFunction } from '@/construction/walls'

import type { Projection, RotationProjection } from '../geometry'
import { CuboidShape } from './CuboidShape'
import { CutCuboidShape } from './CutCuboidShape'

export interface ConstructionElementShapeProps {
  element: ConstructionElement
  projection: Projection
  rotationProjection: RotationProjection
  resolveMaterial: ResolveMaterialFunction
  stroke?: string
  strokeWidth?: number
  showDebugMarkers?: boolean
  className?: string
}

export function ConstructionElementShape({
  element,
  projection,
  resolveMaterial,
  stroke = '#000',
  strokeWidth = 5,
  showDebugMarkers = false,
  className
}: ConstructionElementShapeProps): React.JSX.Element {
  // Get material color for fill
  const material = resolveMaterial(element.material)
  const fill = material?.color ?? '#8B4513' // fallback color

  // Delegate to appropriate shape component
  switch (element.shape.type) {
    case 'cuboid':
      return (
        <g className={className}>
          <CuboidShape
            shape={element.shape}
            projection={projection}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            showDebugMarkers={showDebugMarkers}
          />
        </g>
      )
    case 'cut-cuboid':
      return (
        <g className={className}>
          <CutCuboidShape
            shape={element.shape}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            showDebugMarkers={showDebugMarkers}
          />
        </g>
      )
    default:
      throw new Error(`Unsupported shape type: ${(element.shape as { type: string }).type}`)
  }
}
