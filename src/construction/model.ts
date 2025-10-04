import { vec3 } from 'gl-matrix'

import { type Bounds3D, type Plane3D, type Polygon2D, mergeBounds, vec3Add } from '@/shared/geometry'

import { type ConstructionGroup, type GroupOrElement, createConstructionElementId } from './elements'
import { type Transform, transform, transformBounds } from './geometry'
import type { RawMeasurement } from './measurements'
import type { ConstructionIssue } from './results'
import type { Tag } from './tags'

export interface ConstructionModel {
  elements: GroupOrElement[]
  measurements: RawMeasurement[]
  areas: HighlightedArea[]
  errors: ConstructionIssue[]
  warnings: ConstructionIssue[]
  bounds: Bounds3D
}

export type HighlightedAreaType = 'inner-perimeter' | 'outer-perimeter' | 'corner' | 'window' | 'door' | 'passage'

export type HighlightedArea = HighlightedCuboid | HighlightedPolygon

/** Highlighted area for visual feedback (corners, critical zones, etc.) */
export interface HighlightedCuboid {
  type: 'cuboid'
  areaType: HighlightedAreaType
  label?: string
  transform: Transform
  bounds: Bounds3D
  tags?: Tag[]
  renderPosition: 'bottom' | 'top'
}

export interface HighlightedPolygon {
  type: 'polygon'
  areaType: HighlightedAreaType
  label?: string
  polygon: Polygon2D
  plane: Plane3D
  tags?: Tag[]
  renderPosition: 'bottom' | 'top'
}

/**
 * Creates a construction group with bounds calculated from transformed children
 */
export function createConstructionGroup(
  children: GroupOrElement[],
  transform: Transform,
  tags?: Tag[]
): ConstructionGroup {
  // Calculate bounds from all transformed children
  const childBounds = children.map(child => {
    // Apply the group transform to each child's bounds
    return transformBounds(child.bounds, child.transform)
  })

  const groupBounds =
    childBounds.length > 0 ? mergeBounds(...childBounds) : ({ min: [0, 0, 0], max: [0, 0, 0] } as Bounds3D)

  return {
    id: createConstructionElementId(),
    transform,
    bounds: groupBounds,
    children,
    tags
  }
}

export function mergeModels(...models: ConstructionModel[]): ConstructionModel {
  return {
    elements: models.flatMap(m => m.elements),
    measurements: models.flatMap(m => m.measurements),
    areas: models.flatMap(m => m.areas),
    errors: models.flatMap(m => m.errors),
    warnings: models.flatMap(m => m.warnings),
    bounds: mergeBounds(...models.map(m => m.bounds))
  }
}

export function transformModel(model: ConstructionModel, t: Transform, tags?: Tag[]): ConstructionModel {
  // Create a group with properly calculated bounds from transformed children
  const transformedGroup = createConstructionGroup(model.elements, t, tags)

  return {
    elements: [transformedGroup],
    measurements: model.measurements.map(m => {
      const startPoint = transform(m.startPoint, t)
      const endPoint = transform(m.endPoint, t)
      if ('size' in m) {
        const sizeEnd = transform(vec3Add(m.startPoint, m.size), t)
        const transformedSize = vec3.subtract(vec3.create(), sizeEnd, startPoint)
        return { ...m, startPoint, endPoint, size: transformedSize }
      }
      return { ...m, startPoint, endPoint }
    }),
    areas: model.areas.map(a => transformArea(a, t)),
    errors: model.errors.map(e => ({ ...e, bounds: e.bounds ? transformBounds(e.bounds, t) : undefined })),
    warnings: model.warnings.map(w => ({ ...w, bounds: w.bounds ? transformBounds(w.bounds, t) : undefined })),
    bounds: transformBounds(model.bounds, t)
  }
}

function transformArea(a: HighlightedArea, t: Transform): HighlightedArea {
  if (a.type === 'cuboid') {
    return { ...a, transform: t }
  }
  return a
}
