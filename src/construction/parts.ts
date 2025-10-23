import { vec2, vec3 } from 'gl-matrix'

import type { ConstructionElementId } from '@/construction/elements'
import type { MaterialId } from '@/construction/materials/material'
import { getMaterialById } from '@/construction/materials/store'
import type { ConstructionModel } from '@/construction/model'
import type { Length, Plane3D, Polygon2D, Volume } from '@/shared/geometry'
import { boundsFromPoints, canonicalPolygonKey, minimumAreaBoundingBox } from '@/shared/geometry'

export type PartId = string & { readonly brand: unique symbol }

export interface PartInfo {
  partId: PartId
  type: string
  size: vec3 // Dimensions in millimeters, sorted from smallest to largest
  polygon?: Polygon2D // Normalized within the bounding box defined by width and length
  polygonPlane?: Plane3D // The plane of the polygon relative to the sorted size
}

export const dimensionalPartInfo = (type: string, size: vec3): PartInfo => {
  const sortedDimensions = Array.from(size)
    .map(Math.round)
    .sort((a, b) => a - b)
  const partId = sortedDimensions.join('x') as PartId
  return { partId, type, size: vec3.fromValues(sortedDimensions[0], sortedDimensions[1], sortedDimensions[2]) }
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

export const polygonPartInfo = (type: string, polygon: Polygon2D, plane: Plane3D, thickness: Length): PartInfo => {
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
  const bounds = boundsFromPoints(flippedPoints)
  const normalizedPolygon: Polygon2D = {
    points: flippedPoints.map(p => vec2.fromValues(Math.round(p[0] - bounds.min[0]), Math.round(p[1] - bounds.min[1])))
  }

  const dimStr = sortedSize.join('x')
  const isRect = isAxisAlignedRect(normalizedPolygon)
  const partId = (isRect ? dimStr : `${dimStr}:${canonicalPolygonKey(normalizedPolygon.points)}`) as PartId

  return {
    partId,
    type,
    size: vec3.fromValues(sortedSize[0], sortedSize[1], sortedSize[2]),
    polygon: isRect ? undefined : normalizedPolygon,
    polygonPlane: isRect ? undefined : newPlane
  }
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
  polygon?: Polygon2D
  polygonPlane?: Plane3D
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

  const length = dimensions[indices.length === 1 ? indices[0] : 2]

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
      issue,
      polygon: partInfo.polygon,
      polygonPlane: partInfo.polygonPlane
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
