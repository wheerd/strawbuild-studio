import type { LayerConfig } from '@/construction/layers/types'
import { assertUnreachable } from '@/shared/utils'

const sanitizeLayerName = (name: string): string => name.trim()

const ensureNonNegative = (value: number, message: string): void => {
  if (value < 0) {
    throw new Error(message)
  }
}

const assertLayerIndex = (layers: LayerConfig[], index: number): void => {
  if (!Number.isInteger(index) || index < 0 || index >= layers.length) {
    throw new Error('Layer index out of bounds')
  }
}

export const validateLayerConfig = (layer: LayerConfig): void => {
  if (sanitizeLayerName(layer.name).length === 0) {
    throw new Error('Layer name cannot be empty')
  }
  ensureNonNegative(layer.thickness, 'Layer thickness cannot be negative')

  switch (layer.type) {
    case 'monolithic':
      // No additional validation needed
      break
    case 'striped':
      ensureNonNegative(layer.stripeWidth, 'Layer stripe width cannot be negative')
      ensureNonNegative(layer.gapWidth, 'Layer gap width cannot be negative')
      break
    default:
      assertUnreachable(layer, 'Invalid layer type')
  }
}

export const mergeLayerUpdates = (layer: LayerConfig, updates: Partial<Omit<LayerConfig, 'type'>>): LayerConfig => {
  const nextName = 'name' in updates && typeof updates.name === 'string' ? sanitizeLayerName(updates.name) : layer.name
  const merged = { ...layer, ...updates, name: sanitizeLayerName(nextName) } as LayerConfig
  validateLayerConfig(merged)
  return merged
}

export const appendLayer = (layers: LayerConfig[], layer: LayerConfig): LayerConfig[] => {
  const sanitized: LayerConfig = { ...layer, name: sanitizeLayerName(layer.name) }
  validateLayerConfig(sanitized)
  return [...layers, sanitized]
}

export const replaceLayerAt = (layers: LayerConfig[], index: number, layer: LayerConfig): LayerConfig[] => {
  assertLayerIndex(layers, index)
  const sanitized: LayerConfig = { ...layer, name: sanitizeLayerName(layer.name) }
  validateLayerConfig(sanitized)

  return layers.map((existing, position) => (position === index ? sanitized : existing))
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
  layers.reduce((total, layer) => total + (layer.overlap ? 0 : layer.thickness), 0)

export const sanitizeLayerArray = (layers: LayerConfig[]): LayerConfig[] =>
  layers.reduce<LayerConfig[]>((sanitized, layer) => appendLayer(sanitized, layer), [])
