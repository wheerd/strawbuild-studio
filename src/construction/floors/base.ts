import type { FloorAssemblyConfig } from '@/construction/config'
import { runLayerConstruction } from '@/construction/layers'
import type { LayerConfig } from '@/construction/layers/types'
import type { ConstructionModel } from '@/construction/model'
import type { PerimeterConstructionContext } from '@/construction/perimeters/context'
import { type ConstructionResult, yieldAsGroup } from '@/construction/results'
import { TAG_FLOOR_LAYER_BOTTOM, TAG_FLOOR_LAYER_TOP, TAG_LAYERS, type Tag, createTag } from '@/construction/tags'
import { type Length, type PolygonWithHoles2D } from '@/shared/geometry'

import type { FloorAssembly, FloorAssemblyConfigBase } from './types'

export abstract class BaseFloorAssembly<TConfig extends FloorAssemblyConfigBase> implements FloorAssembly {
  protected readonly config: TConfig

  constructor(config: TConfig) {
    this.config = config
  }

  abstract construct: (context: PerimeterConstructionContext) => ConstructionModel;

  *constructCeilingLayers(polygons: PolygonWithHoles2D[]) {
    yield* this.constructLayers(polygons, this.config.layers.bottomLayers, TAG_FLOOR_LAYER_BOTTOM, true)
  }

  *constructFloorLayers(polygons: PolygonWithHoles2D[]) {
    yield* this.constructLayers(polygons, this.config.layers.topLayers, TAG_FLOOR_LAYER_TOP, false)
  }

  private *constructLayers(
    basePolygons: PolygonWithHoles2D[],
    layers: LayerConfig[],
    layerTag: Tag,
    reverse: boolean
  ): Generator<ConstructionResult> {
    if (layers.length === 0) {
      return
    }

    let offset = 0 as Length
    const actualLayers = reverse ? [...layers].reverse() : layers
    for (const layer of actualLayers) {
      const nameKey = layer.nameKey
      const customTag = createTag('floor-layer', layer.name, nameKey ? t => t(nameKey, { ns: 'config' }) : undefined)
      for (const polygon of basePolygons) {
        yield* yieldAsGroup(runLayerConstruction(polygon, offset, 'xy', layer), [layerTag, TAG_LAYERS, customTag])
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
    return this.config.layers.topThickness
  }

  get bottomLayersThickness() {
    return this.config.layers.bottomThickness
  }

  get totalThickness() {
    return (
      this.config.layers.topThickness +
      this.topOffset +
      this.constructionThickness +
      this.bottomOffset +
      this.config.layers.bottomThickness
    )
  }

  protected abstract get tag(): Tag

  get tags(): Tag[] {
    const nameTag = createTag('floor-assembly', (this.config as unknown as FloorAssemblyConfig).name)
    return [nameTag, this.tag]
  }
}
