import type { Manifold } from 'manifold-3d'

import type { Roof } from '@/building/model'
import type { MonolithicRoofAssemblyConfig } from '@/construction/config'
import { createConstructionElement } from '@/construction/elements'
import { transformManifold } from '@/construction/manifold/operations'
import { type ConstructionModel, mergeModels, transformModel } from '@/construction/model'
import type { PerimeterConstructionContext } from '@/construction/perimeters/context'
import {
  type ConstructionResult,
  mergeResults,
  resultsToModel,
  yieldAndClip,
  yieldElement
} from '@/construction/results'
import { BaseRoofAssembly, type RoofSide } from '@/construction/roofs/base'
import { createExtrudedPolygon } from '@/construction/shapes'
import { TAG_MONOLITHIC_ROOF, TAG_ROOF, TAG_ROOF_SIDE_LEFT, TAG_ROOF_SIDE_RIGHT, createTag } from '@/construction/tags'
import {
  IDENTITY,
  type Length,
  type LineSegment2D,
  type Vec2,
  distVec2,
  intersectLineSegmentWithPolygon,
  lerpVec2,
  lineFromSegment,
  lineIntersection,
  projectVec2
} from '@/shared/geometry'

import type { HeightLine, MonolithicRoofConfig } from './types'

export class MonolithicRoofAssembly extends BaseRoofAssembly<MonolithicRoofConfig> {
  construct = (roof: Roof, _contexts: PerimeterConstructionContext[]): ConstructionModel => {
    const ridgeHeight = this.calculateRidgeHeight(roof)
    const roofSides = this.splitRoofPolygon(roof, ridgeHeight)

    // Calculate Z-range for clipping volume (doubled for safety margin)
    const minZ = (-2 * (ridgeHeight + this.config.layers.insideThickness)) as Length
    const maxZ = ((this.config.thickness + this.config.layers.topThickness) * 2) as Length
    const ceilingClippingVolume = this.getCeilingPolygons(roof)
      .map(c => this.createExtrudedVolume(c, roof.ridgeLine, minZ, maxZ))
      .reduce((a, b) => a.add(b))

    const roofModels = roofSides.map(roofSide => {
      const roofSideVolume = this.createExtrudedVolume(roofSide.polygon, roof.ridgeLine, minZ, maxZ)
      const roofSideInverseRotate = this.calculateInverseRotationTransform(
        roof.ridgeLine,
        roof.slopeAngleRad,
        roofSide.side
      )
      const roofSideClip = transformManifold(roofSideVolume, roofSideInverseRotate)
      const ceilingClip = transformManifold(ceilingClippingVolume, roofSideInverseRotate)
      const clip = (m: Manifold) => m.intersect(roofSideClip)

      const results = Array.from(
        mergeResults(
          yieldAndClip(this.constructRoofElements(roof, roofSide), clip),
          yieldAndClip(this.constructTopLayers(roof, roofSide), clip),
          yieldAndClip(this.constructCeilingLayers(roof, roofSide), m =>
            m.intersect(roofSideClip).intersect(ceilingClip)
          ),
          yieldAndClip(this.constructOverhangLayers(roof, roofSide), clip)
        )
      )

      const sideTag = roofSide.side === 'left' ? TAG_ROOF_SIDE_LEFT : TAG_ROOF_SIDE_RIGHT
      return transformModel(resultsToModel(results), roofSide.transform, [sideTag])
    })

    const nameTag = createTag('roof-assembly', (this.config as unknown as MonolithicRoofAssemblyConfig).name)
    return transformModel(mergeModels(...roofModels), IDENTITY, [TAG_ROOF, TAG_MONOLITHIC_ROOF, nameTag])
  }

  get constructionThickness(): Length {
    return this.config.thickness
  }

  protected get topLayerOffset(): Length {
    return 0 as Length
  }

  protected get ceilingLayerOffset(): Length {
    return 0 as Length
  }

  protected get overhangLayerOffset(): Length {
    return 0 as Length
  }

  get topOffset(): Length {
    return this.config.layers.topThickness
  }

  getBottomOffsets = (roof: Roof, line: LineSegment2D): HeightLine => {
    // Step 1: Find intersection segments with overhang polygon
    const intersection = intersectLineSegmentWithPolygon(line, roof.overhangPolygon)
    if (!intersection || intersection.segments.length === 0) {
      return [] // Line doesn't intersect roof - no coverage
    }

    // Step 2: Setup roof geometry calculations
    const tanSlope = Math.tan(roof.slopeAngleRad)
    const ridgeHeight = this.calculateRidgeHeight(roof)

    // Helper to get SIGNED distance from ridge (perpendicular)
    const getSignedDistanceToRidge = (point: Vec2): number =>
      projectVec2(roof.ridgeLine.start, point, roof.downSlopeDirection)

    // Calculate height offset at a point
    const calculateOffset = (signedDist: number): number =>
      ridgeHeight - (roof.type === 'shed' ? signedDist : Math.abs(signedDist)) * tanSlope

    // Calculate offset at a given T position along the line
    const calculateOffsetAt = (t: number): Length => {
      const point = lerpVec2(line.start, line.end, t)
      return calculateOffset(getSignedDistanceToRidge(point)) as Length
    }

    // Step 3: Calculate ridge intersection ONCE (for gable roofs)
    let ridgeT = -1
    if (roof.type === 'gable') {
      const wallLine = lineFromSegment(line)
      const ridgeLine = lineFromSegment(roof.ridgeLine)
      const ridgeIntersection = lineIntersection(wallLine, ridgeLine)

      if (ridgeIntersection) {
        const lineLength = distVec2(line.end, line.start)
        if (lineLength > 0.001) {
          ridgeT = projectVec2(line.start, ridgeIntersection, wallLine.direction) / lineLength
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

  private *constructRoofElements(roof: Roof, roofSide: RoofSide): Generator<ConstructionResult> {
    const preparedPolygon = this.preparePolygonForConstruction(
      roofSide.polygon,
      roof.ridgeLine,
      roof.slopeAngleRad,
      this.config.thickness,
      this.config.thickness,
      roofSide.dirToRidge
    )

    yield* yieldElement(
      createConstructionElement(
        this.config.material,
        createExtrudedPolygon({ outer: preparedPolygon, holes: [] }, 'xy', this.config.thickness),
        undefined,
        [TAG_ROOF]
      )
    )
  }
}
