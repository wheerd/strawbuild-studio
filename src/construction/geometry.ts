import { type ReadonlyVec2, type ReadonlyVec3, mat4, vec2, vec3 } from 'gl-matrix'

import type { GroupOrElement } from '@/construction/elements'
import {
  type Axis3D,
  Bounds2D,
  Bounds3D,
  type Length,
  type Plane3D,
  type Polygon2D,
  intersectPolygon
} from '@/shared/geometry'

export type Transform = mat4

export const IDENTITY: Transform = mat4.identity(mat4.create())

export const getPosition = (t: Transform) => mat4.getTranslation(vec3.create(), t)

export const translate = (v: vec3) => mat4.fromTranslation(mat4.create(), v)

export function transform(v: vec3, t: Transform): vec3 {
  return vec3.transformMat4(vec3.create(), v, t)
}

export function transformBounds(bounds: Bounds3D, t: Transform): Bounds3D {
  // Transform all 8 corner points of the bounding box
  const corners: vec3[] = [
    [bounds.min[0], bounds.min[1], bounds.min[2]], // min corner
    [bounds.max[0], bounds.min[1], bounds.min[2]],
    [bounds.min[0], bounds.max[1], bounds.min[2]],
    [bounds.min[0], bounds.min[1], bounds.max[2]],
    [bounds.max[0], bounds.max[1], bounds.min[2]],
    [bounds.max[0], bounds.min[1], bounds.max[2]],
    [bounds.min[0], bounds.max[1], bounds.max[2]],
    [bounds.max[0], bounds.max[1], bounds.max[2]] // max corner
  ].map(corner => vec3.fromValues(corner[0], corner[1], corner[2]))

  // Transform all corners
  const transformedCorners = corners.map(corner => transform(corner, t))

  // Use boundsFromPoints3D to compute new bounds
  const result = Bounds3D.fromPoints(transformedCorners)
  if (!result) {
    throw new Error('Failed to compute transformed bounds')
  }
  return result
}

export type ZOrder = (
  a: { bounds: Bounds3D; transform?: Transform },
  b: { bounds: Bounds3D; transform?: Transform }
) => number

export const createZOrder = (axis: Axis3D, viewOrder: 'ascending' | 'descending'): ZOrder => {
  const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2

  if (viewOrder === 'descending') {
    return (a, b) => {
      const aBounds = a.transform ? transformBounds(a.bounds, a.transform) : a.bounds
      const bBounds = b.transform ? transformBounds(b.bounds, b.transform) : b.bounds
      // For front view: sort by front face (max), farthest front face first
      return aBounds.max[axisIndex] - bBounds.max[axisIndex]
    }
  } else {
    return (a, b) => {
      const aBounds = a.transform ? transformBounds(a.bounds, a.transform) : a.bounds
      const bBounds = b.transform ? transformBounds(b.bounds, b.transform) : b.bounds
      // For back view: sort by back face (min), farthest back face first
      return bBounds.min[axisIndex] - aBounds.min[axisIndex]
    }
  }
}

export const bounds3Dto2D = (bounds: Bounds3D, projection: Projection): Bounds2D => {
  // Project all 8 corners and find 2D bounds
  const corners: vec3[] = [
    [bounds.min[0], bounds.min[1], bounds.min[2]],
    [bounds.max[0], bounds.min[1], bounds.min[2]],
    [bounds.min[0], bounds.max[1], bounds.min[2]],
    [bounds.min[0], bounds.min[1], bounds.max[2]],
    [bounds.max[0], bounds.max[1], bounds.min[2]],
    [bounds.max[0], bounds.min[1], bounds.max[2]],
    [bounds.min[0], bounds.max[1], bounds.max[2]],
    [bounds.max[0], bounds.max[1], bounds.max[2]]
  ].map(corner => vec3.fromValues(corner[0], corner[1], corner[2]))

  // Project all corners to 2D
  const projectedCorners = corners.map(corner => {
    const projected = projection(corner)
    return vec2.fromValues(projected[0], projected[1])
  })

  // Find 2D bounds from projected points
  return Bounds2D.fromPoints(projectedCorners)
}

export type Projection = (p: vec3) => vec3
export type RotationProjection = (r: vec3) => number
export type CutFunction = (element: { bounds: Bounds3D; transform?: Transform }) => boolean

export const project = (plane: Plane3D): Projection => {
  switch (plane) {
    case 'xy':
      return (p: vec3): vec3 => vec3.fromValues(p[0], p[1], p[2])
    case 'xz':
      return (p: vec3): vec3 => vec3.fromValues(p[0], p[2], p[1])
    case 'yz':
      return (p: vec3): vec3 => vec3.fromValues(p[1], p[2], p[0])
    default:
      throw new Error(`Unknown plane: ${plane}`)
  }
}

export const projectRotation = (plane: Plane3D): RotationProjection => {
  switch (plane) {
    case 'xy':
      return (r: vec3): number => (r[2] / Math.PI) * 180
    case 'xz':
      return (r: vec3): number => (r[1] / Math.PI) * 180
    case 'yz':
      return (r: vec3): number => (r[0] / Math.PI) * 180
    default:
      throw new Error(`Unknown plane: ${plane}`)
  }
}

/**
 * Creates an SVG transform string from a Transform object using projection functions.
 * Common pattern used throughout construction plan rendering.
 *
 * @param transform - Transform object containing position and rotation
 * @param projection - Function to project 3D position to 2D/3D coordinates
 * @param rotationProjection - Function to project 3D rotation to 2D rotation angle
 * @returns SVG transform string in the format "translate(x y) rotate(angle)"
 */
export const createSvgTransform = (
  transform: Transform,
  projection?: Projection,
  rotationProjection?: RotationProjection
): string | undefined => {
  if (!projection || !rotationProjection) return undefined
  if (transform === IDENTITY) return undefined
  const position = projection(mat4.getTranslation(vec3.create(), transform))
  const euler = vec3.fromValues(
    Math.atan2(transform[6], transform[10]),
    Math.asin(-transform[2]),
    Math.atan2(transform[1], transform[0])
  )
  const rotation = rotationProjection(euler)
  return `translate(${position[0]} ${position[1]}) rotate(${rotation})`
}

export const IDENTITY_PROJECTION: Projection = v => v

export function* allPoints(element: GroupOrElement, projection: Projection): Generator<vec2> {
  if ('shape' in element) {
    yield projection(transform(element.shape.bounds.min, element.transform))
    yield projection(transform([element.shape.bounds.min[0], element.bounds.max[1]], element.transform))
    yield projection(transform(element.shape.bounds.max, element.transform))
    yield projection(transform([element.shape.bounds.max[0], element.bounds.min[1]], element.transform))
  } else if ('children' in element) {
    for (const child of element.children) {
      for (const p of allPoints(child, projection)) {
        yield transform(p, element.transform)
      }
    }
  }
}

export class WallConstructionArea {
  public readonly position: ReadonlyVec3
  public readonly size: ReadonlyVec3
  public readonly topOffsets?: readonly ReadonlyVec2[]

  constructor(position: ReadonlyVec3, size: ReadonlyVec3, topOffsets?: readonly ReadonlyVec2[]) {
    if (topOffsets) {
      const maxOffset = Math.max(...topOffsets.map(o => o[1]))
      topOffsets = topOffsets.map(o => vec2.fromValues(o[0], o[1] - maxOffset))
      const adjustedHeight = Math.max(size[2] + maxOffset, 0)
      size = vec3.fromValues(size[0], size[1], adjustedHeight)
    }
    this.position = position
    this.size = size
    this.topOffsets = topOffsets
  }

  public getOffsetAt(position: Length): Length {
    if (!this.topOffsets || this.topOffsets.length === 0) return 0

    // Find the offset range containing this position
    let beforeIndex = -1
    let afterIndex = -1

    for (let i = 0; i < this.topOffsets.length; i++) {
      if (this.topOffsets[i][0] <= position) {
        beforeIndex = i
      }
      if (this.topOffsets[i][0] >= position && afterIndex === -1) {
        afterIndex = i
        break
      }
    }

    // Position before first offset
    if (beforeIndex === -1) return this.topOffsets[0][1]

    // Position after last offset
    if (afterIndex === -1) return this.topOffsets[this.topOffsets.length - 1][1]

    // Exact match
    if (Math.abs(this.topOffsets[beforeIndex][0] - position) < 0.001) {
      return this.topOffsets[beforeIndex][1]
    }

    // Check for height jump (two offsets at same position)
    if (Math.abs(this.topOffsets[beforeIndex][0] - this.topOffsets[afterIndex][0]) < 0.001) {
      // Height jump - return the "after" value
      return this.topOffsets[afterIndex][1]
    }

    // Linear interpolation between before and after
    const before = this.topOffsets[beforeIndex]
    const after = this.topOffsets[afterIndex]
    const ratio = (position - before[0]) / (after[0] - before[0])
    return before[1] + ratio * (after[1] - before[1])
  }

  /**
   * Create a copy with adjusted Y position/size (depth adjustment)
   */
  public withYAdjustment(yOffset: Length, newDepth?: Length): WallConstructionArea {
    newDepth = Math.min(newDepth ?? this.size[1], this.size[1] - yOffset)
    const newPosition = vec3.fromValues(this.position[0], this.position[1] + yOffset, this.position[2])
    const newSize = vec3.fromValues(this.size[0], newDepth, this.size[2])
    return new WallConstructionArea(newPosition, newSize, this.topOffsets)
  }

  /**
   * Create a copy with adjusted X position (horizontal offset along wall)
   */
  public withXAdjustment(xOffset: Length, newWidth?: Length): WallConstructionArea {
    newWidth = Math.min(newWidth ?? this.size[0] - xOffset, this.size[0] - xOffset)
    const newPosition = vec3.fromValues(this.position[0] + xOffset, this.position[1], this.position[2])
    const newSize = vec3.fromValues(newWidth, this.size[1], this.size[2])

    if (!this.topOffsets) {
      return new WallConstructionArea(newPosition, newSize)
    }

    const inbetweenOffsets = this.topOffsets
      .map(offset => vec2.fromValues(offset[0] - xOffset, offset[1]))
      .filter(offset => offset[0] > 0 && offset[0] < newWidth)

    const newTopOffsets = [
      vec2.fromValues(0, this.getOffsetAt(xOffset)),
      ...inbetweenOffsets,
      vec2.fromValues(newWidth, this.getOffsetAt(xOffset + newWidth))
    ]

    return new WallConstructionArea(newPosition, newSize, newTopOffsets.length > 0 ? newTopOffsets : undefined)
  }

  public splitInX(xOffset: Length): [WallConstructionArea, WallConstructionArea] {
    return [this.withXAdjustment(0, xOffset), this.withXAdjustment(xOffset)]
  }

  /**
   * Create a copy with adjusted Z position/height
   * Adds intersection points where roof line crosses the new top boundary to preserve slope information
   */
  public withZAdjustment(zOffset: Length, newHeight?: Length): WallConstructionArea {
    newHeight = Math.min(newHeight ?? this.size[2], this.size[2] - zOffset)
    const newPosition = vec3.fromValues(this.position[0], this.position[1], this.position[2] + zOffset)
    const newSize = vec3.fromValues(this.size[0], this.size[1], newHeight)

    if (!this.topOffsets || this.topOffsets.length === 0) {
      return new WallConstructionArea(newPosition, newSize)
    }

    const oldTop = this.position[2] + this.size[2]
    const newBase = newPosition[2]
    const newTop = newPosition[2] + newSize[2]

    const newTopOffsets: vec2[] = []

    for (let i = 0; i < this.topOffsets.length; i++) {
      const currentOffset = this.topOffsets[i]
      const x = currentOffset[0]
      const oldOffset = currentOffset[1]

      const topAbsoluteZ = oldTop + oldOffset

      const newOffset = topAbsoluteZ - newBase

      // If this point needs clipping
      if (newOffset > newSize[2]) {
        // Check if we need to add an intersection point before this
        if (i > 0) {
          const prevOffset = this.topOffsets[i - 1]
          const prevX = prevOffset[0]
          const prevOldOffset = prevOffset[1]
          const prevRoofZ = oldTop + prevOldOffset
          const prevNewOffset = prevRoofZ - newBase

          // If previous wasn't clipped but this is, add entry intersection
          if (prevNewOffset <= newSize[2]) {
            const intersectionX = this.findZIntersectionX(prevX, prevRoofZ, x, topAbsoluteZ, newTop)
            newTopOffsets.push(vec2.fromValues(intersectionX, 0)) // At new top, offset = 0
          }
        }

        // Add the clipped point (roof is above new top, so offset = 0)
        newTopOffsets.push(vec2.fromValues(x, 0))

        // Check if next point is unclipped (need exit intersection)
        if (i < this.topOffsets.length - 1) {
          const nextOffset = this.topOffsets[i + 1]
          const nextX = nextOffset[0]
          const nextOldOffset = nextOffset[1]
          const nextRoofZ = oldTop + nextOldOffset
          const nextNewOffset = nextRoofZ - newBase

          if (nextNewOffset <= newSize[2]) {
            const intersectionX = this.findZIntersectionX(x, topAbsoluteZ, nextX, nextRoofZ, newTop)
            newTopOffsets.push(vec2.fromValues(intersectionX, 0)) // At new top, offset = 0
          }
        }
      } else {
        // Not clipped - use adjusted offset
        newTopOffsets.push(vec2.fromValues(x, newOffset - newSize[2]))
      }
    }

    return new WallConstructionArea(newPosition, newSize, newTopOffsets.length > 0 ? newTopOffsets : undefined)
  }

  private findZIntersectionX(x1: number, z1: number, x2: number, z2: number, targetZ: number): number {
    if (Math.abs(z2 - z1) < 0.0001) {
      // Nearly horizontal line
      return (x1 + x2) / 2
    }

    // Linear interpolation to find X where Z = targetZ
    const t = (targetZ - z1) / (z2 - z1)
    return x1 + t * (x2 - x1)
  }

  /**
   * Get side profile polygon (XZ plane)
   * This polygon can be extruded along Y to create 3D geometry
   */
  public getSideProfilePolygon(): Polygon2D {
    const basePolygon = {
      points: [
        vec2.fromValues(this.position[0], this.position[2]), // bottom-left
        vec2.fromValues(this.position[0] + this.size[0], this.position[2]), // bottom-right
        vec2.fromValues(this.position[0] + this.size[0], this.position[2] + this.size[2]), // top-right
        vec2.fromValues(this.position[0], this.position[2] + this.size[2]) // top-left
      ]
    }
    if (!this.topOffsets || this.topOffsets.length === 0) {
      // Simple rectangle
      return basePolygon
    }

    // Complex polygon with sloped top
    const pointsList: vec2[] = []

    const top = this.position[2] + this.size[2]

    // Bottom edge (left to right)
    pointsList.push(vec2.fromValues(this.position[0], this.position[2]))
    pointsList.push(vec2.fromValues(this.position[0] + this.size[0], this.position[2]))

    // Right edge going up
    const lastOffset = this.topOffsets[this.topOffsets.length - 1]
    pointsList.push(vec2.fromValues(this.position[0] + this.size[0], top + lastOffset[1]))

    // Top edge (right to left, following slope)
    for (let i = this.topOffsets.length - 1; i >= 0; i--) {
      const offset = this.topOffsets[i]
      pointsList.push(vec2.fromValues(this.position[0] + offset[0], top + offset[1]))
    }

    // Left edge going down
    const firstOffset = this.topOffsets[0]
    pointsList.push(vec2.fromValues(this.position[0], top + firstOffset[1]))

    const sidePolygonRaw = { outer: { points: pointsList }, holes: [] }
    const sidePolygons = intersectPolygon({ outer: basePolygon, holes: [] }, sidePolygonRaw)

    return sidePolygons.length > 0 ? sidePolygons[0].outer : { points: [] }
  }

  public get bounds() {
    return Bounds3D.fromCuboid(this.position, this.size)
  }

  public get minHeight() {
    return this.size[2] + (this.topOffsets ? Math.min(...this.topOffsets.map(o => o[1])) : 0)
  }

  public get isEmpty() {
    return this.size[0] <= 0 || this.size[1] <= 0 || this.size[2] <= 0
  }
}
