import { vec3 } from 'gl-matrix'

import type { MaterialId } from '@/construction/materials/material'
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
    .sort((a, b) => b - a)
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
  label: string
  material: MaterialId
  size: vec3
  totalVolume: Volume
  length?: Length
  totalLength?: Length
  quantity: number
}

export type PartsList = Record<MaterialId, MaterialParts>

export const generatePartsList = (_model: ConstructionModel): PartsList => {
  throw new Error('Not implemented yet')
}
