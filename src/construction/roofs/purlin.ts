import { mat4, vec2, vec3 } from 'gl-matrix'

import type { Roof } from '@/building/model'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config'
import { type ConstructionElement, type GroupOrElement, createConstructionElement } from '@/construction/elements'
import { PolygonWithBoundingRect, partitionByAlignedEdges, polygonEdges } from '@/construction/helpers'
import { transformManifold } from '@/construction/manifold/operations'
import { type ConstructionModel, createConstructionGroup } from '@/construction/model'
import { BaseRoofAssembly, type RoofSide } from '@/construction/roofs/base'
import { createExtrudedPolygon } from '@/construction/shapes'
import { TAG_ROOF, TAG_ROOF_SIDE_LEFT, TAG_ROOF_SIDE_RIGHT } from '@/construction/tags'
import {
  Bounds3D,
  type Length,
  type LineSegment2D,
  type Polygon2D,
  degreesToRadians,
  direction,
  ensurePolygonIsClockwise,
  intersectLineSegmentWithPolygon,
  intersectLineWithPolygon,
  isPointInPolygon,
  isPointStrictlyInPolygon,
  lineFromSegment,
  lineIntersection,
  midpoint,
  offsetPolygon,
  perpendicular,
  perpendicularCW,
  splitPolygonByLine
} from '@/shared/geometry'
import { type Manifold } from '@/shared/geometry/manifoldInstance'

import type { HeightLine, PurlinRoofConfig } from './types'

const EPSILON = 1e-5

export class PurlinRoofAssembly extends BaseRoofAssembly<PurlinRoofConfig> {
  construct = (roof: Roof, config: PurlinRoofConfig): ConstructionModel => {
    const slopeAngleRad = degreesToRadians(roof.slope)
    const ridgeDirection = direction(roof.ridgeLine.start, roof.ridgeLine.end)
    const ridgeHeight = this.calculateRidgeHeight(roof)

    const allElements: GroupOrElement[] = []

    // STEP 1: Split roof polygon ONCE
    const roofSides = this.splitRoofPolygon(roof, ridgeHeight)

    const edgeRafterMidpoints = this.getRafterMidpoints(roof, config, ridgeDirection)

    const purlinArea = this.getPurlinArea(roof)
    const purlinCheckPoints = this.getPurlinCheckPoints(purlinArea, ridgeDirection)
    const purlinAreaParts =
      roof.type === 'gable'
        ? splitPolygonByLine(purlinArea, lineFromSegment(roof.ridgeLine)).map(s => s.polygon)
        : [purlinArea]

    const purlins = [
      ...this.constructRidgeBeams(roof, config, ridgeHeight),
      ...purlinAreaParts.flatMap(p => [...this.constructPurlins(roof, config, ridgeHeight, p, purlinCheckPoints)])
    ]

    const purlinClippingVolume = purlins
      .map(p => transformManifold(p.shape.manifold, p.transform))
      .reduce((a, b) => a.add(b))

    // STEP 2: For each side, build all layers
    for (const roofSide of roofSides) {
      const sideElements: GroupOrElement[] = []

      // Main construction
      sideElements.push(...this.constructRafters(roof, config, roofSide, edgeRafterMidpoints))

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

      const inverseTransform = mat4.create()
      mat4.invert(inverseTransform, roofSide.transform)

      const purlinClip = transformManifold(purlinClippingVolume, inverseTransform)

      const clip = (m: Manifold) => m.intersect(clippingVolume).subtract(purlinClip)

      // Apply clipping to all elements recursively
      for (const element of sideElements) {
        this.applyClippingRecursive(element, clip)
      }

      // Group this side with its transform
      const sideTag = roofSide.side === 'left' ? TAG_ROOF_SIDE_LEFT : TAG_ROOF_SIDE_RIGHT
      const sideGroup = createConstructionGroup(sideElements, roofSide.transform, [sideTag])

      allElements.push(sideGroup)
    }

    allElements.push(...purlins)

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

  getConstructionThickness = (config: PurlinRoofConfig): Length => {
    return config.thickness
  }

  protected getTopLayerOffset = (_config: PurlinRoofConfig) => 0
  protected getCeilingLayerOffset = (_config: PurlinRoofConfig) => 0
  protected getOverhangLayerOffset = (_config: PurlinRoofConfig) => 0

  getTopOffset = (config: PurlinRoofConfig): Length => {
    return config.layers.topThickness
  }

  getBottomOffsets = (roof: Roof, _config: PurlinRoofConfig, line: LineSegment2D): HeightLine => {
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

  getTotalThickness = (config: PurlinRoofConfig) =>
    config.layers.insideThickness + config.thickness + config.layers.topThickness

  private getPurlinCheckPoints(polygon: Polygon2D, ridgeDirection: vec2) {
    const insideCheckPolygon = offsetPolygon(ensurePolygonIsClockwise(polygon), -5)
    const purlinCheckPoints = [...polygonEdges(insideCheckPolygon)]
      .filter(e => 1 - Math.abs(vec2.dot(direction(e.start, e.end), ridgeDirection)) < EPSILON)
      .map(e => midpoint(e.start, e.end))
    return purlinCheckPoints
  }

  private getRafterMidpoints(roof: Roof, config: PurlinRoofConfig, ridgeDirection: vec2) {
    const halfThickness = config.rafterWidth / 2

    const rafterEdgePolygon = offsetPolygon(roof.overhangPolygon, -halfThickness)
    const edgeRafterMidpoints = [...polygonEdges(rafterEdgePolygon)]
      .filter(e => Math.abs(vec2.dot(direction(e.start, e.end), ridgeDirection)) < EPSILON)
      .map(e => midpoint(e.start, e.end))
      .map(p => vec2.sub(vec2.create(), p, roof.ridgeLine.start))

    const { getPerimetersByStorey } = getModelActions()
    const { getWallAssemblyById } = getConfigActions()

    const perimeters = getPerimetersByStorey(roof.storeyId)
    const wallRafterMidpoints = perimeters
      .flatMap(p =>
        p.walls
          .filter(w => Math.abs(vec2.dot(w.direction, ridgeDirection)) < EPSILON)
          .flatMap(wall => {
            const assembly = getWallAssemblyById(wall.wallAssemblyId)
            const outsideOffset = halfThickness - (assembly?.layers.outsideThickness ?? 0)
            const insideOffset = (assembly?.layers.insideThickness ?? 0) - halfThickness

            const outsideMidpoint = midpoint(wall.outsideLine.start, wall.outsideLine.end)
            const outsidePoint = vec2.scaleAndAdd(vec2.create(), outsideMidpoint, wall.outsideDirection, outsideOffset)
            const insideMidpoint = midpoint(wall.insideLine.start, wall.insideLine.end)
            const insidePoint = vec2.scaleAndAdd(vec2.create(), insideMidpoint, wall.outsideDirection, insideOffset)

            return [outsidePoint, insidePoint]
          })
      )
      .filter(p => isPointInPolygon(p, roof.overhangPolygon))
      .map(p => vec2.sub(vec2.create(), p, roof.ridgeLine.start))

    return edgeRafterMidpoints.concat(wallRafterMidpoints)
  }

  private getPurlinArea(roof: Roof): Polygon2D {
    const ridgeDirection = direction(roof.ridgeLine.start, roof.ridgeLine.end)
    const innerLines = [...polygonEdges(roof.referencePolygon)].map(lineFromSegment)
    const outerLines = [...polygonEdges(roof.overhangPolygon)].map(lineFromSegment)

    const polygonLines = outerLines.map((l, i) =>
      Math.abs(vec2.dot(l.direction, ridgeDirection)) < EPSILON ? l : innerLines[i]
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
        [TAG_ROOF]
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
    const tanSlope = Math.tan(degreesToRadians(roof.slope))
    const ridgeDirection = direction(roof.ridgeLine.start, roof.ridgeLine.end)
    const downSlopeDir = perpendicularCW(ridgeDirection)
    const partitions = Array.from(partitionByAlignedEdges(polygon, ridgeDirection))

    const purlinPolygons = partitions.flatMap(p => {
      const { edgeAtStart, edgeAtEnd } = this.detectRoofEdges(p, ridgeDirection, purlinCheckPoints)

      const rect = PolygonWithBoundingRect.fromPolygon({ outer: p, holes: [] }, ridgeDirection)
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
      Math.abs(vec2.dot(vec2.sub(vec2.create(), point, roof.ridgeLine.start), downSlopeDir))

    for (const purlin of purlinPolygons) {
      const minDist = Math.min(...purlin.outer.points.map(getDistanceToRidge))
      const vOffset = ridgeHeight - minDist * tanSlope - config.purlinHeight + config.purlinInset
      // Helper to get SIGNED distance from ridge (perpendicular)

      yield createConstructionElement(
        config.purlinMaterial,
        createExtrudedPolygon(purlin, 'xy', config.purlinHeight),
        mat4.fromTranslation(mat4.create(), vec3.fromValues(0, 0, vOffset)),
        [TAG_ROOF]
      )
    }
  }

  private constructRafters(
    roof: Roof,
    config: PurlinRoofConfig,
    roofSide: RoofSide,
    rafterMidpoints: vec2[]
  ): GroupOrElement[] {
    const slopeAngleRad = degreesToRadians(roof.slope)
    const ridgeDirection = direction(roof.ridgeLine.start, roof.ridgeLine.end)
    const downSlopeDir = perpendicularCW(ridgeDirection)

    const preparedPolygon = this.preparePolygonForConstruction(
      roofSide.polygon,
      roof.ridgeLine,
      slopeAngleRad,
      config.thickness,
      config.thickness,
      roofSide.dirToRidge
    )

    const polygonBox = PolygonWithBoundingRect.fromPolygon({ outer: preparedPolygon, holes: [] }, downSlopeDir)

    const rafterPolygons = [
      ...polygonBox.stripes({
        thickness: config.rafterWidth,
        spacing: config.rafterSpacing,
        minSpacing: config.rafterSpacingMin,
        stripeAtMax: false, // Covered by rafterMidpoints
        stripeAtMin: false, // Covered by rafterMidpoints
        requiredStripeMidpoints: rafterMidpoints
      })
    ]

    return rafterPolygons.map(p =>
      createConstructionElement(
        config.rafterMaterial,
        createExtrudedPolygon(p.polygon, 'xy', config.thickness),
        undefined,
        undefined,
        { type: 'rafter' }
      )
    )
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
