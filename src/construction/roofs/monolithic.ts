import { quat, vec2, vec3 } from 'gl-matrix'

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
  createTag
} from '@/construction/tags'
import {
  type Length,
  type LineSegment2D,
  type Polygon2D,
  type PolygonWithHoles2D,
  degreesToRadians,
  direction,
  distanceToInfiniteLine,
  intersectPolygon,
  subtractPolygons,
  unionPolygons
} from '@/shared/geometry'

import type { MonolithicRoofConfig, RoofAssembly } from './types'

export class MonolithicRoofAssembly implements RoofAssembly<MonolithicRoofConfig> {
  construct = (roof: Roof, config: MonolithicRoofConfig): ConstructionModel => {
    const slopeAngleRad = degreesToRadians(roof.slope)

    // Avoid division by zero for flat roofs
    if (Math.abs(slopeAngleRad) < 0.001) {
      return createUnsupportedModel('Flat roofs not supported', 'unsupported-roof-flat')
    }

    const expansionFactor = 1 / Math.cos(slopeAngleRad)

    const elements: GroupOrElement[] = []

    // 1. Build main construction elements
    const constructionElements = this.constructRoofElements(roof, config, expansionFactor)
    elements.push(...constructionElements)

    // 2. Build top layers
    const topLayerElements = this.constructTopLayers(roof, config, expansionFactor)
    elements.push(...topLayerElements)

    // 3. Build ceiling layers
    const ceilingLayerElements = this.constructCeilingLayers(roof, config, expansionFactor)
    elements.push(...ceilingLayerElements)

    // 4. Build overhang layers
    const overhangLayerElements = this.constructOverhangLayers(roof, config, expansionFactor)
    elements.push(...overhangLayerElements)

    // 5. Create group with rotation transform
    const roofTransform = this.calculateRoofTransform(roof)
    const roofGroup = createConstructionGroup(elements, roofTransform, [createTag('construction', roof.id)])

    return {
      elements: [roofGroup],
      measurements: [],
      areas: [],
      errors: [],
      warnings: [],
      bounds: roofGroup.bounds
    }
  }

  getConstructionThickness = (config: MonolithicRoofConfig): Length => {
    return config.thickness
  }

  getTopOffset = (config: MonolithicRoofConfig): Length => {
    return config.layers.topThickness
  }

  getBottomOffsets = (_config: MonolithicRoofConfig, _line: LineSegment2D): vec2[] => {
    throw new Error('Not implemented')
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
   * Split roof polygon for gable (two sides) or return single polygon for shed
   */
  private splitRoofPolygon(roof: Roof): Polygon2D[] {
    if (roof.type === 'shed') {
      return [roof.overhangPolygon]
    } else {
      // Gable: For now, return single polygon
      // TODO: Implement proper split along ridge line
      return [roof.overhangPolygon]
    }
  }

  /**
   * Convert quaternion to Euler angles (XYZ convention)
   */
  private quaternionToEuler(q: quat): vec3 {
    const x = q[0]
    const y = q[1]
    const z = q[2]
    const w = q[3]

    // Roll (x-axis rotation)
    const sinRollCosP = 2 * (w * x + y * z)
    const cosRollCosP = 1 - 2 * (x * x + y * y)
    const roll = Math.atan2(sinRollCosP, cosRollCosP)

    // Pitch (y-axis rotation)
    const sinPitch = 2 * (w * y - z * x)
    const pitch = Math.abs(sinPitch) >= 1 ? (Math.sign(sinPitch) * Math.PI) / 2 : Math.asin(sinPitch)

    // Yaw (z-axis rotation)
    const sinYawCosP = 2 * (w * z + x * y)
    const cosYawCosP = 1 - 2 * (y * y + z * z)
    const yaw = Math.atan2(sinYawCosP, cosYawCosP)

    return vec3.fromValues(roll, pitch, yaw)
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

    // Use quaternion for axis-angle to Euler conversion
    const q = quat.create()
    quat.setAxisAngle(q, rotationAxis, slopeAngleRad)

    // Convert quaternion to Euler angles
    const euler = this.quaternionToEuler(q)

    return {
      position: vec3.fromValues(roof.ridgeLine.start[0], roof.ridgeLine.start[1], ridgeHeight),
      rotation: euler
    }
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
   * Get overhang polygons as difference between overhang and reference polygons
   */
  private getOverhangPolygons(roof: Roof): PolygonWithHoles2D[] {
    return subtractPolygons([roof.overhangPolygon], [roof.referencePolygon])
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
  private constructRoofElements(roof: Roof, config: MonolithicRoofConfig, expansionFactor: number): GroupOrElement[] {
    const elements: GroupOrElement[] = []
    const roofSides = this.splitRoofPolygon(roof)

    for (const side of roofSides) {
      const preparedPolygon = this.preparePolygonForConstruction(side, roof.ridgeLine, expansionFactor)

      const element = createConstructionElement(
        config.material,
        createExtrudedPolygon({ outer: preparedPolygon, holes: [] }, 'xy', config.thickness),
        {
          position: vec3.fromValues(0, 0, roof.verticalOffset),
          rotation: vec3.fromValues(0, 0, 0)
        },
        [TAG_ROOF]
      )

      elements.push(element)
    }

    return elements
  }

  /**
   * Construct top layers (on entire overhang polygon)
   */
  private constructTopLayers(roof: Roof, config: MonolithicRoofConfig, expansionFactor: number): GroupOrElement[] {
    const elements: GroupOrElement[] = []

    if (config.layers.topLayers.length === 0) {
      return elements
    }

    const preparedPolygon = this.preparePolygonForConstruction(roof.overhangPolygon, roof.ridgeLine, expansionFactor)

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
   * Construct ceiling layers (inside perimeter intersection)
   */
  private constructCeilingLayers(roof: Roof, config: MonolithicRoofConfig, expansionFactor: number): GroupOrElement[] {
    const elements: GroupOrElement[] = []

    if (config.layers.insideLayers.length === 0) {
      return elements
    }

    const ceilingPolygon = this.getCeilingPolygon(roof)
    if (!ceilingPolygon) {
      return elements
    }

    const preparedOuter = this.preparePolygonForConstruction(ceilingPolygon.outer, roof.ridgeLine, expansionFactor)
    const preparedHoles = ceilingPolygon.holes.map(hole =>
      this.preparePolygonForConstruction(hole, roof.ridgeLine, expansionFactor)
    )

    let zOffset = (roof.verticalOffset - config.layers.insideThickness) as Length

    // Reverse order: bottom to top
    const reversedLayers = [...config.layers.insideLayers].reverse()

    for (const layer of reversedLayers) {
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

      zOffset = (zOffset + layer.thickness) as Length
    }

    return elements
  }

  /**
   * Construct overhang layers (on overhang areas only)
   */
  private constructOverhangLayers(roof: Roof, config: MonolithicRoofConfig, expansionFactor: number): GroupOrElement[] {
    const elements: GroupOrElement[] = []

    if (config.layers.overhangLayers.length === 0) {
      return elements
    }

    const overhangPolygons = this.getOverhangPolygons(roof)
    if (overhangPolygons.length === 0) {
      return elements
    }

    let zOffset = (roof.verticalOffset - config.layers.overhangThickness) as Length

    // Reverse order: bottom to top
    const reversedLayers = [...config.layers.overhangLayers].reverse()

    for (const layer of reversedLayers) {
      for (const overhangPoly of overhangPolygons) {
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
