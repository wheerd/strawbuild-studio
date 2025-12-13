import { mat4, vec3 } from 'gl-matrix'

import type { InitialPartInfo } from '@/construction/parts'
import { type Axis3D, Bounds3D, type Length, type Plane3D, type Polygon2D } from '@/shared/geometry'
import { simplifyPolygon, unionPolygons } from '@/shared/geometry/polygon'

import { type ConstructionGroup, type GroupOrElement, createConstructionElementId } from './elements'
import { type Transform, transform, transformBounds } from './geometry'
import type { RawMeasurement } from './measurements'
import { type ConstructionIssue, type ConstructionIssueId, mergeConstructionIssues } from './results'
import type { Tag } from './tags'

export interface ConstructionModel {
  elements: GroupOrElement[]
  measurements: RawMeasurement[]
  areas: HighlightedArea[]
  errors: ConstructionIssue[]
  warnings: ConstructionIssue[]
  bounds: Bounds3D
}

export type HighlightedAreaType =
  | 'inner-perimeter'
  | 'outer-perimeter'
  | 'corner'
  | 'window'
  | 'door'
  | 'passage'
  | 'top-plate'
  | 'bottom-plate'
  | 'floor-level'

export type HighlightedArea = HighlightedCuboid | HighlightedPolygon | HighlightedCut

/** Highlighted area for visual feedback (corners, critical zones, etc.) */
export interface HighlightedCuboid {
  type: 'cuboid'
  areaType: HighlightedAreaType
  label?: string
  transform: Transform
  size: vec3
  bounds: Bounds3D
  tags?: Tag[]
  renderPosition: 'bottom' | 'top'
  cancelKey?: string
  mergeKey?: string
}

export interface HighlightedPolygon {
  type: 'polygon'
  areaType: HighlightedAreaType
  label?: string
  polygon: Polygon2D
  plane: Plane3D
  tags?: Tag[]
  renderPosition: 'bottom' | 'top'
  cancelKey?: string
  mergeKey?: string
}

export interface HighlightedCut {
  type: 'cut'
  areaType: HighlightedAreaType
  label?: string
  position: Length
  axis: Axis3D
  tags?: Tag[]
  renderPosition: 'bottom' | 'top'
  cancelKey?: string
  mergeKey?: string
}

/**
 * Returns a minimal construction model with no geometry but a single warning.
 * Useful for guarding unfinished construction paths until the real implementation lands.
 */
export function createUnsupportedModel(description: string, issueId?: string): ConstructionModel {
  const id = (issueId ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`) as ConstructionIssueId

  return {
    elements: [],
    measurements: [],
    areas: [],
    errors: [],
    warnings: [
      {
        id,
        description,
        severity: 'warning' as const
      }
    ],
    bounds: Bounds3D.EMPTY
  }
}

/**
 * Creates a construction group with bounds calculated from transformed children
 */
export function createConstructionGroup(
  children: GroupOrElement[],
  transform: Transform,
  tags?: Tag[],
  partInfo?: InitialPartInfo
): ConstructionGroup {
  const childBounds = children.map(child => transformBounds(child.bounds, transform))
  const groupBounds = Bounds3D.merge(...childBounds)

  return {
    id: createConstructionElementId(),
    transform,
    bounds: groupBounds,
    children,
    tags,
    partInfo
  }
}

export function mergeModels(...models: ConstructionModel[]): ConstructionModel {
  const allAreas = models.flatMap(m => m.areas)

  const cancelKeyCounts = new Map<string, number>()
  const areasWithoutCancelKeys: HighlightedArea[] = []

  for (const area of allAreas) {
    if (area.cancelKey) {
      const count = cancelKeyCounts.get(area.cancelKey) || 0
      cancelKeyCounts.set(area.cancelKey, count + 1)
    } else {
      areasWithoutCancelKeys.push(area)
    }
  }

  const filteredAreas = allAreas.filter(area => {
    if (!area.cancelKey) return false
    const count = cancelKeyCounts.get(area.cancelKey) || 0
    return count === 1
  })

  const remainingAreas = [...areasWithoutCancelKeys, ...filteredAreas]

  const areasWithoutMergeKey: HighlightedArea[] = []
  const mergeGroups = new Map<string, HighlightedArea[]>()

  for (const area of remainingAreas) {
    if (area.mergeKey) {
      const group = mergeGroups.get(area.mergeKey) || []
      group.push(area)
      mergeGroups.set(area.mergeKey, group)
    } else {
      areasWithoutMergeKey.push(area)
    }
  }

  const mergedAreas: HighlightedArea[] = []
  for (const [mergeKey, group] of mergeGroups) {
    try {
      const merged = mergeAreaGroup(group, mergeKey)
      mergedAreas.push(...merged)
    } catch (error) {
      console.error(`Failed to merge areas with key ${mergeKey}:`, error)
      mergedAreas.push(...group)
    }
  }

  return {
    elements: models.flatMap(m => m.elements),
    measurements: models.flatMap(m => m.measurements),
    areas: [...areasWithoutMergeKey, ...mergedAreas],
    errors: mergeConstructionIssues(models.flatMap(m => m.errors)),
    warnings: mergeConstructionIssues(models.flatMap(m => m.warnings)),
    bounds: Bounds3D.merge(...models.map(m => m.bounds))
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
      if ('extend1' in m) {
        const extend1 = transform(m.extend1, t)
        const extend2 = m.extend2 ? transform(m.extend2, t) : undefined
        return { ...m, startPoint, endPoint, extend1, extend2 }
      }
      return { ...m, startPoint, endPoint }
    }),
    areas: model.areas.map(a => transformArea(a, t)),
    errors: model.errors, // Issues don't need transformation - they're attached to elements
    warnings: model.warnings, // Issues don't need transformation - they're attached to elements
    bounds: transformBounds(model.bounds, t)
  }
}

function transformArea(a: HighlightedArea, t: Transform): HighlightedArea {
  if (a.type === 'cuboid') {
    const composedTransform = composeTransforms(a.transform, t)
    return { ...a, transform: composedTransform, bounds: transformBounds(a.bounds, t) }
  }
  if (a.type === 'polygon') {
    const transformedPoints = a.polygon.points.map(p => {
      let p3d: vec3
      if (a.plane === 'xy') {
        p3d = vec3.fromValues(p[0], p[1], 0)
      } else if (a.plane === 'xz') {
        p3d = vec3.fromValues(p[0], 0, p[1])
      } else {
        p3d = vec3.fromValues(0, p[0], p[1])
      }
      const transformed = transform(p3d, t)

      if (a.plane === 'xy') {
        return [transformed[0], transformed[1]] as [number, number]
      } else if (a.plane === 'xz') {
        return [transformed[0], transformed[2]] as [number, number]
      } else {
        return [transformed[1], transformed[2]] as [number, number]
      }
    })
    return { ...a, polygon: { points: transformedPoints } }
  }
  if (a.type === 'cut') {
    const positionVec = vec3.fromValues(
      a.axis === 'x' ? a.position : 0,
      a.axis === 'y' ? a.position : 0,
      a.axis === 'z' ? a.position : 0
    )
    const transformed = transform(positionVec, t)
    const newPosition = a.axis === 'x' ? transformed[0] : a.axis === 'y' ? transformed[1] : transformed[2]
    return { ...a, position: newPosition }
  }
  return a
}

function composeTransforms(inner: Transform, outer: Transform): Transform {
  return mat4.multiply(mat4.create(), outer, inner)
}

function mergeAreaGroup(areas: HighlightedArea[], mergeKey: string): HighlightedArea[] {
  if (areas.length === 0) return []
  if (areas.length === 1) return areas

  const firstType = areas[0].type

  if (!areas.every(a => a.type === firstType)) {
    throw new Error(`Cannot merge areas with different types for mergeKey ${mergeKey}`)
  }

  if (firstType === 'cuboid') {
    return [mergeCuboidAreas(areas as HighlightedCuboid[], mergeKey)]
  }

  if (firstType === 'polygon') {
    return mergePolygonAreas(areas as HighlightedPolygon[], mergeKey)
  }

  if (firstType === 'cut') {
    return [mergeCutAreas(areas as HighlightedCut[], mergeKey)]
  }

  return areas
}

function mergeCuboidAreas(areas: HighlightedCuboid[], mergeKey: string): HighlightedCuboid {
  const template = areas[0]

  const mergedBounds = Bounds3D.merge(...areas.map(a => a.bounds))

  return {
    ...template,
    bounds: mergedBounds,
    mergeKey
  }
}

function mergePolygonAreas(areas: HighlightedPolygon[], mergeKey: string): HighlightedPolygon[] {
  const template = areas[0]

  if (!areas.every(a => a.plane === template.plane)) {
    throw new Error(
      `Cannot merge polygons on different planes for mergeKey ${mergeKey}. ` +
        `Found planes: ${Array.from(new Set(areas.map(a => a.plane))).join(', ')}`
    )
  }

  const polygons = areas.map(a => a.polygon)
  const unionResult = unionPolygons(polygons)

  if (unionResult.length !== 1) {
    console.warn(
      `Union of polygons with mergeKey ${mergeKey} resulted in ${unionResult.length} polygons. ` +
        `Expected exactly 1 polygon. This likely means the polygons don't overlap or touch.`
    )
    return areas
  }

  return [
    {
      ...template,
      polygon: simplifyPolygon(unionResult[0]),
      mergeKey
    }
  ]
}

function mergeCutAreas(areas: HighlightedCut[], mergeKey: string): HighlightedCut {
  const template = areas[0]

  if (!areas.every(a => a.axis === template.axis)) {
    throw new Error(
      `Cannot merge cuts on different axes for mergeKey ${mergeKey}. ` +
        `Found axes: ${Array.from(new Set(areas.map(a => a.axis))).join(', ')}`
    )
  }

  const positions = new Set(areas.map(a => a.position))
  if (positions.size !== 1) {
    throw new Error(
      `Cannot merge cuts at different positions for mergeKey ${mergeKey}. ` +
        `Found positions: ${Array.from(positions).join(', ')}`
    )
  }

  return {
    ...template,
    mergeKey
  }
}
