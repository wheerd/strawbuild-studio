import { vec3 } from 'gl-matrix'

import type { ConstructionElement, ConstructionElementId, GroupOrElement } from '@/construction/elements'
import type { CrossSection, DimensionalMaterial, MaterialId, SheetMaterial } from '@/construction/materials/material'
import { getMaterialById } from '@/construction/materials/store'
import type { ConstructionModel } from '@/construction/model'
import {
  TAG_FLOOR_LAYER_BOTTOM,
  TAG_FLOOR_LAYER_TOP,
  TAG_FULL_BALE,
  TAG_PARTIAL_BALE,
  TAG_ROOF_LAYER_INSIDE,
  TAG_ROOF_LAYER_OVERHANG,
  TAG_ROOF_LAYER_TOP,
  TAG_STRAW_FLAKES,
  TAG_STRAW_STUFFED,
  TAG_WALL_LAYER_INSIDE,
  TAG_WALL_LAYER_OUTSIDE,
  type Tag
} from '@/construction/tags'
import {
  type Area,
  type Length,
  type Vec2,
  type Volume,
  calculatePolygonWithHolesArea,
  newVec2
} from '@/shared/geometry'

import { getPartInfoFromManifold } from './pipeline'
import type {
  FullPartInfo,
  MaterialPartItem,
  MaterialParts,
  MaterialPartsList,
  PartId,
  PartIssue,
  PartItem,
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

const computeVolume = (size: vec3): Volume => size[0] * size[1] * size[2]

const STRAW_CATEGORY_BY_TAG: Record<string, StrawCategory> = {
  [TAG_FULL_BALE.id]: 'full',
  [TAG_PARTIAL_BALE.id]: 'partial',
  [TAG_STRAW_FLAKES.id]: 'flakes',
  [TAG_STRAW_STUFFED.id]: 'stuffed'
}

const STRAW_CATEGORY_LABELS: Record<StrawCategory, string> = {
  full: 'Full bales',
  partial: 'Partial bales',
  flakes: 'Flakes',
  stuffed: 'Stuffed fill'
}

const getStrawCategoryFromTags = (tags?: Tag[]): StrawCategory => {
  if (!tags) return 'stuffed'
  for (const tag of tags) {
    const category = STRAW_CATEGORY_BY_TAG[tag.id]
    if (category) return category
  }
  return 'stuffed'
}

const computeDimensionalDetails = (size: vec3, material: DimensionalMaterial) => {
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

const computeSheetDetails = (size: vec3, material: SheetMaterial) => {
  let issue: PartIssue | undefined
  const dimensions = [Math.round(size[0]), Math.round(size[1]), Math.round(size[2])] as [number, number, number]

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

export const generateMaterialPartsList = (model: ConstructionModel, excludeTypes?: string[]): MaterialPartsList => {
  const partsList: MaterialPartsList = {}
  const labelCounters = new Map<MaterialId, number>()

  const ensureMaterialEntry = (materialId: MaterialId): MaterialParts => {
    let entry = partsList[materialId]
    if (!entry) {
      entry = {
        material: materialId,
        totalQuantity: 0,
        totalVolume: 0,
        parts: {},
        usages: {}
      }
      partsList[materialId] = entry
    }
    return entry
  }

  const processElement = (element: ConstructionModel['elements'][number], tags: Tag[]) => {
    if ('children' in element) {
      for (const child of element.children) {
        processElement(child, [...tags, ...(element.tags ?? [])])
      }
      return
    }

    const { material, id } = element
    const elementTags = [...tags, ...(element.tags ?? [])]

    const partType = element.partInfo?.type
    if (partType && excludeTypes?.some(t => t === partType)) return

    const materialEntry = ensureMaterialEntry(material)

    const partInfo = getFullPartInfo(element)
    if (partInfo) {
      processPart(partInfo, materialEntry, id, labelCounters, elementTags)
    } else {
      processConstructionElement(element, elementTags, materialEntry, labelCounters)
    }
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

  const dims = [...element.bounds.size].sort()
  const id = `${typePrefix}-group:${dims.join('x')}` as PartId
  const fullInfo = element.partInfo as FullPartInfo
  fullInfo.boxSize = dims
  fullInfo.id = id
  return fullInfo
}

export const generateVirtualPartsList = (model: ConstructionModel): VirtualPartsList => {
  const partsList: VirtualPartsList = {}
  let labelCounter = 0

  const processElement = (element: GroupOrElement) => {
    if (!('children' in element)) return

    for (const child of element.children) {
      processElement(child)
    }

    const { id } = element

    const partInfo = getFullPartInfo(element)

    if (!partInfo) return

    const partId = partInfo.id
    const existingPart = partsList[partId]

    if (existingPart) {
      existingPart.quantity += 1
      existingPart.elements.push(id)
      return
    }

    const label = indexToLabel(labelCounter++)

    const partItem: PartItem = {
      partId,
      type: partInfo.type,
      label,
      size: vec3.clone(partInfo.boxSize),
      elements: [id],
      quantity: 1
    }

    partsList[partId] = partItem
  }

  for (const element of model.elements) {
    processElement(element)
  }

  return partsList
}

function processPart(
  partInfo: FullPartInfo,
  materialEntry: MaterialParts,
  id: ConstructionElementId,
  labelCounters: Map<MaterialId, number>,
  tags: Tag[]
) {
  const materialDefinition = getMaterialById(materialEntry.material)
  const isStrawbaleMaterial = materialDefinition?.type === 'strawbale'

  let partId: PartId = partInfo.id
  let strawCategory: StrawCategory | undefined

  if (isStrawbaleMaterial) {
    strawCategory = getStrawCategoryFromTags(tags)
    partId = `strawbale:${strawCategory}` as PartId
  }

  const existingPart = materialEntry.parts[partId]

  const size = partInfo.boxSize
  let volume = computeVolume(size)

  if (existingPart) {
    existingPart.quantity += 1
    existingPart.totalVolume += volume
    existingPart.elements.push(id)
    materialEntry.totalQuantity += 1
    materialEntry.totalVolume += volume

    const length = existingPart.length
    if (length !== undefined) {
      existingPart.totalLength = (existingPart.totalLength ?? 0) + length
      materialEntry.totalLength = (materialEntry.totalLength ?? 0) + length
    }

    const area = existingPart.area
    if (area !== undefined) {
      existingPart.totalArea = (existingPart.totalArea ?? 0) + area
      materialEntry.totalArea = (materialEntry.totalArea ?? 0) + area
    }

    return
  }

  let length: Length | undefined
  let area: Area | undefined
  let issue: PartIssue | undefined
  let crossSection: CrossSection | undefined
  let thickness: Length | undefined

  if (materialDefinition?.type === 'dimensional') {
    const details = computeDimensionalDetails(size, materialDefinition)
    length = details.length
    issue = details.issue
    crossSection = details.crossSection
  } else if (materialDefinition?.type === 'sheet') {
    const details = computeSheetDetails(size, materialDefinition)
    if (partInfo.sideFaces) {
      area = calculatePolygonWithHolesArea(partInfo.sideFaces[0].polygon)
      const thickness = partInfo.boxSize[partInfo.sideFaces[0].index]
      volume = thickness * area
    } else {
      area = details.areaSize[0] * details.areaSize[1]
    }
    issue = details.issue
    thickness = details.thickness
  } else if (materialDefinition?.type === 'volume') {
    if (partInfo.sideFaces) {
      area = calculatePolygonWithHolesArea(partInfo.sideFaces[0].polygon)
    }
  }

  const labelIndex = labelCounters.get(materialEntry.material) ?? 0
  const label = indexToLabel(labelIndex)
  labelCounters.set(materialEntry.material, labelIndex + 1)

  const partType = strawCategory ? `strawbale-${strawCategory}` : partInfo.type
  const description = strawCategory ? STRAW_CATEGORY_LABELS[strawCategory] : partInfo.description

  const partItem: MaterialPartItem = {
    partId,
    type: partType,
    description,
    label,
    material: materialEntry.material,
    size: vec3.clone(size),
    elements: [id],
    totalVolume: volume,
    quantity: 1,
    issue,
    sideFaces: partInfo.sideFaces,
    crossSection,
    thickness,
    strawCategory
  }

  if (length !== undefined) {
    partItem.length = length
    partItem.totalLength = length
    materialEntry.totalLength = (materialEntry.totalLength ?? 0) + length
  }

  if (area !== undefined) {
    partItem.area = area
    partItem.totalArea = area
    materialEntry.totalArea = (materialEntry.totalArea ?? 0) + area
  }

  materialEntry.parts[partId] = partItem
  materialEntry.totalQuantity += 1
  materialEntry.totalVolume += volume
}

function processConstructionElement(
  element: ConstructionElement,
  tags: Tag[],
  materialEntry: MaterialParts,
  labelCounters: Map<MaterialId, number>
) {
  let partId: PartId
  let description: string | undefined
  let type: string

  const size = Array.from(element.bounds.size).sort()

  const layerTags = tags.filter(
    t => t.category === 'wall-layer' || t.category === 'floor-layer' || t.category === 'roof-layer'
  )
  if (layerTags.length > 0) {
    const specificTag = layerTags.find(
      t =>
        t.id !== TAG_WALL_LAYER_INSIDE.id &&
        t.id !== TAG_WALL_LAYER_OUTSIDE.id &&
        t.id !== TAG_FLOOR_LAYER_TOP.id &&
        t.id !== TAG_FLOOR_LAYER_BOTTOM.id &&
        t.id !== TAG_ROOF_LAYER_TOP.id &&
        t.id !== TAG_ROOF_LAYER_INSIDE.id &&
        t.id !== TAG_ROOF_LAYER_OVERHANG.id
    )
    const layerTag = specificTag ?? layerTags[0]
    partId = `auto_${layerTag.id}` as PartId
    description = layerTag.label
    type = getLayerType(layerTags)
  } else {
    partId = `auto_${size.join('x')}` as PartId
    type = '-'
  }

  // Extract polygon info from manifold shape params if it's an extrusion
  const baseShape = element.shape.base?.type === 'extrusion' ? element.shape.base : undefined
  const polygon = baseShape?.polygon
  const thickness = baseShape?.thickness

  let area: Area | undefined

  const materialDefinition = getMaterialById(materialEntry.material)
  if (materialDefinition?.type === 'sheet') {
    if (polygon) {
      area = calculatePolygonWithHolesArea(polygon)
    } else {
      const details = computeSheetDetails(size, materialDefinition)
      area = details.areaSize[0] * details.areaSize[1]
    }
  } else if (materialDefinition?.type === 'volume') {
    if (polygon) {
      area = calculatePolygonWithHolesArea(polygon)
    }
  }

  const existingPart = materialEntry.parts[partId]

  const volume = polygon && thickness ? calculatePolygonWithHolesArea(polygon) * thickness : computeVolume(size)

  if (existingPart) {
    existingPart.quantity += 1
    existingPart.totalVolume += volume
    existingPart.elements.push(element.id)
    materialEntry.totalQuantity += 1
    materialEntry.totalVolume += volume

    if (area !== undefined) {
      existingPart.totalArea = (existingPart.totalArea ?? 0) + area
      materialEntry.totalArea = (materialEntry.totalArea ?? 0) + area
    }

    return
  }

  const labelIndex = labelCounters.get(materialEntry.material) ?? 0
  const label = indexToLabel(labelIndex)
  labelCounters.set(materialEntry.material, labelIndex + 1)

  const partItem: MaterialPartItem = {
    partId,
    type,
    description,
    label,
    material: materialEntry.material,
    size: vec3.zero(vec3.create()),
    elements: [element.id],
    totalVolume: volume,
    quantity: 1,
    sideFaces: polygon ? [{ index: 0, polygon }] : [],
    thickness
  }

  if (area !== undefined) {
    partItem.totalArea = area
    materialEntry.totalArea = (materialEntry.totalArea ?? 0) + area
  }

  materialEntry.parts[partId] = partItem
  materialEntry.totalQuantity += 1
  materialEntry.totalVolume += volume
}

function getLayerType(layerTags: Tag[]) {
  if (layerTags.indexOf(TAG_WALL_LAYER_INSIDE) !== -1) return 'wall-layer-inside'
  if (layerTags.indexOf(TAG_WALL_LAYER_OUTSIDE) !== -1) return 'wall-layer-outside'
  if (layerTags.indexOf(TAG_FLOOR_LAYER_TOP) !== -1) return 'floor-layer'
  if (layerTags.indexOf(TAG_FLOOR_LAYER_BOTTOM) !== -1) return 'ceiling-layer'
  if (layerTags.indexOf(TAG_ROOF_LAYER_TOP) !== -1) return 'roof-layer-top'
  if (layerTags.indexOf(TAG_ROOF_LAYER_INSIDE) !== -1) return 'roof-layer-ceiling'
  if (layerTags.indexOf(TAG_ROOF_LAYER_OVERHANG) !== -1) return 'roof-layer-overhang'
  return 'layer'
}
