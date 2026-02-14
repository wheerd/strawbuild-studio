import type { CrossSection, DimensionalMaterial, MaterialId, SheetMaterial } from '@/construction/materials/material'
import { getMaterialById } from '@/construction/materials/store'
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
  calculatePolygonWithHolesArea,
  newVec2
} from '@/shared/geometry'
import type { TranslatableString } from '@/shared/i18n/TranslatableString'

import type { FullPartInfo, PartId, PartIssue, SideFace, StrawCategory } from './types'

const STRAW_CATEGORY_BY_TAG: Record<string, StrawCategory> = {
  [TAG_FULL_BALE.id as string]: 'full',
  [TAG_PARTIAL_BALE.id as string]: 'partial',
  [TAG_STRAW_FLAKES.id as string]: 'flakes',
  [TAG_STRAW_STUFFED.id as string]: 'stuffed'
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

export const indexToLabel = (index: number): string => {
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

export const computeVolume = (size: Vec3): Volume => size[0] * size[1] * size[2]

export const getStrawCategoryFromTags = (tags?: Tag[]): StrawCategory => {
  if (!tags) return 'stuffed'
  for (const tag of tags) {
    if (tag.id in STRAW_CATEGORY_BY_TAG) {
      return STRAW_CATEGORY_BY_TAG[tag.id]
    }
  }
  return 'stuffed'
}

export const computeDimensionalDetails = (size: Vec3, material: DimensionalMaterial) => {
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

export const computeSheetDetails = (size: Vec3, material: SheetMaterial) => {
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

export interface MaterialMetrics {
  volume: Volume
  area?: Area
  length?: Length
  thickness?: Length
  crossSection?: CrossSection
  issue?: PartIssue
  sideFaces?: SideFace[]
}

export function computeMaterialMetrics(
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

export function computePartIdWithInfo(fullPartInfo: FullPartInfo, tags: Tag[], materialId: MaterialId): PartId {
  const materialDefinition = getMaterialById(materialId)
  const isStrawbaleMaterial = materialDefinition?.type === 'strawbale'

  if (isStrawbaleMaterial) {
    const strawCategory = getStrawCategoryFromTags(tags)
    return `strawbale-${materialId}:${strawCategory}` as PartId
  }

  return fullPartInfo.id
}

export function computePartIdWithoutInfo(
  tags: Tag[],
  geometryInfo: { boxSize: Vec3 },
  materialDefinition: ReturnType<typeof getMaterialById>
): PartId {
  let partId: PartId

  const mappedInfo = findMappedTag(tags)
  if (mappedInfo) {
    partId = `auto_${materialDefinition?.id}_${mappedInfo.tag.id}` as PartId
  } else {
    partId = `auto_${materialDefinition?.id}_misc` as PartId
  }

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

export function computePartDescription(
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

export function findMappedTag(tags: Tag[]): { tag: Tag; type: string; description?: TranslatableString } | null {
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
