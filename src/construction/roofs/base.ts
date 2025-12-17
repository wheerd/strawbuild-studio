import { mat4, vec2, vec3 } from 'gl-matrix'
import type { Manifold } from 'manifold-3d'

import type { Roof } from '@/building/model'
import { getModelActions } from '@/building/store'
import type { PerimeterConstructionContext } from '@/construction/context'
import { type GroupOrElement } from '@/construction/elements'
import { type Transform, transformBounds } from '@/construction/geometry'
import { LAYER_CONSTRUCTIONS } from '@/construction/layers'
import type { LayerConfig, MonolithicLayerConfig, StripedLayerConfig } from '@/construction/layers/types'
import { getBoundsFromManifold, transformManifold } from '@/construction/manifold/operations'
import { type ConstructionModel } from '@/construction/model'
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
  Bounds3D,
  type Length,
  type LineSegment2D,
  type Polygon2D,
  type PolygonWithHoles2D,
  direction,
  intersectPolygon,
  lineFromSegment,
  perpendicularCCW,
  perpendicularCW,
  splitPolygonByLine,
  subtractPolygons,
  unionPolygons
} from '@/shared/geometry'

import type { HeightLine, RoofAssembly, RoofAssemblyConfigBase } from './types'

export interface RoofSide {
  polygon: Polygon2D
  side: 'left' | 'right'
  transform: Transform
  dirToRidge: vec2
}

export abstract class BaseRoofAssembly<T extends RoofAssemblyConfigBase> implements RoofAssembly<T> {
  abstract getTopOffset: (config: T) => Length
  abstract getBottomOffsets: (
    roof: Roof,
    config: T,
    line: LineSegment2D,
    contexts: PerimeterConstructionContext[]
  ) => HeightLine

  abstract getConstructionThickness: (config: T) => Length
  abstract construct(roof: Roof, config: T, contexts: PerimeterConstructionContext[]): ConstructionModel

  protected abstract getTopLayerOffset: (config: T) => Length
  protected abstract getCeilingLayerOffset: (config: T) => Length
  protected abstract getOverhangLayerOffset: (config: T) => Length

  getTotalThickness = (config: T) =>
    config.layers.insideThickness +
    this.getCeilingLayerOffset(config) +
    this.getConstructionThickness(config) +
    this.getTopLayerOffset(config) +
    config.layers.topThickness

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
      const toPoint = vec2.sub(vec2.create(), point, ridgeLine.start)
      const projection = vec2.dot(toPoint, ridgeDir)
      const closestOnRidge = vec2.scaleAndAdd(vec2.create(), ridgeLine.start, ridgeDir, projection)

      // Calculate perpendicular offset from ridge
      const offset = vec2.sub(vec2.create(), point, closestOnRidge)
      const offsetLen = vec2.len(offset)

      // Place point at new offset distance from ridge
      if (Math.abs(offsetLen) > 0.1) {
        const offsetDir = vec2.scale(vec2.create(), offset, 1 / offsetLen)
        return vec2.scaleAndAdd(
          vec2.create(),
          closestOnRidge,
          offsetDir,
          offsetLen * expansionFactor + additionalExpansion
        )
      }
      return vec2.clone(point)
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
    const rotationAxis = vec3.normalize(
      vec3.create(),
      vec3.fromValues(roof.ridgeDirection[0], roof.ridgeDirection[1], 0)
    )
    const angle = side === 'left' ? -roof.slopeAngleRad : roof.slopeAngleRad

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

  private calculateInverseRotationTransform(
    ridgeLine: LineSegment2D,
    slopeAngleRad: number,
    side: 'left' | 'right'
  ): Transform {
    const ridgeDir2D = direction(ridgeLine.start, ridgeLine.end)

    // Rotation axis along ridge (in 3D)
    const rotationAxis = vec3.normalize(vec3.create(), vec3.fromValues(ridgeDir2D[0], ridgeDir2D[1], 0))
    const angle = side === 'right' ? -slopeAngleRad : slopeAngleRad

    return mat4.fromRotation(mat4.create(), angle, rotationAxis)
  }

  /**
   * Calculate the ridge elevation based on roof geometry and slope
   * The ridge must be high enough so that when the roof slopes down,
   * the edges align with the reference polygon at verticalOffset height
   */
  protected calculateRidgeHeight(roof: Roof): Length {
    return (roof.verticalOffset + roof.rise) as Length
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
  protected translatePolygonToOrigin(
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
  protected createClippingVolume(
    polygon: Polygon2D,
    ridgeLine: LineSegment2D,
    minZ: Length,
    maxZ: Length,
    slopeAngleRad: number,
    side: 'left' | 'right'
  ): Manifold {
    const translatedPolygon = this.translatePolygonToOrigin(polygon, ridgeLine)

    const extrusionThickness = (maxZ - minZ) as Length
    const shape = createExtrudedPolygon({ outer: translatedPolygon, holes: [] }, 'xy', extrusionThickness)

    const translateToMinZ = mat4.fromTranslation(mat4.create(), vec3.fromValues(0, 0, minZ))
    const inverseRotation = this.calculateInverseRotationTransform(ridgeLine, slopeAngleRad, side)
    const combinedTransform = mat4.multiply(mat4.create(), inverseRotation, translateToMinZ)

    return transformManifold(shape.manifold, combinedTransform)
  }

  /**
   * Apply clipping recursively to elements and groups
   * Modifies elements in place by clipping their manifolds
   */
  protected applyClippingRecursive(item: GroupOrElement, clipping: (m: Manifold) => Manifold): void {
    if ('shape' in item) {
      // This is an element - apply clipping
      const invertedTransform = mat4.invert(mat4.create(), item.transform)
      const clippedManifold = invertedTransform
        ? transformManifold(clipping(transformManifold(item.shape.manifold, item.transform)), invertedTransform)
        : clipping(item.shape.manifold)
      item.shape.manifold = clippedManifold
      item.shape.bounds = getBoundsFromManifold(clippedManifold)
      item.bounds = item.shape.bounds
    } else if ('children' in item) {
      // This is a group - recursively apply to children
      for (const child of item.children) {
        this.applyClippingRecursive(child, clipping)
      }
      // Recalculate group bounds from children
      if (item.children.length > 0) {
        item.bounds = Bounds3D.merge(...item.children.map(c => transformBounds(c.bounds, item.transform)))
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
  protected preparePolygonForConstruction(
    polygon: Polygon2D,
    ridgeLine: LineSegment2D,
    slopeAngleRad: number,
    verticalOffset: Length,
    thickness: Length,
    dirToRidge: vec2
  ): Polygon2D {
    const expandedPolygon = this.expandPolygonFromRidge(polygon, ridgeLine, slopeAngleRad, thickness)
    const ridgeOffset = this.calculateRidgeOffset(verticalOffset, slopeAngleRad)
    const directedRidgeOffset = vec2.scale(vec2.create(), dirToRidge, -ridgeOffset)
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
        points: polygon.outer.points.map(point => vec2.fromValues(point[0], point[1]))
      },
      holes: polygon.holes.map(hole => ({
        points: hole.points.map(point => vec2.fromValues(point[0], point[1]))
      }))
    }

    if (layer.type === 'monolithic') {
      const construction = LAYER_CONSTRUCTIONS.monolithic
      yield* construction.construct(clonedPolygon, offset, 'xy', layer as MonolithicLayerConfig)
      return
    }
    if (layer.type === 'striped') {
      const construction = LAYER_CONSTRUCTIONS.striped
      yield* construction.construct(clonedPolygon, offset, 'xy', layer as StripedLayerConfig)
      return
    }
    throw new Error(`Unsupported layer type: ${(layer as { type: string }).type}`)
  }

  // ============================================================================
  // Construction Methods
  // ============================================================================

  /**
   * Construct top layers (on roof side polygon)
   */
  protected *constructTopLayers(roof: Roof, config: T, roofSide: RoofSide): Generator<ConstructionResult> {
    if (config.layers.topLayers.length === 0) {
      return
    }

    let zOffset = (this.getConstructionThickness(config) + this.getTopLayerOffset(config)) as Length

    for (const layer of config.layers.topLayers) {
      const preparedPolygon = this.preparePolygonForConstruction(
        roofSide.polygon,
        roof.ridgeLine,
        roof.slopeAngleRad,
        zOffset + layer.thickness,
        layer.thickness,
        roofSide.dirToRidge
      )

      const results = this.runLayerConstruction({ outer: preparedPolygon, holes: [] }, zOffset, layer)

      const customTag = createTag('roof-layer', layer.name)
      yield* yieldAsGroup(results, [TAG_ROOF_LAYER_TOP, TAG_LAYERS, customTag])

      zOffset += layer.thickness
    }
  }

  /**
   * Construct ceiling layers (inside perimeter intersection with roof side)
   */
  protected *constructCeilingLayers(roof: Roof, config: T, roofSide: RoofSide): Generator<ConstructionResult> {
    if (config.layers.insideLayers.length === 0) {
      return
    }

    // Get full ceiling polygon (perimeter inside intersection with reference)
    const fullCeilingPolygon = this.getCeilingPolygon(roof)
    if (!fullCeilingPolygon) {
      return
    }

    // Intersect roof side polygon with ceiling polygon
    const sideCeilingPolygons = intersectPolygon({ outer: roofSide.polygon, holes: [] }, fullCeilingPolygon)

    if (sideCeilingPolygons.length === 0) {
      return
    }

    let zOffset = (this.getCeilingLayerOffset(config) - config.layers.insideThickness) as Length

    // Reverse order: bottom to top
    const reversedLayers = [...config.layers.insideLayers].reverse()

    for (const layer of reversedLayers) {
      for (const ceilingPoly of sideCeilingPolygons) {
        const preparedOuter = this.preparePolygonForConstruction(
          ceilingPoly.outer,
          roof.ridgeLine,
          roof.slopeAngleRad,
          zOffset + layer.thickness,
          layer.thickness,
          roofSide.dirToRidge
        )
        const preparedHoles = ceilingPoly.holes.map(hole =>
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

        const customTag = createTag('roof-layer', layer.name)
        yield* yieldAsGroup(results, [TAG_ROOF_LAYER_INSIDE, TAG_LAYERS, customTag])
      }
      zOffset += layer.thickness
    }
  }

  /**
   * Construct overhang layers (overhang areas for this roof side)
   */
  protected *constructOverhangLayers(roof: Roof, config: T, roofSide: RoofSide): Generator<ConstructionResult> {
    if (config.layers.overhangLayers.length === 0) {
      return
    }

    // Subtract reference polygon from this roof side's polygon
    const sideOverhangPolygons = subtractPolygons([roofSide.polygon], [roof.referencePolygon])

    if (sideOverhangPolygons.length === 0) {
      return
    }

    let zOffset = (this.getOverhangLayerOffset(config) - config.layers.overhangThickness) as Length

    // Reverse order: bottom to top
    const reversedLayers = [...config.layers.overhangLayers].reverse()

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

        const customTag = createTag('roof-layer', layer.name)
        yield* yieldAsGroup(results, [TAG_ROOF_LAYER_OVERHANG, TAG_LAYERS, customTag])
      }
      zOffset += layer.thickness
    }
  }
}
