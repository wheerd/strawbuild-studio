import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Opening } from '@/building/model'
import { resolveOpeningAssembly } from '@/construction/openings/resolver'
import { ThresholdOpeningAssembly } from '@/construction/openings/threshold'
import type { OpeningAssembly, ThresholdAssemblyConfig } from '@/construction/openings/types'
import { partial } from '@/test/helpers'

class TestThresholdOpeningAssembly extends ThresholdOpeningAssembly {
  public selectAssemblyByWidth(openings: Opening[]): OpeningAssembly {
    return super.selectAssemblyByWidth(openings)
  }
}

vi.mock('@/construction/openings/resolver', () => ({
  resolveOpeningAssembly: vi.fn()
}))

const mockResolveOpeningAssembly = vi.mocked(resolveOpeningAssembly)

describe('ThresholdOpeningAssembly', () => {
  let mockSimpleConfig: ThresholdAssemblyConfig
  const assembly1 = partial<OpeningAssembly>({})
  const assembly2 = partial<OpeningAssembly>({})
  const assembly3 = partial<OpeningAssembly>({})

  const mockOpening = (width: number) => partial<Opening>({ width })

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

    mockResolveOpeningAssembly.mockImplementation(id => {
      if (id === 'oa_simple_1') {
        return assembly1
      }
      if (id === 'oa_post_1') {
        return assembly2
      }
      if (id === 'oa_empty_1') {
        return assembly3
      }
      throw new Error(`Unknown assembly ID: ${id}`)
    })
  })

  it('should select default assembly when total width is below all thresholds', () => {
    const assembly = new TestThresholdOpeningAssembly(mockSimpleConfig)
    const selectedAssembly = assembly.selectAssemblyByWidth([mockOpening(800)])
    expect(selectedAssembly).toBe(assembly1)
  })

  it('should select first threshold assembly when total width exceeds first threshold', () => {
    const assembly = new TestThresholdOpeningAssembly(mockSimpleConfig)
    const selectedAssembly = assembly.selectAssemblyByWidth([mockOpening(1500)])
    expect(selectedAssembly).toBe(assembly2)
  })

  it('should select second threshold assembly when total width exceeds second threshold', () => {
    const assembly = new TestThresholdOpeningAssembly(mockSimpleConfig)
    const selectedAssembly = assembly.selectAssemblyByWidth([mockOpening(2500)])
    expect(selectedAssembly).toBe(assembly3)
  })

  it('should handle empty thresholds array', () => {
    const config = {
      type: 'threshold' as const,
      padding: 15,
      defaultId: 'oa_simple_1' as any,
      thresholds: []
    }
    const assembly = new TestThresholdOpeningAssembly(config)
    const selectedAssembly = assembly.selectAssemblyByWidth([mockOpening(800)])
    expect(selectedAssembly).toBe(assembly1)
  })
})
