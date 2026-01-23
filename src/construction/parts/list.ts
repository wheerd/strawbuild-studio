import type { ConstructionElement, ConstructionElementId, GroupOrElement } from '@/construction/elements'
import {
  type CrossSection,
  type DimensionalMaterial,
  type MaterialId,
  type SheetMaterial
} from '@/construction/materials/material'
import { getMaterialById } from '@/construction/materials/store'
import type { ConstructionModel } from '@/construction/model'
import {
  TAG_FLOOR_INFILL,
  TAG_FLOOR_LAYER_BOTTOM,
  TAG_FLOOR_LAYER_TOP,
  TAG_FULL_BALE,
  TAG_INFILL,
  TAG_MODULE_INFILL,
  TAG_PARTIAL_BALE,
  TAG_ROOF_INFILL,
  TAG_ROOF_LAYER_INSIDE,
  TAG_ROOF_LAYER_OVERHANG,
  TAG_ROOF_LAYER_TOP,
  TAG_STRAW_FLAKES,
  TAG_STRAW_STUFFED,
  TAG_WALL_LAYER_INSIDE,
  TAG_WALL_LAYER_OUTSIDE,
  type Tag,
  type TagCategoryId,
  isCustomTag
} from '@/construction/tags'
import {
  type Area,
  type Length,
  type Vec2,
  type Vec3,
  type Volume,
  ZERO_VEC3,
  arrayToVec3,
  calculatePolygonWithHolesArea,
  copyVec3,
  newVec2
} from '@/shared/geometry'
import type { TranslatableString } from '@/shared/i18n/TranslatableString'

import { getPartInfoFromManifold } from './pipeline'
import type {
  FullPartInfo,
  MaterialPartItem,
  MaterialParts,
  MaterialPartsList,
  PartId,
  PartIssue,
  PartItem,
  SideFace,
  StrawCategory,
  VirtualPartsList
} from './types'

const indexToLabel = (index: number): string => {
  const alphabetLength = 26
  let current = index
  let label = ''

  do {
    const remainder = current % alphabetLength
    label = String.fromCharCode(65 + remainder) + label
    current = Math.floor(current / alphabetLength) - 1
  } while (current >= 0)

  return label
}

const computeVolume = (size: Vec3): Volume => size[0] * size[1] * size[2]

const STRAW_CATEGORY_BY_TAG: Record<string, StrawCategory> = {
  [TAG_FULL_BALE.id as string]: 'full',
  [TAG_PARTIAL_BALE.id as string]: 'partial',
  [TAG_STRAW_FLAKES.id as string]: 'flakes',
  [TAG_STRAW_STUFFED.id as string]: 'stuffed'
}

const getStrawCategoryFromTags = (tags?: Tag[]): StrawCategory => {
  if (!tags) return 'stuffed'
  for (const tag of tags) {
    if (tag.id in STRAW_CATEGORY_BY_TAG) {
      return STRAW_CATEGORY_BY_TAG[tag.id]
    }
  }
  return 'stuffed'
}

interface TagMapping {
  type: string
  descriptionTagCategory?: TagCategoryId
}

const TAG_MAPPING: Record<string, TagMapping> = {
  [TAG_INFILL.id]: { type: 'wall-infill', descriptionTagCategory: 'wall-assembly' },
  [TAG_MODULE_INFILL.id]: { type: 'module-infill', descriptionTagCategory: 'wall-assembly' },
  [TAG_FLOOR_INFILL.id]: { type: 'floor-infill', descriptionTagCategory: 'floor-assembly' },
  [TAG_ROOF_INFILL.id]: { type: 'roof-infill', descriptionTagCategory: 'roof-assembly' },
  [TAG_WALL_LAYER_INSIDE.id]: { type: 'wall-layer-inside', descriptionTagCategory: 'wall-layer' },
  [TAG_WALL_LAYER_OUTSIDE.id]: { type: 'wall-layer-outside', descriptionTagCategory: 'wall-layer' },
  [TAG_FLOOR_LAYER_TOP.id]: { type: 'floor-layer', descriptionTagCategory: 'floor-layer' },
  [TAG_FLOOR_LAYER_BOTTOM.id]: { type: 'ceiling-layer', descriptionTagCategory: 'floor-layer' },
  [TAG_ROOF_LAYER_TOP.id]: { type: 'roof-layer-top', descriptionTagCategory: 'roof-layer' },
  [TAG_ROOF_LAYER_INSIDE.id]: { type: 'roof-layer-ceiling', descriptionTagCategory: 'roof-layer' },
  [TAG_ROOF_LAYER_OVERHANG.id]: { type: 'roof-layer-overhang', descriptionTagCategory: 'roof-layer' }
}

const computeDimensionalDetails = (size: Vec3, material: DimensionalMaterial) => {
  const dimensions = [Math.round(size[0]), Math.round(size[1]), Math.round(size[2])] as [number, number, number]
  let issue: PartIssue | undefined
  let length = dimensions[2]
  let crossSection: CrossSection = { smallerLength: dimensions[0], biggerLength: dimensions[1] }

  const matchesCrossSection = material.crossSections.some(section => {
    const indices = [0, 1, 2]
    const findIndex = (target: number): number => {
      for (let i = 0; i < indices.length; i++) {
        if (dimensions[indices[i]] === Math.round(target)) {
          const [removed] = indices.splice(i, 1)
          return removed
        }
      }
      return -1
    }

    const smallerIndex = findIndex(section.smallerLength)
    const biggerIndex = findIndex(section.biggerLength)
    if (smallerIndex === -1 || biggerIndex === -1) {
      return false
    }

    length = dimensions[indices[0]]
    crossSection = section
    return true
  })

  if (!matchesCrossSection) {
    issue = 'CrossSectionMismatch'
  } else if (material.lengths.length > 0) {
    const maxAvailableLength = Math.max(...material.lengths)
    if (length > maxAvailableLength) {
      issue = 'LengthExceedsAvailable'
    }
  }

  return { length, issue, crossSection }
}

const computeSheetDetails = (size: Vec3, material: SheetMaterial) => {
  let issue: PartIssue | undefined
  const dimensions = [Math.round(size[0]), Math.round(size[1]), Math.round(size[2])].sort((a, b) => a - b) as [
    number,
    number,
    number
  ]

  const thicknessIndex = dimensions.findIndex(d => material.thicknesses.includes(d))
  let thickness: Length
  let areaSize: Vec2

  if (thicknessIndex === -1) {
    issue = 'ThicknessMismatch'
    thickness = dimensions[0]
    areaSize = newVec2(dimensions[1], dimensions[2])
  } else {
    thickness = dimensions[thicknessIndex]
    const remainingDimensions = dimensions.filter((_, i) => i !== thicknessIndex).sort((a, b) => a - b)
    const fitsSize = material.sizes.some(sizeOption => {
      const smaller = Math.min(sizeOption.smallerLength, sizeOption.biggerLength)
      const bigger = Math.max(sizeOption.smallerLength, sizeOption.biggerLength)
      return remainingDimensions[0] <= smaller && remainingDimensions[1] <= bigger
    })
    if (!fitsSize) {
      issue = 'SheetSizeExceeded'
    }
    areaSize = newVec2(remainingDimensions[0], remainingDimensions[1])
  }

  return { thickness, areaSize, issue }
}

interface MaterialMetrics {
  volume: Volume
  area?: Area
  length?: Length
  thickness?: Length
  crossSection?: CrossSection
  issue?: PartIssue
  sideFaces?: SideFace[]
}

function computeMaterialMetrics(
  geometryInfo: { boxSize: Vec3; sideFaces?: SideFace[] },
  materialDefinition: ReturnType<typeof getMaterialById>,
  hasPartInfo: boolean
): MaterialMetrics {
  const { boxSize, sideFaces } = geometryInfo
  let volume: Volume
  let area: Area | undefined
  let length: Length | undefined
  let thickness: Length | undefined
  let crossSection: CrossSection | undefined
  let issue: PartIssue | undefined

  if (materialDefinition?.type === 'dimensional') {
    const details = computeDimensionalDetails(boxSize, materialDefinition)
    length = details.length
    issue = hasPartInfo ? details.issue : undefined
    crossSection = details.crossSection
    volume = computeVolume(boxSize)
  } else if (materialDefinition?.type === 'sheet') {
    const details = computeSheetDetails(boxSize, materialDefinition)
    thickness = details.thickness
    issue = hasPartInfo ? details.issue : undefined

    if (sideFaces?.[0]) {
      const sideFaceThickness = Math.round(boxSize[sideFaces[0].index])
      if (sideFaceThickness === thickness) {
        area = calculatePolygonWithHolesArea(sideFaces[0].polygon)
      } else {
        area = details.areaSize[0] * details.areaSize[1]
      }
    } else {
      area = details.areaSize[0] * details.areaSize[1]
    }
    volume = thickness * area
  } else if (materialDefinition?.type === 'volume') {
    if (hasPartInfo && sideFaces?.[0]) {
      area = calculatePolygonWithHolesArea(sideFaces[0].polygon)
      thickness = boxSize[sideFaces[0].index]
      volume = thickness * area
    } else {
      const sorted = Array.from(boxSize).sort((a, b) => a - b)
      area = sorted[1] * sorted[2]
      thickness = sorted[0]
      volume = thickness * area
    }
  } else {
    volume = computeVolume(boxSize)
  }

  return {
    volume,
    area,
    length,
    thickness,
    crossSection,
    issue,
    sideFaces: hasPartInfo ? sideFaces : undefined
  }
}

function computePartIdWithInfo(fullPartInfo: FullPartInfo, tags: Tag[], materialId: MaterialId): PartId {
  const materialDefinition = getMaterialById(materialId)
  const isStrawbaleMaterial = materialDefinition?.type === 'strawbale'

  if (isStrawbaleMaterial) {
    const strawCategory = getStrawCategoryFromTags(tags)
    return `strawbale:${strawCategory}` as PartId
  }

  return fullPartInfo.id
}

function computePartIdWithoutInfo(
  tags: Tag[],
  geometryInfo: { boxSize: Vec3 },
  materialDefinition: ReturnType<typeof getMaterialById>
): PartId {
  let partId: PartId

  const mappedInfo = findMappedTag(tags)
  if (mappedInfo) {
    partId = `auto_${mappedInfo.tag.id}` as PartId
  } else {
    partId = `auto_misc` as PartId
  }

  // Append material-specific discriminator
  if (materialDefinition?.type === 'sheet') {
    const details = computeSheetDetails(geometryInfo.boxSize, materialDefinition)
    partId = `${partId}_${details.thickness}` as PartId
  } else if (materialDefinition?.type === 'dimensional') {
    const details = computeDimensionalDetails(geometryInfo.boxSize, materialDefinition)
    partId = `${partId}_${details.crossSection.smallerLength}x${details.crossSection.biggerLength}` as PartId
  } else if (materialDefinition?.type === 'volume') {
    const sorted = Array.from(geometryInfo.boxSize).sort((a, b) => a - b)
    const thickness = sorted[0]
    partId = `${partId}_${thickness}` as PartId
  }

  return partId
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

    // Update existing part
    existingPart.quantity += 1
    existingPart.totalVolume += metrics.volume
    existingPart.elements.push(elementId)
    materialEntry.totalQuantity += 1
    materialEntry.totalVolume += metrics.volume

    // Always update totals (for both with and without part info)
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

  // Create new part
  const labelIndex = labelCounters.get(materialEntry.material) ?? 0
  const label = indexToLabel(labelIndex)
  labelCounters.set(materialEntry.material, labelIndex + 1)

  const strawCategory = computeStrawCategory(materialEntry.material, tags)
  const partType = computePartType(fullPartInfo, tags, strawCategory)
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

  // Set individual fields ONLY for elements WITH part info
  if (hasPartInfo && metrics.length !== undefined) {
    partItem.length = metrics.length
  }
  if (hasPartInfo && metrics.area !== undefined) {
    partItem.area = metrics.area
  }

  // ALWAYS set totals (for both with and without part info)
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

function getFullPartInfo(element: GroupOrElement): FullPartInfo | null {
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
    return fullInfo
  }

  const dims = [...element.bounds.size].sort((a, b) => a - b)
  const id = `${typePrefix}-group:${dims.join('x')}` as PartId
  const fullInfo = element.partInfo as FullPartInfo
  fullInfo.boxSize = arrayToVec3(dims)
  fullInfo.id = id
  return fullInfo
}

export const generateVirtualPartsList = (model: ConstructionModel): VirtualPartsList => {
  const partsList: VirtualPartsList = {}
  let labelCounter = 0

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
      return
    }

    const typeTag = element.tags?.find(t => t.category === 'module-type')
    const description = typeTag && isCustomTag(typeTag) ? typeTag.label : undefined

    const label = indexToLabel(labelCounter++)

    const partItem: PartItem = {
      partId,
      type: partInfo.type,
      label,
      description,
      size: copyVec3(partInfo.boxSize),
      elements: [element.id],
      quantity: 1
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

  // Call getPartInfoFromManifold ONCE
  const geometryInfo = getPartInfoFromManifold(element.shape.manifold)

  // Build fullPartInfo without calling getPartInfoFromManifold again
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

  // Determine partId based on whether we have part info
  let partId: PartId
  if (hasPartInfo && fullPartInfo) {
    partId = computePartIdWithInfo(fullPartInfo, tags, materialEntry.material)
  } else {
    partId = computePartIdWithoutInfo(tags, geometryInfo, materialDefinition)
  }

  // Compute material-specific metrics
  const metrics = computeMaterialMetrics(geometryInfo, materialDefinition, hasPartInfo)

  // Update or create part entry
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

function computeStrawCategory(materialId: MaterialId, tags: Tag[]): StrawCategory | undefined {
  const materialDefinition = getMaterialById(materialId)
  if (materialDefinition?.type !== 'strawbale') return undefined
  return getStrawCategoryFromTags(tags)
}

function computePartType(fullPartInfo: FullPartInfo | null, tags: Tag[], strawCategory?: StrawCategory): string {
  if (strawCategory) {
    return `strawbale-${strawCategory}`
  }
  if (fullPartInfo) {
    return fullPartInfo.type
  }
  return findMappedTag(tags)?.type ?? '-'
}

function computePartDescription(
  fullPartInfo: FullPartInfo | null,
  tags: Tag[],
  strawCategory?: StrawCategory
): TranslatableString | undefined {
  if (strawCategory) {
    return t => t($ => $.strawCategories[strawCategory], { ns: 'construction' })
  }
  if (fullPartInfo?.description) {
    return fullPartInfo.description
  }
  return findMappedTag(tags)?.description
}

function findMappedTag(tags: Tag[]): { tag: Tag; type: string; description?: TranslatableString } | null {
  for (const tag of tags) {
    if (tag.id in TAG_MAPPING) {
      const mapping = TAG_MAPPING[tag.id]
      const customTag = tags.find(t => t.category === mapping.descriptionTagCategory && isCustomTag(t))
      const description = customTag && isCustomTag(customTag) ? customTag.label : undefined
      return { tag: customTag ?? tag, type: mapping.type, description }
    }
  }
  return null
}
