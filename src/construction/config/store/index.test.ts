import { beforeEach, describe, expect, it } from 'vitest'

import type { FloorConfig } from '@/construction/floors/types'
import { createMaterialId } from '@/construction/materials/material'
import type { InfillWallConfig, WallConfig } from '@/construction/walls'

import { _clearAllAssemblies, getConfigActions } from '.'

describe('ConfigStore', () => {
  describe('Floor Assemblies', () => {
    const createFloorConfig = (): FloorConfig => ({
      type: 'monolithic',
      thickness: 180,
      material: createMaterialId(),
      topLayerSetId: undefined,
      bottomLayerSetId: undefined
    })

    beforeEach(() => {
      _clearAllAssemblies()
    })

    it('should add a floor assembly', () => {
      const store = getConfigActions()
      const assembly = store.addFloorAssembly('Test Floor', createFloorConfig())

      expect(assembly.name).toBe('Test Floor')
      expect(assembly.type).toBe('monolithic')
      expect(store.getAllFloorAssemblies()).toHaveLength(1)
    })

    it('should update floor assembly config', () => {
      const store = getConfigActions()
      const assembly = store.addFloorAssembly('Test Floor', createFloorConfig())

      store.updateFloorAssemblyConfig(assembly.id, { thickness: 200 } as Partial<FloorConfig>)

      const updated = store.getFloorAssemblyById(assembly.id)
      expect(updated?.type).toBe('monolithic')
      expect.assert(updated?.type === 'monolithic')
      expect(updated.thickness).toBe(200)
    })

    it('should duplicate floor assembly', () => {
      const store = getConfigActions()
      const assembly = store.addFloorAssembly('Original', createFloorConfig())

      const duplicated = store.duplicateFloorAssembly(assembly.id, 'Copy')

      expect(duplicated.name).toBe('Copy')
      expect(duplicated.id).not.toBe(assembly.id)
      expect(store.getAllFloorAssemblies()).toHaveLength(2)
    })
  })

  describe('Default Ring Beam Assembly', () => {
    it('should initialize with a default ring beam assembly', () => {
      const assemblies = getConfigActions().getAllRingBeamAssemblies()

      expect(assemblies.length).toBeGreaterThanOrEqual(1)

      const defaultAssembly = assemblies[0]
      expect(defaultAssembly.name).toBe('Full 36x6cm')
      expect(defaultAssembly.type).toBe('full')
      expect.assert(defaultAssembly.type === 'full')
      expect(defaultAssembly.height).toBe(60)
      expect(defaultAssembly.width).toBe(360)
      expect(defaultAssembly.offsetFromEdge).toBe(0)
      expect(defaultAssembly.material).toBeDefined()
    })
  })

  describe('Layer Sets', () => {
    beforeEach(() => {
      _clearAllAssemblies()
    })

    it('should have default layer sets', () => {
      const store = getConfigActions()
      const layerSets = store.getAllLayerSets()

      expect(layerSets.length).toBeGreaterThan(0)
    })

    it('should create a new layer set', () => {
      const store = getConfigActions()
      const layerSet = store.addLayerSet('Custom Wall Layers', [], 'wall')

      expect(layerSet.name).toBe('Custom Wall Layers')
      expect(layerSet.use).toBe('wall')
      expect(layerSet.totalThickness).toBe(0)
    })

    it('should update layer set layers', () => {
      const store = getConfigActions()
      const layerSet = store.addLayerSet('Test', [], 'wall')

      const newLayers = [
        {
          type: 'monolithic' as const,
          name: 'Test Layer',
          thickness: 30,
          material: createMaterialId()
        }
      ]

      store.setLayerSetLayers(layerSet.id, newLayers)

      const updated = store.getLayerSetById(layerSet.id)
      expect(updated?.layers).toHaveLength(1)
      expect(updated?.totalThickness).toBe(30)
    })
  })

  describe('Wall Assemblies', () => {
    beforeEach(() => {
      _clearAllAssemblies()
    })

    const createValidWallConfig = (): InfillWallConfig => {
      const postMaterial = createMaterialId()

      return {
        type: 'infill',
        maxPostSpacing: 900,
        desiredPostSpacing: 800,
        minStrawSpace: 70,
        posts: {
          type: 'full',
          width: 60,
          material: postMaterial
        },
        triangularBattens: {
          size: 30,
          material: 'batten' as any,
          inside: false,
          outside: false,
          minLength: 100
        },
        insideLayerSetId: undefined,
        outsideLayerSetId: undefined
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

      expect(() => {
        store.updateWallAssemblyConfig(assembly.id, {
          desiredPostSpacing: -1
        })
      }).toThrow('Desired post spacing must be greater than 0')

      const fetched = store.getWallAssemblyById(assembly.id)
      expect(fetched?.type).toBe('infill')
      expect.assert(fetched?.type === 'infill')
      expect(fetched.desiredPostSpacing).toBe(800)
    })

    it('should update wall assembly layer set references', () => {
      const store = getConfigActions()
      const assembly = store.addWallAssembly('Layered Wall', createValidWallConfig())

      const insideLayerSet = store.addLayerSet('Inside Plaster', [], 'wall')
      const outsideLayerSet = store.addLayerSet('Outside Render', [], 'wall')

      store.updateWallAssemblyConfig(assembly.id, {
        insideLayerSetId: insideLayerSet.id,
        outsideLayerSetId: outsideLayerSet.id
      })

      const updated = store.getWallAssemblyById(assembly.id)
      expect(updated?.insideLayerSetId).toBe(insideLayerSet.id)
      expect(updated?.outsideLayerSetId).toBe(outsideLayerSet.id)
    })

    it('should duplicate wall assembly with layer set references', () => {
      const store = getConfigActions()
      const layerSet = store.addLayerSet('Test Layers', [], 'wall')

      const config: InfillWallConfig = {
        ...createValidWallConfig(),
        insideLayerSetId: layerSet.id
      }

      const assembly = store.addWallAssembly('Original', config)
      const duplicated = store.duplicateWallAssembly(assembly.id, 'Copy')

      expect(duplicated.insideLayerSetId).toBe(layerSet.id)
      expect(duplicated.name).toBe('Copy')
    })
  })
})
