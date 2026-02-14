import type { ConstructionElement, ConstructionElementId, GroupOrElement } from '@/construction/elements'
import type { MaterialId } from '@/construction/materials/material'
import { getMaterialById } from '@/construction/materials/store'
import type { ConstructionModel } from '@/construction/model'
import { type Tag, isCustomTag } from '@/construction/tags'
import {
  type Area,
  type Vec3,
  ZERO_VEC3,
  arrayToVec3,
  calculatePolygonWithHolesArea,
  copyVec3
} from '@/shared/geometry'

import { getPartInfoFromManifold } from './pipeline'
import {
  type MaterialMetrics,
  computeMaterialMetrics,
  computePartDescription,
  computePartIdWithInfo,
  computePartIdWithoutInfo,
  findMappedTag,
  getStrawCategoryFromTags,
  indexToLabel
} from './shared'
import type {
  FullPartInfo,
  MaterialPartItem,
  MaterialParts,
  MaterialPartsList,
  PartId,
  PartItem,
  SideFace,
  VirtualPartsList
} from './types'

const calculateModuleArea = (element: GroupOrElement, partInfo: FullPartInfo | null): Area => {
  if (partInfo?.sideFaces?.[0]) {
    return calculatePolygonWithHolesArea(partInfo.sideFaces[0].polygon)
  }
  return element.bounds.size[0] * element.bounds.size[2]
}

function updateOrCreatePartEntry(
  partId: PartId,
  elementId: ConstructionElementId,
  metrics: MaterialMetrics,
  hasPartInfo: boolean,
  fullPartInfo: FullPartInfo | null,
  tags: Tag[],
  materialEntry: MaterialParts,
  labelCounters: Map<MaterialId, number>,
  geometryInfo: { boxSize: Vec3; sideFaces?: SideFace[] }
) {
  if (partId in materialEntry.parts) {
    const existingPart = materialEntry.parts[partId]

    existingPart.quantity += 1
    existingPart.totalVolume += metrics.volume
    existingPart.elements.push(elementId)
    materialEntry.totalQuantity += 1
    materialEntry.totalVolume += metrics.volume

    if (metrics.length !== undefined) {
      existingPart.totalLength = (existingPart.totalLength ?? 0) + metrics.length
      materialEntry.totalLength = (materialEntry.totalLength ?? 0) + metrics.length
    }

    if (metrics.area !== undefined) {
      existingPart.totalArea = (existingPart.totalArea ?? 0) + metrics.area
      materialEntry.totalArea = (materialEntry.totalArea ?? 0) + metrics.area
    }

    return
  }

  const labelIndex = labelCounters.get(materialEntry.material) ?? 0
  const label = indexToLabel(labelIndex)
  labelCounters.set(materialEntry.material, labelIndex + 1)

  const materialDefinition = getMaterialById(materialEntry.material)
  const strawCategory = materialDefinition?.type === 'strawbale' ? getStrawCategoryFromTags(tags) : undefined
  const partType = strawCategory
    ? `strawbale-${strawCategory}`
    : (fullPartInfo?.type ?? findMappedTag(tags)?.type ?? '-')
  const description = computePartDescription(fullPartInfo, tags, strawCategory)

  const partItem: MaterialPartItem = {
    partId,
    type: partType,
    description,
    label,
    material: materialEntry.material,
    size: hasPartInfo ? copyVec3(geometryInfo.boxSize) : ZERO_VEC3,
    elements: [elementId],
    totalVolume: metrics.volume,
    quantity: 1,
    issue: metrics.issue,
    sideFaces: hasPartInfo ? metrics.sideFaces : undefined,
    crossSection: metrics.crossSection,
    thickness: metrics.thickness,
    strawCategory,
    requiresSinglePiece: fullPartInfo?.requiresSinglePiece
  }

  if (hasPartInfo && metrics.length !== undefined) {
    partItem.length = metrics.length
  }
  if (hasPartInfo && metrics.area !== undefined) {
    partItem.area = metrics.area
  }

  if (metrics.length !== undefined) {
    partItem.totalLength = metrics.length
    materialEntry.totalLength = (materialEntry.totalLength ?? 0) + metrics.length
  }
  if (metrics.area !== undefined) {
    partItem.totalArea = metrics.area
    materialEntry.totalArea = (materialEntry.totalArea ?? 0) + metrics.area
  }

  materialEntry.parts[partId] = partItem
  materialEntry.totalQuantity += 1
  materialEntry.totalVolume += metrics.volume
}

export const generateMaterialPartsList = (model: ConstructionModel, excludeTypes?: string[]): MaterialPartsList => {
  const partsList: MaterialPartsList = {}
  const labelCounters = new Map<MaterialId, number>()

  const ensureMaterialEntry = (materialId: MaterialId): MaterialParts => {
    if (!(materialId in partsList)) {
      partsList[materialId] = {
        material: materialId,
        totalQuantity: 0,
        totalVolume: 0,
        parts: {},
        usages: {}
      }
    }
    return partsList[materialId]
  }

  const processElement = (element: ConstructionModel['elements'][number], tags: Tag[]) => {
    if ('children' in element) {
      for (const child of element.children) {
        processElement(child, [...tags, ...(element.tags ?? [])])
      }
      return
    }

    const { material } = element
    const elementTags = [...tags, ...(element.tags ?? [])]

    const materialDefinition = getMaterialById(material)
    if (materialDefinition?.type === 'prefab') return

    const partType = element.partInfo?.type
    if (partType && excludeTypes?.some(t => t === partType)) return

    const materialEntry = ensureMaterialEntry(material)

    processConstructionElement(element, elementTags, materialEntry, labelCounters)
  }

  for (const element of model.elements) {
    processElement(element, [])
  }

  return partsList
}

export function getFullPartInfo(element: GroupOrElement): FullPartInfo | null {
  if (!element.partInfo) return null
  if ('id' in element.partInfo) return element.partInfo
  const typePrefix = `${element.partInfo.type}${element.partInfo.subtype ? `-${element.partInfo.subtype}` : ''}`

  if ('shape' in element) {
    const mpi = getPartInfoFromManifold(element.shape.manifold)
    const id = `${typePrefix}-${element.material}-${mpi.id}` as PartId
    const fullInfo = element.partInfo as FullPartInfo
    fullInfo.boxSize = mpi.boxSize
    fullInfo.sideFaces = mpi.sideFaces
    fullInfo.id = id
    fullInfo.subtype = element.partInfo.subtype
    return fullInfo
  }

  const dims = [...element.bounds.size].sort((a, b) => a - b)
  const id = `${typePrefix}-group:${dims.join('x')}` as PartId
  const fullInfo = element.partInfo as FullPartInfo
  fullInfo.boxSize = arrayToVec3(dims)
  fullInfo.id = id
  fullInfo.subtype = element.partInfo.subtype
  return fullInfo
}

export const generateVirtualPartsList = (model: ConstructionModel): VirtualPartsList => {
  const partsList: VirtualPartsList = {}
  let labelCounter = 0
  const labelCounters = new Map<MaterialId, number>()

  const processElement = (element: GroupOrElement) => {
    let partInfo: FullPartInfo | null = null

    if ('children' in element) {
      for (const child of element.children) {
        processElement(child)
      }

      partInfo = getFullPartInfo(element)
    } else {
      const materialDefinition = getMaterialById(element.material)
      if (materialDefinition?.type !== 'prefab') return

      partInfo = getFullPartInfo(element)
    }

    if (!partInfo) return

    const partId = partInfo.id

    if (partId in partsList) {
      const existingPart = partsList[partId]
      existingPart.quantity += 1
      existingPart.elements.push(element.id)
      if (existingPart.area !== undefined) {
        existingPart.totalArea = existingPart.area * existingPart.quantity
      }
      return
    }

    const typeTag = element.tags?.find(t => t.category === 'module-type')
    const description = typeTag && isCustomTag(typeTag) ? typeTag.label : undefined

    let labelIndex
    if ('material' in element) {
      labelIndex = labelCounters.get(element.material) ?? 0
      labelCounters.set(element.material, labelIndex + 1)
    } else {
      labelIndex = labelCounter++
    }

    const label = indexToLabel(labelIndex)
    const area = calculateModuleArea(element, partInfo)

    const partItem: PartItem = {
      partId,
      type: partInfo.type,
      subtype: partInfo.subtype,
      label,
      description,
      size: copyVec3(partInfo.boxSize),
      elements: [element.id],
      quantity: 1,
      area,
      totalArea: area
    }

    partsList[partId] = partItem
  }

  for (const element of model.elements) {
    processElement(element)
  }

  return partsList
}

function processConstructionElement(
  element: ConstructionElement,
  tags: Tag[],
  materialEntry: MaterialParts,
  labelCounters: Map<MaterialId, number>
) {
  const materialDefinition = getMaterialById(materialEntry.material)

  const geometryInfo = getPartInfoFromManifold(element.shape.manifold)

  let fullPartInfo: FullPartInfo | null = null
  const hasPartInfo = !!element.partInfo

  if (hasPartInfo && element.partInfo) {
    if ('id' in element.partInfo) {
      fullPartInfo = element.partInfo
    } else {
      const typePrefix = `${element.partInfo.type}${element.partInfo.subtype ? `-${element.partInfo.subtype}` : ''}`
      const id = `${typePrefix}-${element.material}-${geometryInfo.id}` as PartId
      const partInfoMutable = element.partInfo as FullPartInfo
      partInfoMutable.id = id
      partInfoMutable.boxSize = geometryInfo.boxSize
      partInfoMutable.sideFaces = geometryInfo.sideFaces
      fullPartInfo = partInfoMutable
    }
  }

  let partId: PartId
  if (hasPartInfo && fullPartInfo) {
    partId = computePartIdWithInfo(fullPartInfo, tags, materialEntry.material)
  } else {
    partId = computePartIdWithoutInfo(tags, geometryInfo, materialDefinition)
  }

  const metrics = computeMaterialMetrics(geometryInfo, materialDefinition, hasPartInfo)

  updateOrCreatePartEntry(
    partId,
    element.id,
    metrics,
    hasPartInfo,
    fullPartInfo,
    tags,
    materialEntry,
    labelCounters,
    geometryInfo
  )
}
