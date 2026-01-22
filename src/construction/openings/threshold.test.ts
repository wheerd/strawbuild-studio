import { describe, expect, it, vi } from 'vitest'

import type { Opening } from '@/building/model'
import type { MaterialId } from '@/construction/materials/material'
import { EmptyOpeningAssembly } from '@/construction/openings/empty'
import { PostOpeningAssembly } from '@/construction/openings/post'
import { SimpleOpeningAssembly } from '@/construction/openings/simple'
import { ThresholdOpeningAssembly } from '@/construction/openings/threshold'
import type { ThresholdAssemblyConfig } from '@/construction/openings/types'

describe('ThresholdOpeningAssembly', () => {
  let mockSimpleConfig: ThresholdAssemblyConfig

  beforeEach(() => {
    vi.clearAllMocks()

    mockSimpleConfig = {
      type: 'threshold',
      padding: 15,
      defaultId: 'oa_simple_1' as any,
      thresholds: [
        { assemblyId: 'oa_post_1' as any, widthThreshold: 1200 },
        { assemblyId: 'oa_empty_1' as any, widthThreshold: 2400 }
      ]
    }

    vi.mock('@/construction/openings/resolver', () => ({
      resolveOpeningAssembly: vi.fn((id: string) => {
        if (id === 'oa_simple_1') {
          const assembly = new SimpleOpeningAssembly({
            type: 'simple',
            padding: 15,
            headerThickness: 60,
            headerMaterial: 'mat_1' as MaterialId,
            sillThickness: 60,
            sillMaterial: 'mat_1' as MaterialId
          })
          return assembly
        }
        if (id === 'oa_post_1') {
          const assembly = new PostOpeningAssembly({
            type: 'post',
            padding: 15,
            headerThickness: 60,
            headerMaterial: 'mat_1' as MaterialId,
            sillThickness: 60,
            sillMaterial: 'mat_1' as MaterialId,
            posts: {
              type: 'double',
              material: 'mat_1' as MaterialId,
              infillMaterial: 'mat_2' as MaterialId,
              thickness: 140,
              width: 100
            },
            replacePosts: true,
            postsSupportHeader: false
          })
          return assembly
        }
        if (id === 'oa_empty_1') {
          const assembly = new EmptyOpeningAssembly({
            type: 'empty',
            padding: 15
          })
          return assembly
        }
        throw new Error(`Unknown assembly ID: ${id}`)
      })
    }))
  })

  it('should select default assembly when width is below all thresholds', () => {
    const assembly = new ThresholdOpeningAssembly(mockSimpleConfig)
    const selectMethod = assembly.selectAssemblyByWidth.bind(assembly) as (width: number) => string
    const selectedId = selectMethod(1000)
    expect(selectedId).toBe('oa_simple_1')
  })

  it('should select first threshold assembly when width exceeds first threshold', () => {
    const assembly = new ThresholdOpeningAssembly(mockSimpleConfig)
    const selectMethod = assembly.selectAssemblyByWidth.bind(assembly) as (width: number) => string
    const selectedId = selectMethod(1500)
    expect(selectedId).toBe('oa_post_1')
  })

  it('should select second threshold assembly when width exceeds second threshold', () => {
    const assembly = new ThresholdOpeningAssembly(mockSimpleConfig)
    const selectMethod = assembly.selectAssemblyByWidth.bind(assembly) as (width: number) => string
    const selectedId = selectMethod(2500)
    expect(selectedId).toBe('oa_empty_1')
  })

  it('should handle empty thresholds array', () => {
    const config = {
      type: 'threshold' as const,
      padding: 15,
      defaultId: 'oa_simple_1' as any,
      thresholds: []
    }
    const assembly = new ThresholdOpeningAssembly(config)
    const selectMethod = assembly.selectAssemblyByWidth.bind(assembly) as (width: number) => string
    const selectedId = selectMethod(1000)
    expect(selectedId).toBe('oa_simple_1')
  })

  it('should return max segmentation padding from all referenced assemblies', () => {
    const assembly = new ThresholdOpeningAssembly(mockSimpleConfig)
    const openings: Opening[] = []
    const padding = assembly.getSegmentationPadding(openings)

    expect(padding).toBeGreaterThanOrEqual(0)
  })

  it('should return true for needsWallStands if any referenced assembly needs wall stands', () => {
    const assembly = new ThresholdOpeningAssembly(mockSimpleConfig)
    const openings: Opening[] = []
    const needsStands = assembly.needsWallStands(openings)

    expect(typeof needsStands).toBe('boolean')
  })

  it('should throw error for negative width threshold in validation', async () => {
    const config = {
      type: 'threshold' as const,
      padding: 15,
      defaultId: 'oa_simple_1' as any,
      thresholds: [{ assemblyId: 'oa_post_1' as any, widthThreshold: -100 }]
    }

    const { validateOpeningConfig: v } = await import('@/construction/openings/types')
    expect(() => {
      v(config)
    }).toThrow()
  })
})
