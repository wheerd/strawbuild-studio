import { vec3 } from 'gl-matrix'

import type { ConstructionElementId } from '@/construction/elements'
import type { MaterialId } from '@/construction/materials/material'
import { getMaterialById } from '@/construction/materials/store'
import type { ConstructionModel } from '@/construction/model'
import type { Length, Polygon2D, Volume } from '@/shared/geometry'

export type PartId = string & { readonly brand: unique symbol }

export interface PartInfo {
  partId: PartId
  type: string
  size: vec3 // Thickness, width, length sorted from smallest to largest
  polygon?: Polygon2D // Normalized within the bounding box defined by width and length
}

export const dimensionalPartInfo = (type: string, size: vec3): PartInfo => {
  const sortedDimensions = Array.from(size)
    .map(Math.round)
    .sort((a, b) => a - b)
  const partId = sortedDimensions.join('x') as PartId
  return { partId, type, size: vec3.fromValues(sortedDimensions[0], sortedDimensions[1], sortedDimensions[2]) }
}

export interface MaterialParts {
  material: MaterialId
  totalQuantity: number
  totalVolume: Volume
  totalLength?: Length
  parts: Record<PartId, PartItem>
}

export interface PartItem {
  partId: PartId
  type: string
  label: string // A, B, C, ...
  material: MaterialId
  size: vec3
  elements: ConstructionElementId[]
  totalVolume: Volume
  length?: Length
  totalLength?: Length
  quantity: number
  issue?: PartIssue
}

export type PartsList = Record<MaterialId, MaterialParts>

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

export type PartIssue = 'CrossSectionMismatch' | 'LengthExceedsAvailable'

const computeDimensionalDetails = (size: vec3, availableLengths: Length[], width: Length, thickness: Length) => {
  const dimensions = Array.from(size) as [number, number, number]
  const indices = [0, 1, 2]
  const materialWidth = Math.round(width)
  const materialThickness = Math.round(thickness)

  const findMatchingIndex = (target: number): number => {
    for (let i = 0; i < indices.length; i++) {
      if (dimensions[indices[i]] === target) {
        indices.splice(i, 1)
        return i
      }
    }
    return -1
  }

  const widthIndex = findMatchingIndex(materialWidth)
  const thicknessIndex = findMatchingIndex(materialThickness)
  let issue: PartIssue | undefined

  if (widthIndex === -1 || thicknessIndex === -1) {
    issue = 'CrossSectionMismatch'
  }

  let length: Length | undefined
  length = dimensions[indices.length === 1 ? indices[0] : 2]

  if (!issue && availableLengths.length > 0) {
    const maxAvailableLength = Math.round(Math.max(...availableLengths))
    if (length > maxAvailableLength) {
      issue = 'LengthExceedsAvailable'
    }
  }

  return { length, issue }
}

export const generatePartsList = (model: ConstructionModel): PartsList => {
  const partsList: PartsList = {}
  const labelCounters = new Map<MaterialId, number>()

  const ensureMaterialEntry = (materialId: MaterialId): MaterialParts => {
    let entry = partsList[materialId]
    if (!entry) {
      entry = {
        material: materialId,
        totalQuantity: 0,
        totalVolume: 0,
        parts: {}
      }
      partsList[materialId] = entry
    }
    return entry
  }

  const processElement = (element: ConstructionModel['elements'][number]) => {
    if ('children' in element) {
      for (const child of element.children) {
        processElement(child)
      }
      return
    }

    const { material, partInfo, id } = element

    if (!partInfo) return

    const materialEntry = ensureMaterialEntry(material)
    const partId = partInfo.partId
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

      return
    }

    const materialDefinition = getMaterialById(material)
    let length: Length | undefined
    let issue: PartIssue | undefined

    if (materialDefinition?.type === 'dimensional') {
      const details = computeDimensionalDetails(
        size,
        materialDefinition.availableLengths,
        materialDefinition.width,
        materialDefinition.thickness
      )
      length = details.length
      issue = details.issue
    }

    const labelIndex = labelCounters.get(material) ?? 0
    const label = indexToLabel(labelIndex)
    labelCounters.set(material, labelIndex + 1)

    const partItem: PartItem = {
      partId,
      type: partInfo.type,
      label,
      material,
      size: vec3.clone(size),
      elements: [id],
      totalVolume: volume,
      quantity: 1,
      issue
    }

    if (length !== undefined) {
      partItem.length = length
      partItem.totalLength = length
      materialEntry.totalLength = (materialEntry.totalLength ?? 0) + length
    }

    materialEntry.parts[partId] = partItem
    materialEntry.totalQuantity += 1
    materialEntry.totalVolume += volume
  }

  for (const element of model.elements) {
    processElement(element)
  }

  return partsList
}
