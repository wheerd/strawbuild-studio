import { mat4, vec2, vec3 } from 'gl-matrix'

import type { Roof } from '@/building/model'
import { getModelActions } from '@/building/store'
import { type GroupOrElement, createConstructionElement } from '@/construction/elements'
import { IDENTITY, type Transform } from '@/construction/geometry'
import { LAYER_CONSTRUCTIONS } from '@/construction/layers'
import type { LayerConfig, MonolithicLayerConfig, StripedLayerConfig } from '@/construction/layers/types'
import { type ConstructionModel, createConstructionGroup, createUnsupportedModel } from '@/construction/model'
import { type ConstructionResult } from '@/construction/results'
import { createExtrudedPolygon } from '@/construction/shapes'
import {
  TAG_LAYERS,
  TAG_ROOF,
  TAG_ROOF_LAYER_INSIDE,
  TAG_ROOF_LAYER_OVERHANG,
  TAG_ROOF_LAYER_TOP,
  TAG_ROOF_SIDE_LEFT,
  TAG_ROOF_SIDE_RIGHT,
  createTag
} from '@/construction/tags'
import {
  Bounds3D,
  type Length,
  type LineSegment2D,
  type Polygon2D,
  type PolygonWithHoles2D,
  degreesToRadians,
  direction,
  distanceToInfiniteLine,
  intersectPolygon,
  lineFromSegment,
  lineIntersection,
  perpendicularCCW,
  perpendicularCW,
  splitPolygonByLine,
  subtractPolygons,
  unionPolygons
} from '@/shared/geometry'

import type { HeightLine, MonolithicRoofConfig, RoofAssembly } from './types'

interface RoofSide {
  polygon: Polygon2D
  side: 'left' | 'right'
  transform: Transform
}

export class MonolithicRoofAssembly implements RoofAssembly<MonolithicRoofConfig> {
  construct = (roof: Roof, config: MonolithicRoofConfig): ConstructionModel => {
    const slopeAngleRad = degreesToRadians(roof.slope)

    // Avoid division by zero for flat roofs
    if (Math.abs(slopeAngleRad) < 0.001) {
      return createUnsupportedModel('Flat roofs not supported', 'unsupported-roof-flat')
    }

    const expansionFactor = 1 / Math.cos(slopeAngleRad)

    // STEP 1: Split roof polygon ONCE
    const roofSides = this.splitRoofPolygon(roof)

    console.log(roof.ridgeLine)
    console.log(roofSides.map(s => [s.side, s.polygon.points.length]))

    const allElements: GroupOrElement[] = []

    // STEP 2: For each side, build all layers
    for (const roofSide of roofSides) {
      const sideElements: GroupOrElement[] = []

      // Main construction
      sideElements.push(...this.constructRoofElements(roof, config, expansionFactor, roofSide))

      // Top layers
      sideElements.push(...this.constructTopLayers(roof, config, expansionFactor, roofSide))

      // Ceiling layers
      sideElements.push(...this.constructCeilingLayers(roof, config, expansionFactor, roofSide))

      // Overhang layers
      sideElements.push(...this.constructOverhangLayers(roof, config, expansionFactor, roofSide))

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

  getTopOffset = (config: MonolithicRoofConfig): Length => {
    return config.layers.topThickness
  }

  getBottomOffsets = (roof: Roof, _config: MonolithicRoofConfig, line: LineSegment2D): HeightLine => {
    const slopeAngleRad = degreesToRadians(roof.slope)
    const tanSlope = Math.tan(slopeAngleRad)

    // Calculate ridge height (the reference point - highest point)
    const ridgeHeight = this.calculateRidgeHeight(roof)

    // Helper to get SIGNED distance from ridge (perpendicular)
    const getSignedDistanceToRidge = (point: vec2): number => {
      const ridgeDir = direction(roof.ridgeLine.start, roof.ridgeLine.end)
      const toPoint = vec2.sub(vec2.create(), point, roof.ridgeLine.start)
      const downSlopeDir = perpendicularCW(ridgeDir)
      return vec2.dot(toPoint, downSlopeDir)
    }

    const distStart = getSignedDistanceToRidge(line.start)
    const distEnd = getSignedDistanceToRidge(line.end)

    // Calculate height offsets relative to verticalOffset
    // Negative signed distance * tan(slope) gives the drop from ridge
    // Then subtract inside layer thickness (ceiling is below roof construction)
    const calculateOffset = (signedDist: number): number => {
      return ridgeHeight - (roof.type === 'shed' ? signedDist : Math.abs(signedDist)) * tanSlope
    }

    const offsetStart = calculateOffset(distStart)
    const offsetEnd = calculateOffset(distEnd)

    // For gable roofs, check if wall line crosses the ridge
    if (roof.type === 'gable') {
      // Find where the wall line intersects the infinite ridge line
      const wallLine = lineFromSegment(line)
      const ridgeLine = lineFromSegment(roof.ridgeLine)
      const intersection = lineIntersection(wallLine, ridgeLine)

      if (intersection) {
        // Calculate parameter t (0 to 1) along the wall line
        const lineDir = vec2.sub(vec2.create(), line.end, line.start)
        const lineLength = vec2.len(lineDir)

        if (lineLength > 0.001) {
          const toIntersection = vec2.sub(vec2.create(), intersection, line.start)
          const t = vec2.len(toIntersection) / lineLength

          // Only add intermediate point if intersection is within the line segment
          if (t >= 0 && t <= 1) {
            return [
              { position: 0, offset: offsetStart, nullAfter: false },
              { position: t, offset: ridgeHeight, nullAfter: false },
              { position: 1, offset: offsetEnd, nullAfter: false }
            ]
          }
        }
      }
    }

    // Shed roof or gable roof where wall doesn't cross ridge
    return [
      { position: 0, offset: offsetStart, nullAfter: false },
      { position: 1, offset: offsetEnd, nullAfter: false }
    ]
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Expand polygon perpendicular to ridge line by given factor
   */
  private expandPolygonFromRidge(polygon: Polygon2D, ridgeLine: LineSegment2D, factor: number): Polygon2D {
    const ridgeDir = direction(ridgeLine.start, ridgeLine.end)

    return {
      points: polygon.points.map(point => {
        // Project point onto ridge line
        const toPoint = vec2.sub(vec2.create(), point, ridgeLine.start)
        const projection = vec2.dot(toPoint, ridgeDir)
        const closestOnRidge = vec2.scaleAndAdd(vec2.create(), ridgeLine.start, ridgeDir, projection)

        // Calculate perpendicular offset from ridge
        const offset = vec2.sub(vec2.create(), point, closestOnRidge)
        const offsetLen = vec2.len(offset)

        // Expand point away from ridge
        if (offsetLen > 0.001) {
          const offsetDir = vec2.scale(vec2.create(), offset, 1 / offsetLen)
          const expansion = offsetLen * (factor - 1)
          return vec2.scaleAndAdd(vec2.create(), point, offsetDir, expansion)
        }
        return vec2.clone(point)
      })
    }
  }

  /**
   * Split roof polygon for gable (two sides) or return single side for shed
   */
  private splitRoofPolygon(roof: Roof): RoofSide[] {
    if (roof.type === 'shed') {
      return [
        {
          polygon: roof.overhangPolygon,
          side: 'left',
          transform: this.calculateRoofTransform(roof)
        }
      ]
    } else {
      // Gable: split overhang polygon by ridge line
      const sides = splitPolygonByLine(roof.overhangPolygon, roof.ridgeLine)

      return sides.map(({ polygon, side }) => ({
        polygon,
        side,
        transform: this.calculateRoofSideTransform(roof, side)
      }))
    }
  }

  /**
   * Calculate rotation transform for a specific roof side
   */
  private calculateRoofSideTransform(roof: Roof, side: 'left' | 'right'): Transform {
    const ridgeDir2D = direction(roof.ridgeLine.start, roof.ridgeLine.end)
    const slopeAngleRad = degreesToRadians(roof.slope)

    // Ridge height from FULL polygon (shared by both sides)
    const ridgeHeight = this.calculateRidgeHeight(roof)

    // Rotation axis along ridge (in 3D)
    const rotationAxis = vec3.normalize(vec3.create(), vec3.fromValues(ridgeDir2D[0], ridgeDir2D[1], 0))

    // Determine rotation direction using right-hand rule
    // When rotating around an axis, positive rotation makes the perpendicular CCW side go UP
    // We want the roof to slope DOWN on both sides, so:
    // - The side on the "up" side of rotation needs NEGATIVE angle (to slope down)
    // - The side on the "down" side of rotation needs POSITIVE angle (already down, we tilt more)
    //
    // Cross product: rotationAxis × +Z = perpendicular that goes "up" with positive rotation
    const upDirection = vec3.create()
    vec3.cross(upDirection, rotationAxis, [0, 0, 1])
    // upDirection now points in the direction that goes UP with positive rotation

    // Get the perpendicular direction for this side
    const sidePerp = side === 'left' ? perpendicularCCW(ridgeDir2D) : perpendicularCW(ridgeDir2D)
    const sidePerp3D = vec3.fromValues(sidePerp[0], sidePerp[1], 0)

    // If sidePerp aligns with upDirection, this side goes UP with positive rotation
    // So we need NEGATIVE rotation to make it go DOWN
    const dot = vec3.dot(sidePerp3D, upDirection)
    const angle = dot < 0 ? -slopeAngleRad : slopeAngleRad
    console.log('angle', rotationAxis, sidePerp, side, dot, angle)

    const transform = mat4.rotate(
      mat4.create(),
      mat4.fromTranslation(
        mat4.create(),
        vec3.fromValues(roof.ridgeLine.start[0], roof.ridgeLine.start[1], ridgeHeight)
      ),
      angle,
      rotationAxis
    )

    return transform
  }

  /**
   * Calculate the ridge elevation based on roof geometry and slope
   * The ridge must be high enough so that when the roof slopes down,
   * the edges align with the reference polygon at verticalOffset height
   */
  private calculateRidgeHeight(roof: Roof): Length {
    const slopeAngleRad = degreesToRadians(roof.slope)

    // Find maximum perpendicular distance from ridge to reference polygon
    let maxDistance = 0
    const ridgeDir = direction(roof.ridgeLine.start, roof.ridgeLine.end)

    for (const point of roof.referencePolygon.points) {
      const distance = distanceToInfiniteLine(point, {
        point: roof.ridgeLine.start,
        direction: ridgeDir
      })
      if (distance > maxDistance) {
        maxDistance = distance
      }
    }

    // Calculate vertical rise from edge to ridge
    const verticalRise = maxDistance * Math.tan(slopeAngleRad)

    // Ridge height = base height + vertical rise
    return (roof.verticalOffset + verticalRise) as Length
  }

  /**
   * Calculate rotation transform for the entire roof assembly
   */
  private calculateRoofTransform(roof: Roof): Transform {
    const ridgeDir2D = direction(roof.ridgeLine.start, roof.ridgeLine.end)
    const slopeAngleRad = degreesToRadians(roof.slope)

    // Calculate proper ridge height based on geometry and slope
    const ridgeHeight = this.calculateRidgeHeight(roof)

    // Convert to 3D axis-angle rotation
    const rotationAxis = vec3.fromValues(ridgeDir2D[0], ridgeDir2D[1], 0)
    vec3.normalize(rotationAxis, rotationAxis)

    const transform = mat4.rotate(
      mat4.create(),
      mat4.fromTranslation(
        mat4.create(),
        vec3.fromValues(roof.ridgeLine.start[0], roof.ridgeLine.start[1], ridgeHeight)
      ),
      slopeAngleRad,
      rotationAxis
    )

    return transform
  }

  /**
   * Get ceiling polygon as intersection of perimeter inside polygons with roof reference
   */
  private getCeilingPolygon(roof: Roof): PolygonWithHoles2D | null {
    const { getPerimetersByStorey } = getModelActions()
    const perimeters = getPerimetersByStorey(roof.storeyId)

    if (perimeters.length === 0) return null

    // Combine all inside perimeter polygons
    const insidePolygons: Polygon2D[] = perimeters.map(p => ({
      points: p.corners.map(c => vec2.clone(c.insidePoint))
    }))

    // Union all inside polygons
    const unionResult = unionPolygons(insidePolygons)
    if (unionResult.length === 0) return null

    // Intersect with roof reference polygon
    const intersections = intersectPolygon(
      { outer: unionResult[0], holes: [] },
      { outer: roof.referencePolygon, holes: [] }
    )

    return intersections.length > 0 ? intersections[0] : null
  }

  /**
   * Translate polygon to be relative to ridge start (rotation origin)
   */
  private translatePolygonToOrigin(polygon: Polygon2D, ridgeLine: LineSegment2D): Polygon2D {
    return {
      points: polygon.points.map(point => vec2.sub(vec2.create(), point, ridgeLine.start))
    }
  }

  /**
   * Expand and translate polygon - combines expansion and translation to origin
   * This prepares the polygon for construction by:
   * 1. Expanding it perpendicular to ridge to compensate for slope angle
   * 2. Translating it so ridge start is at origin (for rotation)
   */
  private preparePolygonForConstruction(
    polygon: Polygon2D,
    ridgeLine: LineSegment2D,
    expansionFactor: number
  ): Polygon2D {
    const expanded = this.expandPolygonFromRidge(polygon, ridgeLine, expansionFactor)
    return this.translatePolygonToOrigin(expanded, ridgeLine)
  }

  /**
   * Run layer construction similar to wall layers
   */
  private runLayerConstruction(polygon: PolygonWithHoles2D, offset: Length, layer: LayerConfig): ConstructionResult[] {
    // Clone polygon to avoid mutations
    const clonedPolygon: PolygonWithHoles2D = {
      outer: {
        points: polygon.outer.points.map(point => vec2.fromValues(point[0], point[1]))
      },
      holes: polygon.holes.map(hole => ({
        points: hole.points.map(point => vec2.fromValues(point[0], point[1]))
      }))
    }

    if (layer.type === 'monolithic') {
      const construction = LAYER_CONSTRUCTIONS.monolithic
      return Array.from(construction.construct(clonedPolygon, offset, 'xy', layer as MonolithicLayerConfig))
    }
    if (layer.type === 'striped') {
      const construction = LAYER_CONSTRUCTIONS.striped
      return Array.from(construction.construct(clonedPolygon, offset, 'xy', layer as StripedLayerConfig))
    }
    throw new Error(`Unsupported layer type: ${(layer as { type: string }).type}`)
  }

  // ============================================================================
  // Construction Methods
  // ============================================================================

  /**
   * Construct main roof elements (construction material)
   */
  private constructRoofElements(
    roof: Roof,
    config: MonolithicRoofConfig,
    expansionFactor: number,
    roofSide: RoofSide
  ): GroupOrElement[] {
    const preparedPolygon = this.preparePolygonForConstruction(roofSide.polygon, roof.ridgeLine, expansionFactor)

    const element = createConstructionElement(
      config.material,
      createExtrudedPolygon({ outer: preparedPolygon, holes: [] }, 'xy', config.thickness),
      mat4.fromTranslation(mat4.create(), vec3.fromValues(0, 0, roof.verticalOffset)),
      [TAG_ROOF]
    )

    return [element]
  }

  /**
   * Construct top layers (on roof side polygon)
   */
  private constructTopLayers(
    roof: Roof,
    config: MonolithicRoofConfig,
    expansionFactor: number,
    roofSide: RoofSide
  ): GroupOrElement[] {
    const elements: GroupOrElement[] = []

    if (config.layers.topLayers.length === 0) {
      return elements
    }

    const preparedPolygon = this.preparePolygonForConstruction(roofSide.polygon, roof.ridgeLine, expansionFactor)

    let zOffset = (roof.verticalOffset + config.thickness) as Length

    for (const layer of config.layers.topLayers) {
      const results = this.runLayerConstruction({ outer: preparedPolygon, holes: [] }, zOffset, layer)

      const layerElements: GroupOrElement[] = []
      for (const result of results) {
        if (result.type === 'element') {
          layerElements.push(result.element)
        }
      }

      if (layerElements.length > 0) {
        const customTag = createTag('roof-layer', layer.name)
        const group = createConstructionGroup(layerElements, IDENTITY, [TAG_ROOF_LAYER_TOP, TAG_LAYERS, customTag])
        elements.push(group)
      }

      zOffset = (zOffset + layer.thickness) as Length
    }

    return elements
  }

  /**
   * Construct ceiling layers (inside perimeter intersection with roof side)
   */
  private constructCeilingLayers(
    roof: Roof,
    config: MonolithicRoofConfig,
    expansionFactor: number,
    roofSide: RoofSide
  ): GroupOrElement[] {
    const elements: GroupOrElement[] = []

    if (config.layers.insideLayers.length === 0) {
      return elements
    }

    // Get full ceiling polygon (perimeter inside intersection with reference)
    const fullCeilingPolygon = this.getCeilingPolygon(roof)
    if (!fullCeilingPolygon) {
      return elements
    }

    // Intersect roof side polygon with ceiling polygon
    const sideCeilingPolygons = intersectPolygon({ outer: roofSide.polygon, holes: [] }, fullCeilingPolygon)

    if (sideCeilingPolygons.length === 0) {
      return elements
    }

    let zOffset = (roof.verticalOffset - config.layers.insideThickness) as Length

    // Reverse order: bottom to top
    const reversedLayers = [...config.layers.insideLayers].reverse()

    for (const layer of reversedLayers) {
      for (const ceilingPoly of sideCeilingPolygons) {
        const preparedOuter = this.preparePolygonForConstruction(ceilingPoly.outer, roof.ridgeLine, expansionFactor)
        const preparedHoles = ceilingPoly.holes.map(hole =>
          this.preparePolygonForConstruction(hole, roof.ridgeLine, expansionFactor)
        )

        const results = this.runLayerConstruction({ outer: preparedOuter, holes: preparedHoles }, zOffset, layer)

        const layerElements: GroupOrElement[] = []
        for (const result of results) {
          if (result.type === 'element') {
            layerElements.push(result.element)
          }
        }

        if (layerElements.length > 0) {
          const customTag = createTag('roof-layer', layer.name)
          const group = createConstructionGroup(layerElements, IDENTITY, [TAG_ROOF_LAYER_INSIDE, TAG_LAYERS, customTag])
          elements.push(group)
        }
      }

      zOffset = (zOffset + layer.thickness) as Length
    }

    return elements
  }

  /**
   * Construct overhang layers (overhang areas for this roof side)
   */
  private constructOverhangLayers(
    roof: Roof,
    config: MonolithicRoofConfig,
    expansionFactor: number,
    roofSide: RoofSide
  ): GroupOrElement[] {
    const elements: GroupOrElement[] = []

    if (config.layers.overhangLayers.length === 0) {
      return elements
    }

    // Subtract reference polygon from this roof side's polygon
    const sideOverhangPolygons = subtractPolygons([roofSide.polygon], [roof.referencePolygon])

    if (sideOverhangPolygons.length === 0) {
      return elements
    }

    let zOffset = (roof.verticalOffset - config.layers.overhangThickness) as Length

    // Reverse order: bottom to top
    const reversedLayers = [...config.layers.overhangLayers].reverse()

    for (const layer of reversedLayers) {
      for (const overhangPoly of sideOverhangPolygons) {
        const preparedOuter = this.preparePolygonForConstruction(overhangPoly.outer, roof.ridgeLine, expansionFactor)
        const preparedHoles = overhangPoly.holes.map(hole =>
          this.preparePolygonForConstruction(hole, roof.ridgeLine, expansionFactor)
        )

        const results = this.runLayerConstruction({ outer: preparedOuter, holes: preparedHoles }, zOffset, layer)

        const layerElements: GroupOrElement[] = []
        for (const result of results) {
          if (result.type === 'element') {
            layerElements.push(result.element)
          }
        }

        if (layerElements.length > 0) {
          const customTag = createTag('roof-layer', layer.name)
          const group = createConstructionGroup(layerElements, IDENTITY, [
            TAG_ROOF_LAYER_OVERHANG,
            TAG_LAYERS,
            customTag
          ])
          elements.push(group)
        }
      }

      zOffset = (zOffset + layer.thickness) as Length
    }

    return elements
  }
}
