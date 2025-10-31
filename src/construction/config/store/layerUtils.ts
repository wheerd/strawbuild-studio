import type {
  LayerConfig,
  MonolithicLayerConfig,
  StripedLayerConfig
} from '@/construction/layers/types'

const ensureNonNegative = (value: number, message: string): void => {
  if (Number(value) < 0) {
    throw new Error(message)
  }
}

const assertLayerIndex = (layers: LayerConfig[], index: number): void => {
  if (!Number.isInteger(index) || index < 0 || index >= layers.length) {
    throw new Error('Layer index out of bounds')
  }
}

export const validateLayerConfig = (layer: LayerConfig): void => {
  ensureNonNegative(layer.thickness, 'Layer thickness cannot be negative')

  if (layer.type === 'striped') {
    ensureNonNegative(layer.stripeWidth, 'Layer stripe width cannot be negative')
    ensureNonNegative(layer.gapWidth, 'Layer gap width cannot be negative')
  }
}

const createMonolithicLayer = (
  base: LayerConfig,
  updates: Partial<LayerConfig>
): MonolithicLayerConfig => {
  const monolithicUpdates = updates as Partial<MonolithicLayerConfig>
  const material = monolithicUpdates.material
  if (material == null) {
    throw new Error('Monolithic layer updates must include a material')
  }

  const thickness = updates.thickness ?? base.thickness
  const layer: MonolithicLayerConfig = {
    type: 'monolithic',
    thickness,
    material
  }

  validateLayerConfig(layer)
  return layer
}

const createStripedLayer = (
  base: LayerConfig,
  updates: Partial<LayerConfig>
): StripedLayerConfig => {
  const stripedUpdates = updates as Partial<StripedLayerConfig>
  const direction = stripedUpdates.direction
  const stripeWidth = stripedUpdates.stripeWidth
  const stripeMaterial = stripedUpdates.stripeMaterial
  const gapWidth = stripedUpdates.gapWidth

  if (direction == null || stripeWidth == null || stripeMaterial == null || gapWidth == null) {
    throw new Error(
      'Striped layer updates must include direction, stripe width, stripe material, and gap width'
    )
  }

  const layer: StripedLayerConfig = {
    type: 'striped',
    thickness: updates.thickness ?? base.thickness,
    direction,
    stripeWidth,
    stripeMaterial,
    gapWidth,
    gapMaterial: stripedUpdates.gapMaterial
  }

  validateLayerConfig(layer)
  return layer
}

export const mergeLayerUpdates = (
  layer: LayerConfig,
  updates: Partial<LayerConfig>
): LayerConfig => {
  if (updates.type != null && updates.type !== layer.type) {
    if (updates.type === 'monolithic') {
      return createMonolithicLayer(layer, updates)
    }

    if (updates.type === 'striped') {
      return createStripedLayer(layer, updates)
    }

    const exhaustiveCheck: never = updates.type
    return exhaustiveCheck
  }

  const merged = { ...layer, ...updates } as LayerConfig
  validateLayerConfig(merged)
  return merged
}

export const appendLayer = (
  layers: LayerConfig[],
  layer: LayerConfig
): LayerConfig[] => {
  validateLayerConfig(layer)
  return [...layers, layer]
}

export const replaceLayerAt = (
  layers: LayerConfig[],
  index: number,
  layer: LayerConfig
): LayerConfig[] => {
  assertLayerIndex(layers, index)
  validateLayerConfig(layer)

  return layers.map((existing, position) =>
    position === index ? layer : existing
  )
}

export const updateLayerAt = (
  layers: LayerConfig[],
  index: number,
  updates: Partial<LayerConfig>
): LayerConfig[] => {
  assertLayerIndex(layers, index)

  const nextLayer = mergeLayerUpdates(layers[index], updates)
  return layers.map((existing, position) =>
    position === index ? nextLayer : existing
  )
}

export const removeLayerAt = (
  layers: LayerConfig[],
  index: number
): LayerConfig[] => {
  assertLayerIndex(layers, index)
  return layers.filter((_, position) => position !== index)
}

export const moveLayer = (
  layers: LayerConfig[],
  fromIndex: number,
  toIndex: number
): LayerConfig[] => {
  assertLayerIndex(layers, fromIndex)
  assertLayerIndex(layers, toIndex)

  if (fromIndex === toIndex) {
    return [...layers]
  }

  const reordered = [...layers]
  const [layer] = reordered.splice(fromIndex, 1)
  reordered.splice(toIndex, 0, layer)
  return reordered
}

export const sumLayerThickness = (layers: LayerConfig[]): number =>
  layers.reduce((total, layer) => total + Number(layer.thickness ?? 0), 0)
