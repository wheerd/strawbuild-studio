import type { Manifold } from 'manifold-3d'

import type { Roof } from '@/building/model'
import type { RoofAssemblyConfig } from '@/config/types'
import { type PhysicsSeries, materialToPhysicsSeriesItem } from '@/construction/assemblies/physics'
import { BaseRoofAssembly, type RoofSide } from '@/construction/assemblies/roofs/base'
import type { VerticalOffsetMap } from '@/construction/context/offsets'
import type { PerimeterConstructionContext } from '@/construction/context/perimeter'
import { transformManifold } from '@/construction/manifold/operations'
import { createConstructionElement } from '@/construction/model/elements'
import { type ConstructionModel, mergeModels, transformModel } from '@/construction/model/model'
import {
  type ConstructionResult,
  assignDeterministicIdsToResults,
  mergeResults,
  resultsToModel,
  yieldAndClip,
  yieldElement
} from '@/construction/model/results'
import { createExtrudedPolygon } from '@/construction/model/shapes'
import {
  TAG_MONOLITHIC_ROOF,
  TAG_ROOF,
  TAG_ROOF_SIDE_LEFT,
  TAG_ROOF_SIDE_RIGHT,
  createTag
} from '@/construction/model/tags'
import { IDENTITY, type Length, negVec2 } from '@/shared/geometry'

import type { MonolithicRoofConfig } from './types'

export class MonolithicRoofAssembly extends BaseRoofAssembly<MonolithicRoofConfig> {
  construct = (roof: Roof, contexts: PerimeterConstructionContext[]): ConstructionModel => {
    const ridgeHeight = this.calculateRidgeHeight(roof)
    const roofSides = this.splitRoofPolygon(roof, ridgeHeight)

    // Calculate Z-range for clipping volume (doubled for safety margin)
    const minZ = -2 * (ridgeHeight + this.insideLayersThickness)
    const maxZ = (this.config.thickness + this.topLayersThickness) * 2
    const ceilingClippingVolume = this.getCeilingPolygons(roof)
      .map(c => this.createExtrudedVolume(c, roof.ridgeLine, minZ, maxZ))
      .reduce((a, b) => a.add(b))
    const interiorWallClippingVolume = this.createInteriorWallClippingVolume(contexts, roof.ridgeLine, minZ, maxZ)

    const roofModels = roofSides.map(roofSide => {
      const roofSideVolume = this.createExtrudedVolume(roofSide.polygon, roof.ridgeLine, minZ, maxZ)
      const roofSideInverseRotate = this.calculateInverseRotationTransform(
        roof.ridgeLine,
        roof.slopeAngleRad,
        roofSide.side
      )
      const roofSideClip = transformManifold(roofSideVolume, roofSideInverseRotate)
      const ceilingClip = transformManifold(ceilingClippingVolume, roofSideInverseRotate)
      const interiorWallClip = interiorWallClippingVolume
        ? transformManifold(interiorWallClippingVolume, roofSideInverseRotate)
        : null
      const clip = (m: Manifold) => m.intersect(roofSideClip)

      const results = Array.from(
        mergeResults(
          yieldAndClip(this.constructRoofElements(roof, roofSide), clip),
          yieldAndClip(this.constructTopLayers(roof, roofSide), clip),
          yieldAndClip(this.constructCeilingLayers(roof, roofSide), m =>
            interiorWallClip
              ? m.intersect(roofSideClip).intersect(ceilingClip).subtract(interiorWallClip)
              : m.intersect(roofSideClip).intersect(ceilingClip)
          ),
          yieldAndClip(this.constructOverhangLayers(roof, roofSide), clip)
        )
      )
      assignDeterministicIdsToResults(results, roof.id)

      const sideTag = roofSide.side === 'left' ? TAG_ROOF_SIDE_LEFT : TAG_ROOF_SIDE_RIGHT
      return transformModel(resultsToModel(results), roofSide.transform, [sideTag])
    })

    const config = this.config as unknown as RoofAssemblyConfig
    const nameKey = config.nameKey
    const nameTag = createTag(
      'roof-assembly',
      config.id,
      nameKey != null ? t => t(nameKey, { ns: 'config' }) : config.name
    )
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
    return this.topLayersThickness
  }

  getBottomOffsets = (roof: Roof, map: VerticalOffsetMap, _contexts: PerimeterConstructionContext[]): void => {
    const ridgeHeight = this.calculateRidgeHeight(roof)
    const roofSides = this.splitRoofPolygon(roof, ridgeHeight)

    for (const side of roofSides) {
      map.addSlopedArea(side.polygon, roof.ridgeLine.start, negVec2(side.dirToRidge), roof.slopeAngleRad, ridgeHeight)
    }
  }

  getCoreThickness(): Length {
    return this.config.thickness
  }

  getCorePhysicsStructure(): PhysicsSeries[] {
    const item = materialToPhysicsSeriesItem(this.config.material, this.getCoreThickness())
    return [
      {
        items: item ? [item] : [],
        areaFraction: 1,
        label: t => t($ => $.physics.breakdown.roof, { ns: 'config' })
      }
    ]
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
