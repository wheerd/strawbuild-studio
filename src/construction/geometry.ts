import type { GroupOrElement } from '@/construction/elements'
import {
  type Axis3D,
  Bounds2D,
  Bounds3D,
  IDENTITY,
  type Length,
  type Plane3D,
  type Polygon2D,
  type Transform,
  type Vec2,
  type Vec3,
  ZERO_VEC2,
  composeTransform,
  eqVec2,
  intersectPolygon,
  newVec2,
  newVec3,
  transform,
  transformFromValues
} from '@/shared/geometry'

export function transformBounds(bounds: Bounds3D, t: Transform): Bounds3D {
  // Transform all 8 corner points of the bounding box
  const corners = [
    newVec3(bounds.min[0], bounds.min[1], bounds.min[2]), // min corner
    newVec3(bounds.max[0], bounds.min[1], bounds.min[2]),
    newVec3(bounds.min[0], bounds.max[1], bounds.min[2]),
    newVec3(bounds.min[0], bounds.min[1], bounds.max[2]),
    newVec3(bounds.max[0], bounds.max[1], bounds.min[2]),
    newVec3(bounds.max[0], bounds.min[1], bounds.max[2]),
    newVec3(bounds.min[0], bounds.max[1], bounds.max[2]),
    newVec3(bounds.max[0], bounds.max[1], bounds.max[2]) // max corner
  ]

  const transformedCorners = corners.map(corner => transform(corner, t))

  return Bounds3D.fromPoints(transformedCorners)
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
  const corners: Vec3[] = [
    [bounds.min[0], bounds.min[1], bounds.min[2]],
    [bounds.max[0], bounds.min[1], bounds.min[2]],
    [bounds.min[0], bounds.max[1], bounds.min[2]],
    [bounds.min[0], bounds.min[1], bounds.max[2]],
    [bounds.max[0], bounds.max[1], bounds.min[2]],
    [bounds.max[0], bounds.min[1], bounds.max[2]],
    [bounds.min[0], bounds.max[1], bounds.max[2]],
    [bounds.max[0], bounds.max[1], bounds.max[2]]
  ].map(corner => newVec3(corner[0], corner[1], corner[2]))

  // Project all corners to 2D
  const projectedCorners = corners.map(corner => {
    const projected = projectPoint(corner, projection)
    return newVec2(projected[0], projected[1])
  })

  // Find 2D bounds from projected points
  return Bounds2D.fromPoints(projectedCorners)
}

/**
 * Projection is now a transformation matrix that converts 3D world coordinates
 * to 2D view coordinates. The z-component of the result is used for depth ordering.
 */
export type Projection = Transform

export type CutFunction = (element: { bounds: Bounds3D; transform?: Transform }) => boolean

/**
 * Create a projection matrix that transforms 3D world coordinates to 2D view coordinates
 * based on the viewing plane. The resulting coordinates are [x, y, depth] where depth is
 * used for z-ordering.
 *
 * @param plane - The viewing plane (xy = top view, xz = front view, yz = side view)
 * @returns A 4x4 projection matrix
 */
export const createProjectionMatrix = (plane: Plane3D, z: -1 | 1, x: -1 | 1): Projection => {
  switch (plane) {
    case 'xy':
      // Top view: X→X, Y→Y (inverted), Z→depth
      // prettier-ignore
      return transformFromValues(
        x,  0,  0,  0,
        0, -1,  0,  0,
        0,  0,  z,  0,
        0,  0,  0,  1 
      )

    case 'xz':
      // Front view: X→X, Z→Y, Y→depth
      // prettier-ignore
      return transformFromValues(
        x,  0,  0,  0,
        0,  0,  z,  0,
        0, -1,  0,  0,
        0,  0,  0,  1 
      )

    case 'yz':
      // Side view: Y→X, Z→Y, X→depth
      // prettier-ignore
      return transformFromValues(
        0,  0,  z,  0,
        x,  0,  0,  0,
        0, -1,  0,  0, 
        0,  0,  0,  1  
      )

    default:
      throw new Error(`Unknown plane: ${plane}`)
  }
}

/**
 * Project a 3D point using a projection matrix.
 * Returns [x, y, depth] where depth is used for z-ordering.
 *
 * @param point - The 3D point to project
 * @param matrix - The projection matrix (or combined projection + transform matrix)
 * @returns Projected point with depth component
 */
export const projectPoint = (point: Vec3, matrix: Projection): Vec3 => {
  return transform(point, matrix)
}

/**
 * Generate all corner points of an element's bounds, projected to 2D.
 * Accumulates transforms through the hierarchy.
 *
 * @param element - The element or group to get points from
 * @param projectionMatrix - The projection matrix for the current view
 * @param parentTransform - Accumulated parent transform (identity for top-level elements)
 */
export function* allPoints(
  element: GroupOrElement,
  projectionMatrix: Projection,
  parentTransform: Transform = IDENTITY
): Generator<Vec2> {
  // Accumulate transform: parent * element
  const accumulatedTransform = composeTransform(parentTransform, element.transform)

  if ('shape' in element) {
    // Combine projection with accumulated transform
    const finalTransform = composeTransform(projectionMatrix, accumulatedTransform)

    // Get all 4 corners of the shape bounds (fixing bug: was using element.bounds instead of element.shape.bounds)
    const corners: Vec3[] = [
      element.shape.bounds.min,
      newVec3(element.shape.bounds.min[0], element.shape.bounds.max[1], element.shape.bounds.min[2]),
      element.shape.bounds.max,
      newVec3(element.shape.bounds.max[0], element.shape.bounds.min[1], element.shape.bounds.max[2])
    ]

    // Project all corners
    for (const corner of corners) {
      const projected = projectPoint(corner, finalTransform)
      yield newVec2(projected[0], projected[1])
    }
  } else if ('children' in element) {
    // Recursively get points from children, passing accumulated transform
    for (const child of element.children) {
      yield* allPoints(child, projectionMatrix, accumulatedTransform)
    }
  }
}

export class WallConstructionArea {
  public readonly position: Vec3
  public readonly size: Vec3
  public readonly topOffsets?: readonly Vec2[]

  constructor(position: Vec3, size: Vec3, topOffsets?: readonly Vec2[]) {
    if (topOffsets) {
      const maxOffset = Math.max(...topOffsets.map(o => o[1]))
      topOffsets = topOffsets.map(o => newVec2(o[0], o[1] - maxOffset))
      const adjustedHeight = Math.max(size[2] + maxOffset, 0)
      size = newVec3(size[0], size[1], adjustedHeight)
      // Simplify flat top by removing offsets
      if (topOffsets.length === 2 && eqVec2(topOffsets[0], ZERO_VEC2) && eqVec2(topOffsets[1], newVec2(size[0], 0))) {
        topOffsets = undefined
      }
    }
    this.position = position
    this.size = size
    this.topOffsets = topOffsets
  }

  public getOffsetsAt(position: Length, tolerance: Length = 0): [Length, Length] {
    if (!this.topOffsets || this.topOffsets.length === 0) return [0, 0]

    // To avoid artifacts at the boundaries when there are height jumps, support tolerance
    if (tolerance > 0) {
      const filtered = this.topOffsets.filter(o => o[0] >= position && o[0] < position + tolerance)
      if (filtered.length > 0) {
        const lastOffset = filtered.reverse()[0][1]
        return [lastOffset, lastOffset]
      }
    }
    if (tolerance < 0) {
      const filtered = this.topOffsets.filter(o => o[0] <= position && o[0] > position + tolerance)
      if (filtered.length > 0) {
        const firstOffset = filtered[0][1]
        return [firstOffset, firstOffset]
      }
    }

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
    if (beforeIndex === -1) return [this.topOffsets[0][1], this.topOffsets[0][1]]

    // Position after last offset
    const lastIndex = this.topOffsets.length - 1
    if (afterIndex === -1) return [this.topOffsets[lastIndex][1], this.topOffsets[lastIndex][1]]

    const before = this.topOffsets[beforeIndex]
    const after = this.topOffsets[afterIndex]

    // Exact match
    if (Math.abs(before[0] - position) < 0.001) {
      let nextPositionIndex = afterIndex
      // Find potential jump, find last index with the same position
      while (nextPositionIndex <= lastIndex) {
        const next = this.topOffsets[nextPositionIndex]
        if (Math.abs(next[0] - position) > 0.001) break
        nextPositionIndex++
      }
      // Last offset value with the same position
      const next = this.topOffsets[nextPositionIndex - 1]
      return [before[1], next[1]]
    }

    // Linear interpolation between before and after
    const ratio = (position - before[0]) / (after[0] - before[0])
    const interpolated = before[1] + ratio * (after[1] - before[1])
    return [interpolated, interpolated]
  }

  public getHeightAtStart(): Length {
    return this.size[2] + this.getOffsetsAt(0, 1)[1]
  }

  public getHeightAtEnd(): Length {
    return this.size[2] + this.getOffsetsAt(this.size[0], -1)[0]
  }

  /**
   * Create a copy with adjusted Y position/size (depth adjustment)
   */
  public withYAdjustment(yOffset: Length, newDepth?: Length): WallConstructionArea {
    newDepth = Math.min(newDepth ?? this.size[1], this.size[1] - yOffset)
    const newPosition = newVec3(this.position[0], this.position[1] + yOffset, this.position[2])
    const newSize = newVec3(this.size[0], newDepth, this.size[2])
    return new WallConstructionArea(newPosition, newSize, this.topOffsets)
  }

  /**
   * Create a copy with adjusted X position (horizontal offset along wall)
   */
  public withXAdjustment(xOffset: Length, newWidth?: Length): WallConstructionArea {
    xOffset = Math.max(xOffset, 0)
    newWidth = Math.min(newWidth ?? this.size[0] - xOffset, this.size[0] - xOffset)
    const newPosition = newVec3(this.position[0] + xOffset, this.position[1], this.position[2])
    const newSize = newVec3(newWidth, this.size[1], this.size[2])

    if (!this.topOffsets) {
      return new WallConstructionArea(newPosition, newSize)
    }

    const inbetweenOffsets = this.topOffsets
      .map(offset => newVec2(offset[0] - xOffset, offset[1]))
      .filter(offset => offset[0] > 0.5 && offset[0] < newWidth - 0.5)

    const newTopOffsets = [
      newVec2(0, this.getOffsetsAt(xOffset, 1)[1]),
      ...inbetweenOffsets,
      newVec2(newWidth, this.getOffsetsAt(xOffset + newWidth, -1)[0])
    ]

    return new WallConstructionArea(newPosition, newSize, newTopOffsets)
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
    const newPosition = newVec3(this.position[0], this.position[1], this.position[2] + zOffset)
    const newSize = newVec3(this.size[0], this.size[1], newHeight)

    if (!this.topOffsets || this.topOffsets.length === 0) {
      return new WallConstructionArea(newPosition, newSize)
    }

    const oldTop = this.position[2] + this.size[2]
    const newBase = newPosition[2]
    const newTop = newPosition[2] + newSize[2]

    const newTopOffsets: Vec2[] = []

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
            newTopOffsets.push(newVec2(intersectionX, 0)) // At new top, offset = 0
          }
        }

        // Add the clipped point (roof is above new top, so offset = 0)
        newTopOffsets.push(newVec2(x, 0))

        // Check if next point is unclipped (need exit intersection)
        if (i < this.topOffsets.length - 1) {
          const nextOffset = this.topOffsets[i + 1]
          const nextX = nextOffset[0]
          const nextOldOffset = nextOffset[1]
          const nextRoofZ = oldTop + nextOldOffset
          const nextNewOffset = nextRoofZ - newBase

          if (nextNewOffset <= newSize[2]) {
            const intersectionX = this.findZIntersectionX(x, topAbsoluteZ, nextX, nextRoofZ, newTop)
            newTopOffsets.push(newVec2(intersectionX, 0)) // At new top, offset = 0
          }
        }
      } else {
        // Not clipped - use adjusted offset
        newTopOffsets.push(newVec2(x, newOffset - newSize[2]))
      }
    }

    return new WallConstructionArea(newPosition, newSize, newTopOffsets.length > 0 ? newTopOffsets : undefined)
  }

  public splitInZ(offset: Length): [WallConstructionArea, WallConstructionArea] {
    return [this.withZAdjustment(0, offset), this.withZAdjustment(offset)]
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
        newVec2(this.position[0], this.position[2]), // bottom-left
        newVec2(this.position[0] + this.size[0], this.position[2]), // bottom-right
        newVec2(this.position[0] + this.size[0], this.position[2] + this.size[2]), // top-right
        newVec2(this.position[0], this.position[2] + this.size[2]) // top-left
      ]
    }
    if (!this.topOffsets || this.topOffsets.length === 0) {
      // Simple rectangle
      return basePolygon
    }

    // Complex polygon with sloped top
    const pointsList: Vec2[] = []

    const top = this.position[2] + this.size[2]

    // Bottom edge (left to right)
    pointsList.push(newVec2(this.position[0], this.position[2]))
    pointsList.push(newVec2(this.position[0] + this.size[0], this.position[2]))

    // Right edge going up
    const lastOffset = this.topOffsets[this.topOffsets.length - 1]
    pointsList.push(newVec2(this.position[0] + this.size[0], top + lastOffset[1]))

    // Top edge (right to left, following slope)
    for (let i = this.topOffsets.length - 1; i >= 0; i--) {
      const offset = this.topOffsets[i]
      pointsList.push(newVec2(this.position[0] + offset[0], top + offset[1]))
    }

    // Left edge going down
    const firstOffset = this.topOffsets[0]
    pointsList.push(newVec2(this.position[0], top + firstOffset[1]))

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
