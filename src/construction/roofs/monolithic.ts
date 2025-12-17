import { vec2 } from 'gl-matrix'
import type { Manifold } from 'manifold-3d'

import type { Roof } from '@/building/model'
import type { PerimeterConstructionContext } from '@/construction/context'
import { createConstructionElement } from '@/construction/elements'
import { IDENTITY } from '@/construction/geometry'
import { type ConstructionModel, mergeModels, transformModel } from '@/construction/model'
import { type ConstructionResult, mergeResults, resultsToModel, yieldElement } from '@/construction/results'
import { BaseRoofAssembly, type RoofSide } from '@/construction/roofs/base'
import { createExtrudedPolygon } from '@/construction/shapes'
import { TAG_ROOF, TAG_ROOF_SIDE_LEFT, TAG_ROOF_SIDE_RIGHT } from '@/construction/tags'
import {
  type Length,
  type LineSegment2D,
  intersectLineSegmentWithPolygon,
  lineFromSegment,
  lineIntersection
} from '@/shared/geometry'

import type { HeightLine, MonolithicRoofConfig } from './types'

export class MonolithicRoofAssembly extends BaseRoofAssembly<MonolithicRoofConfig> {
  construct = (
    roof: Roof,
    config: MonolithicRoofConfig,
    _contexts: PerimeterConstructionContext[]
  ): ConstructionModel => {
    const ridgeHeight = this.calculateRidgeHeight(roof)

    // STEP 1: Split roof polygon ONCE
    const roofSides = this.splitRoofPolygon(roof, ridgeHeight)

    // STEP 2: For each side, build all layers
    const roofModels = roofSides.map(roofSide => {
      const results = Array.from(
        mergeResults(
          this.constructRoofElements(roof, config, roofSide),
          this.constructTopLayers(roof, config, roofSide),
          this.constructCeilingLayers(roof, config, roofSide),
          this.constructOverhangLayers(roof, config, roofSide)
        )
      )

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
        roof.slopeAngleRad,
        roofSide.side
      )
      const clip = (m: Manifold) => m.intersect(clippingVolume)

      // Apply clipping to all elements recursively
      for (const result of results) {
        if (result.type === 'element') {
          this.applyClippingRecursive(result.element, clip)
        }
      }

      // Group this side with its transform
      const sideTag = roofSide.side === 'left' ? TAG_ROOF_SIDE_LEFT : TAG_ROOF_SIDE_RIGHT
      return transformModel(resultsToModel(results), roofSide.transform, [sideTag])
    })

    return transformModel(mergeModels(...roofModels), IDENTITY, [TAG_ROOF])
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
    const tanSlope = Math.tan(roof.slopeAngleRad)
    const ridgeHeight = this.calculateRidgeHeight(roof)

    // Helper to get SIGNED distance from ridge (perpendicular)
    const getSignedDistanceToRidge = (point: vec2): number =>
      vec2.dot(vec2.sub(vec2.create(), point, roof.ridgeLine.start), roof.downSlopeDirection)

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

  private *constructRoofElements(
    roof: Roof,
    config: MonolithicRoofConfig,
    roofSide: RoofSide
  ): Generator<ConstructionResult> {
    const preparedPolygon = this.preparePolygonForConstruction(
      roofSide.polygon,
      roof.ridgeLine,
      roof.slopeAngleRad,
      config.thickness,
      config.thickness,
      roofSide.dirToRidge
    )

    yield* yieldElement(
      createConstructionElement(
        config.material,
        createExtrudedPolygon({ outer: preparedPolygon, holes: [] }, 'xy', config.thickness),
        undefined,
        [TAG_ROOF]
      )
    )
  }
}
