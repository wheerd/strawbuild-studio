import type { LayerConfig } from '@/construction/layers/types'

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

export const mergeLayerUpdates = (layer: LayerConfig, updates: Partial<Omit<LayerConfig, 'type'>>): LayerConfig => {
  const merged = { ...layer, ...updates } as LayerConfig
  validateLayerConfig(merged)
  return merged
}

export const appendLayer = (layers: LayerConfig[], layer: LayerConfig): LayerConfig[] => {
  validateLayerConfig(layer)
  return [...layers, layer]
}

export const replaceLayerAt = (layers: LayerConfig[], index: number, layer: LayerConfig): LayerConfig[] => {
  assertLayerIndex(layers, index)
  validateLayerConfig(layer)

  return layers.map((existing, position) => (position === index ? layer : existing))
}

export const updateLayerAt = (
  layers: LayerConfig[],
  index: number,
  updates: Partial<Omit<LayerConfig, 'type'>>
): LayerConfig[] => {
  assertLayerIndex(layers, index)

  const nextLayer = mergeLayerUpdates(layers[index], updates)
  return layers.map((existing, position) => (position === index ? nextLayer : existing))
}

export const removeLayerAt = (layers: LayerConfig[], index: number): LayerConfig[] => {
  assertLayerIndex(layers, index)
  return layers.filter((_, position) => position !== index)
}

export const moveLayer = (layers: LayerConfig[], fromIndex: number, toIndex: number): LayerConfig[] => {
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
