import { vec2 } from 'gl-matrix'
import type { Manifold } from 'manifold-3d'

import type { Roof } from '@/building/model'
import { type GroupOrElement, createConstructionElement } from '@/construction/elements'
import { type ConstructionModel, createConstructionGroup } from '@/construction/model'
import { BaseRoofAssembly, type RoofSide } from '@/construction/roofs/base'
import { createExtrudedPolygon } from '@/construction/shapes'
import { TAG_ROOF, TAG_ROOF_SIDE_LEFT, TAG_ROOF_SIDE_RIGHT } from '@/construction/tags'
import {
  Bounds3D,
  type Length,
  type LineSegment2D,
  degreesToRadians,
  direction,
  intersectLineSegmentWithPolygon,
  lineFromSegment,
  lineIntersection,
  perpendicularCW
} from '@/shared/geometry'

import type { HeightLine, MonolithicRoofConfig } from './types'

export class MonolithicRoofAssembly extends BaseRoofAssembly<MonolithicRoofConfig> {
  construct = (roof: Roof, config: MonolithicRoofConfig): ConstructionModel => {
    const slopeAngleRad = degreesToRadians(roof.slope)
    const ridgeHeight = this.calculateRidgeHeight(roof)

    // STEP 1: Split roof polygon ONCE
    const roofSides = this.splitRoofPolygon(roof, ridgeHeight)

    const allElements: GroupOrElement[] = []

    // STEP 2: For each side, build all layers
    for (const roofSide of roofSides) {
      const sideElements: GroupOrElement[] = []

      // Main construction
      sideElements.push(...this.constructRoofElements(roof, config, roofSide))

      // Top layers
      sideElements.push(...this.constructTopLayers(roof, config, roofSide))

      // Ceiling layers
      sideElements.push(...this.constructCeilingLayers(roof, config, roofSide))

      // Overhang layers
      sideElements.push(...this.constructOverhangLayers(roof, config, roofSide))

      // STEP 3: Create clipping volume and apply to all elements
      // Calculate Z-range for clipping volume (doubled for safety margin)
      const minZ = (-2 * (ridgeHeight + config.layers.insideThickness)) as Length
      const maxZ = ((config.thickness + config.layers.topThickness) * 2) as Length

      // Create clipping volume from original (unexpanded, unoffset) polygon
      const clippingVolume = this.createClippingVolume(
        roofSide.polygon,
        roof.ridgeLine,
        minZ,
        maxZ,
        slopeAngleRad,
        roofSide.side
      )
      const clip = (m: Manifold) => m.intersect(clippingVolume)

      // Apply clipping to all elements recursively
      for (const element of sideElements) {
        this.applyClippingRecursive(element, clip)
      }

      // Group this side with its transform
      const sideTag = roofSide.side === 'left' ? TAG_ROOF_SIDE_LEFT : TAG_ROOF_SIDE_RIGHT
      const sideGroup = createConstructionGroup(sideElements, roofSide.transform, [sideTag])

      allElements.push(sideGroup)
    }

    // Compute bounds from all elements
    const bounds = allElements.length > 0 ? Bounds3D.merge(...allElements.map(el => el.bounds)) : Bounds3D.EMPTY

    return {
      elements: allElements,
      measurements: [],
      areas: [],
      errors: [],
      warnings: [],
      bounds
    }
  }

  getConstructionThickness = (config: MonolithicRoofConfig): Length => {
    return config.thickness
  }

  protected getTopLayerOffset = (_config: MonolithicRoofConfig) => 0
  protected getCeilingLayerOffset = (_config: MonolithicRoofConfig) => 0
  protected getOverhangLayerOffset = (_config: MonolithicRoofConfig) => 0

  getTopOffset = (config: MonolithicRoofConfig): Length => {
    return config.layers.topThickness
  }

  getBottomOffsets = (roof: Roof, _config: MonolithicRoofConfig, line: LineSegment2D): HeightLine => {
    // Step 1: Find intersection segments with overhang polygon
    const intersection = intersectLineSegmentWithPolygon(line, roof.overhangPolygon)
    if (!intersection || intersection.segments.length === 0) {
      return [] // Line doesn't intersect roof - no coverage
    }

    // Step 2: Setup roof geometry calculations
    const slopeAngleRad = degreesToRadians(roof.slope)
    const tanSlope = Math.tan(slopeAngleRad)
    const ridgeHeight = this.calculateRidgeHeight(roof)
    const ridgeDir = direction(roof.ridgeLine.start, roof.ridgeLine.end)
    const downSlopeDir = perpendicularCW(ridgeDir)

    // Helper to get SIGNED distance from ridge (perpendicular)
    const getSignedDistanceToRidge = (point: vec2): number =>
      vec2.dot(vec2.sub(vec2.create(), point, roof.ridgeLine.start), downSlopeDir)

    // Calculate height offset at a point
    const calculateOffset = (signedDist: number): number =>
      ridgeHeight - (roof.type === 'shed' ? signedDist : Math.abs(signedDist)) * tanSlope

    // Calculate offset at a given T position along the line
    const calculateOffsetAt = (t: number): Length => {
      const point = vec2.lerp(vec2.create(), line.start, line.end, t)
      return calculateOffset(getSignedDistanceToRidge(point)) as Length
    }

    // Step 3: Calculate ridge intersection ONCE (for gable roofs)
    let ridgeT = -1
    if (roof.type === 'gable') {
      const wallLine = lineFromSegment(line)
      const ridgeLine = lineFromSegment(roof.ridgeLine)
      const ridgeIntersection = lineIntersection(wallLine, ridgeLine)

      if (ridgeIntersection) {
        const lineLength = vec2.distance(line.end, line.start)
        if (lineLength > 0.001) {
          ridgeT = vec2.distance(ridgeIntersection, line.start) / lineLength
        }
      }
    }

    // Step 4: Build HeightLine for all segments
    const result: HeightLine = []
    for (const segment of intersection.segments) {
      // Segment start
      result.push({ position: segment.tStart, offset: calculateOffsetAt(segment.tStart), nullAfter: false })

      // Ridge intersection (if within this segment)
      if (ridgeT > segment.tStart && ridgeT < segment.tEnd) {
        result.push({ position: ridgeT, offset: ridgeHeight as Length, nullAfter: false })
      }

      // Segment end
      result.push({ position: segment.tEnd, offset: calculateOffsetAt(segment.tEnd), nullAfter: true })
    }

    return result
  }

  getTotalThickness = (config: MonolithicRoofConfig) =>
    config.layers.insideThickness + config.thickness + config.layers.topThickness

  private constructRoofElements(roof: Roof, config: MonolithicRoofConfig, roofSide: RoofSide): GroupOrElement[] {
    const slopeAngleRad = degreesToRadians(roof.slope)

    const preparedPolygon = this.preparePolygonForConstruction(
      roofSide.polygon,
      roof.ridgeLine,
      slopeAngleRad,
      config.thickness,
      config.thickness,
      roofSide.dirToRidge
    )

    const element = createConstructionElement(
      config.material,
      createExtrudedPolygon({ outer: preparedPolygon, holes: [] }, 'xy', config.thickness),
      undefined,
      [TAG_ROOF]
    )

    return [element]
  }
}
