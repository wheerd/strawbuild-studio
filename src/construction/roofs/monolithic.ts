import type { Manifold } from 'manifold-3d'

import type { Roof } from '@/building/model'
import type { RoofAssemblyConfig } from '@/construction/config'
import { createConstructionElement } from '@/construction/elements'
import { transformManifold } from '@/construction/manifold/operations'
import { type ConstructionModel, mergeModels, transformModel } from '@/construction/model'
import type { PerimeterConstructionContext } from '@/construction/perimeters/context'
import {
  type ConstructionResult,
  assignDeterministicIdsToResults,
  mergeResults,
  resultsToModel,
  yieldAndClip,
  yieldElement
} from '@/construction/results'
import { BaseRoofAssembly, type RoofSide } from '@/construction/roofs/base'
import { createExtrudedPolygon } from '@/construction/shapes'
import type { VerticalOffsetMap } from '@/construction/storeys/offsets'
import { TAG_MONOLITHIC_ROOF, TAG_ROOF, TAG_ROOF_SIDE_LEFT, TAG_ROOF_SIDE_RIGHT, createTag } from '@/construction/tags'
import { IDENTITY, type Length, negVec2 } from '@/shared/geometry'

import type { MonolithicRoofConfig } from './types'

export class MonolithicRoofAssembly extends BaseRoofAssembly<MonolithicRoofConfig> {
  construct = (roof: Roof, _contexts: PerimeterConstructionContext[]): ConstructionModel => {
    const ridgeHeight = this.calculateRidgeHeight(roof)
    const roofSides = this.splitRoofPolygon(roof, ridgeHeight)

    // Calculate Z-range for clipping volume (doubled for safety margin)
    const minZ = -2 * (ridgeHeight + this.config.layers.insideThickness)
    const maxZ = (this.config.thickness + this.config.layers.topThickness) * 2
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
    return this.config.layers.topThickness
  }

  getBottomOffsets = (roof: Roof, map: VerticalOffsetMap, _contexts: PerimeterConstructionContext[]): void => {
    const ridgeHeight = this.calculateRidgeHeight(roof)
    const roofSides = this.splitRoofPolygon(roof, ridgeHeight)

    for (const side of roofSides) {
      map.addSlopedArea(side.polygon, roof.ridgeLine.start, negVec2(side.dirToRidge), roof.slopeAngleRad, ridgeHeight)
    }
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
