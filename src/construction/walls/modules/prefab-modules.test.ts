import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ConstructionElement } from '@/construction/elements'
import { WallConstructionArea } from '@/construction/geometry'
import type { MaterialId, PrefabMaterial } from '@/construction/materials/material'
import { getMaterialsActions } from '@/construction/materials/store'
import { aggregateResults } from '@/construction/results'
import type { PrefabModulesWallConfig } from '@/construction/walls'
import { newVec3 } from '@/shared/geometry'

import { PrefabModulesWallAssembly } from './prefab-modules'

vi.mock('@/construction/materials/store', () => ({
  getMaterialsActions: vi.fn()
}))

const mockGetMaterialById = vi.fn()

vi.mocked(getMaterialsActions).mockReturnValue({
  getMaterialById: mockGetMaterialById
} as any)

const standardMaterial: PrefabMaterial = {
  id: 'material_standard' as any,
  type: 'prefab',
  name: 'Standard Module',
  color: '#BBBBBB',
  minHeight: 400,
  maxHeight: 3000,
  minThickness: 300,
  maxThickness: 400,
  minWidth: 400,
  maxWidth: 850,
  isFlipped: false
}

const fallbackMaterial: PrefabMaterial = {
  id: 'material_fallback' as any,
  type: 'prefab',
  name: 'Fallback Module',
  color: '#FF8888',
  minHeight: 119,
  maxHeight: 532,
  minThickness: 300,
  maxThickness: 400,
  minWidth: 400,
  maxWidth: 6000,
  isFlipped: true
}

const lintelMaterial: PrefabMaterial = {
  id: 'material_lintel' as any,
  type: 'prefab',
  name: 'Lintel Module',
  color: '#BBFFFF',
  minHeight: 400,
  maxHeight: 850,
  minThickness: 300,
  maxThickness: 400,
  minWidth: 850,
  maxWidth: 3000,
  isFlipped: true
}

const inclinedMaterial: PrefabMaterial = {
  id: 'material_inclined' as any,
  type: 'prefab',
  name: 'Inclined Module',
  color: '#FFFFBB',
  minHeight: 200,
  maxHeight: 3000,
  minThickness: 300,
  maxThickness: 400,
  minWidth: 400,
  maxWidth: 800,
  sloped: {
    minAngleDegrees: 1,
    maxAngleDegrees: 50
  },
  isFlipped: false
}

const sillMaterial: PrefabMaterial = {
  id: 'material_sill' as any,
  type: 'prefab',
  name: 'Sill Module',
  color: '#BBBBFF',
  minHeight: 400,
  maxHeight: 850,
  minThickness: 300,
  maxThickness: 400,
  minWidth: 850,
  maxWidth: 3000,
  isFlipped: true
}

const createTestConfig = (): PrefabModulesWallConfig => ({
  type: 'prefab-modules',
  defaultMaterial: 'material_standard' as MaterialId,
  fallbackMaterial: 'material_fallback' as MaterialId,
  inclinedMaterial: 'material_inclined' as MaterialId,
  lintelMaterial: 'material_lintel' as MaterialId,
  sillMaterial: 'material_sill' as MaterialId,
  maxWidth: 850,
  targetWidth: 600,
  preferEqualWidths: false,
  tallReinforceThreshold: 3000,
  tallReinforceThickness: 15,
  tallReinforceStagger: 400,
  tallReinforceMaterial: 'material_reinforce' as MaterialId,
  layers: {
    insideThickness: 0,
    insideLayers: [],
    outsideThickness: 0,
    outsideLayers: []
  }
})

class TestPrefabModulesWallAssembly extends PrefabModulesWallAssembly {
  public moduleWallArea(
    area: WallConstructionArea,
    startsWithStand = false,
    endsWithStand = false,
    startAtEnd = false
  ) {
    return super.moduleWallArea(area, startsWithStand, endsWithStand, startAtEnd)
  }

  public moduleOpeningSubWallArea(area: WallConstructionArea, type: 'lintel' | 'sill') {
    return super.moduleOpeningSubWallArea(area, type)
  }
}

function extractElements(results: any[]) {
  return aggregateResults(results).elements as ConstructionElement[]
}

describe('Prefab Modules Wall Assembly', () => {
  let config: PrefabModulesWallConfig
  let assembly: TestPrefabModulesWallAssembly

  beforeEach(() => {
    config = createTestConfig()
    mockGetMaterialById.mockImplementation((id: string) => {
      if (id === 'material_standard') return standardMaterial
      if (id === 'material_fallback') return fallbackMaterial
      if (id === 'material_lintel') return lintelMaterial
      if (id === 'material_inclined') return inclinedMaterial
      if (id === 'material_sill') return sillMaterial
      return undefined
    })
    assembly = new TestPrefabModulesWallAssembly(config)
  })

  describe('moduleWallArea - Standard Construction', () => {
    it('should create single module when width equals target', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(600, 360, 2000))
      const results = Array.from(assembly.moduleWallArea(area))
      const elements = extractElements(results)

      expect(elements).toHaveLength(1)
      expect(elements[0].material).toBe('material_standard')
    })

    it('should create multiple modules for larger wall', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(1400, 360, 2000))
      const results = Array.from(assembly.moduleWallArea(area))
      const elements = extractElements(results)

      expect(elements.length).toBeGreaterThan(1)
      elements.forEach(el => {
        expect(el.material).toBe('material_standard')
      })
    })

    it('should place remaining modules at end', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(700, 360, 2000))
      const results = Array.from(assembly.moduleWallArea(area, false, false, true))
      const elements = extractElements(results)

      expect(elements.length).toBeGreaterThan(0)

      const sortedElements = elements.sort((a, b) => a.transform[12] - b.transform[12])
      const lastElement = sortedElements[sortedElements.length - 1]

      expect(lastElement.transform[12] + lastElement.bounds.size[0]).toBeCloseTo(700, 5)
    })
  })

  describe('moduleWallArea - Equal Widths', () => {
    beforeEach(() => {
      config = createTestConfig()
      config.preferEqualWidths = true
      config.targetWidth = 550
      config.maxWidth = 800
      assembly = new TestPrefabModulesWallAssembly(config)
    })

    it('should distribute modules equally when preferEqualWidths is true', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(1200, 360, 2000))
      const results = Array.from(assembly.moduleWallArea(area))
      const elements = extractElements(results)

      expect(elements.length).toBeGreaterThan(1)

      const sortedElements = elements.sort((a, b) => a.transform[12] - b.transform[12])
      const moduleWidths = sortedElements.map(el => el.bounds.size[0])

      const allEqualWidths = moduleWidths.every(w => Math.abs(w - moduleWidths[0]) < 1e-3)
      expect(allEqualWidths).toBe(true)
    })

    it('should respect minWidth and maxWidth constraints', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(2000, 360, 2000))
      const results = Array.from(assembly.moduleWallArea(area))
      const elements = extractElements(results)

      elements.forEach(el => {
        const width = el.bounds.size[0]
        expect(width).toBeGreaterThanOrEqual(standardMaterial.minWidth)
        expect(width).toBeLessThanOrEqual(Math.min(config.maxWidth, standardMaterial.maxWidth))
      })
    })
  })

  describe('moduleWallArea - Fallback', () => {
    it('should use fallback when width is too small', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(300, 360, 2000))
      const results = Array.from(assembly.moduleWallArea(area))
      const elements = extractElements(results)

      expect(elements.length).toBeGreaterThan(0)
      expect(elements[0].material).toBe('material_fallback')
    })

    it('should use fallback when height is too small', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(600, 360, 300))
      const results = Array.from(assembly.moduleWallArea(area))
      const elements = extractElements(results)

      expect(elements.length).toBeGreaterThan(0)
      expect(elements[0].material).toBe('material_fallback')
    })

    it('should generate validation errors for too small module', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(300, 360, 2000))
      const results = Array.from(assembly.moduleWallArea(area))

      const hasErrors = results.some(r => typeof r === 'object' && 'error' in r)
      expect(hasErrors).toBe(true)
    })
  })

  describe('moduleOpeningSubWallArea - Lintel', () => {
    it('should create single lintel module', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(1000, 360, 600))
      const results = Array.from(assembly.moduleOpeningSubWallArea(area, 'lintel'))
      const elements = extractElements(results)

      expect(elements.length).toBeGreaterThan(0)
      expect(elements[0].material).toBe('material_lintel')
    })

    it('should create two stacked lintel modules for taller openings', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(1000, 360, 1200))
      const results = Array.from(assembly.moduleOpeningSubWallArea(area, 'lintel'))
      const elements = extractElements(results)

      expect(elements.length).toBeGreaterThanOrEqual(2)
      const lintelElements = elements.filter(el => el.material === 'material_lintel')
      expect(lintelElements.length).toBeGreaterThanOrEqual(2)
    })

    it('should use fallback when lintel width exceeds maxWidth', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(4000, 360, 600))
      const results = Array.from(assembly.moduleOpeningSubWallArea(area, 'lintel'))
      const elements = extractElements(results)

      const hasFallback = elements.some(el => el.material === 'material_fallback')
      expect(hasFallback).toBe(true)
    })

    it('should delegate to moduleWallArea when width < minWidth', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(700, 360, 600))
      const results = Array.from(assembly.moduleOpeningSubWallArea(area, 'lintel'))
      const elements = extractElements(results)

      expect(elements.length).toBeGreaterThan(0)
      expect(elements[0].material).toBe('material_standard')
    })

    it('should use fallback when height is too small', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(1000, 360, 300))
      const results = Array.from(assembly.moduleOpeningSubWallArea(area, 'lintel'))
      const elements = extractElements(results)

      const hasFallback = elements.some(el => el.material === 'material_fallback')
      expect(hasFallback).toBe(true)
    })
  })

  describe('moduleOpeningSubWallArea - Sill', () => {
    it('should create sill module when dimensions are valid', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(1000, 360, 600))
      const results = Array.from(assembly.moduleOpeningSubWallArea(area, 'sill'))
      const elements = extractElements(results)

      expect(elements.length).toBeGreaterThan(0)
      expect(elements[0].material).toBe('material_sill')
    })

    it('should delegate to moduleWallArea when sill is not configured', () => {
      const configNoSill = createTestConfig()
      configNoSill.sillMaterial = undefined
      const assemblyNoSill = new TestPrefabModulesWallAssembly(configNoSill)

      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(1000, 360, 600))
      const results = Array.from(assemblyNoSill.moduleOpeningSubWallArea(area, 'sill'))
      const elements = extractElements(results)

      expect(elements.length).toBeGreaterThan(0)
      expect(elements[0].material).toBe('material_standard')
    })

    it('should use moduleWallArea when dimensions exceed sill bounds', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(1000, 360, 900))
      const results = Array.from(assembly.moduleOpeningSubWallArea(area, 'sill'))
      const elements = extractElements(results)

      expect(elements.length).toBeGreaterThan(0)
      expect(elements[0].material).toBe('material_standard')
    })
  })

  describe('moduleOpeningSubWallArea - Complex Scenarios', () => {
    it('should handle lintel + standard modules for tall openings', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(1000, 360, 2000))
      const results = Array.from(assembly.moduleOpeningSubWallArea(area, 'lintel'))
      const elements = extractElements(results)

      const hasLintel = elements.some(el => el.material === 'material_lintel')
      const hasStandard = elements.some(el => el.material === 'material_standard')
      expect(hasLintel).toBe(true)
      expect(hasStandard).toBe(true)
    })

    it('should handle two lintel modules + standard modules', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(1000, 360, 2500))
      const results = Array.from(assembly.moduleOpeningSubWallArea(area, 'lintel'))
      const elements = extractElements(results)

      const lintelElements = elements.filter(el => el.material === 'material_lintel')
      const standardElements = elements.filter(el => el.material === 'material_standard')
      expect(lintelElements.length).toBeGreaterThanOrEqual(2)
      expect(standardElements.length).toBeGreaterThan(0)
    })
  })

  describe('Element Properties', () => {
    it('should create elements with correct bounds', () => {
      const area = new WallConstructionArea(newVec3(100, 0, 200), newVec3(600, 360, 2000))
      const results = Array.from(assembly.moduleWallArea(area))
      const elements = extractElements(results)

      expect(elements[0].bounds.size[0]).toBeCloseTo(600, 5)
      expect(elements[0].bounds.size[2]).toBeCloseTo(2000, 5)
    })

    it('should position elements correctly', () => {
      const position = newVec3(100, 0, 200)
      const area = new WallConstructionArea(position, newVec3(600, 360, 2000))
      const results = Array.from(assembly.moduleWallArea(area))
      const elements = extractElements(results)

      expect(elements[0].transform[12]).toBeCloseTo(100, 5)
      expect(elements[0].transform[14]).toBeCloseTo(200, 5)
    })
  })

  describe('Validation', () => {
    it('should throw error for non-prefab material', () => {
      mockGetMaterialById.mockImplementation((id: string) => {
        if (id === 'material_standard') return { type: 'generic', id } as any
        return fallbackMaterial
      })

      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(600, 360, 2000))
      expect(() => Array.from(assembly.moduleWallArea(area))).toThrow('Invalid module material')
    })
  })

  describe('Snapshot Tests - Various Dimensions', () => {
    it.each([
      [400, 400],
      [600, 600],
      [800, 800],
      [1000, 2000],
      [1200, 2500],
      [1600, 3000]
    ])('should produce consistent layout for %dx%d', (width, height) => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(width, 360, height))
      const results = Array.from(assembly.moduleWallArea(area))

      const snapshotData = extractElements(results).map(el => ({
        material: el.material,
        position_x: el.transform[12],
        position_z: el.transform[14],
        width: el.bounds.size[0],
        height: el.bounds.size[2]
      }))

      expect(snapshotData).toMatchSnapshot(`layout-${width}x${height}`)
    })
  })
})
