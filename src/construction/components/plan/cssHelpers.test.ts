import { describe, expect, it } from 'vitest'

import type { ConstructionElement, ConstructionGroup } from '@/construction/elements'
import type { MaterialId } from '@/construction/materials/material'
import { Bounds3D, IDENTITY } from '@/shared/geometry'

import { getConstructionElementClasses } from './cssHelpers'

describe('getConstructionElementClasses', () => {
  it('should generate correct classes for element with material and tags', () => {
    const element: ConstructionElement = {
      id: 'test-id' as any,
      material: 'wood' as MaterialId,
      transform: IDENTITY,
      bounds: Bounds3D.EMPTY,
      shape: { type: 'cuboid', bounds: Bounds3D.EMPTY } as any,
      tags: [
        { id: 'wall-part_post', label: 'Post', category: 'wall-part' },
        { id: 'construction_top-plate', label: 'Top Plate', category: 'construction' }
      ]
    }

    const result = getConstructionElementClasses(element)

    expect(result).toBe(
      'tag__wall-part_post tag-cat__wall-part tag__construction_top-plate tag-cat__construction wood construction-element'
    )
  })

  it('should generate correct classes for group with tags but no material', () => {
    const group: ConstructionGroup = {
      id: 'test-group-id' as any,
      transform: IDENTITY,
      bounds: Bounds3D.EMPTY,
      children: [],
      tags: [{ id: 'construction_walls', label: 'Walls', category: 'construction' }]
    }

    const result = getConstructionElementClasses(group)

    expect(result).toBe('tag__construction_walls tag-cat__construction construction-group')
  })

  it('should include cut class when aboveCut returns true', () => {
    const element: ConstructionElement = {
      id: 'test-id' as any,
      material: 'straw' as MaterialId,
      transform: IDENTITY,
      bounds: Bounds3D.EMPTY,
      shape: { type: 'cuboid', bounds: Bounds3D.EMPTY } as any
    }

    const aboveCut = () => true

    const result = getConstructionElementClasses(element, aboveCut)

    expect(result).toBe('straw construction-element above-cut')
  })

  it('should include additional className when provided', () => {
    const element: ConstructionElement = {
      id: 'test-id' as any,
      material: 'concrete' as MaterialId,
      transform: IDENTITY,
      bounds: Bounds3D.EMPTY,
      shape: { type: 'cuboid', bounds: Bounds3D.EMPTY } as any
    }

    const result = getConstructionElementClasses(element, undefined, 'custom-class')

    expect(result).toBe('custom-class concrete construction-element')
  })

  it('should handle element with no tags or additional classes', () => {
    const element: ConstructionElement = {
      id: 'test-id' as any,
      material: 'steel' as MaterialId,
      transform: IDENTITY,
      bounds: Bounds3D.EMPTY,
      shape: { type: 'cuboid', bounds: Bounds3D.EMPTY } as any
    }

    const result = getConstructionElementClasses(element)

    expect(result).toBe('steel construction-element')
  })

  it('should handle group with no tags', () => {
    const group: ConstructionGroup = {
      id: 'test-group-id' as any,
      transform: IDENTITY,
      bounds: Bounds3D.EMPTY,
      children: []
    }

    const result = getConstructionElementClasses(group)

    expect(result).toBe('construction-group')
  })
})
