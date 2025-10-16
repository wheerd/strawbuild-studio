import { beforeEach, describe, expect, it } from 'vitest'

import { createMaterialId } from '@/construction/materials/material'
import type { RingBeamConfig } from '@/construction/ringBeams'
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
})
