import type { Roof } from '@/building/model'
import type { PurlinRoofAssemblyConfig } from '@/construction/config'
import { getPerimeterContextsByStorey } from '@/construction/derived/perimeterContextCache'
import { createConstructionElement } from '@/construction/elements'
import {
  PolygonWithBoundingRect,
  type StripeOrGap,
  partitionByAlignedEdges,
  polygonEdges
} from '@/construction/helpers'
import { transformManifold } from '@/construction/manifold/operations'
import { constructStrawPolygon } from '@/construction/materials/straw'
import { type ConstructionModel, mergeModels, transformModel } from '@/construction/model'
import { type PerimeterConstructionContext, applyWallFaceOffsets } from '@/construction/perimeters/context'
import {
  type ConstructionResult,
  assignDeterministicIdsToResults,
  mergeResults,
  resultsToModel,
  yieldAndClip,
  yieldElement,
  yieldMeasurement
} from '@/construction/results'
import { BaseRoofAssembly, type RoofSide } from '@/construction/roofs/base'
import { type ExtrudedShape, createExtrudedPolygon } from '@/construction/shapes'
import type { VerticalOffsetMap } from '@/construction/storeys/offsets'
import {
  TAG_DECKING,
  TAG_INSIDE_SHEATHING,
  TAG_PURLIN,
  TAG_PURLIN_LENGTH,
  TAG_PURLIN_RISE,
  TAG_PURLIN_ROOF,
  TAG_PURLIN_SPACING,
  TAG_RAFTER,
  TAG_RAFTER_LENGTH,
  TAG_RAFTER_SPACING,
  TAG_RIDGE_BEAM,
  TAG_ROOF,
  TAG_ROOF_SIDE_LEFT,
  TAG_ROOF_SIDE_RIGHT,
  createTag
} from '@/construction/tags'
import {
  IDENTITY,
  type Length,
  type Polygon2D,
  type Vec2,
  addVec2,
  direction,
  dotAbsVec2,
  dotVec2,
  ensurePolygonIsClockwise,
  fromTrans,
  getPosition,
  intersectLineSegmentWithPolygon,
  intersectPolygons,
  invertTransform,
  isPointStrictlyInPolygon,
  lineFromSegment,
  lineIntersection,
  midpoint,
  negVec2,
  newVec3,
  offsetPolygon,
  perpendicular,
  perpendicularCCW,
  perpendicularCW,
  projectVec2,
  scaleAddVec2,
  splitPolygonByLine,
  subVec2,
  subtractPolygons,
  unionPolygons,
  vec3To2
} from '@/shared/geometry'
import { intersectLineWithPolygon } from '@/shared/geometry/polygon'

import type { PurlinRoofConfig } from './types'

const EPSILON = 1e-5

export class PurlinRoofAssembly extends BaseRoofAssembly<PurlinRoofConfig> {
  construct = (roof: Roof, _contexts: PerimeterConstructionContext[]): ConstructionModel => {
    const ridgeHeight = this.calculateRidgeHeight(roof)
    const perimeterContexts = getPerimeterContextsByStorey(roof.storeyId)

    const roofSides = this.splitRoofPolygon(roof, ridgeHeight)

    const edgeRafterMidpoints = this.getRafterMidpoints(roof, roof.ridgeDirection, roof.storeyId)

    const purlins = Array.from(this.constructAllPurlins(roof, perimeterContexts, ridgeHeight))
    assignDeterministicIdsToResults(purlins, roof.id)

    const purlinClippingVolume = purlins
      .filter(p => p.type === 'element')
      .map(p => p.element)
      .filter(p => 'shape' in p)
      .map(p => transformManifold(p.shape.manifold, p.transform))
      .reduce((a, b) => a.add(b))

    // Calculate Z-range for clipping volume (doubled for safety margin)
    const minZ = -2 * (roof.rise + this.insideLayersThickness)
    const maxZ = (this.config.thickness + this.topLayersThickness) * 2

    const outerConstructionClippingVolume = perimeterContexts
      .map(c =>
        this.createExtrudedVolume(
          offsetPolygon(c.outerPolygon, -0.01), // For avoiding clipping artifacts
          roof.ridgeLine,
          minZ,
          maxZ
        )
      )
      .reduce((a, b) => a.add(b))
    const innerConstructionClippingVolume = perimeterContexts
      .map(c => this.createExtrudedVolume(c.innerPolygon, roof.ridgeLine, minZ, maxZ))
      .reduce((a, b) => a.add(b))
    const ceilingClippingVolume = this.getCeilingPolygons(roof, true)
      .map(c => this.createExtrudedVolume(c, roof.ridgeLine, minZ, maxZ))
      .reduce((a, b) => a.add(b))

    // STEP 2: For each side, build all layers
    const roofModels = roofSides.map(roofSide => {
      const raftersAndGaps = this.getRafterPolygons(roof, roofSide, edgeRafterMidpoints)
      const rafterPolygons = raftersAndGaps.filter(x => x.type === 'stripe').map(x => x.polygon)

      // Create clipping volume from original (unexpanded, unoffset) polygon
      const roofSideVolume = this.createExtrudedVolume(roofSide.polygon, roof.ridgeLine, minZ, maxZ)
      const roofSideInverseRotate = this.calculateInverseRotationTransform(
        roof.ridgeLine,
        roof.slopeAngleRad,
        roofSide.side
      )
      const roofSideClip = transformManifold(roofSideVolume, roofSideInverseRotate)

      const inverseTransform = invertTransform(roofSide.transform) ?? IDENTITY
      const purlinClip = transformManifold(purlinClippingVolume, inverseTransform)

      const infillClip = transformManifold(outerConstructionClippingVolume, roofSideInverseRotate)
      const sheathingClip = transformManifold(innerConstructionClippingVolume, roofSideInverseRotate)
      const ceilingClip = transformManifold(ceilingClippingVolume, roofSideInverseRotate)

      const results = Array.from(
        mergeResults(
          yieldAndClip(this.construcRafters(raftersAndGaps), m => m.intersect(roofSideClip).subtract(purlinClip)),
          yieldAndClip(this.constructInfill(perimeterContexts, roof, roofSide, rafterPolygons), m =>
            m.intersect(roofSideClip).intersect(infillClip).subtract(purlinClip)
          ),
          yieldAndClip(this.constructDecking(roofSide, roof), m => m.intersect(roofSideClip)),
          yieldAndClip(this.constructCeilingSheathing(roofSide, roof, perimeterContexts), m =>
            m.intersect(roofSideClip).intersect(sheathingClip).subtract(purlinClip)
          ),
          yieldAndClip(this.constructTopLayers(roof, roofSide), m => m.intersect(roofSideClip)),
          yieldAndClip(this.constructCeilingLayers(roof, roofSide), m =>
            m.intersect(roofSideClip).intersect(ceilingClip).subtract(purlinClip)
          ),
          yieldAndClip(this.constructOverhangLayers(roof, roofSide), m => m.intersect(roofSideClip))
        )
      )
      assignDeterministicIdsToResults(results, roof.id)

      const sideTag = roofSide.side === 'left' ? TAG_ROOF_SIDE_LEFT : TAG_ROOF_SIDE_RIGHT
      return transformModel(resultsToModel(results), roofSide.transform, [sideTag])
    })

    roofModels.push(resultsToModel(purlins))

    const config = this.config as unknown as PurlinRoofAssemblyConfig
    const nameKey = config.nameKey
    const nameTag = createTag(
      'roof-assembly',
      config.id,
      nameKey != null ? t => t(nameKey, { ns: 'config' }) : config.name
    )
    return transformModel(mergeModels(...roofModels), IDENTITY, [TAG_ROOF, TAG_PURLIN_ROOF, nameTag])
  }

  get constructionThickness(): Length {
    return this.config.thickness
  }

  protected get topLayerOffset(): Length {
    return this.config.deckingThickness
  }

  protected get ceilingLayerOffset(): Length {
    return -this.config.ceilingSheathingThickness
  }

  protected get overhangLayerOffset(): Length {
    return 0 as Length
  }

  get topOffset(): Length {
    return this.topLayersThickness
  }

  getBottomOffsets = (roof: Roof, map: VerticalOffsetMap, _contexts: PerimeterConstructionContext[]): void => {
    const ridgeHeight = this.calculateRidgeHeight(roof)
    const perimeterContexts = getPerimeterContextsByStorey(roof.storeyId)
    const roofSides = this.splitRoofPolygon(roof, ridgeHeight)

    for (const side of roofSides) {
      map.addSlopedArea(side.polygon, roof.ridgeLine.start, negVec2(side.dirToRidge), roof.slopeAngleRad, ridgeHeight)
    }

    const purlins = Array.from(this.constructAllPurlins(roof, perimeterContexts, ridgeHeight))

    purlins
      .filter(p => p.type === 'element')
      .map(p => p.element)
      .filter(p => 'shape' in p)
      .forEach(purlin => {
        const purlinPolygon = (purlin.shape.base as ExtrudedShape).polygon.outer
        const position = getPosition(purlin.transform)
        const position2D = vec3To2(position)
        const transformed: Polygon2D = { points: purlinPolygon.points.map(p => addVec2(p, position2D)) }
        const offset = position[2]
        map.addConstantArea(transformed, offset)
      })
  }

  private *constructAllPurlins(
    roof: Roof,
    _contexts: PerimeterConstructionContext[],
    ridgeHeight: number
  ): Generator<ConstructionResult> {
    const purlinArea = this.getPurlinArea(roof, _contexts)
    const purlinCheckPoints = this.getPurlinCheckPoints(purlinArea, roof.ridgeDirection)
    const purlinAreaParts =
      roof.type === 'gable'
        ? splitPolygonByLine(purlinArea, lineFromSegment(roof.ridgeLine)).map(s => s.polygon)
        : [purlinArea]

    yield* this.constructRidgeBeams(roof, ridgeHeight)

    for (const area of purlinAreaParts) {
      yield* this.constructPurlins(roof, ridgeHeight, area, purlinCheckPoints)
    }
  }

  private getPurlinCheckPoints(polygon: Polygon2D, ridgeDirection: Vec2) {
    const insideCheckPolygon = offsetPolygon(ensurePolygonIsClockwise(polygon), -5)
    const purlinCheckPoints = [...polygonEdges(insideCheckPolygon)]
      .filter(e => 1 - dotAbsVec2(direction(e.start, e.end), ridgeDirection) < EPSILON)
      .map(e => midpoint(e.start, e.end))
    return purlinCheckPoints
  }

  private getRafterMidpoints(roof: Roof, ridgeDirection: Vec2, _storeyId: string) {
    const perimeterContexts = getPerimeterContextsByStorey(roof.storeyId)
    const halfThickness = this.config.rafterWidth / 2

    const rafterEdgePolygon = offsetPolygon(roof.overhangPolygon, -halfThickness)
    const edgeRafterMidpoints = [...polygonEdges(rafterEdgePolygon)]
      .filter(e => dotAbsVec2(direction(e.start, e.end), ridgeDirection) < EPSILON)
      .map(e => midpoint(e.start, e.end))

    const innerRafterPoints = perimeterContexts.flatMap(c =>
      Array.from(polygonEdges(c.innerPolygon))
        .filter(e => dotAbsVec2(direction(e.start, e.end), ridgeDirection) < EPSILON)
        .filter(e => intersectLineSegmentWithPolygon(e, roof.overhangPolygon) != null)
        .map(e => scaleAddVec2(e.start, perpendicularCW(direction(e.start, e.end)), halfThickness))
    )
    const outerRafterPoints = perimeterContexts.flatMap(c =>
      Array.from(polygonEdges(c.outerPolygon))
        .filter(e => dotAbsVec2(direction(e.start, e.end), ridgeDirection) < EPSILON)
        .filter(e => intersectLineSegmentWithPolygon(e, roof.overhangPolygon) != null)
        .map(e => scaleAddVec2(e.start, perpendicularCCW(direction(e.start, e.end)), halfThickness))
    )

    return innerRafterPoints
      .concat(outerRafterPoints)
      .concat(edgeRafterMidpoints)
      .map(p => subVec2(p, roof.ridgeLine.start))
  }

  private getPurlinArea(roof: Roof, _contexts: PerimeterConstructionContext[]): Polygon2D {
    const perimeterContexts = getPerimeterContextsByStorey(roof.storeyId)
    const adjustedPolygon = applyWallFaceOffsets(
      roof.referencePolygon,
      perimeterContexts.flatMap(c => c.wallFaceOffsets)
    )

    const innerLines = [...polygonEdges(adjustedPolygon)].map(lineFromSegment)
    const outerLines = [...polygonEdges(roof.overhangPolygon)].map(lineFromSegment)

    const polygonLines = outerLines.map((l, i) =>
      dotAbsVec2(l.direction, roof.ridgeDirection) < EPSILON ? l : innerLines[i]
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

  private *constructRidgeBeams(roof: Roof, ridgeHeight: Length): Generator<ConstructionResult> {
    if (roof.type === 'shed') return // Handled as a normal purlin

    const line = lineFromSegment(roof.ridgeLine)
    const parts = intersectLineWithPolygon(line, roof.overhangPolygon)
    const perpDir = perpendicular(line.direction)

    const vOffset = ridgeHeight - this.config.purlinHeight + this.config.purlinInset
    const halfWidth = this.config.purlinWidth / 2
    for (const part of parts) {
      const partPolygon: Polygon2D = {
        points: [
          scaleAddVec2(part.start, perpDir, -halfWidth),
          scaleAddVec2(part.end, perpDir, -halfWidth),
          scaleAddVec2(part.end, perpDir, halfWidth),
          scaleAddVec2(part.start, perpDir, halfWidth)
        ]
      }

      yield* yieldElement(
        createConstructionElement(
          this.config.purlinMaterial,
          createExtrudedPolygon({ outer: partPolygon, holes: [] }, 'xy', this.config.purlinHeight),
          fromTrans(newVec3(0, 0, vOffset)),
          [TAG_RIDGE_BEAM],
          { type: 'roof-purlin', requiresSinglePiece: true }
        )
      )

      const basePoint = partPolygon.points[1]
      const startPoint = newVec3(basePoint[0], basePoint[1], 0)
      const extend1 = newVec3(partPolygon.points[2][0], partPolygon.points[2][1], 0)
      const extend2 = newVec3(partPolygon.points[0][0], partPolygon.points[0][1], 0)
      yield yieldMeasurement({
        startPoint,
        endPoint: newVec3(basePoint[0], basePoint[1], vOffset),
        extend1,
        extend2,
        tags: [TAG_PURLIN_RISE]
      })
    }
  }

  private *constructPurlins(
    roof: Roof,
    ridgeHeight: Length,
    polygon: Polygon2D,
    purlinCheckPoints: Vec2[]
  ): Generator<ConstructionResult> {
    const partitions = Array.from(partitionByAlignedEdges(polygon, roof.ridgeDirection))

    const gapPolygons: PolygonWithBoundingRect[] = []
    const purlinPolygons = partitions.flatMap(p => {
      const { edgeAtStart, edgeAtEnd } = this.detectRoofEdges(p, roof.ridgeDirection, purlinCheckPoints)
      const rect = PolygonWithBoundingRect.fromPolygon({ outer: p, holes: [] }, roof.ridgeDirection)
      const stripes = [
        ...rect.stripes({
          thickness: this.config.purlinWidth,
          spacing: this.config.purlinSpacing,
          equalSpacing: true,
          stripeAtMin: edgeAtStart,
          stripeAtMax: edgeAtEnd,
          gapCallback: gap => gapPolygons.push(gap)
        })
      ]
      return stripes.map(s => s.expandedInDir(0.01))
    })

    const getDistanceToRidge = (point: Vec2): number =>
      Math.abs(projectVec2(roof.ridgeLine.start, point, roof.downSlopeDirection))

    const tanSlope = Math.tan(roof.slopeAngleRad)
    for (const purlin of purlinPolygons) {
      const polygon = purlin.polygon.outer
      const minDist = Math.min(...polygon.points.map(getDistanceToRidge))
      const vOffset = ridgeHeight - minDist * tanSlope - this.config.purlinHeight + this.config.purlinInset
      yield* purlin.extrude(
        this.config.purlinMaterial,
        this.config.purlinHeight,
        'xy',
        fromTrans(newVec3(0, 0, vOffset)),
        [TAG_PURLIN],
        { type: 'roof-purlin', requiresSinglePiece: true }
      )

      const purlinLength = purlin.dirMeasurement('xy', this.config.purlinHeight, [TAG_PURLIN_LENGTH])
      if (purlinLength) {
        yield yieldMeasurement(purlinLength)
      }

      const basePoint = polygon.points[1]
      const startPoint = newVec3(basePoint[0], basePoint[1], 0)
      const extend1 = newVec3(polygon.points[2][0], polygon.points[2][1], 0)
      const extend2 = newVec3(polygon.points[0][0], polygon.points[0][1], 0)
      yield yieldMeasurement({
        startPoint,
        endPoint: newVec3(basePoint[0], basePoint[1], vOffset),
        extend1,
        extend2,
        tags: [TAG_PURLIN_RISE]
      })
    }

    yield* gapPolygons
      .map(g => g.perpMeasurement('xy', this.config.thickness, [TAG_PURLIN_SPACING]))
      .filter(m => m != null)
      .map(yieldMeasurement)
  }

  private *construcRafters(raftersAndGaps: StripeOrGap[]): Generator<ConstructionResult> {
    for (const rafterOrGap of raftersAndGaps) {
      if (rafterOrGap.type === 'stripe') {
        yield* rafterOrGap.polygon.extrude(
          this.config.rafterMaterial,
          this.config.thickness,
          'xy',
          undefined,
          [TAG_RAFTER],
          {
            type: 'rafter',
            requiresSinglePiece: true
          }
        )
        const length = rafterOrGap.polygon.dirMeasurement('xy', this.config.thickness, [TAG_RAFTER_LENGTH])
        if (length) {
          yield yieldMeasurement(length)
        }
      } else {
        const spacing = rafterOrGap.polygon.perpMeasurement('xy', this.config.thickness, [TAG_RAFTER_SPACING])
        if (spacing) {
          yield yieldMeasurement(spacing)
        }
      }
    }
  }

  private *constructDecking(roofSide: RoofSide, roof: Roof): Generator<ConstructionResult> {
    const deckingArea = this.preparePolygonForConstruction(
      roofSide.polygon,
      roof.ridgeLine,
      roof.slopeAngleRad,
      this.config.thickness + this.config.deckingThickness,
      this.config.deckingThickness,
      roofSide.dirToRidge
    )
    yield* yieldElement(
      createConstructionElement(
        this.config.deckingMaterial,
        createExtrudedPolygon({ outer: deckingArea, holes: [] }, 'xy', this.config.deckingThickness),
        fromTrans(newVec3(0, 0, this.config.thickness)),
        [TAG_DECKING],
        { type: 'roof-decking' }
      )
    )
  }

  private *constructCeilingSheathing(
    roofSide: RoofSide,
    roof: Roof,
    _perimeterContexts: PerimeterConstructionContext[]
  ): Generator<ConstructionResult> {
    const perimeterContexts = getPerimeterContextsByStorey(roof.storeyId)
    const roofSidePolygon = this.preparePolygonForConstruction(
      roofSide.polygon,
      roof.ridgeLine,
      roof.slopeAngleRad,
      -this.config.ceilingSheathingThickness,
      this.config.ceilingSheathingThickness,
      roofSide.dirToRidge
    )
    const perimeterPolygons = unionPolygons(
      perimeterContexts.map(c =>
        this.preparePolygonForConstruction(
          c.innerPolygon,
          roof.ridgeLine,
          roof.slopeAngleRad,
          -this.config.ceilingSheathingThickness,
          this.config.ceilingSheathingThickness,
          roofSide.dirToRidge
        )
      )
    )
    const innerConstructionAreas = intersectPolygons([roofSidePolygon], perimeterPolygons)

    for (const area of innerConstructionAreas) {
      yield* yieldElement(
        createConstructionElement(
          this.config.ceilingSheathingMaterial,
          createExtrudedPolygon({ outer: area, holes: [] }, 'xy', this.config.ceilingSheathingThickness),
          fromTrans(newVec3(0, 0, -this.config.ceilingSheathingThickness)),
          [TAG_INSIDE_SHEATHING],
          { type: 'roof-inside-sheathing' }
        )
      )
    }
  }

  private *constructInfill(
    _perimeterContexts: PerimeterConstructionContext[],
    roof: Roof,
    roofSide: RoofSide,
    rafterPolygons: PolygonWithBoundingRect[]
  ): Generator<ConstructionResult> {
    const perimeterContexts = getPerimeterContextsByStorey(roof.storeyId)
    const preparedRoofSide = this.preparePolygonForConstruction(
      roofSide.polygon,
      roof.ridgeLine,
      roof.slopeAngleRad,
      this.config.thickness,
      this.config.thickness,
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
            this.config.thickness,
            this.config.thickness,
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
      Array.from(constructStrawPolygon(p, 'xy', this.config.thickness, this.config.strawMaterial))
    )
  }

  private getRafterPolygons(roof: Roof, roofSide: RoofSide, rafterMidpoints: Vec2[]) {
    const preparedPolygon = this.preparePolygonForConstruction(
      roofSide.polygon,
      roof.ridgeLine,
      roof.slopeAngleRad,
      this.config.thickness,
      this.config.thickness,
      roofSide.dirToRidge
    )
    const polygonBox = PolygonWithBoundingRect.fromPolygon(
      { outer: preparedPolygon, holes: [] },
      roof.downSlopeDirection
    )
    return [
      ...polygonBox.stripesAndGaps({
        thickness: this.config.rafterWidth,
        spacing: this.config.rafterSpacing,
        minSpacing: this.config.rafterSpacingMin,
        stripeAtMax: false, // Covered by rafterMidpoints
        stripeAtMin: false, // Covered by rafterMidpoints
        requiredStripeMidpoints: rafterMidpoints
      })
    ]
  }

  private detectRoofEdges(
    partition: Polygon2D,
    edgeDirection: Vec2,
    checkPoints: Vec2[]
  ): { edgeAtStart: boolean; edgeAtEnd: boolean } {
    if (partition.points.length === 0 || checkPoints.length === 0) {
      return { edgeAtStart: false, edgeAtEnd: false }
    }

    const perpDir = perpendicular(edgeDirection)

    // Find left and right boundaries of partition (min/max perpendicular projections)
    const projections = partition.points.map(p => dotVec2(p, perpDir))
    const leftProjection = Math.min(...projections)
    const rightProjection = Math.max(...projections)
    const centerProjection = (leftProjection + rightProjection) / 2

    let edgeAtStart = false
    let edgeAtEnd = false

    for (const checkPoint of checkPoints) {
      if (isPointStrictlyInPolygon(checkPoint, partition)) {
        const projection = dotVec2(checkPoint, perpDir)

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
