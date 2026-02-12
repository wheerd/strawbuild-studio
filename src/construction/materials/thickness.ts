import type { Namespace, TFunction } from 'i18next'

import type { Length } from '@/shared/geometry'

import type { Material } from './material'

export interface ThicknessRange {
  min: Length
  max?: Length
}

export function getMaterialThickness(material: Material): ThicknessRange {
  switch (material.type) {
    case 'sheet':
      if (material.thicknesses.length === 0) {
        return { min: 0, max: undefined }
      }
      return { min: Math.min(...material.thicknesses), max: Math.max(...material.thicknesses) }
    case 'prefab':
      return { min: material.minThickness, max: material.maxThickness }
    case 'strawbale':
      return { min: material.baleWidth, max: material.baleWidth }
    default:
      return { min: 0, max: undefined }
  }
}

export function addThickness(range: ThicknessRange | undefined, thickness: Length): ThicknessRange {
  return range != null
    ? { min: range.min + thickness, max: range.max != null ? range.max + thickness : undefined }
    : { min: thickness }
}

export function formatThicknessRange<NS extends Namespace>(range: ThicknessRange, t: TFunction<NS>): string {
  if (range.max === undefined) {
    return t($ => $.thicknessRange.minOnly, {
      min: range.min,
      ns: 'common',
      defaultValue: '{{min, length}} + ?'
    })
  }

  if (range.min === range.max) {
    return t($ => $.thicknessRange.single, {
      single: range.min,
      ns: 'common',
      defaultValue: '{{single, length}}'
    })
  }

  return t($ => $.thicknessRange.range, {
    min: range.min,
    max: range.max,
    ns: 'common',
    defaultValue: '{{min, length}} - {{max, length}}'
  })
}
