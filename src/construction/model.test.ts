import { vec2, vec3 } from 'gl-matrix'
import { describe, expect, it } from 'vitest'

import { Bounds3D } from '@/shared/geometry'

import type { ConstructionElementId } from './elements'
import { type ConstructionModel, mergeModels, transformModel } from './model'

describe('mergeModels', () => {
  it('should remove areas with duplicate cancelKeys', () => {
    const model1: ConstructionModel = {
      elements: [],
      measurements: [],
      areas: [
        {
          type: 'polygon',
          areaType: 'corner',
          renderPosition: 'top',
          plane: 'xz',
          polygon: { points: [vec2.fromValues(0, 0), vec2.fromValues(1, 0), vec2.fromValues(1, 1)] },
          cancelKey: 'corner-1'
        }
      ],
      errors: [],
      warnings: [],
      bounds: Bounds3D.fromMinMax(vec3.fromValues(0, 0, 0), vec3.fromValues(1, 1, 1))
    }

    const model2: ConstructionModel = {
      elements: [],
      measurements: [],
      areas: [
        {
          type: 'polygon',
          areaType: 'corner',
          renderPosition: 'top',
          plane: 'xz',
          polygon: { points: [vec2.fromValues(2, 0), vec2.fromValues(3, 0), vec2.fromValues(3, 1)] },
          cancelKey: 'corner-1'
        }
      ],
      errors: [],
      warnings: [],
      bounds: Bounds3D.fromMinMax(vec3.fromValues(0, 0, 0), vec3.fromValues(1, 1, 1))
    }

    const merged = mergeModels(model1, model2)

    expect(merged.areas).toHaveLength(0)
  })

  it('should keep areas without cancelKey', () => {
    const model1: ConstructionModel = {
      elements: [],
      measurements: [],
      areas: [
        {
          type: 'polygon',
          areaType: 'corner',
          renderPosition: 'top',
          plane: 'xz',
          polygon: { points: [vec2.fromValues(0, 0), vec2.fromValues(1, 0), vec2.fromValues(1, 1)] }
        }
      ],
      errors: [],
      warnings: [],
      bounds: Bounds3D.fromMinMax(vec3.fromValues(0, 0, 0), vec3.fromValues(1, 1, 1))
    }

    const model2: ConstructionModel = {
      elements: [],
      measurements: [],
      areas: [
        {
          type: 'polygon',
          areaType: 'corner',
          renderPosition: 'top',
          plane: 'xz',
          polygon: { points: [vec2.fromValues(2, 0), vec2.fromValues(3, 0), vec2.fromValues(3, 1)] }
        }
      ],
      errors: [],
      warnings: [],
      bounds: Bounds3D.fromMinMax(vec3.fromValues(0, 0, 0), vec3.fromValues(1, 1, 1))
    }

    const merged = mergeModels(model1, model2)

    expect(merged.areas).toHaveLength(2)
  })

  it('should handle mix of areas with and without cancelKey', () => {
    const model1: ConstructionModel = {
      elements: [],
      measurements: [],
      areas: [
        {
          type: 'polygon',
          areaType: 'corner',
          renderPosition: 'top',
          plane: 'xz',
          polygon: { points: [vec2.fromValues(0, 0), vec2.fromValues(1, 0), vec2.fromValues(1, 1)] },
          cancelKey: 'corner-1'
        },
        {
          type: 'polygon',
          areaType: 'window',
          renderPosition: 'top',
          plane: 'xz',
          polygon: { points: [vec2.fromValues(0, 0), vec2.fromValues(1, 0), vec2.fromValues(1, 1)] }
        }
      ],
      errors: [],
      warnings: [],
      bounds: Bounds3D.fromMinMax(vec3.fromValues(0, 0, 0), vec3.fromValues(1, 1, 1))
    }

    const model2: ConstructionModel = {
      elements: [],
      measurements: [],
      areas: [
        {
          type: 'polygon',
          areaType: 'corner',
          renderPosition: 'top',
          plane: 'xz',
          polygon: { points: [vec2.fromValues(2, 0), vec2.fromValues(3, 0), vec2.fromValues(3, 1)] },
          cancelKey: 'corner-1'
        }
      ],
      errors: [],
      warnings: [],
      bounds: Bounds3D.fromMinMax(vec3.fromValues(0, 0, 0), vec3.fromValues(1, 1, 1))
    }

    const merged = mergeModels(model1, model2)

    expect(merged.areas).toHaveLength(1)
    expect(merged.areas.filter(a => a.cancelKey === 'corner-1')).toHaveLength(0)
    expect(merged.areas.filter(a => a.areaType === 'window')).toHaveLength(1)
  })

  it('should keep areas with unique cancelKeys', () => {
    const model1: ConstructionModel = {
      elements: [],
      measurements: [],
      areas: [
        {
          type: 'polygon',
          areaType: 'corner',
          renderPosition: 'top',
          plane: 'xz',
          polygon: { points: [vec2.fromValues(0, 0), vec2.fromValues(1, 0), vec2.fromValues(1, 1)] },
          cancelKey: 'corner-1'
        }
      ],
      errors: [],
      warnings: [],
      bounds: Bounds3D.fromMinMax(vec3.fromValues(0, 0, 0), vec3.fromValues(1, 1, 1))
    }

    const model2: ConstructionModel = {
      elements: [],
      measurements: [],
      areas: [
        {
          type: 'polygon',
          areaType: 'corner',
          renderPosition: 'top',
          plane: 'xz',
          polygon: { points: [vec2.fromValues(2, 0), vec2.fromValues(3, 0), vec2.fromValues(3, 1)] },
          cancelKey: 'corner-2'
        }
      ],
      errors: [],
      warnings: [],
      bounds: Bounds3D.fromMinMax(vec3.fromValues(0, 0, 0), vec3.fromValues(1, 1, 1))
    }

    const merged = mergeModels(model1, model2)

    expect(merged.areas).toHaveLength(2)
    expect(merged.areas.filter(a => a.cancelKey === 'corner-1')).toHaveLength(1)
    expect(merged.areas.filter(a => a.cancelKey === 'corner-2')).toHaveLength(1)
  })

  it('deduplicates warnings by groupKey when merging models', () => {
    const warningA = {
      description: 'duplicate warning',
      elements: ['ce_warning_a' as ConstructionElementId],
      groupKey: 'shared-warning'
    }
    const warningB = {
      description: 'duplicate warning',
      elements: ['ce_warning_b' as ConstructionElementId],
      groupKey: 'shared-warning'
    }

    const model1: ConstructionModel = {
      elements: [],
      measurements: [],
      areas: [],
      errors: [],
      warnings: [warningA],
      bounds: Bounds3D.fromMinMax(vec3.fromValues(0, 0, 0), vec3.fromValues(1, 1, 1))
    }

    const model2: ConstructionModel = {
      elements: [],
      measurements: [],
      areas: [],
      errors: [],
      warnings: [warningB],
      bounds: Bounds3D.fromMinMax(vec3.fromValues(1, 1, 1), vec3.fromValues(2, 2, 2))
    }

    const merged = mergeModels(model1, model2)

    expect(merged.warnings).toHaveLength(1)
    expect(merged.warnings[0].elements).toEqual(['ce_warning_a', 'ce_warning_b'])
  })

  it('deduplicates errors across models and merges element ids', () => {
    const errorA = {
      description: 'duplicate error',
      elements: ['ce_error_a' as ConstructionElementId, 'ce_error_b' as ConstructionElementId],
      groupKey: 'shared-error'
    }
    const errorB = {
      description: 'duplicate error',
      elements: ['ce_error_b' as ConstructionElementId, 'ce_error_c' as ConstructionElementId],
      groupKey: 'shared-error'
    }

    const model1: ConstructionModel = {
      elements: [],
      measurements: [],
      areas: [],
      errors: [errorA],
      warnings: [],
      bounds: Bounds3D.fromMinMax(vec3.fromValues(0, 0, 0), vec3.fromValues(1, 1, 1))
    }

    const model2: ConstructionModel = {
      elements: [],
      measurements: [],
      areas: [],
      errors: [errorB],
      warnings: [],
      bounds: Bounds3D.fromMinMax(vec3.fromValues(1, 1, 1), vec3.fromValues(2, 2, 2))
    }

    const merged = mergeModels(model1, model2)

    expect(merged.errors).toHaveLength(1)
    expect(merged.errors[0].elements).toEqual(['ce_error_a', 'ce_error_b', 'ce_error_c'])
  })
})

describe('transformModel', () => {
  it('should transform polygon areas', () => {
    const model: ConstructionModel = {
      elements: [],
      measurements: [],
      areas: [
        {
          type: 'polygon',
          areaType: 'corner',
          renderPosition: 'top',
          plane: 'xz',
          polygon: { points: [vec2.fromValues(0, 0), vec2.fromValues(1, 0), vec2.fromValues(1, 1)] }
        }
      ],
      errors: [],
      warnings: [],
      bounds: Bounds3D.fromMinMax(vec3.fromValues(0, 0, 0), vec3.fromValues(1, 1, 1))
    }

    const transformed = transformModel(model, {
      position: vec3.fromValues(10, 0, 0),
      rotation: vec3.fromValues(0, 0, 0)
    })

    expect(transformed.areas).toHaveLength(1)
    const area = transformed.areas[0]
    if (area.type === 'polygon') {
      expect(area.polygon.points[0][0]).toBe(10)
      expect(area.polygon.points[1][0]).toBe(11)
    }
  })

  it('should transform cuboid areas by composing transforms', () => {
    const model: ConstructionModel = {
      elements: [],
      measurements: [],
      areas: [
        {
          type: 'cuboid',
          areaType: 'corner',
          renderPosition: 'top',
          transform: { position: vec3.fromValues(5, 0, 0), rotation: vec3.fromValues(0, 0, 0) },
          bounds: Bounds3D.fromMinMax(vec3.fromValues(0, 0, 0), vec3.fromValues(1, 1, 1))
        }
      ],
      errors: [],
      warnings: [],
      bounds: Bounds3D.fromMinMax(vec3.fromValues(0, 0, 0), vec3.fromValues(1, 1, 1))
    }

    const transformed = transformModel(model, {
      position: vec3.fromValues(10, 0, 0),
      rotation: vec3.fromValues(0, 0, 0)
    })

    expect(transformed.areas).toHaveLength(1)
    const area = transformed.areas[0]
    if (area.type === 'cuboid') {
      expect(area.transform.position[0]).toBe(15)
    }
  })

  it('should transform cut areas', () => {
    const model: ConstructionModel = {
      elements: [],
      measurements: [],
      areas: [
        {
          type: 'cut',
          areaType: 'corner',
          renderPosition: 'top',
          axis: 'x',
          position: 5
        }
      ],
      errors: [],
      warnings: [],
      bounds: Bounds3D.fromMinMax(vec3.fromValues(0, 0, 0), vec3.fromValues(1, 1, 1))
    }

    const transformed = transformModel(model, {
      position: vec3.fromValues(10, 0, 0),
      rotation: vec3.fromValues(0, 0, 0)
    })

    expect(transformed.areas).toHaveLength(1)
    const area = transformed.areas[0]
    if (area.type === 'cut') {
      expect(area.position).toBe(15)
    }
  })
})

describe('mergeKey functionality', () => {
  it('should merge cuboid areas with same mergeKey', () => {
    const model1: ConstructionModel = {
      elements: [],
      measurements: [],
      areas: [
        {
          type: 'cuboid',
          areaType: 'floor-level',
          renderPosition: 'bottom',
          transform: { position: vec3.fromValues(0, 0, 0), rotation: vec3.fromValues(0, 0, 0) },
          bounds: Bounds3D.fromMinMax(vec3.fromValues(0, 0, 0), vec3.fromValues(10, 10, 1)),
          mergeKey: 'floor-1'
        }
      ],
      errors: [],
      warnings: [],
      bounds: Bounds3D.fromMinMax(vec3.fromValues(0, 0, 0), vec3.fromValues(10, 10, 1))
    }

    const model2: ConstructionModel = {
      elements: [],
      measurements: [],
      areas: [
        {
          type: 'cuboid',
          areaType: 'floor-level',
          renderPosition: 'bottom',
          transform: { position: vec3.fromValues(0, 0, 0), rotation: vec3.fromValues(0, 0, 0) },
          bounds: Bounds3D.fromMinMax(vec3.fromValues(10, 0, 0), vec3.fromValues(20, 10, 1)),
          mergeKey: 'floor-1'
        }
      ],
      errors: [],
      warnings: [],
      bounds: Bounds3D.fromMinMax(vec3.fromValues(10, 0, 0), vec3.fromValues(20, 10, 1))
    }

    const merged = mergeModels(model1, model2)

    expect(merged.areas).toHaveLength(1)
    const area = merged.areas[0]
    if (area.type === 'cuboid') {
      expect(area.bounds.min[0]).toBe(0)
      expect(area.bounds.max[0]).toBe(20)
      expect(area.mergeKey).toBe('floor-1')
    }
  })

  it('should keep cuboid areas with unique mergeKeys', () => {
    const model1: ConstructionModel = {
      elements: [],
      measurements: [],
      areas: [
        {
          type: 'cuboid',
          areaType: 'floor-level',
          renderPosition: 'bottom',
          transform: { position: vec3.fromValues(0, 0, 0), rotation: vec3.fromValues(0, 0, 0) },
          bounds: Bounds3D.fromMinMax(vec3.fromValues(0, 0, 0), vec3.fromValues(10, 10, 1)),
          mergeKey: 'floor-1'
        }
      ],
      errors: [],
      warnings: [],
      bounds: Bounds3D.fromMinMax(vec3.fromValues(0, 0, 0), vec3.fromValues(10, 10, 1))
    }

    const model2: ConstructionModel = {
      elements: [],
      measurements: [],
      areas: [
        {
          type: 'cuboid',
          areaType: 'floor-level',
          renderPosition: 'bottom',
          transform: { position: vec3.fromValues(0, 0, 0), rotation: vec3.fromValues(0, 0, 0) },
          bounds: Bounds3D.fromMinMax(vec3.fromValues(10, 0, 0), vec3.fromValues(20, 10, 1)),
          mergeKey: 'floor-2'
        }
      ],
      errors: [],
      warnings: [],
      bounds: Bounds3D.fromMinMax(vec3.fromValues(10, 0, 0), vec3.fromValues(20, 10, 1))
    }

    const merged = mergeModels(model1, model2)

    expect(merged.areas).toHaveLength(2)
    expect(merged.areas.filter(a => a.mergeKey === 'floor-1')).toHaveLength(1)
    expect(merged.areas.filter(a => a.mergeKey === 'floor-2')).toHaveLength(1)
  })

  it('should deduplicate cut areas with same mergeKey', () => {
    const model1: ConstructionModel = {
      elements: [],
      measurements: [],
      areas: [
        {
          type: 'cut',
          areaType: 'corner',
          renderPosition: 'top',
          axis: 'x',
          position: 100,
          mergeKey: 'cut-x-100'
        }
      ],
      errors: [],
      warnings: [],
      bounds: Bounds3D.fromMinMax(vec3.fromValues(0, 0, 0), vec3.fromValues(1, 1, 1))
    }

    const model2: ConstructionModel = {
      elements: [],
      measurements: [],
      areas: [
        {
          type: 'cut',
          areaType: 'corner',
          renderPosition: 'top',
          axis: 'x',
          position: 100,
          mergeKey: 'cut-x-100'
        }
      ],
      errors: [],
      warnings: [],
      bounds: Bounds3D.fromMinMax(vec3.fromValues(0, 0, 0), vec3.fromValues(1, 1, 1))
    }

    const merged = mergeModels(model1, model2)

    expect(merged.areas).toHaveLength(1)
    expect(merged.areas[0].mergeKey).toBe('cut-x-100')
  })
})
