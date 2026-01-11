import type { Manifold } from 'manifold-3d'

import type { Roof } from '@/building/model'
import { getModelActions } from '@/building/store'
import { LAYER_CONSTRUCTIONS } from '@/construction/layers'
import type { LayerConfig } from '@/construction/layers/types'
import { transformManifold } from '@/construction/manifold/operations'
import { type ConstructionModel } from '@/construction/model'
import type { PerimeterConstructionContext } from '@/construction/perimeters/context'
import { type ConstructionResult, yieldAsGroup } from '@/construction/results'
import { createExtrudedPolygon } from '@/construction/shapes'
import {
  TAG_LAYERS,
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
  type Transform,
  type Vec2,
  ZERO_VEC2,
  copyVec2,
  direction,
  dotVec2,
  fromRot,
  fromTrans,
  intersectPolygons,
  lenVec2,
  lineFromSegment,
  newVec2,
  newVec3,
  normVec3,
  perpendicularCCW,
  perpendicularCW,
  rotate,
  scaleAddVec2,
  scaleVec2,
  splitPolygonByLine,
  subVec2,
  subtractPolygons,
  unionPolygons
} from '@/shared/geometry'
import { assertUnreachable } from '@/shared/utils'

import type { HeightLine, RoofAssembly, RoofAssemblyConfigBase } from './types'

export interface RoofSide {
  polygon: Polygon2D
  side: 'left' | 'right'
  transform: Transform
  dirToRidge: Vec2
}

export abstract class BaseRoofAssembly<T extends RoofAssemblyConfigBase> implements RoofAssembly {
  protected readonly config: T

  constructor(config: T) {
    this.config = config
  }

  abstract get topOffset(): Length
  abstract getBottomOffsets(roof: Roof, line: LineSegment2D, contexts: PerimeterConstructionContext[]): HeightLine

  abstract get constructionThickness(): Length
  abstract construct(roof: Roof, contexts: PerimeterConstructionContext[]): ConstructionModel

  protected abstract get topLayerOffset(): Length
  protected abstract get ceilingLayerOffset(): Length
  protected abstract get overhangLayerOffset(): Length

  get totalThickness(): Length {
    return (
      this.config.layers.insideThickness +
      this.ceilingLayerOffset +
      this.constructionThickness +
      this.topLayerOffset +
      this.config.layers.topThickness
    )
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Expand polygon perpendicular to ridge line based on roof slope and vertical offset
   */
  protected expandPolygonFromRidge(
    polygon: Polygon2D,
    ridgeLine: LineSegment2D,
    slopeAngleRad: number,
    thickness: Length
  ): Polygon2D {
    const ridgeDir = direction(ridgeLine.start, ridgeLine.end)

    const additionalExpansion = Math.tan(slopeAngleRad) * thickness
    const expansionFactor = 1 / Math.cos(slopeAngleRad)

    const expandedPoints = polygon.points.map(point => {
      // Project point onto ridge line
      const toPoint = subVec2(point, ridgeLine.start)
      const projection = dotVec2(toPoint, ridgeDir)
      const closestOnRidge = scaleAddVec2(ridgeLine.start, ridgeDir, projection)

      // Calculate perpendicular offset from ridge
      const offset = subVec2(point, closestOnRidge)
      const offsetLen = lenVec2(offset)

      // Place point at new offset distance from ridge
      if (Math.abs(offsetLen) > 0.1) {
        const offsetDir = scaleVec2(offset, 1 / offsetLen)
        return scaleAddVec2(closestOnRidge, offsetDir, offsetLen * expansionFactor + additionalExpansion)
      }
      return copyVec2(point)
    })

    return {
      points: expandedPoints
    }
  }

  /**
   * Split roof polygon for gable (two sides) or return single side for shed
   */
  protected splitRoofPolygon(roof: Roof, ridgeHeight: Length): RoofSide[] {
    const leftTowardsRidgeDir = perpendicularCCW(roof.ridgeDirection)
    const rightTowardsRidgeDir = perpendicularCW(roof.ridgeDirection)
    if (roof.type === 'shed') {
      return [
        {
          polygon: roof.overhangPolygon,
          side: 'right',
          transform: this.calculateRoofSideTransform(roof, 'right', ridgeHeight),
          dirToRidge: rightTowardsRidgeDir
        }
      ]
    } else {
      const sides = splitPolygonByLine(roof.overhangPolygon, lineFromSegment(roof.ridgeLine))
      return sides.map(({ polygon, side }) => ({
        polygon,
        side,
        transform: this.calculateRoofSideTransform(roof, side, ridgeHeight),
        dirToRidge: side === 'left' ? leftTowardsRidgeDir : rightTowardsRidgeDir
      }))
    }
  }

  /**
   * Calculate rotation transform for a specific roof side
   */
  private calculateRoofSideTransform(roof: Roof, side: 'left' | 'right', ridgeHeight: Length): Transform {
    // Rotation axis along ridge (in 3D)
    const rotationAxis = normVec3(newVec3(roof.ridgeDirection[0], roof.ridgeDirection[1], 0))
    const angle = side === 'left' ? -roof.slopeAngleRad : roof.slopeAngleRad

    const transform = rotate(
      fromTrans(newVec3(roof.ridgeLine.start[0], roof.ridgeLine.start[1], ridgeHeight)),
      angle,
      rotationAxis
    )

    return transform
  }

  protected calculateInverseRotationTransform(
    ridgeLine: LineSegment2D,
    slopeAngleRad: number,
    side: 'left' | 'right'
  ): Transform {
    const ridgeDir2D = direction(ridgeLine.start, ridgeLine.end)
    const rotationAxis = normVec3(newVec3(ridgeDir2D[0], ridgeDir2D[1], 0))
    const angle = side === 'right' ? -slopeAngleRad : slopeAngleRad
    return fromRot(angle, rotationAxis)
  }

  /**
   * Calculate the ridge elevation based on roof geometry and slope
   * The ridge must be high enough so that when the roof slopes down,
   * the edges align with the reference polygon at verticalOffset height
   */
  protected calculateRidgeHeight(roof: Roof): Length {
    return roof.verticalOffset + roof.rise
  }

  /**
   * Get ceiling polygon as intersection of perimeter inside polygons with roof reference
   */
  protected getCeilingPolygons(roof: Roof, all = false): Polygon2D[] {
    const { getPerimetersByStorey } = getModelActions()
    const perimeters = getPerimetersByStorey(roof.storeyId)

    if (perimeters.length === 0) return []

    const insidePolygons: Polygon2D[] = perimeters.map(p => p.innerPolygon)

    const insides = unionPolygons(insidePolygons)
    return all ? insides : intersectPolygons(insides, [roof.referencePolygon])
  }

  /**
   * Translate polygon to be relative to ridge start (rotation origin)
   */
  protected translatePolygonToOrigin(
    polygon: Polygon2D,
    ridgeLine: LineSegment2D,
    offset: Vec2 = ZERO_VEC2
  ): Polygon2D {
    const combinedOffset = subVec2(ridgeLine.start, offset)
    return {
      points: polygon.points.map(point => subVec2(point, combinedOffset))
    }
  }

  /**
   * Calculate ridge offset distance based on Z position and slope
   * Positive Z (above rotation axis) returns positive offset (toward ridge)
   * Negative Z (below rotation axis) returns negative offset (away from ridge)
   */
  private calculateRidgeOffset(zPosition: Length, slopeAngleRad: number): Length {
    return zPosition * Math.tan(slopeAngleRad)
  }

  protected createExtrudedVolume(polygon: Polygon2D, ridgeLine: LineSegment2D, minZ: Length, maxZ: Length): Manifold {
    const translatedPolygon = this.translatePolygonToOrigin(polygon, ridgeLine)
    const extrusionThickness = maxZ - minZ
    const shape = createExtrudedPolygon({ outer: translatedPolygon, holes: [] }, 'xy', extrusionThickness)
    const translateToMinZ = fromTrans(newVec3(0, 0, minZ))
    return transformManifold(shape.manifold, translateToMinZ)
  }

  /**
   * Expand, offset toward ridge, and translate polygon to origin
   * This prepares the polygon for construction by:
   * 1. Expanding it perpendicular to ridge to compensate for slope angle
   * 2. Offsetting it toward ridge to compensate for rotation gap
   * 3. Translating it so ridge start is at origin (for rotation)
   */
  protected preparePolygonForConstruction(
    polygon: Polygon2D,
    ridgeLine: LineSegment2D,
    slopeAngleRad: number,
    verticalOffset: Length,
    thickness: Length,
    dirToRidge: Vec2
  ): Polygon2D {
    const expandedPolygon = this.expandPolygonFromRidge(polygon, ridgeLine, slopeAngleRad, thickness)
    const ridgeOffset = this.calculateRidgeOffset(verticalOffset, slopeAngleRad)
    const directedRidgeOffset = scaleVec2(dirToRidge, -ridgeOffset)
    return this.translatePolygonToOrigin(expandedPolygon, ridgeLine, directedRidgeOffset)
  }

  /**
   * Run layer construction similar to wall layers
   */
  protected *runLayerConstruction(
    polygon: PolygonWithHoles2D,
    offset: Length,
    layer: LayerConfig
  ): Generator<ConstructionResult> {
    // Clone polygon to avoid mutations
    const clonedPolygon: PolygonWithHoles2D = {
      outer: {
        points: polygon.outer.points.map(point => newVec2(point[0], point[1]))
      },
      holes: polygon.holes.map(hole => ({
        points: hole.points.map(point => newVec2(point[0], point[1]))
      }))
    }

    switch (layer.type) {
      case 'monolithic': {
        const construction = LAYER_CONSTRUCTIONS.monolithic
        yield* construction.construct(clonedPolygon, offset, 'xy', layer)
        return
      }
      case 'striped': {
        const construction = LAYER_CONSTRUCTIONS.striped
        yield* construction.construct(clonedPolygon, offset, 'xy', layer)
        return
      }
      default:
        assertUnreachable(layer, 'Unsupported layer type')
    }
  }

  // ============================================================================
  // Construction Methods
  // ============================================================================

  /**
   * Construct top layers (on roof side polygon)
   */
  protected *constructTopLayers(roof: Roof, roofSide: RoofSide): Generator<ConstructionResult> {
    if (this.config.layers.topLayers.length === 0) {
      return
    }

    let zOffset = this.constructionThickness + this.topLayerOffset

    for (const layer of this.config.layers.topLayers) {
      const preparedPolygon = this.preparePolygonForConstruction(
        roofSide.polygon,
        roof.ridgeLine,
        roof.slopeAngleRad,
        zOffset + layer.thickness,
        layer.thickness,
        roofSide.dirToRidge
      )

      const results = this.runLayerConstruction({ outer: preparedPolygon, holes: [] }, zOffset, layer)

      const customTag = createTag('roof-layer', layer.name, layer.nameKey)
      yield* yieldAsGroup(results, [TAG_ROOF_LAYER_TOP, TAG_LAYERS, customTag])

      if (!layer.overlap) {
        zOffset += layer.thickness
      }
    }
  }

  /**
   * Construct ceiling layers (inside perimeter intersection with roof side)
   */
  protected *constructCeilingLayers(roof: Roof, roofSide: RoofSide): Generator<ConstructionResult> {
    if (this.config.layers.insideLayers.length === 0) {
      return
    }

    const fullCeilingPolygons = this.getCeilingPolygons(roof)
    if (fullCeilingPolygons.length === 0) {
      return
    }

    const sideCeilingPolygons = intersectPolygons([roofSide.polygon], fullCeilingPolygons)
    if (sideCeilingPolygons.length === 0) {
      return
    }

    let zOffset = this.ceilingLayerOffset - this.config.layers.insideThickness

    // Reverse order: bottom to top
    const reversedLayers = [...this.config.layers.insideLayers].reverse()

    for (const layer of reversedLayers) {
      for (const ceilingPoly of sideCeilingPolygons) {
        const preparedOuter = this.preparePolygonForConstruction(
          ceilingPoly,
          roof.ridgeLine,
          roof.slopeAngleRad,
          zOffset + layer.thickness,
          layer.thickness,
          roofSide.dirToRidge
        )

        const results = this.runLayerConstruction({ outer: preparedOuter, holes: [] }, zOffset, layer)

        const customTag = createTag('roof-layer', layer.name, layer.nameKey)
        yield* yieldAsGroup(results, [TAG_ROOF_LAYER_INSIDE, TAG_LAYERS, customTag])
      }
      zOffset += layer.thickness
    }
  }

  /**
   * Construct overhang layers (overhang areas for this roof side)
   */
  protected *constructOverhangLayers(roof: Roof, roofSide: RoofSide): Generator<ConstructionResult> {
    if (this.config.layers.overhangLayers.length === 0) {
      return
    }

    // Subtract reference polygon from this roof side's polygon
    const sideOverhangPolygons = subtractPolygons([roofSide.polygon], [roof.referencePolygon])

    if (sideOverhangPolygons.length === 0) {
      return
    }

    let zOffset = this.overhangLayerOffset - this.config.layers.overhangThickness

    // Reverse order: bottom to top
    const reversedLayers = [...this.config.layers.overhangLayers].reverse()

    for (const layer of reversedLayers) {
      for (const overhangPoly of sideOverhangPolygons) {
        const preparedOuter = this.preparePolygonForConstruction(
          overhangPoly.outer,
          roof.ridgeLine,
          roof.slopeAngleRad,
          zOffset + layer.thickness,
          layer.thickness,
          roofSide.dirToRidge
        )
        const preparedHoles = overhangPoly.holes.map(hole =>
          this.preparePolygonForConstruction(
            hole,
            roof.ridgeLine,
            roof.slopeAngleRad,
            zOffset + layer.thickness,
            layer.thickness,
            roofSide.dirToRidge
          )
        )

        const results = this.runLayerConstruction({ outer: preparedOuter, holes: preparedHoles }, zOffset, layer)

        const customTag = createTag('roof-layer', layer.name, layer.nameKey)
        yield* yieldAsGroup(results, [TAG_ROOF_LAYER_OVERHANG, TAG_LAYERS, customTag])
      }
      zOffset += layer.thickness
    }
  }
}
