import { type ConstructionElement, createConstructionElement, createCuboidElement } from '@/construction/model/elements'
import type { RawMeasurement } from '@/construction/model/measurements'
import { type ConstructionResult, yieldMeasurement } from '@/construction/model/results'
import { createExtrudedPolygon } from '@/construction/model/shapes'
import type { Tag } from '@/construction/model/tags'
import type { MaterialId } from '@/materials/types'
import type { InitialPartInfo } from '@/parts/types'
import {
  Bounds3D,
  type Length,
  type Polygon2D,
  type PolygonWithHoles2D,
  type Vec2,
  type Vec3,
  ZERO_VEC2,
  eqVec2,
  fromTrans,
  intersectPolygon,
  newVec2,
  newVec3
} from '@/shared/geometry'

export type AreaMeasurement = 'minHeight' | 'maxHeight' | 'width' | 'thickness'

export class WallConstructionArea {
  public readonly position: Vec3
  public readonly size: Vec3
  public readonly topOffsets?: readonly Vec2[]
  public readonly bottomOffsets?: readonly Vec2[]

  constructor(position: Vec3, size: Vec3, topOffsets?: readonly Vec2[], bottomOffsets?: readonly Vec2[]) {
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
    if (bottomOffsets) {
      const minOffset = Math.min(...bottomOffsets.map(o => o[1]))
      bottomOffsets = bottomOffsets.map(o => newVec2(o[0], o[1] - minOffset))
      // Simplify flat bottom by removing offsets
      if (
        bottomOffsets.length === 2 &&
        eqVec2(bottomOffsets[0], ZERO_VEC2) &&
        eqVec2(bottomOffsets[1], newVec2(size[0], 0))
      ) {
        bottomOffsets = undefined
      }
    }
    this.position = position
    this.size = size
    this.topOffsets = topOffsets
    this.bottomOffsets = bottomOffsets
  }

  public getTopOffsetsAt(position: Length, tolerance: Length = 0): [Length, Length] {
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

  public getBottomOffsetsAt(position: Length, tolerance: Length = 0): [Length, Length] {
    if (!this.bottomOffsets || this.bottomOffsets.length === 0) return [0, 0]

    // To avoid artifacts at the boundaries when there are height jumps, support tolerance
    if (tolerance > 0) {
      const filtered = this.bottomOffsets.filter(o => o[0] >= position && o[0] < position + tolerance)
      if (filtered.length > 0) {
        const lastOffset = filtered.reverse()[0][1]
        return [lastOffset, lastOffset]
      }
    }
    if (tolerance < 0) {
      const filtered = this.bottomOffsets.filter(o => o[0] <= position && o[0] > position + tolerance)
      if (filtered.length > 0) {
        const firstOffset = filtered[0][1]
        return [firstOffset, firstOffset]
      }
    }

    // Find the offset range containing this position
    let beforeIndex = -1
    let afterIndex = -1

    for (let i = 0; i < this.bottomOffsets.length; i++) {
      if (this.bottomOffsets[i][0] <= position) {
        beforeIndex = i
      }
      if (this.bottomOffsets[i][0] >= position && afterIndex === -1) {
        afterIndex = i
        break
      }
    }

    // Position before first offset
    if (beforeIndex === -1) return [this.bottomOffsets[0][1], this.bottomOffsets[0][1]]

    // Position after last offset
    const lastIndex = this.bottomOffsets.length - 1
    if (afterIndex === -1) return [this.bottomOffsets[lastIndex][1], this.bottomOffsets[lastIndex][1]]

    const before = this.bottomOffsets[beforeIndex]
    const after = this.bottomOffsets[afterIndex]

    // Exact match
    if (Math.abs(before[0] - position) < 0.001) {
      let nextPositionIndex = afterIndex
      // Find potential jump, find last index with the same position
      while (nextPositionIndex <= lastIndex) {
        const next = this.bottomOffsets[nextPositionIndex]
        if (Math.abs(next[0] - position) > 0.001) break
        nextPositionIndex++
      }
      // Last offset value with the same position
      const next = this.bottomOffsets[nextPositionIndex - 1]
      return [before[1], next[1]]
    }

    // Linear interpolation between before and after
    const ratio = (position - before[0]) / (after[0] - before[0])
    const interpolated = before[1] + ratio * (after[1] - before[1])
    return [interpolated, interpolated]
  }

  public getTopAtStart(): Length {
    return this.size[2] + this.getTopOffsetsAt(0, 1)[1]
  }

  public getTopAtEnd(): Length {
    return this.size[2] + this.getTopOffsetsAt(this.size[0], -1)[0]
  }

  /**
   * Create a copy with adjusted Y position/size (depth adjustment)
   */
  public withYAdjustment(yOffset: Length, newDepth?: Length): WallConstructionArea {
    newDepth = Math.min(newDepth ?? this.size[1], this.size[1] - yOffset)
    const newPosition = newVec3(this.position[0], this.position[1] + yOffset, this.position[2])
    const newSize = newVec3(this.size[0], newDepth, this.size[2])
    return new WallConstructionArea(newPosition, newSize, this.topOffsets, this.bottomOffsets)
  }

  /**
   * Create a copy with adjusted X position (horizontal offset along wall)
   */
  public withXAdjustment(xOffset: Length, newWidth?: Length): WallConstructionArea {
    xOffset = Math.max(xOffset, 0)
    newWidth = Math.min(newWidth ?? this.size[0] - xOffset, this.size[0] - xOffset)
    const newPosition = newVec3(this.position[0] + xOffset, this.position[1], this.position[2])
    const newSize = newVec3(newWidth, this.size[1], this.size[2])

    if (!this.topOffsets && !this.bottomOffsets) {
      return new WallConstructionArea(newPosition, newSize)
    }

    let newTopOffsets: Vec2[] | undefined
    if (this.topOffsets) {
      const inbetweenOffsets = this.topOffsets
        .map(offset => newVec2(offset[0] - xOffset, offset[1]))
        .filter(offset => offset[0] > 0.5 && offset[0] < newWidth - 0.5)

      newTopOffsets = [
        newVec2(0, this.getTopOffsetsAt(xOffset, 1)[1]),
        ...inbetweenOffsets,
        newVec2(newWidth, this.getTopOffsetsAt(xOffset + newWidth, -1)[0])
      ]
    }

    let newBottomOffsets: Vec2[] | undefined
    if (this.bottomOffsets) {
      const inbetweenBottomOffsets = this.bottomOffsets
        .map(offset => newVec2(offset[0] - xOffset, offset[1]))
        .filter(offset => offset[0] > 0.5 && offset[0] < newWidth - 0.5)

      newBottomOffsets = [
        newVec2(0, this.getBottomOffsetsAt(xOffset, 1)[1]),
        ...inbetweenBottomOffsets,
        newVec2(newWidth, this.getBottomOffsetsAt(xOffset + newWidth, -1)[0])
      ]
    }

    return new WallConstructionArea(newPosition, newSize, newTopOffsets, newBottomOffsets)
  }

  public splitInX(xOffset: Length): [WallConstructionArea, WallConstructionArea] {
    return [this.withXAdjustment(0, xOffset), this.withXAdjustment(xOffset)]
  }

  /**
   * Split the area into continuous top-contour segments at height jumps.
   */
  public splitAtHeightJumps(): WallConstructionArea[] {
    if (!this.topOffsets || this.topOffsets.length === 0) return [this]

    const segments: WallConstructionArea[] = []
    let start = 0
    for (let index = 0; index < this.topOffsets.length - 1; index++) {
      const current = this.topOffsets[index]
      const next = this.topOffsets[index + 1]
      if (Math.abs(current[0] - next[0]) < 0.0001 && Math.abs(current[1] - next[1]) > 0.0001) {
        const segment = this.withXAdjustment(start, current[0] - start)
        if (!segment.isEmpty) segments.push(segment)
        start = current[0]
      }
    }

    if (segments.length === 0) return [this]
    const finalSegment = this.withXAdjustment(start)
    if (!finalSegment.isEmpty) segments.push(finalSegment)
    return segments
  }

  /**
   * Split off a strip following the top contour. The first result is the top
   * strip and the second result is the remaining area below it.
   */
  public splitAtTop(thickness: Length): [WallConstructionArea, WallConstructionArea] {
    if (thickness <= 0) throw new Error('Top split thickness must be greater than 0')
    if (this.isEmpty) return [this, this]
    if (thickness >= this.minTopHeight) {
      return [this, new WallConstructionArea(this.position, newVec3(this.size[0], this.size[1], 0))]
    }

    const top = this.getAbsoluteTopPoints()
    const offsetBottom = offsetContour(top, thickness)
    const bottom = this.getAbsoluteBottomPoints()

    return [this.createAreaFromBoundaries(offsetBottom, top), this.createAreaFromBoundaries(bottom, offsetBottom)]
  }

  /**
   * Create a copy with adjusted Z position/height
   * Adds intersection points where roof line crosses the new top boundary to preserve slope information
   * Adds intersection points where floor line crosses the new base boundary for bottom offsets
   */
  public withZAdjustment(zOffset: Length, newHeight?: Length): WallConstructionArea {
    newHeight = Math.min(newHeight ?? this.size[2], this.size[2] - zOffset)
    const newPosition = newVec3(this.position[0], this.position[1], this.position[2] + zOffset)
    const newSize = newVec3(this.size[0], this.size[1], newHeight)

    if (!this.topOffsets && !this.bottomOffsets) {
      return new WallConstructionArea(newPosition, newSize)
    }

    const oldBase = this.position[2]
    const oldTop = this.position[2] + this.size[2]
    const newBase = newPosition[2]
    const newTop = newPosition[2] + newSize[2]

    // Process top offsets
    let newTopOffsets: Vec2[] | undefined
    if (this.topOffsets && this.topOffsets.length > 0) {
      newTopOffsets = []

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
    }

    // Process bottom offsets
    let newBottomOffsets: Vec2[] | undefined
    if (this.bottomOffsets && this.bottomOffsets.length > 0) {
      newBottomOffsets = []

      for (let i = 0; i < this.bottomOffsets.length; i++) {
        const currentOffset = this.bottomOffsets[i]
        const x = currentOffset[0]
        const oldOffset = currentOffset[1]

        const bottomAbsoluteZ = oldBase + oldOffset

        const newOffset = bottomAbsoluteZ - newBase

        // If this point is below the new base (needs clipping)
        if (newOffset < 0) {
          // Check if we need to add an intersection point before this
          if (i > 0) {
            const prevOffset = this.bottomOffsets[i - 1]
            const prevX = prevOffset[0]
            const prevOldOffset = prevOffset[1]
            const prevFloorZ = oldBase + prevOldOffset
            const prevNewOffset = prevFloorZ - newBase

            // If previous wasn't clipped but this is, add entry intersection
            if (prevNewOffset >= 0) {
              const intersectionX = this.findZIntersectionX(prevX, prevFloorZ, x, bottomAbsoluteZ, newBase)
              newBottomOffsets.push(newVec2(intersectionX, 0)) // At new base, offset = 0
            }
          }

          // Add the clipped point (floor is below new base, so offset = 0)
          newBottomOffsets.push(newVec2(x, 0))

          // Check if next point is unclipped (need exit intersection)
          if (i < this.bottomOffsets.length - 1) {
            const nextOffset = this.bottomOffsets[i + 1]
            const nextX = nextOffset[0]
            const nextOldOffset = nextOffset[1]
            const nextFloorZ = oldBase + nextOldOffset
            const nextNewOffset = nextFloorZ - newBase

            if (nextNewOffset >= 0) {
              const intersectionX = this.findZIntersectionX(x, bottomAbsoluteZ, nextX, nextFloorZ, newBase)
              newBottomOffsets.push(newVec2(intersectionX, 0)) // At new base, offset = 0
            }
          }
        } else {
          // Not clipped - use adjusted offset
          newBottomOffsets.push(newVec2(x, newOffset))
        }
      }
    }

    return new WallConstructionArea(
      newPosition,
      newSize,
      newTopOffsets && newTopOffsets.length > 0 ? newTopOffsets : undefined,
      newBottomOffsets && newBottomOffsets.length > 0 ? newBottomOffsets : undefined
    )
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

  private getAbsoluteTopPoints(): Vec2[] {
    if (!this.topOffsets || this.topOffsets.length === 0) {
      return [newVec2(0, this.position[2] + this.size[2]), newVec2(this.size[0], this.position[2] + this.size[2])]
    }
    return this.topOffsets.map(offset => newVec2(offset[0], this.position[2] + this.size[2] + offset[1]))
  }

  private getAbsoluteBottomPoints(): Vec2[] {
    if (!this.bottomOffsets || this.bottomOffsets.length === 0) {
      return [newVec2(0, this.position[2]), newVec2(this.size[0], this.position[2])]
    }
    return this.bottomOffsets.map(offset => newVec2(offset[0], this.position[2] + offset[1]))
  }

  private createAreaFromBoundaries(bottom: Vec2[], top: Vec2[]): WallConstructionArea {
    const baseZ = Math.min(...bottom.map(point => point[1]))
    const topZ = Math.max(...top.map(point => point[1]))
    const topOffsets = top.map(point => newVec2(point[0], point[1] - topZ))
    const bottomOffsets = bottom.map(point => newVec2(point[0], point[1] - baseZ))

    return new WallConstructionArea(
      newVec3(this.position[0], this.position[1], baseZ),
      newVec3(this.size[0], this.size[1], Math.max(topZ - baseZ, 0)),
      topOffsets,
      bottomOffsets
    )
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
    if (
      (!this.topOffsets || this.topOffsets.length === 0) &&
      (!this.bottomOffsets || this.bottomOffsets.length === 0)
    ) {
      // Simple rectangle
      return basePolygon
    }

    const pointsList: Vec2[] = []
    const top = this.position[2] + this.size[2]

    // Bottom edge (left to right) - following bottom offsets if present
    if (!this.bottomOffsets || this.bottomOffsets.length === 0) {
      pointsList.push(newVec2(this.position[0], this.position[2]))
      pointsList.push(newVec2(this.position[0] + this.size[0], this.position[2]))
    } else {
      // Bottom edge follows offsets
      for (const offset of this.bottomOffsets) {
        pointsList.push(newVec2(this.position[0] + offset[0], this.position[2] + offset[1]))
      }
    }

    // Right edge going up
    const lastTopOffset = this.topOffsets ? this.topOffsets[this.topOffsets.length - 1] : newVec2(this.size[0], 0)
    pointsList.push(newVec2(this.position[0] + this.size[0], top + lastTopOffset[1]))

    // Top edge (right to left, following slope)
    if (this.topOffsets && this.topOffsets.length > 0) {
      for (let i = this.topOffsets.length - 1; i >= 0; i--) {
        const offset = this.topOffsets[i]
        pointsList.push(newVec2(this.position[0] + offset[0], top + offset[1]))
      }
    } else {
      pointsList.push(newVec2(this.position[0], top))
    }

    // Left edge going down
    const firstBottomOffset = this.bottomOffsets ? this.bottomOffsets[0] : newVec2(0, 0)
    pointsList.push(newVec2(this.position[0], this.position[2] + firstBottomOffset[1]))

    const sidePolygonRaw = { outer: { points: pointsList }, holes: [] }
    const sidePolygons = intersectPolygon({ outer: basePolygon, holes: [] }, sidePolygonRaw)

    return sidePolygons.length > 0 ? sidePolygons[0].outer : { points: [] }
  }

  public extrude(materialId: MaterialId, tags?: Tag[], partInfo?: InitialPartInfo): ConstructionElement | null {
    if (this.isEmpty) return null

    if (this.isFlat) {
      return createCuboidElement(materialId, this.position, this.size, tags, partInfo)
    }

    const polygon: PolygonWithHoles2D = {
      outer: this.getSideProfilePolygon(),
      holes: []
    }

    const shape = createExtrudedPolygon(polygon, 'xz', this.size[1])
    const transform = fromTrans(newVec3(0, this.position[1], 0))

    return createConstructionElement(materialId, shape, transform, tags, partInfo)
  }

  public createMeasurement(type: AreaMeasurement, tags?: Tag[], offset?: Length, useMin = true): RawMeasurement | null {
    if (this.isEmpty) return null

    const bounds = this.bounds
    const axis = type === 'width' ? 0 : type === 'thickness' ? 1 : 2
    const base = useMin ? bounds.min : bounds.max
    const maxZ = type === 'minHeight' ? bounds.min[2] + this.minHeight : bounds.max[2]
    const startPoint = newVec3(
      axis === 0 ? bounds.min[0] : base[0],
      axis === 1 ? bounds.min[1] : base[1],
      axis === 2 ? bounds.min[2] : base[2]
    )
    const endPoint = newVec3(
      axis === 0 ? bounds.max[0] : base[0],
      axis === 1 ? bounds.max[1] : base[1],
      axis === 2 ? maxZ : base[2]
    )
    const extend1 = newVec3(
      axis === 1 ? bounds.max[0] : base[0],
      axis === 2 ? bounds.max[1] : base[1],
      axis === 0 ? bounds.max[2] : base[2]
    )
    const extend2 = newVec3(
      axis === 2 ? bounds.max[0] : base[0],
      axis === 0 ? bounds.max[1] : base[1],
      axis === 1 ? bounds.max[2] : base[2]
    )
    const length = type === 'minHeight' ? this.minHeight : bounds.size[axis]
    return {
      startPoint,
      endPoint,
      extend1,
      extend2,
      length: offset != null ? length : undefined,
      tags,
      offset
    }
  }

  *yieldMeasurement(
    type: 'width' | 'thickness' | 'height',
    tags?: Tag[],
    offset?: Length,
    useMin = true
  ): Generator<ConstructionResult> {
    if (this.isEmpty) return
    if (type === 'height') {
      if (this.minHeight !== this.size[2]) {
        const minHeight = this.createMeasurement(
          'minHeight',
          tags,
          offset ? -offset : undefined,
          offset ? !useMin : useMin
        )
        if (minHeight) {
          yield yieldMeasurement(minHeight)
        }
      }
      const maxHeight = this.createMeasurement('maxHeight', tags, offset, useMin)
      if (maxHeight) {
        yield yieldMeasurement(maxHeight)
      }
    } else {
      const measurement = this.createMeasurement(type, tags, offset, useMin)
      if (measurement) {
        yield yieldMeasurement(measurement)
      }
    }
  }

  public get bounds() {
    return Bounds3D.fromCuboid(this.position, this.size)
  }

  public get minHeight() {
    return this.minTopHeight
  }

  public get minTopHeight() {
    return this.size[2] + (this.topOffsets ? Math.min(...this.topOffsets.map(o => o[1])) : 0)
  }

  public get maxBottomHeight() {
    return this.bottomOffsets ? Math.max(...this.bottomOffsets.map(o => o[1])) : 0
  }

  public get totalHeight() {
    return this.size[2]
  }

  public get isEmpty() {
    return this.size[0] <= 0 || this.size[1] <= 0 || this.size[2] <= 0
  }

  public get isTopFlat() {
    return this.topOffsets == null || Math.min(...this.topOffsets.map(o => o[1])) === 0
  }

  public get isBottomFlat() {
    return this.bottomOffsets == null || Math.max(...this.bottomOffsets.map(o => o[1])) === 0
  }

  public get isFlat() {
    return this.isTopFlat && this.isBottomFlat
  }
}

function offsetContour(contour: Vec2[], distance: Length): Vec2[] {
  if (contour.length < 2) return contour

  const lines = contour.slice(0, -1).map((start, index) => {
    const end = contour[index + 1]
    const dx = end[0] - start[0]
    const dz = end[1] - start[1]
    const length = Math.hypot(dx, dz)
    if (length < 0.0001) throw new Error('Cannot offset a zero-length top contour segment')

    const normal = newVec2((dz / length) * distance, (-dx / length) * distance)
    return {
      point: newVec2(start[0] + normal[0], start[1] + normal[1]),
      direction: newVec2(dx, dz)
    }
  })

  const first = intersectLineWithVertical(lines[0].point, lines[0].direction, contour[0][0])
  const lastLine = lines[lines.length - 1]
  const last = intersectLineWithVertical(lastLine.point, lastLine.direction, contour[contour.length - 1][0])
  const result = [first]

  for (let index = 0; index < lines.length - 1; index++) {
    result.push(
      intersectLines(lines[index].point, lines[index].direction, lines[index + 1].point, lines[index + 1].direction)
    )
  }
  result.push(last)
  return result
}

function intersectLineWithVertical(point: Vec2, direction: Vec2, x: number): Vec2 {
  if (Math.abs(direction[0]) < 0.0001) return newVec2(x, point[1])
  const ratio = (x - point[0]) / direction[0]
  return newVec2(x, point[1] + ratio * direction[1])
}

function intersectLines(firstPoint: Vec2, firstDirection: Vec2, secondPoint: Vec2, secondDirection: Vec2): Vec2 {
  const determinant = firstDirection[0] * secondDirection[1] - firstDirection[1] * secondDirection[0]
  if (Math.abs(determinant) < 0.0001) {
    return newVec2(secondPoint[0], (firstPoint[1] + secondPoint[1]) / 2)
  }

  const dx = secondPoint[0] - firstPoint[0]
  const dz = secondPoint[1] - firstPoint[1]
  const ratio = (dx * secondDirection[1] - dz * secondDirection[0]) / determinant
  return newVec2(firstPoint[0] + ratio * firstDirection[0], firstPoint[1] + ratio * firstDirection[1])
}
