import { vec2, vec3 } from 'gl-matrix'

import type { ConstructionElement, ConstructionElementId } from '@/construction/elements'
import type { CrossSection, DimensionalMaterial, MaterialId, SheetMaterial } from '@/construction/materials/material'
import { getMaterialById } from '@/construction/materials/store'
import type { ConstructionModel } from '@/construction/model'
import { getPartInfoFromManifold } from '@/construction/parts/pipeline'
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
  Bounds2D,
  type Length,
  type Plane3D,
  type Polygon2D,
  type Volume,
  calculatePolygonArea,
  calculatePolygonWithHolesArea,
  canonicalPolygonKey,
  minimumAreaBoundingBox,
  simplifyPolygon
} from '@/shared/geometry'

export type PartId = string & { readonly brand: unique symbol }

export interface PartInfo {
  partId: PartId
  type: string
  description?: string
  size: vec3 // Dimensions in millimeters, sorted from smallest to largest
  polygon?: Polygon2D // Normalized within the bounding box defined by width and length
  polygonPlane?: Plane3D // The plane of the polygon relative to the sorted size
}

export const dimensionalPartInfo = (type: string, size: vec3, description?: string): PartInfo => {
  const sortedDimensions = Array.from(size)
    .map(Math.round)
    .sort((a, b) => a - b)
  const partId = sortedDimensions.join('x') as PartId
  return {
    partId,
    type,
    description,
    size: vec3.fromValues(sortedDimensions[0], sortedDimensions[1], sortedDimensions[2])
  }
}

const isAxisAlignedRect = (polygon: Polygon2D) => {
  if (polygon.points.length !== 4) return false
  for (let i = 0; i < 4; i++) {
    const prev = polygon.points[(i - 1 + 4) % 4]
    const current = polygon.points[i]
    const next = polygon.points[(i + 1) % 4]
    if ((prev[0] !== current[0]) === (current[0] !== next[0])) return false
    if ((prev[1] !== current[1]) === (current[1] !== next[1])) return false
    if (prev[0] !== current[0] && prev[1] !== current[1]) return false
  }
  return true
}

export const polygonPartInfo = (
  type: string,
  polygon: Polygon2D,
  plane: Plane3D,
  thickness: Length,
  description?: string,
  simplifyRect = true
): PartInfo => {
  const { size, angle } = minimumAreaBoundingBox(polygon)
  const width = Math.max(Math.round(size[0]), 0)
  const height = Math.max(Math.round(size[1]), 0)
  const absoluteThickness = Math.abs(Math.round(thickness))

  const dimensions =
    plane === 'xy'
      ? [width, height, absoluteThickness]
      : plane === 'xz'
        ? [width, absoluteThickness, height]
        : [absoluteThickness, width, height]
  const dimTypes = plane === 'xy' ? 'xyz' : plane === 'xz' ? 'xzy' : 'zxy'
  const combined: [number, string][] = [
    [dimensions[0], dimTypes[0]],
    [dimensions[1], dimTypes[1]],
    [dimensions[2], dimTypes[2]]
  ]

  const sorted = combined.sort((a, b) => a[0] - b[0])
  const sortedSize = sorted.map(s => s[0])
  const sortedDim = sorted.map(s => s[1])
  const xIndex = sortedDim.indexOf('x')
  const yIndex = sortedDim.indexOf('y')
  // This plane is relative to the sorted dimensions
  const newPlane = `${'xyz'[Math.min(xIndex, yIndex)]}${'xyz'[Math.max(xIndex, yIndex)]}` as Plane3D
  // If the axes are swapped in the new plane, we need to swap them in the polygon also
  const flipXY = yIndex < xIndex

  const sinAngle = Math.sin(-angle)
  const cosAngle = Math.cos(-angle)

  const rotatePoint = (point: vec2) => {
    const x = point[0] * cosAngle - point[1] * sinAngle
    const y = point[0] * sinAngle + point[1] * cosAngle
    return vec2.fromValues(x, y)
  }

  const rotatedPoints = polygon.points.map(rotatePoint)
  const flippedPoints = rotatedPoints.map(p => (flipXY ? vec2.fromValues(p[1], p[0]) : vec2.fromValues(p[0], p[1])))
  if (flipXY) flippedPoints.reverse()
  const bounds = Bounds2D.fromPoints(flippedPoints)
  const normalizedPolygon: Polygon2D = {
    points: flippedPoints.map(p => vec2.fromValues(Math.round(p[0] - bounds.min[0]), Math.round(p[1] - bounds.min[1])))
  }
  const simplifiedPolygon = simplifyPolygon(normalizedPolygon, 0.1)

  const dimStr = sortedSize.join('x')
  const isRect = isAxisAlignedRect(simplifiedPolygon) && simplifyRect
  const partId = (isRect ? dimStr : `${dimStr}:${canonicalPolygonKey(simplifiedPolygon.points)}`) as PartId

  return {
    partId,
    type,
    description,
    size: vec3.fromValues(sortedSize[0], sortedSize[1], sortedSize[2]),
    polygon: isRect ? undefined : normalizedPolygon,
    polygonPlane: isRect ? undefined : newPlane
  }
}

export interface MaterialParts {
  material: MaterialId
  totalQuantity: number
  totalVolume: Volume
  totalArea?: Length
  totalLength?: Length
  parts: Record<PartId, MaterialPartItem>
  usages: Record<PartId, MaterialPartItem>
}

export interface PartItem {
  partId: PartId
  type: string
  description?: string
  label: string // A, B, C, ...
  size: vec3
  elements: ConstructionElementId[]
  quantity: number
}

export interface MaterialPartItem extends PartItem {
  material: MaterialId
  totalVolume: Volume
  area?: Length
  totalArea?: Length
  length?: Length
  totalLength?: Length
  crossSection?: CrossSection
  thickness?: Length
  strawCategory?: StrawCategory
  polygon?: Polygon2D
  polygonPlane?: Plane3D
  issue?: PartIssue
}

export interface MaterialUsage {
  key: string
  type: string
  label: string // A, B, C, ...
  totalVolume: Volume
  totalArea?: Area
}

export type MaterialPartsList = Record<MaterialId, MaterialParts>
export type VirtualPartsList = Record<PartId, PartItem>

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

export type PartIssue = 'CrossSectionMismatch' | 'LengthExceedsAvailable' | 'ThicknessMismatch' | 'SheetSizeExceeded'

type StrawCategory = 'full' | 'partial' | 'flakes' | 'stuffed'

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
  let areaSize: vec2

  if (thicknessIndex === -1) {
    issue = 'ThicknessMismatch'
    thickness = dimensions[0]
    areaSize = vec2.fromValues(dimensions[1], dimensions[2])
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
    areaSize = vec2.fromValues(remainingDimensions[0], remainingDimensions[1])
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

    const { material, partInfo, id } = element
    const elementTags = [...tags, ...(element.tags ?? [])]

    if (partInfo && excludeTypes?.some(t => t === partInfo.type)) return

    const materialEntry = ensureMaterialEntry(material)

    if (partInfo) {
      processPart(partInfo, materialEntry, id, labelCounters, elementTags)
      const mp = getPartInfoFromManifold(element.shape.manifold)
      if (!mp.id.startsWith('cuboid')) {
        console.log(partInfo, mp)
      }
    } else {
      processConstructionElement(element, elementTags, materialEntry, labelCounters)
    }
  }

  for (const element of model.elements) {
    processElement(element, [])
  }

  return partsList
}

export const generateVirtualPartsList = (model: ConstructionModel): VirtualPartsList => {
  const partsList: VirtualPartsList = {}
  let labelCounter = 0

  const processElement = (element: ConstructionModel['elements'][number]) => {
    if (!('children' in element)) return

    for (const child of element.children) {
      processElement(child)
    }

    const { partInfo, id } = element

    if (!partInfo) return

    const partId = partInfo.partId
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
      size: vec3.clone(partInfo.size),
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
  partInfo: PartInfo,
  materialEntry: MaterialParts,
  id: ConstructionElementId,
  labelCounters: Map<MaterialId, number>,
  tags: Tag[]
) {
  const materialDefinition = getMaterialById(materialEntry.material)
  const isStrawbaleMaterial = materialDefinition?.type === 'strawbale'

  let partId: PartId = partInfo.partId
  let strawCategory: StrawCategory | undefined

  if (isStrawbaleMaterial) {
    strawCategory = getStrawCategoryFromTags(tags)
    partId = `strawbale:${strawCategory}` as PartId
  }

  const existingPart = materialEntry.parts[partId]

  const size = partInfo.size
  const volume = computeVolume(size)

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
    if (partInfo.polygon) {
      area = calculatePolygonArea(partInfo.polygon)
    } else {
      area = details.areaSize[0] * details.areaSize[1]
    }
    issue = details.issue
    thickness = details.thickness
  } else if (materialDefinition?.type === 'volume') {
    if (partInfo.polygon) {
      area = calculatePolygonArea(partInfo.polygon)
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
    polygon: partInfo.polygon,
    polygonPlane: partInfo.polygonPlane,
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
  const polygonPlane = baseShape?.plane
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
    polygon: polygon?.outer,
    polygonPlane,
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
