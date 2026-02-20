import { type FloorAssemblyConfig, resolveLayerSetLayers, resolveLayerSetThickness } from '@/construction/config'
import { runLayerConstruction } from '@/construction/layers'
import type { LayerConfig } from '@/construction/layers/types'
import type { ConstructionModel } from '@/construction/model'
import type { PerimeterConstructionContext } from '@/construction/perimeters/context'
import { type ConstructionResult, yieldAsGroup, yieldWithDeterministicIds } from '@/construction/results'
import { TAG_FLOOR_LAYER_BOTTOM, TAG_FLOOR_LAYER_TOP, TAG_LAYERS, type Tag, createTag } from '@/construction/tags'
import { type Length, type PolygonWithHoles2D } from '@/shared/geometry'

import type { FloorAssembly, FloorAssemblyConfigBase } from './types'

export abstract class BaseFloorAssembly<TConfig extends FloorAssemblyConfigBase> implements FloorAssembly {
  protected readonly config: TConfig

  constructor(config: TConfig) {
    this.config = config
  }

  abstract construct: (context: PerimeterConstructionContext) => ConstructionModel;

  *constructCeilingLayers(polygons: PolygonWithHoles2D[], idPrefix: string) {
    const layers = resolveLayerSetLayers(this.config.bottomLayerSetId)
    yield* this.constructLayers(polygons, layers, TAG_FLOOR_LAYER_BOTTOM, true, idPrefix)
  }

  *constructFloorLayers(polygons: PolygonWithHoles2D[], idPrefix: string) {
    const layers = resolveLayerSetLayers(this.config.topLayerSetId)
    yield* this.constructLayers(polygons, layers, TAG_FLOOR_LAYER_TOP, false, idPrefix)
  }

  private *constructLayers(
    basePolygons: PolygonWithHoles2D[],
    layers: LayerConfig[],
    layerTag: Tag,
    reverse: boolean,
    idPrefix: string
  ): Generator<ConstructionResult> {
    if (layers.length === 0) {
      return
    }

    let offset = 0 as Length
    const actualLayers = reverse ? [...layers].reverse() : layers
    for (const [layerIndex, layer] of actualLayers.entries()) {
      const nameKey = layer.nameKey
      const customTag = createTag('floor-layer', layer.name, nameKey ? t => t(nameKey, { ns: 'config' }) : layer.name)
      for (const polygon of basePolygons) {
        const results = yieldWithDeterministicIds(
          runLayerConstruction(polygon, offset, 'xy', layer),
          `${idPrefix}_${layerIndex}`
        )
        yield* yieldAsGroup(results, [layerTag, TAG_LAYERS, customTag])
      }
      if (!layer.overlap) {
        offset += layer.thickness
      }
    }
  }

  abstract get topOffset(): Length
  abstract get bottomOffset(): Length
  abstract get constructionThickness(): Length

  get topLayersThickness() {
    return resolveLayerSetThickness(this.config.topLayerSetId)
  }

  get bottomLayersThickness() {
    return resolveLayerSetThickness(this.config.bottomLayerSetId)
  }

  get totalThickness() {
    return (
      this.topLayersThickness +
      this.topOffset +
      this.constructionThickness +
      this.bottomOffset +
      this.bottomLayersThickness
    )
  }

  protected abstract get tag(): Tag

  get tags(): Tag[] {
    const config = this.config as unknown as FloorAssemblyConfig
    const nameKey = config.nameKey
    const nameTag = createTag(
      'floor-assembly',
      config.id,
      nameKey != null ? t => t(nameKey, { ns: 'config' }) : config.name
    )
    return [nameTag, this.tag]
  }
}
