import { beforeEach, describe, expect, it } from 'vitest'

import { createMaterialId, strawbale } from '@/construction/materials/material'
import type { RingBeamConfig } from '@/construction/ringBeams'
import type { InfillWallConfig, WallConfig } from '@/construction/walls'
import '@/shared/geometry'

import { _clearAllAssemblies, getConfigActions } from './store'

describe('ConfigStore', () => {
  describe('Default Ring Beam Assembly', () => {
    it('should initialize with a default ring beam assembly', () => {
      // Check the initial state (don't clear first)
      const assemblies = getConfigActions().getAllRingBeamAssemblies()

      expect(assemblies.length).toBeGreaterThanOrEqual(1)

      const defaultAssembly = assemblies[0]
      expect(defaultAssembly.name).toBe('Full 36x6cm')
      expect(defaultAssembly.type).toBe('full')
      expect(defaultAssembly.height).toBe(60)
      if (defaultAssembly.type === 'full') {
        expect(defaultAssembly.width).toBe(360)
        expect(defaultAssembly.offsetFromEdge).toBe(30)
      }
      expect(defaultAssembly.material).toBeDefined()
    })
  })

  describe('Straw Configuration', () => {
    beforeEach(() => {
      const store = getConfigActions()
      store.updateStrawConfig({
        baleMinLength: 800,
        baleMaxLength: 900,
        baleHeight: 500,
        baleWidth: 360,
        material: strawbale.id,
        tolerance: 2,
        topCutoffLimit: 50,
        flakeSize: 70
      })
    })

    it('should expose default straw configuration', () => {
      const { getStrawConfig } = getConfigActions()
      const strawConfig = getStrawConfig()

      expect(strawConfig).toMatchObject({
        baleMinLength: 800,
        baleMaxLength: 900,
        baleHeight: 500,
        baleWidth: 360,
        material: strawbale.id,
        tolerance: 2,
        topCutoffLimit: 50,
        flakeSize: 70
      })
    })

    it('should update straw configuration', () => {
      const store = getConfigActions()

      store.updateStrawConfig({ baleMinLength: 850, baleMaxLength: 950 })
      const strawConfig = store.getStrawConfig()

      expect(strawConfig.baleMinLength).toBe(850)
      expect(strawConfig.baleMaxLength).toBe(950)
      store.updateStrawConfig({ tolerance: 3, topCutoffLimit: 45, flakeSize: 65 })
      const updatedStrawConfig = store.getStrawConfig()
      expect(updatedStrawConfig.tolerance).toBe(3)
      expect(updatedStrawConfig.topCutoffLimit).toBe(45)
      expect(updatedStrawConfig.flakeSize).toBe(65)
    })

    it('should reject invalid straw configuration', () => {
      const store = getConfigActions()

      expect(() => store.updateStrawConfig({ baleMinLength: -10 })).toThrow(
        'Minimum straw bale length must be greater than 0'
      )

      expect(() => store.updateStrawConfig({ baleMaxLength: 500, baleMinLength: 600 })).toThrow(
        'Minimum straw bale length cannot exceed the maximum straw bale length'
      )

      expect(() => store.updateStrawConfig({ tolerance: -1 })).toThrow('Straw bale tolerance cannot be negative')

      expect(() => store.updateStrawConfig({ topCutoffLimit: 0 })).toThrow(
        'Straw top cutoff limit must be greater than 0'
      )

      expect(() => store.updateStrawConfig({ flakeSize: 0 })).toThrow('Straw flake size must be greater than 0')
    })
  })

  describe('Ring Beam Wall Assemblies', () => {
    beforeEach(() => {
      // Clear the store manually for CRUD tests
      _clearAllAssemblies()
      // TODO: Fix this
    })
    it('should add a full ring beam assembly', () => {
      const store = getConfigActions()
      const material = createMaterialId()
      const config: RingBeamConfig = {
        type: 'full',
        height: 60,
        width: 360,
        material,
        offsetFromEdge: 0
      }

      const assembly = store.addRingBeamAssembly('Standard Ring Beam', config)

      expect(assembly.name).toBe('Standard Ring Beam')
      expect(assembly).toMatchObject(config)

      const allAssemblies = store.getAllRingBeamAssemblies()
      expect(allAssemblies).toHaveLength(1)
      expect(allAssemblies[0]).toEqual(assembly)
    })

    it('should add a double ring beam assembly', () => {
      const store = getConfigActions()
      const material = createMaterialId()
      const infillMaterial = createMaterialId()
      const config: RingBeamConfig = {
        type: 'double',
        height: 60,
        thickness: 120,
        material,
        infillMaterial,
        offsetFromEdge: 50,
        spacing: 100
      }

      const assembly = store.addRingBeamAssembly('Double Ring Beam', config)

      expect(assembly.name).toBe('Double Ring Beam')
      expect(assembly).toMatchObject(config)
    })

    it('should throw error for empty name', () => {
      const store = getConfigActions()
      const material = createMaterialId()
      const config: RingBeamConfig = {
        type: 'full',
        height: 60,
        width: 360,
        material,
        offsetFromEdge: 0
      }

      expect(() => {
        store.addRingBeamAssembly('', config)
      }).toThrow('Ring beam assembly name cannot be empty')
    })

    it('should throw error for invalid height', () => {
      const store = getConfigActions()
      const material = createMaterialId()
      const config: RingBeamConfig = {
        type: 'full',
        height: 0,
        width: 360,
        material,
        offsetFromEdge: 0
      }

      expect(() => {
        store.addRingBeamAssembly('Test', config)
      }).toThrow('Ring beam height must be greater than 0')
    })

    it('should allow duplicate names', () => {
      const store = getConfigActions()
      const material = createMaterialId()
      const config: RingBeamConfig = {
        type: 'full',
        height: 60,
        width: 360,
        material,
        offsetFromEdge: 0
      }

      const assembly1 = store.addRingBeamAssembly('Same Name', config)
      const assembly2 = store.addRingBeamAssembly('Same Name', config)

      expect(assembly1.name).toBe('Same Name')
      expect(assembly2.name).toBe('Same Name')
      expect(assembly1.id).not.toBe(assembly2.id)
      expect(store.getAllRingBeamAssemblies()).toHaveLength(2)
    })

    it('should remove a ring beam assembly', () => {
      const store = getConfigActions()
      const material = createMaterialId()
      const config: RingBeamConfig = {
        type: 'full',
        height: 60,
        width: 360,
        material,
        offsetFromEdge: 0
      }

      const assembly = store.addRingBeamAssembly('To Remove', config)
      expect(store.getAllRingBeamAssemblies()).toHaveLength(1)

      store.removeRingBeamAssembly(assembly.id)
      expect(store.getAllRingBeamAssemblies()).toHaveLength(0)
    })

    it('should update ring beam assembly name', () => {
      const store = getConfigActions()
      const material = createMaterialId()
      const config: RingBeamConfig = {
        type: 'full',
        height: 60,
        width: 360,
        material,
        offsetFromEdge: 0
      }

      const assembly = store.addRingBeamAssembly('Original', config)

      store.updateRingBeamAssemblyName(assembly.id, 'Updated')

      const updated = store.getRingBeamAssemblyById(assembly.id)
      expect(updated?.name).toBe('Updated')
      expect(updated).toMatchObject(config)
    })

    it('should update ring beam assembly config', () => {
      const store = getConfigActions()
      const material = createMaterialId()
      const originalConfig: RingBeamConfig = {
        type: 'full',
        height: 60,
        width: 360,
        material,
        offsetFromEdge: 0
      }

      const assembly = store.addRingBeamAssembly('Test Assembly', originalConfig)

      const newMaterial = createMaterialId()
      const newConfig: RingBeamConfig = {
        type: 'full',
        height: 80,
        width: 400,
        material: newMaterial,
        offsetFromEdge: 10
      }

      store.updateRingBeamAssemblyConfig(assembly.id, newConfig)

      const updated = store.getRingBeamAssemblyById(assembly.id)
      expect(updated?.name).toBe('Test Assembly')
      expect(updated).toMatchObject(newConfig)
    })

    it('should handle validation errors for invalid config', () => {
      const store = getConfigActions()
      const material = createMaterialId()
      const invalidConfig: RingBeamConfig = {
        type: 'full',
        height: 0, // Invalid height
        width: 360,
        material,
        offsetFromEdge: 0
      }

      expect(() => {
        store.addRingBeamAssembly('Invalid Config', invalidConfig)
      }).toThrow('Ring beam height must be greater than 0')
    })

    it('should allow negative offset from edge', () => {
      const store = getConfigActions()
      const material = createMaterialId()
      const config: RingBeamConfig = {
        type: 'full',
        height: 60,
        width: 360,
        material,
        offsetFromEdge: -50
      }

      const assembly = store.addRingBeamAssembly('Negative Offset Assembly', config)

      expect(assembly.type).toBe('full')
      if (assembly.type === 'full') {
        expect(assembly.offsetFromEdge).toBe(-50)
        expect(Number(assembly.offsetFromEdge)).toBe(-50)
      }
    })
  })

  describe('Wall Assemblies', () => {
    beforeEach(() => {
      _clearAllAssemblies()
    })

    const createValidWallConfig = (): InfillWallConfig => {
      const postMaterial = createMaterialId()
      const headerMaterial = createMaterialId()
      const sillMaterial = createMaterialId()

      return {
        type: 'infill',
        maxPostSpacing: 800,
        minStrawSpace: 70,
        posts: {
          type: 'full',
          width: 60,
          material: postMaterial
        },
        openings: {
          padding: 15,
          headerThickness: 60,
          headerMaterial,
          sillThickness: 60,
          sillMaterial
        },
        layers: {
          insideThickness: 30,
          outsideThickness: 50
        }
      }
    }

    it('should add an infill wall assembly', () => {
      const store = getConfigActions()
      const config = createValidWallConfig()

      const assembly = store.addWallAssembly('Standard Infill', config)

      expect(assembly.name).toBe('Standard Infill')
      expect(assembly.type).toBe('infill')
      expect(store.getAllWallAssemblies()).toHaveLength(1)
    })

    it('should validate wall assembly on add', () => {
      const store = getConfigActions()
      const invalidConfig: WallConfig = {
        ...createValidWallConfig(),
        maxPostSpacing: 0
      }

      expect(() => store.addWallAssembly('Invalid Wall', invalidConfig)).toThrow(
        'Maximum post spacing must be greater than 0'
      )
    })

    it('should validate wall assembly on update', () => {
      const store = getConfigActions()
      const assembly = store.addWallAssembly('Standard Infill', createValidWallConfig())

      expect(() =>
        store.updateWallAssemblyConfig(assembly.id, { layers: { insideThickness: -1, outsideThickness: 0 } })
      ).toThrow('Inside layer thickness cannot be negative')

      const fetched = store.getWallAssemblyById(assembly.id)
      if (fetched?.type === 'infill') {
        expect(fetched.layers.insideThickness).toBe(30)
      } else {
        throw new Error('Expected infill wall assembly')
      }
    })
  })
})
