import clipperWasmUrl from 'clipper2-wasm/dist/es/clipper2z.wasm?url'
import fs from 'node:fs/promises'
import path from 'node:path'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ConstructionElement } from '@/construction/elements'
import { WallConstructionArea } from '@/construction/geometry'
import type { MaterialId, PrefabMaterial } from '@/construction/materials/material'
import { getMaterialsActions } from '@/construction/materials/store'
import { aggregateResults } from '@/construction/results'
import type { PrefabModulesWallConfig } from '@/construction/walls'
import { newVec2, newVec3 } from '@/shared/geometry'
import { ensureClipperModule } from '@/shared/geometry/clipperInstance'

import { PrefabModulesWallAssembly } from './prefab-modules'

vi.mock('@/construction/materials/store', () => ({
  getMaterialsActions: vi.fn()
}))

vi.unmock('@/shared/geometry/clipperInstance')

function resolveBundledAssetPath(assetUrl: string): string {
  const normalized = assetUrl.startsWith('/') ? assetUrl.slice(1) : assetUrl
  return path.resolve(process.cwd(), normalized)
}

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

const reinforceMaterial: PrefabMaterial = {
  id: 'material_reinforce' as any,
  type: 'prefab',
  name: 'Reinforcement',
  color: '#FF0000',
  minHeight: 100,
  maxHeight: 5000,
  minThickness: 10,
  maxThickness: 50,
  minWidth: 5,
  maxWidth: 50,
  isFlipped: false
}

const tallModule: PrefabMaterial = {
  id: 'material_tall' as any,
  type: 'prefab',
  name: 'Tall Module',
  color: '#AAFFAA',
  minHeight: 400,
  maxHeight: 2800,
  minThickness: 300,
  maxThickness: 400,
  minWidth: 400,
  maxWidth: 800,
  isFlipped: false
}

const flipModule: PrefabMaterial = {
  id: 'material_flip' as any,
  type: 'prefab',
  name: 'Flip Module',
  color: '#FFAAFF',
  minHeight: 400,
  maxHeight: 1000,
  minThickness: 300,
  maxThickness: 400,
  minWidth: 1000,
  maxWidth: 2000,
  isFlipped: true
}

const inclinedModule: PrefabMaterial = {
  id: 'material_inclined_alt' as any,
  type: 'prefab',
  name: 'Inclined Alt',
  color: '#FFFF88',
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
  insideLayerSetId: undefined,
  outsideLayerSetId: undefined
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

  beforeAll(async () => {
    const clipperPath = resolveBundledAssetPath(clipperWasmUrl)
    const clipperBinary = await fs.readFile(clipperPath)
    await ensureClipperModule({ wasmBinary: clipperBinary })
  })

  beforeEach(() => {
    config = createTestConfig()
    mockGetMaterialById.mockImplementation((id: string) => {
      if (id === 'material_standard') return standardMaterial
      if (id === 'material_fallback') return fallbackMaterial
      if (id === 'material_lintel') return lintelMaterial
      if (id === 'material_inclined') return inclinedMaterial
      if (id === 'material_inclined_alt') return inclinedModule
      if (id === 'material_sill') return sillMaterial
      if (id === 'material_reinforce') return reinforceMaterial
      if (id === 'material_tall') return tallModule
      if (id === 'material_flip') return flipModule
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
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(100, 360, 2000))
      const results = Array.from(assembly.moduleWallArea(area))

      const hasErrors = results.some(r => 'error' in r)
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

  describe('Inclined Modules', () => {
    it('should use inclined material for non-flat area', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(600, 360, 2000), [
        newVec2(0, -100),
        newVec2(600, -50)
      ])

      const results = Array.from(assembly.moduleWallArea(area))
      const elements = extractElements(results)

      const hasInclined = elements.some(el => el.material === 'material_inclined')
      expect(hasInclined).toBe(true)
    })

    it('should split area when topOffsets has more than 2 points', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(1200, 360, 2000), [
        newVec2(0, -100),
        newVec2(500, -50),
        newVec2(700, -80),
        newVec2(1200, -100)
      ])

      const results = Array.from(assembly.moduleWallArea(area))
      const elements = extractElements(results)

      expect(elements.length).toBeGreaterThan(1)
    })

    it('should use standard material when topOffsets are equal', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(600, 360, 2000), [newVec2(0, 0), newVec2(600, 0)])

      const results = Array.from(assembly.moduleWallArea(area))
      const elements = extractElements(results)

      expect(elements[0].material).toBe('material_standard')
    })

    it('should create elements with sloped side profile for inclined areas', () => {
      // Create a sloped roof area - top rises 100mm from left to right
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(600, 360, 2000), [
        newVec2(0, -100),
        newVec2(600, 0)
      ])

      const results = Array.from(assembly.moduleWallArea(area))
      const elements = extractElements(results)

      // Verify that inclined material is used
      const hasInclined = elements.some(el => el.material === 'material_inclined')
      expect(hasInclined).toBe(true)

      // Verify the side profile polygon has sloped top by checking the area geometry
      // The area should be non-flat with different minHeight and height
      expect(area.isFlat).toBe(false)
      expect(area.minHeight).not.toBe(area.size[2])

      // Calculate expected height difference from the topOffsets
      // topOffsets are [0, -100] and [600, 0], adjusted by max offset (100)
      // So the effective offset is [-100, 0] relative to the adjusted height
      // The area will have size[2] = max(2000 + (-100, 0)) = 2000
      // And minHeight at the left = 2000 + (-100) = 1900
      // So the slope should be 100mm over 600mm width
      const expectedHeightDiff = 100
      const actualHeightDiff = area.size[2] - area.minHeight

      expect(actualHeightDiff).toBeCloseTo(expectedHeightDiff, 5)
    })
  })

  describe('Tall Wall Reinforcement - Equal Widths Mode', () => {
    beforeEach(() => {
      config = createTestConfig()
      config.preferEqualWidths = true
      config.targetWidth = 600
      config.maxWidth = 800
      config.tallReinforceThreshold = 2500
      config.tallReinforceThickness = 15
      config.tallReinforceMaterial = 'material_reinforce' as MaterialId
      assembly = new TestPrefabModulesWallAssembly(config)
    })

    it('should insert reinforcement between modules in tall wall', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(1200, 360, 2800))
      const results = Array.from(assembly.moduleWallArea(area))
      const elements = extractElements(results)

      const reinforceElements = elements.filter(el => el.material === 'material_reinforce')
      expect(reinforceElements.length).toBeGreaterThan(0)
    })

    it('should not insert reinforcement for short walls', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(1200, 360, 2400))
      const results = Array.from(assembly.moduleWallArea(area))
      const elements = extractElements(results)

      const reinforceElements = elements.filter(el => el.material === 'material_reinforce')
      expect(reinforceElements.length).toBe(0)
    })

    it('should adjust module widths to accommodate reinforcement', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(1200, 360, 2800))
      const results = Array.from(assembly.moduleWallArea(area))
      const elements = extractElements(results)

      const reinforceElements = elements.filter(el => el.material === 'material_reinforce')
      reinforceElements.forEach(el => {
        const thickness = el.bounds.size[0]
        expect(thickness).toBeCloseTo(15, 5)
      })
    })
  })

  describe('Tall Wall Reinforcement - Standard Mode', () => {
    beforeEach(() => {
      config = createTestConfig()
      config.targetWidth = 600
      config.maxWidth = 800
      config.tallReinforceThreshold = 2500
      config.tallReinforceThickness = 15
      config.tallReinforceMaterial = 'material_reinforce' as MaterialId
      assembly = new TestPrefabModulesWallAssembly(config)
    })

    it('should insert reinforcement after target-width modules in tall wall', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(1200, 360, 2800))
      const results = Array.from(assembly.moduleWallArea(area))
      const elements = extractElements(results)

      const reinforceElements = elements.filter(el => el.material === 'material_reinforce')
      expect(reinforceElements.length).toBeGreaterThan(0)
    })

    it('should insert reinforcement before splitting remaining area', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(1000, 360, 2800))
      const results = Array.from(assembly.moduleWallArea(area))
      const elements = extractElements(results)

      const reinforceElements = elements.filter(el => el.material === 'material_reinforce')
      const standardElements = elements.filter(el => el.material === 'material_standard')

      expect(reinforceElements.length).toBeGreaterThan(0)
      expect(standardElements.length).toBeGreaterThan(0)
    })
  })

  describe('Module Column Stagger', () => {
    beforeEach(() => {
      config = createTestConfig()
      config.tallReinforceThreshold = 2500
      config.tallReinforceStagger = 400
      config.defaultMaterial = 'material_tall' as MaterialId
      assembly = new TestPrefabModulesWallAssembly(config)
    })

    it('should not stagger at even index', () => {
      // First column (index 0) should not be staggered
      const firstArea = new WallConstructionArea(newVec3(0, 0, 0), newVec3(600, 360, 2800))
      const results = Array.from(assembly.moduleWallArea(firstArea))
      const elements = extractElements(results)

      const sortedElements = elements.sort((a, b) => a.transform[14] - b.transform[14])
      const firstElement = sortedElements[0]

      expect(firstElement.bounds.size[2]).not.toBeCloseTo(400, 5)
    })
  })

  describe('Flip Logic', () => {
    it('should flip when material isFlipped is true and area is flat', () => {
      // Use dimensions that fit the flipModule bounds
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(1200, 360, 600))

      const configFlip = createTestConfig()
      configFlip.defaultMaterial = 'material_flip' as MaterialId
      configFlip.maxWidth = 2000
      const assemblyFlip = new TestPrefabModulesWallAssembly(configFlip)

      const results = Array.from(assemblyFlip.moduleWallArea(area))
      const elements = extractElements(results)

      expect(elements.length).toBeGreaterThan(0)
      expect(elements[0].material).toBe('material_flip')
    })

    it('should auto-flip dimensions for better fit', () => {
      const configFlip = createTestConfig()
      configFlip.defaultMaterial = 'material_flip' as MaterialId
      configFlip.fallbackMaterial = 'material_flip' as MaterialId
      configFlip.maxWidth = 2000
      const assemblyFlip = new TestPrefabModulesWallAssembly(configFlip)

      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(1200, 360, 500))

      const results = Array.from(assemblyFlip.moduleWallArea(area))
      const elements = extractElements(results)

      expect(elements.length).toBeGreaterThan(0)
    })

    it('should respect material flip preference', () => {
      // lintelMaterial has isFlipped: true, test with appropriate dimensions
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(1200, 360, 800))

      const configFlip = createTestConfig()
      configFlip.defaultMaterial = 'material_lintel' as MaterialId
      configFlip.maxWidth = 3000
      const assemblyFlip = new TestPrefabModulesWallAssembly(configFlip)

      const results = Array.from(assemblyFlip.moduleWallArea(area))
      const elements = extractElements(results)

      expect(elements.length).toBeGreaterThan(0)
      expect(elements[0].material).toBe('material_lintel')
    })
  })

  describe('Validation Errors', () => {
    it('should generate error when thickness is too thick', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(600, 500, 2000))
      const results = Array.from(assembly.moduleWallArea(area))

      const errors = results.filter((r: any) => 'error' in r)
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should use fallback for sill when dimensions exceed standard bounds', () => {
      // Create area smaller than standard module's minHeight
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(900, 360, 300))
      const results = Array.from(assembly.moduleOpeningSubWallArea(area, 'sill'))

      const elements = aggregateResults(results).elements as ConstructionElement[]
      // Should delegate to moduleWallArea which falls back to fallback
      expect(elements.length).toBeGreaterThan(0)
      expect(elements[0].material).toBe('material_fallback')
    })
  })

  describe('Start/End Placement', () => {
    it('should place modules at end when startAtEnd is true', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(1200, 360, 2000))
      const results = Array.from(assembly.moduleWallArea(area, false, false, true))
      const elements = extractElements(results)

      const sortedElements = elements.sort((a, b) => a.transform[12] - b.transform[12])
      const lastElement = sortedElements[sortedElements.length - 1]

      expect(lastElement.transform[12] + lastElement.bounds.size[0]).toBeCloseTo(1200, 5)
    })

    it('should place modules at start when startAtEnd is false', () => {
      const area = new WallConstructionArea(newVec3(100, 0, 0), newVec3(1200, 360, 2000))
      const results = Array.from(assembly.moduleWallArea(area, false, false, false))
      const elements = extractElements(results)

      const sortedElements = elements.sort((a, b) => a.transform[12] - b.transform[12])
      const firstElement = sortedElements[0]

      expect(firstElement.transform[12]).toBeCloseTo(100, 5)
    })
  })

  describe('Sloped Lintel', () => {
    it('should handle non-flat lintel area with inclined modules', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(1000, 360, 1200), [
        newVec2(0, -600),
        newVec2(1000, -550)
      ])

      const results = Array.from(assembly.moduleOpeningSubWallArea(area, 'lintel'))
      const elements = extractElements(results)

      expect(elements.length).toBeGreaterThan(0)
    })

    it('should delegate to moduleWallArea for inclined area above lintel', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(1000, 360, 1500), [
        newVec2(0, -900),
        newVec2(1000, -850)
      ])

      const results = Array.from(assembly.moduleOpeningSubWallArea(area, 'lintel'))
      const elements = extractElements(results)

      expect(elements.length).toBeGreaterThan(0)
    })

    it('should use fallback for sloped lintel with insufficient minHeight', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(1000, 360, 1000), [
        newVec2(0, -700),
        newVec2(1000, -650)
      ])

      const results = Array.from(assembly.moduleOpeningSubWallArea(area, 'lintel'))
      const elements = extractElements(results)

      const hasFallback = elements.some(el => el.material === 'material_fallback')
      expect(hasFallback).toBe(true)
    })
  })

  describe('Lintel Edge Cases', () => {
    it('should handle lintel at exactly maxHeight', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(1000, 360, 850))
      const results = Array.from(assembly.moduleOpeningSubWallArea(area, 'lintel'))
      const elements = extractElements(results)

      const lintelElements = elements.filter(el => el.material === 'material_lintel')
      expect(lintelElements.length).toBe(1)
    })

    it('should handle lintel height > 2 * maxHeight with standard modules', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(1000, 360, 2000))
      const results = Array.from(assembly.moduleOpeningSubWallArea(area, 'lintel'))
      const elements = extractElements(results)

      const lintelElements = elements.filter(el => el.material === 'material_lintel')
      const standardElements = elements.filter(el => el.material === 'material_standard')

      expect(lintelElements.length).toBeGreaterThanOrEqual(2)
      expect(standardElements.length).toBeGreaterThan(0)
    })

    it('should use two lintel modules when height <= 2 * maxHeight', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(1000, 360, 1500))
      const results = Array.from(assembly.moduleOpeningSubWallArea(area, 'lintel'))
      const elements = extractElements(results)

      const lintelElements = elements.filter(el => el.material === 'material_lintel')
      expect(lintelElements.length).toBe(2)
    })
  })

  describe('Sill Edge Cases', () => {
    it('should handle sill at exactly minWidth', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(850, 360, 600))
      const results = Array.from(assembly.moduleOpeningSubWallArea(area, 'sill'))
      const elements = extractElements(results)

      expect(elements[0].material).toBe('material_sill')
    })

    it('should handle sill at exactly maxWidth', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 360, 600))
      const results = Array.from(assembly.moduleOpeningSubWallArea(area, 'sill'))
      const elements = extractElements(results)

      expect(elements[0].material).toBe('material_sill')
    })

    it('should handle sill at exactly minHeight', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(1000, 360, 400))
      const results = Array.from(assembly.moduleOpeningSubWallArea(area, 'sill'))
      const elements = extractElements(results)

      expect(elements[0].material).toBe('material_sill')
    })

    it('should handle sill at exactly maxHeight', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(1000, 360, 850))
      const results = Array.from(assembly.moduleOpeningSubWallArea(area, 'sill'))
      const elements = extractElements(results)

      expect(elements[0].material).toBe('material_sill')
    })
  })

  describe('Complex Scenarios', () => {
    it('should handle tall wall with reinforcement, stagger, and startAtEnd', () => {
      const configComplex = createTestConfig()
      configComplex.tallReinforceThreshold = 2500
      configComplex.tallReinforceThickness = 15
      configComplex.tallReinforceStagger = 400
      configComplex.tallReinforceMaterial = 'material_reinforce' as MaterialId
      configComplex.targetWidth = 600
      const assemblyComplex = new TestPrefabModulesWallAssembly(configComplex)

      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(1800, 360, 2800))
      const results = Array.from(assemblyComplex.moduleWallArea(area, false, false, true))
      const elements = extractElements(results)

      expect(elements.length).toBeGreaterThan(0)
    })

    it('should handle non-flat area with inclined modules and fallback', () => {
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(300, 360, 2000), [
        newVec2(0, -100),
        newVec2(300, -50)
      ])

      const results = Array.from(assembly.moduleWallArea(area))
      const elements = extractElements(results)

      const hasFallback = elements.some(el => el.material === 'material_fallback')
      expect(hasFallback).toBe(true)
    })

    it('should handle multiple modules with reinforcement in tall wall', () => {
      const configComplex = createTestConfig()
      configComplex.tallReinforceThreshold = 2500
      configComplex.tallReinforceThickness = 15
      configComplex.tallReinforceMaterial = 'material_reinforce' as MaterialId
      configComplex.targetWidth = 600
      const assemblyComplex = new TestPrefabModulesWallAssembly(configComplex)

      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(2400, 360, 2800))
      const results = Array.from(assemblyComplex.moduleWallArea(area))
      const elements = extractElements(results)

      const reinforceElements = elements.filter(el => el.material === 'material_reinforce')
      expect(reinforceElements.length).toBeGreaterThan(1)
    })
  })
})
