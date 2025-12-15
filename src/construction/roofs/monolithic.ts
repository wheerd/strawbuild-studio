import { mat4, vec2, vec3 } from 'gl-matrix'
import type { Manifold } from 'manifold-3d'

import type { Roof } from '@/building/model'
import { getModelActions } from '@/building/store'
import { type GroupOrElement, createConstructionElement } from '@/construction/elements'
import { IDENTITY, type Transform } from '@/construction/geometry'
import { LAYER_CONSTRUCTIONS } from '@/construction/layers'
import type { LayerConfig, MonolithicLayerConfig, StripedLayerConfig } from '@/construction/layers/types'
import { getBoundsFromManifold, intersectManifolds, transformManifold } from '@/construction/manifold/operations'
import { type ConstructionModel, createConstructionGroup } from '@/construction/model'
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
  intersectLineSegmentWithPolygon,
  intersectPolygon,
  lineFromSegment,
  lineIntersection,
  perpendicular,
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
    const ridgeHeight = this.calculateRidgeHeight(roof)

    const expansionFactor = 1 / Math.cos(slopeAngleRad)

    // STEP 1: Split roof polygon ONCE
    const roofSides = this.splitRoofPolygon(roof, ridgeHeight)

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

      // STEP 3: Create clipping volume and apply to all elements
      // Calculate Z-range for clipping volume (doubled for safety margin)
      const minZ = -ridgeHeight - 2 * config.layers.insideThickness
      const maxZ = ((config.thickness + config.layers.topThickness) * 2) as Length

      // Get inverse transform to rotate clipping volume into local space
      const inverseTransform = mat4.invert(mat4.create(), roofSide.transform)
      if (!inverseTransform) {
        throw new Error('Failed to invert roof transform')
      }

      mat4.translate(
        inverseTransform,
        inverseTransform,
        vec3.fromValues(roof.ridgeLine.start[0], roof.ridgeLine.start[1], ridgeHeight)
      )

      // Create clipping volume from original (unexpanded, unoffset) polygon
      const clippingVolume = this.createClippingVolume(roofSide.polygon, roof.ridgeLine, minZ, maxZ, inverseTransform)

      // Apply clipping to all elements recursively
      for (const element of sideElements) {
        this.applyClippingRecursive(element, clippingVolume)
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

    // Helper to get SIGNED distance from ridge (perpendicular)
    const getSignedDistanceToRidge = (point: vec2): number => {
      const ridgeDir = direction(roof.ridgeLine.start, roof.ridgeLine.end)
      const toPoint = vec2.sub(vec2.create(), point, roof.ridgeLine.start)
      const downSlopeDir = perpendicularCW(ridgeDir)
      return vec2.dot(toPoint, downSlopeDir)
    }

    // Calculate height offset at a point
    const calculateOffset = (signedDist: number): number => {
      return ridgeHeight - (roof.type === 'shed' ? signedDist : Math.abs(signedDist)) * tanSlope
    }

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

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Expand polygon perpendicular to ridge line and offset toward ridge
   * Combines expansion and ridge offset in a single operation
   */
  private expandAndOffsetPolygonFromRidge(
    polygon: Polygon2D,
    ridgeLine: LineSegment2D,
    expansionFactor: number,
    additionalExpansion: number
  ): [Polygon2D, vec2] {
    const ridgeDir = direction(ridgeLine.start, ridgeLine.end)
    let perpDir = perpendicular(ridgeDir)

    const expandedPoints = polygon.points.map(point => {
      // Project point onto ridge line
      const toPoint = vec2.sub(vec2.create(), point, ridgeLine.start)
      const projection = vec2.dot(toPoint, ridgeDir)
      const closestOnRidge = vec2.scaleAndAdd(vec2.create(), ridgeLine.start, ridgeDir, projection)

      // Calculate perpendicular offset from ridge
      const offset = vec2.sub(vec2.create(), point, closestOnRidge)
      const offsetLen = vec2.len(offset)

      // Place point at new offset distance from ridge
      if (Math.abs(offsetLen) > 0.001) {
        const offsetDir = vec2.scale(vec2.create(), offset, 1 / offsetLen)
        perpDir = offsetDir
        return vec2.scaleAndAdd(
          vec2.create(),
          closestOnRidge,
          offsetDir,
          offsetLen * expansionFactor + additionalExpansion
        )
      }
      return vec2.clone(point)
    })

    return [
      {
        points: expandedPoints
      },
      perpDir
    ]
  }

  /**
   * Split roof polygon for gable (two sides) or return single side for shed
   */
  private splitRoofPolygon(roof: Roof, ridgeHeight: Length): RoofSide[] {
    if (roof.type === 'shed') {
      return [
        {
          polygon: roof.overhangPolygon,
          side: 'left',
          transform: this.calculateRoofTransform(roof, ridgeHeight)
        }
      ]
    } else {
      // Gable: split overhang polygon by ridge line
      const sides = splitPolygonByLine(roof.overhangPolygon, lineFromSegment(roof.ridgeLine))

      return sides.map(({ polygon, side }) => ({
        polygon,
        side,
        transform: this.calculateRoofSideTransform(roof, side, ridgeHeight)
      }))
    }
  }

  /**
   * Calculate rotation transform for a specific roof side
   */
  private calculateRoofSideTransform(roof: Roof, side: 'left' | 'right', ridgeHeight: Length): Transform {
    const ridgeDir2D = direction(roof.ridgeLine.start, roof.ridgeLine.end)
    const slopeAngleRad = degreesToRadians(roof.slope)

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
  private calculateRoofTransform(roof: Roof, ridgeHeight: Length): Transform {
    const ridgeDir2D = direction(roof.ridgeLine.start, roof.ridgeLine.end)
    const slopeAngleRad = degreesToRadians(roof.slope)

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
  private translatePolygonToOrigin(
    polygon: Polygon2D,
    ridgeLine: LineSegment2D,
    offset: vec2 = vec2.create()
  ): Polygon2D {
    const combinedOffset = vec2.sub(vec2.create(), ridgeLine.start, offset)
    return {
      points: polygon.points.map(point => vec2.sub(vec2.create(), point, combinedOffset))
    }
  }

  /**
   * Calculate ridge offset distance based on Z position and slope
   * Positive Z (above rotation axis) returns positive offset (toward ridge)
   * Negative Z (below rotation axis) returns negative offset (away from ridge)
   */
  private calculateRidgeOffset(zPosition: Length, slopeAngleRad: number): Length {
    return (zPosition * Math.tan(slopeAngleRad)) as Length
  }

  /**
   * Create a clipping volume for the roof geometry
   * The volume is a vertical extrusion of the roof side polygon, transformed by the inverse
   * of the roof rotation so that after rotation it produces vertical edges
   */
  private createClippingVolume(
    polygon: Polygon2D,
    ridgeLine: LineSegment2D,
    minZ: Length,
    maxZ: Length,
    inverseTransform: Transform
  ): Manifold {
    // Translate polygon to origin (same as for construction)
    const translatedPolygon = this.translatePolygonToOrigin(polygon, ridgeLine)

    // Create vertical extrusion
    const extrusionThickness = (2 * (maxZ - minZ)) as Length
    const shape = createExtrudedPolygon({ outer: translatedPolygon, holes: [] }, 'xy', extrusionThickness)

    // Get the manifold and translate it to start at minZ
    let manifold = shape.manifold
    const translateToMinZ = mat4.fromTranslation(mat4.create(), vec3.fromValues(0, 0, 2 * minZ))
    manifold = transformManifold(manifold, translateToMinZ)

    // Transform by inverse of roof rotation
    manifold = transformManifold(manifold, inverseTransform)

    return manifold
  }

  /**
   * Apply clipping recursively to elements and groups
   * Modifies elements in place by clipping their manifolds
   */
  private applyClippingRecursive(item: GroupOrElement, clippingVolume: Manifold): void {
    if ('shape' in item) {
      // This is an element - apply clipping
      const invertedTransform = mat4.invert(mat4.create(), item.transform)
      const clippedManifold = invertedTransform
        ? transformManifold(
            intersectManifolds(transformManifold(item.shape.manifold, item.transform), clippingVolume),
            invertedTransform
          )
        : intersectManifolds(item.shape.manifold, clippingVolume)
      item.shape.manifold = clippedManifold
      item.shape.bounds = getBoundsFromManifold(clippedManifold)
      item.bounds = item.shape.bounds
    } else if ('children' in item) {
      // This is a group - recursively apply to children
      for (const child of item.children) {
        this.applyClippingRecursive(child, clippingVolume)
      }
      // Recalculate group bounds from children
      if (item.children.length > 0) {
        item.bounds = Bounds3D.merge(...item.children.map(c => c.bounds))
      }
    }
  }

  /**
   * Expand, offset toward ridge, and translate polygon to origin
   * This prepares the polygon for construction by:
   * 1. Expanding it perpendicular to ridge to compensate for slope angle
   * 2. Offsetting it toward ridge to compensate for rotation gap
   * 3. Translating it so ridge start is at origin (for rotation)
   */
  private preparePolygonForConstruction(
    polygon: Polygon2D,
    ridgeLine: LineSegment2D,
    expansionFactor: number,
    ridgeOffsetDistance: Length,
    additionalExpansion: Length
  ): Polygon2D {
    const [expandedPolygon, offset] = this.expandAndOffsetPolygonFromRidge(
      polygon,
      ridgeLine,
      expansionFactor,
      additionalExpansion
    )
    const actualOffset = vec2.scale(vec2.create(), offset, -ridgeOffsetDistance)
    return this.translatePolygonToOrigin(expandedPolygon, ridgeLine, actualOffset)
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
    const slopeAngleRad = degreesToRadians(roof.slope)

    // Calculate ridge offset for the center of the roof thickness
    const ridgeOffset = this.calculateRidgeOffset(config.thickness, slopeAngleRad)
    const additionalExpansion = Math.tan(slopeAngleRad) * config.thickness

    const preparedPolygon = this.preparePolygonForConstruction(
      roofSide.polygon,
      roof.ridgeLine,
      expansionFactor,
      ridgeOffset,
      additionalExpansion
    )

    const element = createConstructionElement(
      config.material,
      createExtrudedPolygon({ outer: preparedPolygon, holes: [] }, 'xy', config.thickness),
      undefined,
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

    const slopeAngleRad = degreesToRadians(roof.slope)
    let zOffset = config.thickness as Length

    for (const layer of config.layers.topLayers) {
      // Calculate ridge offset for the center of this layer
      const ridgeOffset = this.calculateRidgeOffset(zOffset + layer.thickness, slopeAngleRad)
      const additionalExpansion = Math.tan(slopeAngleRad) * layer.thickness

      const preparedPolygon = this.preparePolygonForConstruction(
        roofSide.polygon,
        roof.ridgeLine,
        expansionFactor,
        ridgeOffset,
        additionalExpansion
      )

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

      zOffset += layer.thickness
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

    const slopeAngleRad = degreesToRadians(roof.slope)
    let zOffset = -config.layers.insideThickness as Length

    // Reverse order: bottom to top
    const reversedLayers = [...config.layers.insideLayers].reverse()

    for (const layer of reversedLayers) {
      const ridgeOffset = this.calculateRidgeOffset(zOffset + layer.thickness, slopeAngleRad) // Will be negative
      const additionalExpansion = Math.tan(slopeAngleRad) * layer.thickness

      for (const ceilingPoly of sideCeilingPolygons) {
        const preparedOuter = this.preparePolygonForConstruction(
          ceilingPoly.outer,
          roof.ridgeLine,
          expansionFactor,
          ridgeOffset,
          additionalExpansion
        )
        const preparedHoles = ceilingPoly.holes.map(hole =>
          this.preparePolygonForConstruction(hole, roof.ridgeLine, expansionFactor, ridgeOffset, additionalExpansion)
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
      zOffset += layer.thickness
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

    const slopeAngleRad = degreesToRadians(roof.slope)
    let zOffset = -config.layers.overhangThickness as Length

    // Reverse order: bottom to top
    const reversedLayers = [...config.layers.overhangLayers].reverse()

    for (const layer of reversedLayers) {
      const ridgeOffset = this.calculateRidgeOffset(zOffset + layer.thickness, slopeAngleRad) // Will be negative
      const additionalExpansion = Math.tan(slopeAngleRad) * layer.thickness

      for (const overhangPoly of sideOverhangPolygons) {
        const preparedOuter = this.preparePolygonForConstruction(
          overhangPoly.outer,
          roof.ridgeLine,
          expansionFactor,
          ridgeOffset,
          additionalExpansion
        )
        const preparedHoles = overhangPoly.holes.map(hole =>
          this.preparePolygonForConstruction(hole, roof.ridgeLine, expansionFactor, ridgeOffset, additionalExpansion)
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
      zOffset += layer.thickness
    }

    return elements
  }
}
