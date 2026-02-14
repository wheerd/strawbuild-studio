import type { MaterialPartItem, MaterialPartsList, PartItem, VirtualPartsList } from '@/construction/parts/types'

import type { AggregatedPartItem } from './types'

export function toMaterialPartsList(parts: AggregatedPartItem[]): MaterialPartsList {
  const result: MaterialPartsList = {}

  for (const part of parts) {
    const materialId = part.materialId
    if (!materialId) continue

    result[materialId] ??= {
      material: materialId,
      totalQuantity: 0,
      totalVolume: 0,
      parts: {},
      usages: {}
    }

    const materialEntry = result[materialId]

    const materialPartItem: MaterialPartItem = {
      partId: part.partId,
      type: part.type,
      subtype: part.subtype,
      description: part.description,
      label: part.label,
      material: materialId,
      size: part.size,
      elements: part.elementIds,
      quantity: part.quantity,
      totalVolume: part.totalVolume,
      area: part.area,
      totalArea: part.totalArea,
      length: part.length,
      totalLength: part.totalLength,
      crossSection: part.crossSection,
      thickness: part.thickness,
      strawCategory: part.strawCategory,
      sideFaces: part.sideFaces,
      issue: part.issue,
      requiresSinglePiece: part.requiresSinglePiece
    }

    materialEntry.parts[part.partId] = materialPartItem
    materialEntry.totalQuantity += part.quantity
    materialEntry.totalVolume += part.totalVolume

    if (part.totalLength !== undefined) {
      materialEntry.totalLength = (materialEntry.totalLength ?? 0) + part.totalLength
    }
    if (part.totalArea !== undefined) {
      materialEntry.totalArea = (materialEntry.totalArea ?? 0) + part.totalArea
    }
  }

  return result
}

export function toVirtualPartsList(parts: AggregatedPartItem[]): VirtualPartsList {
  const result: VirtualPartsList = {}

  for (const part of parts) {
    const partItem: PartItem = {
      partId: part.partId,
      type: part.type,
      subtype: part.subtype,
      description: part.description,
      label: part.label,
      size: part.size,
      elements: part.elementIds,
      quantity: part.quantity,
      area: part.area,
      totalArea: part.totalArea
    }

    result[part.partId] = partItem
  }

  return result
}
