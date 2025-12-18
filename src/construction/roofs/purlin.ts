import { mat4, vec2, vec3 } from 'gl-matrix'

import type { Roof } from '@/building/model'
import { type PerimeterConstructionContext, applyWallFaceOffsets } from '@/construction/context'
import { type ConstructionElement, createConstructionElement } from '@/construction/elements'
import { IDENTITY } from '@/construction/geometry'
import { PolygonWithBoundingRect, partitionByAlignedEdges, polygonEdges } from '@/construction/helpers'
import { transformManifold } from '@/construction/manifold/operations'
import { constructStrawPolygon } from '@/construction/materials/straw'
import { type ConstructionModel, mergeModels, transformModel } from '@/construction/model'
import {
  type ConstructionResult,
  mergeResults,
  resultsToModel,
  yieldAndClip,
  yieldElement,
  yieldMeasurement
} from '@/construction/results'
import { BaseRoofAssembly, type RoofSide } from '@/construction/roofs/base'
import { type ExtrudedShape, createExtrudedPolygon } from '@/construction/shapes'
import {
  TAG_DECKING,
  TAG_INSIDE_SHEATHING,
  TAG_PURLIN,
  TAG_RAFTER,
  TAG_RAFTER_SPACING,
  TAG_RIDGE_BEAM,
  TAG_ROOF,
  TAG_ROOF_SIDE_LEFT,
  TAG_ROOF_SIDE_RIGHT
} from '@/construction/tags'
import {
  type Length,
  type LineSegment2D,
  type Polygon2D,
  direction,
  ensurePolygonIsClockwise,
  intersectLineSegmentWithPolygon,
  intersectLineWithPolygon,
  intersectPolygons,
  isPointStrictlyInPolygon,
  lineFromSegment,
  lineIntersection,
  midpoint,
  offsetPolygon,
  perpendicular,
  perpendicularCCW,
  perpendicularCW,
  splitPolygonByLine,
  subtractPolygons,
  unionPolygons
} from '@/shared/geometry'

import type { HeightLine, PurlinRoofConfig } from './types'

const EPSILON = 1e-5

export class PurlinRoofAssembly extends BaseRoofAssembly<PurlinRoofConfig> {
  construct = (roof: Roof, config: PurlinRoofConfig, contexts: PerimeterConstructionContext[]): ConstructionModel => {
    const ridgeHeight = this.calculateRidgeHeight(roof)

    const roofSides = this.splitRoofPolygon(roof, ridgeHeight)

    const edgeRafterMidpoints = this.getRafterMidpoints(roof, config, roof.ridgeDirection, contexts)

    const purlins = this.getAllPurlins(roof, contexts, config, ridgeHeight)
    const purlinClippingVolume = purlins
      .map(p => transformManifold(p.shape.manifold, p.transform))
      .reduce((a, b) => a.add(b))

    // Calculate Z-range for clipping volume (doubled for safety margin)
    const minZ = (-2 * (ridgeHeight + config.layers.insideThickness)) as Length
    const maxZ = ((config.thickness + config.layers.topThickness) * 2) as Length

    const outerConstructionClippingVolume = contexts
      .map(c => this.createExtrudedVolume(offsetPolygon(c.outerPolygon, -0.01), roof.ridgeLine, minZ, maxZ))
      .reduce((a, b) => a.add(b))
    const innerConstructionClippingVolume = contexts
      .map(c => this.createExtrudedVolume(c.innerPolygon, roof.ridgeLine, minZ, maxZ))
      .reduce((a, b) => a.add(b))
    const ceilingClippingVolume = this.getCeilingPolygons(roof)
      .map(c => this.createExtrudedVolume(c, roof.ridgeLine, minZ, maxZ))
      .reduce((a, b) => a.add(b))

    // STEP 2: For each side, build all layers
    const roofModels = roofSides.map(roofSide => {
      const rafterPolygons = this.getRafterPolygons(roof, roofSide, config, edgeRafterMidpoints)

      // Create clipping volume from original (unexpanded, unoffset) polygon
      const roofSideVolume = this.createExtrudedVolume(roofSide.polygon, roof.ridgeLine, minZ, maxZ)
      const roofSideInverseRotate = this.calculateInverseRotationTransform(
        roof.ridgeLine,
        roof.slopeAngleRad,
        roofSide.side
      )
      const roofSideClip = transformManifold(roofSideVolume, roofSideInverseRotate)

      const inverseTransform = mat4.create()
      mat4.invert(inverseTransform, roofSide.transform)
      const purlinClip = transformManifold(purlinClippingVolume, inverseTransform)

      const infillClip = transformManifold(outerConstructionClippingVolume, roofSideInverseRotate)
      const sheathingClip = transformManifold(innerConstructionClippingVolume, roofSideInverseRotate)
      const ceilingClip = transformManifold(ceilingClippingVolume, roofSideInverseRotate)

      const results = Array.from(
        mergeResults(
          yieldAndClip(this.construcRafters(rafterPolygons, config), m =>
            m.intersect(roofSideClip).subtract(purlinClip)
          ),
          yieldAndClip(this.constructInfill(contexts, roof, config, roofSide, rafterPolygons), m =>
            m.intersect(roofSideClip).intersect(infillClip).subtract(purlinClip)
          ),
          yieldAndClip(this.constructDecking(roofSide, roof, config), m => m.intersect(roofSideClip)),
          yieldAndClip(this.constructCeilingSheathing(roofSide, roof, config, contexts), m =>
            m.intersect(roofSideClip).intersect(sheathingClip).subtract(purlinClip)
          ),
          yieldAndClip(this.constructTopLayers(roof, config, roofSide), m => m.intersect(roofSideClip)),
          yieldAndClip(this.constructCeilingLayers(roof, config, roofSide), m =>
            m.intersect(roofSideClip).intersect(ceilingClip).subtract(purlinClip)
          ),
          yieldAndClip(this.constructOverhangLayers(roof, config, roofSide), m => m.intersect(roofSideClip))
        )
      )

      const sideTag = roofSide.side === 'left' ? TAG_ROOF_SIDE_LEFT : TAG_ROOF_SIDE_RIGHT
      return transformModel(resultsToModel(results), roofSide.transform, [sideTag])
    })

    roofModels.push(resultsToModel(purlins.map(element => ({ type: 'element' as const, element }))))

    return transformModel(mergeModels(...roofModels), IDENTITY, [TAG_ROOF])
  }

  getConstructionThickness = (config: PurlinRoofConfig): Length => {
    return config.thickness
  }

  protected getTopLayerOffset = (config: PurlinRoofConfig) => config.deckingThickness
  protected getCeilingLayerOffset = (config: PurlinRoofConfig) => -config.ceilingSheathingThickness
  protected getOverhangLayerOffset = (_config: PurlinRoofConfig) => 0

  getTopOffset = (config: PurlinRoofConfig): Length => {
    return config.layers.topThickness
  }

  getBottomOffsets = (
    roof: Roof,
    config: PurlinRoofConfig,
    line: LineSegment2D,
    contexts: PerimeterConstructionContext[]
  ): HeightLine => {
    // Step 1: Find intersection segments with overhang polygon
    const intersection = intersectLineSegmentWithPolygon(line, roof.overhangPolygon)
    if (!intersection || intersection.segments.length === 0) {
      return [] // Line doesn't intersect roof - no coverage
    }

    // Step 2: Setup roof geometry calculations
    const tanSlope = Math.tan(roof.slopeAngleRad)
    const ridgeHeight = this.calculateRidgeHeight(roof)

    interface PurlinIntersection {
      tStart: number
      tEnd: number
      offset: Length
    }
    const purlins = this.getAllPurlins(roof, contexts, config, ridgeHeight)
    const purlinIntersections: PurlinIntersection[] = purlins
      .flatMap(purlin => {
        const purlinPolygon = (purlin.shape.base as ExtrudedShape).polygon.outer
        const intersection = intersectLineSegmentWithPolygon(line, purlinPolygon)
        if (!intersection) return []
        const offset = purlin.transform[14]
        return [{ tStart: intersection.segments[0].tStart, tEnd: intersection.segments[0].tEnd, offset }]
      })
      .sort((a, b) => b.tStart - a.tStart)

    // Check if entire line runs along a purlin
    if (purlinIntersections.length === 1) {
      const purlin = purlinIntersections[0]
      if (purlin.tStart === 0 && purlin.tEnd === 1) {
        return [
          { position: 0, offset: purlin.offset, nullAfter: false },
          { position: 1, offset: purlin.offset, nullAfter: true }
        ]
      }
    }

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

    const processPurlinsUntilT = (t: number) => {
      let lastT = -1
      let purlin
      while ((purlin = purlinIntersections.pop())) {
        if (purlin.tStart >= t) {
          purlinIntersections.push(purlin)
          break
        }
        result.push({
          position: purlin.tStart,
          offsetBefore: calculateOffsetAt(purlin.tStart),
          offsetAfter: purlin.offset
        })
        result.push({ position: purlin.tEnd, offsetBefore: purlin.offset, offsetAfter: calculateOffsetAt(purlin.tEnd) })
        lastT = purlin.tEnd
      }
      return lastT < t
    }

    // Step 4: Build HeightLine for all segments
    const result: HeightLine = []
    for (const segment of intersection.segments) {
      // Segment start
      result.push({ position: segment.tStart, offset: calculateOffsetAt(segment.tStart), nullAfter: false })

      // Ridge intersection (if within this segment)
      if (ridgeT > segment.tStart && ridgeT < segment.tEnd) {
        if (processPurlinsUntilT(ridgeT)) {
          result.push({ position: ridgeT, offset: ridgeHeight as Length, nullAfter: false })
        }
      }

      processPurlinsUntilT(segment.tEnd)

      // Segment end
      result.push({ position: segment.tEnd, offset: calculateOffsetAt(segment.tEnd), nullAfter: true })
    }

    return result
  }

  getTotalThickness = (config: PurlinRoofConfig) =>
    config.layers.insideThickness + config.thickness + config.layers.topThickness

  private getAllPurlins(
    roof: Roof,
    contexts: PerimeterConstructionContext[],
    config: PurlinRoofConfig,
    ridgeHeight: number
  ) {
    const purlinArea = this.getPurlinArea(roof, contexts)
    const purlinCheckPoints = this.getPurlinCheckPoints(purlinArea, roof.ridgeDirection)
    const purlinAreaParts =
      roof.type === 'gable'
        ? splitPolygonByLine(purlinArea, lineFromSegment(roof.ridgeLine)).map(s => s.polygon)
        : [purlinArea]

    const purlins = [
      ...this.constructRidgeBeams(roof, config, ridgeHeight),
      ...purlinAreaParts.flatMap(p => [...this.constructPurlins(roof, config, ridgeHeight, p, purlinCheckPoints)])
    ]
    return purlins
  }

  private getPurlinCheckPoints(polygon: Polygon2D, ridgeDirection: vec2) {
    const insideCheckPolygon = offsetPolygon(ensurePolygonIsClockwise(polygon), -5)
    const purlinCheckPoints = [...polygonEdges(insideCheckPolygon)]
      .filter(e => 1 - Math.abs(vec2.dot(direction(e.start, e.end), ridgeDirection)) < EPSILON)
      .map(e => midpoint(e.start, e.end))
    return purlinCheckPoints
  }

  private getRafterMidpoints(
    roof: Roof,
    config: PurlinRoofConfig,
    ridgeDirection: vec2,
    perimeterContexts: PerimeterConstructionContext[]
  ) {
    const halfThickness = config.rafterWidth / 2

    const rafterEdgePolygon = offsetPolygon(roof.overhangPolygon, -halfThickness)
    const edgeRafterMidpoints = [...polygonEdges(rafterEdgePolygon)]
      .filter(e => Math.abs(vec2.dot(direction(e.start, e.end), ridgeDirection)) < EPSILON)
      .map(e => midpoint(e.start, e.end))

    const innerRafterPoints = perimeterContexts.flatMap(c =>
      Array.from(polygonEdges(c.innerPolygon))
        .filter(e => Math.abs(vec2.dot(direction(e.start, e.end), ridgeDirection)) < EPSILON)
        .filter(e => intersectLineSegmentWithPolygon(e, roof.overhangPolygon) != null)
        .map(e => vec2.scaleAndAdd(vec2.create(), e.start, perpendicularCW(direction(e.start, e.end)), halfThickness))
    )
    const outerRafterPoints = perimeterContexts.flatMap(c =>
      Array.from(polygonEdges(c.outerPolygon))
        .filter(e => Math.abs(vec2.dot(direction(e.start, e.end), ridgeDirection)) < EPSILON)
        .filter(e => intersectLineSegmentWithPolygon(e, roof.overhangPolygon) != null)
        .map(e => vec2.scaleAndAdd(vec2.create(), e.start, perpendicularCCW(direction(e.start, e.end)), halfThickness))
    )

    return innerRafterPoints
      .concat(outerRafterPoints)
      .concat(edgeRafterMidpoints)
      .map(p => vec2.sub(vec2.create(), p, roof.ridgeLine.start))
  }

  private getPurlinArea(roof: Roof, contexts: PerimeterConstructionContext[]): Polygon2D {
    const adjustedPolygon = applyWallFaceOffsets(
      roof.referencePolygon,
      contexts.flatMap(c => c.wallFaceOffsets)
    )

    const innerLines = [...polygonEdges(adjustedPolygon)].map(lineFromSegment)
    const outerLines = [...polygonEdges(roof.overhangPolygon)].map(lineFromSegment)

    const polygonLines = outerLines.map((l, i) =>
      Math.abs(vec2.dot(l.direction, roof.ridgeDirection)) < EPSILON ? l : innerLines[i]
    )
    const points = polygonLines
      .map((line, index) => {
        const prevIndex = (index - 1 + polygonLines.length) % polygonLines.length
        const prevLine = polygonLines[prevIndex]
        return lineIntersection(prevLine, line)
      })
      .filter(p => p != null)

    return { points }
  }

  private *constructRidgeBeams(
    roof: Roof,
    config: PurlinRoofConfig,
    ridgeHeight: Length
  ): Generator<ConstructionElement> {
    if (roof.type === 'shed') return // Handled as a normal purlin

    const line = lineFromSegment(roof.ridgeLine)
    const parts = intersectLineWithPolygon(line, roof.overhangPolygon)
    const perpDir = perpendicular(line.direction)

    const vOffset = ridgeHeight - config.purlinHeight + config.purlinInset
    const halfWidth = config.purlinWidth / 2
    for (const part of parts) {
      const partPolygon: Polygon2D = {
        points: [
          vec2.scaleAndAdd(vec2.create(), part.start, perpDir, -halfWidth),
          vec2.scaleAndAdd(vec2.create(), part.end, perpDir, -halfWidth),
          vec2.scaleAndAdd(vec2.create(), part.end, perpDir, halfWidth),
          vec2.scaleAndAdd(vec2.create(), part.start, perpDir, halfWidth)
        ]
      }

      yield createConstructionElement(
        config.purlinMaterial,
        createExtrudedPolygon({ outer: partPolygon, holes: [] }, 'xy', config.purlinHeight),
        mat4.fromTranslation(mat4.create(), vec3.fromValues(0, 0, vOffset)),
        [TAG_RIDGE_BEAM],
        { type: 'roof-purlin' }
      )
    }
  }

  private *constructPurlins(
    roof: Roof,
    config: PurlinRoofConfig,
    ridgeHeight: Length,
    polygon: Polygon2D,
    purlinCheckPoints: vec2[]
  ): Generator<ConstructionElement> {
    const tanSlope = Math.tan(roof.slopeAngleRad)
    const partitions = Array.from(partitionByAlignedEdges(polygon, roof.ridgeDirection))

    const purlinPolygons = partitions.flatMap(p => {
      const { edgeAtStart, edgeAtEnd } = this.detectRoofEdges(p, roof.ridgeDirection, purlinCheckPoints)
      const rect = PolygonWithBoundingRect.fromPolygon({ outer: p, holes: [] }, roof.ridgeDirection)
      return [
        ...rect.stripes({
          thickness: config.purlinWidth,
          spacing: config.purlinSpacing,
          equalSpacing: true,
          stripeAtMin: edgeAtStart,
          stripeAtMax: edgeAtEnd
        })
      ].map(p => p.polygon)
    })

    const getDistanceToRidge = (point: vec2): number =>
      Math.abs(vec2.dot(vec2.sub(vec2.create(), point, roof.ridgeLine.start), roof.downSlopeDirection))

    for (const purlin of purlinPolygons) {
      const minDist = Math.min(...purlin.outer.points.map(getDistanceToRidge))
      const vOffset = ridgeHeight - minDist * tanSlope - config.purlinHeight + config.purlinInset
      yield createConstructionElement(
        config.purlinMaterial,
        createExtrudedPolygon(purlin, 'xy', config.purlinHeight),
        mat4.fromTranslation(mat4.create(), vec3.fromValues(0, 0, vOffset)),
        [TAG_PURLIN],
        { type: 'roof-purlin' }
      )
    }
  }

  private *construcRafters(
    rafterPolygons: PolygonWithBoundingRect[],
    config: PurlinRoofConfig
  ): Generator<ConstructionResult> {
    for (const rafter of rafterPolygons) {
      yield* yieldElement(
        createConstructionElement(
          config.rafterMaterial,
          createExtrudedPolygon(rafter.polygon, 'xy', config.thickness),
          undefined,
          [TAG_RAFTER],
          { type: 'rafter' }
        )
      )
    }
  }

  private *constructDecking(roofSide: RoofSide, roof: Roof, config: PurlinRoofConfig): Generator<ConstructionResult> {
    const deckingArea = this.preparePolygonForConstruction(
      roofSide.polygon,
      roof.ridgeLine,
      roof.slopeAngleRad,
      config.thickness + config.deckingThickness,
      config.deckingThickness,
      roofSide.dirToRidge
    )
    yield* yieldElement(
      createConstructionElement(
        config.deckingMaterial,
        createExtrudedPolygon({ outer: deckingArea, holes: [] }, 'xy', config.deckingThickness),
        mat4.fromTranslation(mat4.create(), vec3.fromValues(0, 0, config.thickness)),
        [TAG_DECKING],
        { type: 'roof-decking' }
      )
    )
  }

  private *constructCeilingSheathing(
    roofSide: RoofSide,
    roof: Roof,
    config: PurlinRoofConfig,
    perimeterContexts: PerimeterConstructionContext[]
  ): Generator<ConstructionResult> {
    const roofSidePolygon = this.preparePolygonForConstruction(
      roofSide.polygon,
      roof.ridgeLine,
      roof.slopeAngleRad,
      -config.ceilingSheathingThickness,
      config.ceilingSheathingThickness,
      roofSide.dirToRidge
    )
    const perimeterPolygons = unionPolygons(
      perimeterContexts.map(c =>
        this.preparePolygonForConstruction(
          c.innerPolygon,
          roof.ridgeLine,
          roof.slopeAngleRad,
          -config.ceilingSheathingThickness,
          config.ceilingSheathingThickness,
          roofSide.dirToRidge
        )
      )
    )
    const innerConstructionAreas = intersectPolygons([roofSidePolygon], perimeterPolygons)

    for (const area of innerConstructionAreas) {
      yield* yieldElement(
        createConstructionElement(
          config.ceilingSheathingMaterial,
          createExtrudedPolygon({ outer: area, holes: [] }, 'xy', config.ceilingSheathingThickness),
          mat4.fromTranslation(mat4.create(), vec3.fromValues(0, 0, -config.ceilingSheathingThickness)),
          [TAG_INSIDE_SHEATHING],
          { type: 'roof-inside-sheathing' }
        )
      )
    }
  }

  private *constructInfill(
    perimeterContexts: PerimeterConstructionContext[],
    roof: Roof,
    config: PurlinRoofConfig,
    roofSide: RoofSide,
    rafterPolygons: PolygonWithBoundingRect[]
  ): Generator<ConstructionResult> {
    const preparedRoofSide = this.preparePolygonForConstruction(
      roofSide.polygon,
      roof.ridgeLine,
      roof.slopeAngleRad,
      config.thickness,
      config.thickness,
      roofSide.dirToRidge
    )

    const outerConstructionAreas = intersectPolygons(
      [preparedRoofSide],
      unionPolygons(
        perimeterContexts.map(c =>
          this.preparePolygonForConstruction(
            c.outerPolygon,
            roof.ridgeLine,
            roof.slopeAngleRad,
            config.thickness,
            config.thickness,
            roofSide.dirToRidge
          )
        )
      )
    )
    const infillPolygons = subtractPolygons(
      outerConstructionAreas,
      rafterPolygons.map(p => p.polygon.outer)
    ).map(p => PolygonWithBoundingRect.fromPolygon(p, roof.downSlopeDirection))

    yield* infillPolygons.flatMap(p =>
      Array.from(constructStrawPolygon(p, 'xy', config.thickness, config.strawMaterial))
    )

    yield* infillPolygons
      .map(p => p.perpMeasurement('xy', config.thickness, [TAG_RAFTER_SPACING]))
      .filter(m => m != null)
      .map(yieldMeasurement)
  }

  private getRafterPolygons(roof: Roof, roofSide: RoofSide, config: PurlinRoofConfig, rafterMidpoints: vec2[]) {
    const preparedPolygon = this.preparePolygonForConstruction(
      roofSide.polygon,
      roof.ridgeLine,
      roof.slopeAngleRad,
      config.thickness,
      config.thickness,
      roofSide.dirToRidge
    )
    const polygonBox = PolygonWithBoundingRect.fromPolygon(
      { outer: preparedPolygon, holes: [] },
      roof.downSlopeDirection
    )
    return [
      ...polygonBox.stripes({
        thickness: config.rafterWidth,
        spacing: config.rafterSpacing,
        minSpacing: config.rafterSpacingMin,
        stripeAtMax: false, // Covered by rafterMidpoints
        stripeAtMin: false, // Covered by rafterMidpoints
        requiredStripeMidpoints: rafterMidpoints
      })
    ]
  }

  private detectRoofEdges(
    partition: Polygon2D,
    edgeDirection: vec2,
    checkPoints: vec2[]
  ): { edgeAtStart: boolean; edgeAtEnd: boolean } {
    if (partition.points.length === 0 || checkPoints.length === 0) {
      return { edgeAtStart: false, edgeAtEnd: false }
    }

    const perpDir = perpendicular(edgeDirection)

    // Find left and right boundaries of partition (min/max perpendicular projections)
    const projections = partition.points.map(p => vec2.dot(p, perpDir))
    const leftProjection = Math.min(...projections)
    const rightProjection = Math.max(...projections)
    const centerProjection = (leftProjection + rightProjection) / 2

    let edgeAtStart = false
    let edgeAtEnd = false

    for (const checkPoint of checkPoints) {
      if (isPointStrictlyInPolygon(checkPoint, partition)) {
        const projection = vec2.dot(checkPoint, perpDir)

        if (projection < centerProjection) {
          edgeAtStart = true
        } else {
          edgeAtEnd = true
        }
      }

      if (edgeAtStart && edgeAtEnd) break
    }

    return { edgeAtStart, edgeAtEnd }
  }
}
