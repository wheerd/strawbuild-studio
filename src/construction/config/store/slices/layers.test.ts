import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { LayerSetId } from '@/building/model/ids'
import type { LayerConfig } from '@/construction/layers/types'
import type { MaterialId } from '@/construction/materials/material'

import type { LayerSetsSlice } from './layers'
import { createLayerSetsSlice } from './layers'

describe('layersSlice', () => {
  let store: LayerSetsSlice
  let mockSet: any
  let mockGet: any

  beforeEach(() => {
    mockSet = vi.fn()
    mockGet = vi.fn()
    const mockStore = {} as any

    store = createLayerSetsSlice(mockSet, mockGet, mockStore)
    store = { ...store, timestamps: {} } as any

    mockGet.mockImplementation(() => store)

    mockSet.mockImplementation((updater: any) => {
      if (typeof updater === 'function') {
        updater(store)
      } else {
        store = { ...store, ...updater }
      }
    })
  })

  const createTestLayer = (overrides?: Partial<LayerConfig>): LayerConfig =>
    ({
      type: 'monolithic',
      name: 'Test Layer',
      material: 'material_test' as MaterialId,
      thickness: 30,
      ...overrides
    }) as LayerConfig

  const createTestStripedLayer = (overrides?: Partial<LayerConfig>): LayerConfig =>
    ({
      type: 'striped',
      name: 'Striped Layer',
      direction: 'diagonal',
      stripeMaterial: 'material_wood' as MaterialId,
      stripeWidth: 50,
      gapMaterial: 'material_plaster' as MaterialId,
      gapWidth: 10,
      thickness: 40,
      ...overrides
    }) as LayerConfig

  describe('initial state', () => {
    it('should initialize with DEFAULT_LAYER_SETS', () => {
      const layerSetCount = Object.keys(store.layerSetConfigs).length
      expect(layerSetCount).toBeGreaterThan(0)
    })
  })

  describe('addLayerSet', () => {
    it('should create a layer set with valid parameters', () => {
      const layers = [createTestLayer({ thickness: 20 }), createTestLayer({ thickness: 30 })]
      const layerSet = store.actions.addLayerSet('Test Layer Set', layers, 'wall')

      expect(layerSet).toBeDefined()
      expect(layerSet.name).toBe('Test Layer Set')
      expect(layerSet.use).toBe('wall')
      expect(layerSet.layers).toHaveLength(2)
      expect(layerSet.totalThickness).toBe(50)
    })

    it('should trim whitespace from name', () => {
      const layerSet = store.actions.addLayerSet('  Trimmed Name  ', [], 'wall')

      expect(layerSet.name).toBe('Trimmed Name')
    })

    it('should calculate totalThickness from layers', () => {
      const layers = [createTestLayer({ thickness: 100 }), createTestLayer({ thickness: 50 })]
      const layerSet = store.actions.addLayerSet('Thick Set', layers, 'floor')

      expect(layerSet.totalThickness).toBe(150)
    })

    it('should calculate totalThickness excluding overlap layers', () => {
      const layers = [
        createTestLayer({ thickness: 100 }),
        createTestLayer({ thickness: 50, overlap: true }),
        createTestLayer({ thickness: 25 })
      ]
      const layerSet = store.actions.addLayerSet('Overlap Set', layers, 'wall')

      expect(layerSet.totalThickness).toBe(125)
    })

    it('should throw error for empty name', () => {
      expect(() => {
        store.actions.addLayerSet('', [], 'wall')
      }).toThrow('Layer set name cannot be empty')
    })

    it('should throw error for whitespace-only name', () => {
      expect(() => {
        store.actions.addLayerSet('   ', [], 'wall')
      }).toThrow('Layer set name cannot be empty')
    })

    it('should sanitize layer names in array', () => {
      const layers = [createTestLayer({ name: '  Trimmed Layer Name  ' })]
      const layerSet = store.actions.addLayerSet('Test', layers, 'wall')

      expect(layerSet.layers[0].name).toBe('Trimmed Layer Name')
    })

    it('should throw for empty layer name', () => {
      const layers = [createTestLayer({ name: '' })]

      expect(() => {
        store.actions.addLayerSet('Test', layers, 'wall')
      }).toThrow('Layer name cannot be empty')
    })

    it('should throw for negative layer thickness', () => {
      const layers = [createTestLayer({ thickness: -10 })]

      expect(() => {
        store.actions.addLayerSet('Test', layers, 'wall')
      }).toThrow('Layer thickness cannot be negative')
    })
  })

  describe('duplicateLayerSet', () => {
    it('should duplicate an existing layer set with new ID', () => {
      const original = store.actions.addLayerSet('Original', [createTestLayer()], 'wall')
      const duplicated = store.actions.duplicateLayerSet(original.id, 'Duplicated')

      expect(duplicated.id).not.toBe(original.id)
      expect(duplicated.name).toBe('Duplicated')
      expect(duplicated.use).toBe(original.use)
      expect(duplicated.layers).toHaveLength(original.layers.length)
    })

    it('should clear nameKey on duplicate', () => {
      const defaultLayerSet = store.actions.getAllLayerSets()[0]
      const duplicated = store.actions.duplicateLayerSet(defaultLayerSet.id, 'My Copy')

      expect(duplicated.nameKey).toBeUndefined()
    })

    it('should deep copy layers array (not share references)', () => {
      const original = store.actions.addLayerSet('Original', [createTestLayer({ thickness: 50 })], 'wall')
      const duplicated = store.actions.duplicateLayerSet(original.id, 'Duplicated')

      expect(duplicated.layers).not.toBe(original.layers)
      expect(duplicated.layers[0]).not.toBe(original.layers[0])
    })

    it('should throw error if source does not exist', () => {
      expect(() => {
        store.actions.duplicateLayerSet('ls_nonexistent' as LayerSetId, 'Copy')
      }).toThrow('Layer set with id ls_nonexistent not found')
    })

    it('should throw error for empty name', () => {
      const original = store.actions.addLayerSet('Original', [], 'wall')

      expect(() => {
        store.actions.duplicateLayerSet(original.id, '')
      }).toThrow('Layer set name cannot be empty')
    })

    it('should trim whitespace from name', () => {
      const original = store.actions.addLayerSet('Original', [], 'wall')
      const duplicated = store.actions.duplicateLayerSet(original.id, '  Trimmed  ')

      expect(duplicated.name).toBe('Trimmed')
    })
  })

  describe('removeLayerSet', () => {
    it('should remove a custom layer set', () => {
      const layerSet = store.actions.addLayerSet('To Remove', [], 'wall')
      expect(store.actions.getLayerSetById(layerSet.id)).toBe(layerSet)

      store.actions.removeLayerSet(layerSet.id)

      expect(store.actions.getLayerSetById(layerSet.id)).toBeNull()
    })

    it('should NOT remove a default layer set (silently ignores)', () => {
      const defaultLayerSets = store.actions.getAllLayerSets()
      const defaultId = defaultLayerSets[0].id

      store.actions.removeLayerSet(defaultId)

      expect(store.actions.getLayerSetById(defaultId)).toBeDefined()
    })

    it('should not throw when removing non-existent', () => {
      expect(() => {
        store.actions.removeLayerSet('ls_nonexistent' as LayerSetId)
      }).not.toThrow()
    })
  })

  describe('updateLayerSetName', () => {
    it('should update name and clear nameKey', () => {
      const layerSet = store.actions.addLayerSet('Original Name', [], 'wall')

      store.actions.updateLayerSetName(layerSet.id, 'New Name')

      const updated = store.actions.getLayerSetById(layerSet.id)
      expect(updated?.name).toBe('New Name')
      expect(updated?.nameKey).toBeUndefined()
    })

    it('should trim whitespace', () => {
      const layerSet = store.actions.addLayerSet('Original', [], 'wall')

      store.actions.updateLayerSetName(layerSet.id, '  Trimmed  ')

      const updated = store.actions.getLayerSetById(layerSet.id)
      expect(updated?.name).toBe('Trimmed')
    })

    it('should throw error for empty name', () => {
      const layerSet = store.actions.addLayerSet('Original', [], 'wall')

      expect(() => {
        store.actions.updateLayerSetName(layerSet.id, '')
      }).toThrow('Layer set name cannot be empty')
    })

    it('should silently ignore non-existent ID', () => {
      expect(() => {
        store.actions.updateLayerSetName('ls_nonexistent' as LayerSetId, 'New Name')
      }).not.toThrow()
    })
  })

  describe('updateLayerSetUse', () => {
    it('should update the use property', () => {
      const layerSet = store.actions.addLayerSet('Test', [], 'wall')

      store.actions.updateLayerSetUse(layerSet.id, 'floor')

      const updated = store.actions.getLayerSetById(layerSet.id)
      expect(updated?.use).toBe('floor')
    })

    it('should update to ceiling use', () => {
      const layerSet = store.actions.addLayerSet('Test', [], 'wall')

      store.actions.updateLayerSetUse(layerSet.id, 'ceiling')

      const updated = store.actions.getLayerSetById(layerSet.id)
      expect(updated?.use).toBe('ceiling')
    })

    it('should update to roof use', () => {
      const layerSet = store.actions.addLayerSet('Test', [], 'wall')

      store.actions.updateLayerSetUse(layerSet.id, 'roof')

      const updated = store.actions.getLayerSetById(layerSet.id)
      expect(updated?.use).toBe('roof')
    })

    it('should silently ignore non-existent ID', () => {
      expect(() => {
        store.actions.updateLayerSetUse('ls_nonexistent' as LayerSetId, 'floor')
      }).not.toThrow()
    })
  })

  describe('addLayerToSet', () => {
    it('should append a layer to existing layers', () => {
      const layerSet = store.actions.addLayerSet('Test', [createTestLayer({ thickness: 20 })], 'wall')

      store.actions.addLayerToSet(layerSet.id, createTestLayer({ thickness: 30 }))

      const updated = store.actions.getLayerSetById(layerSet.id)
      expect(updated?.layers).toHaveLength(2)
      expect(updated?.totalThickness).toBe(50)
    })

    it('should recalculate totalThickness', () => {
      const layerSet = store.actions.addLayerSet('Test', [createTestLayer({ thickness: 100 })], 'wall')

      store.actions.addLayerToSet(layerSet.id, createTestLayer({ thickness: 50 }))

      const updated = store.actions.getLayerSetById(layerSet.id)
      expect(updated?.totalThickness).toBe(150)
    })

    it('should sanitize layer name', () => {
      const layerSet = store.actions.addLayerSet('Test', [], 'wall')

      store.actions.addLayerToSet(layerSet.id, createTestLayer({ name: '  Trimmed  ' }))

      const updated = store.actions.getLayerSetById(layerSet.id)
      expect(updated?.layers[0].name).toBe('Trimmed')
    })

    it('should throw for empty layer name', () => {
      const layerSet = store.actions.addLayerSet('Test', [], 'wall')

      expect(() => {
        store.actions.addLayerToSet(layerSet.id, createTestLayer({ name: '' }))
      }).toThrow('Layer name cannot be empty')
    })

    it('should throw for negative thickness', () => {
      const layerSet = store.actions.addLayerSet('Test', [], 'wall')

      expect(() => {
        store.actions.addLayerToSet(layerSet.id, createTestLayer({ thickness: -5 }))
      }).toThrow('Layer thickness cannot be negative')
    })

    it('should throw for negative stripeWidth (striped layer)', () => {
      const layerSet = store.actions.addLayerSet('Test', [], 'wall')

      expect(() => {
        store.actions.addLayerToSet(layerSet.id, createTestStripedLayer({ stripeWidth: -10 }))
      }).toThrow('Layer stripe width cannot be negative')
    })

    it('should throw for negative gapWidth (striped layer)', () => {
      const layerSet = store.actions.addLayerSet('Test', [], 'wall')

      expect(() => {
        store.actions.addLayerToSet(layerSet.id, createTestStripedLayer({ gapWidth: -5 }))
      }).toThrow('Layer gap width cannot be negative')
    })

    it('should silently ignore non-existent layer set ID', () => {
      expect(() => {
        store.actions.addLayerToSet('ls_nonexistent' as LayerSetId, createTestLayer())
      }).not.toThrow()
    })
  })

  describe('updateLayerInSet', () => {
    it('should update layer at valid index', () => {
      const layerSet = store.actions.addLayerSet(
        'Test',
        [createTestLayer({ thickness: 20 }), createTestLayer({ thickness: 30 })],
        'wall'
      )

      store.actions.updateLayerInSet(layerSet.id, 0, { thickness: 50 })

      const updated = store.actions.getLayerSetById(layerSet.id)
      expect(updated?.layers[0].thickness).toBe(50)
      expect(updated?.layers[1].thickness).toBe(30)
    })

    it('should recalculate totalThickness', () => {
      const layerSet = store.actions.addLayerSet('Test', [createTestLayer({ thickness: 100 })], 'wall')

      store.actions.updateLayerInSet(layerSet.id, 0, { thickness: 200 })

      const updated = store.actions.getLayerSetById(layerSet.id)
      expect(updated?.totalThickness).toBe(200)
    })

    it('should throw for index out of bounds (negative)', () => {
      const layerSet = store.actions.addLayerSet('Test', [createTestLayer()], 'wall')

      expect(() => {
        store.actions.updateLayerInSet(layerSet.id, -1, { thickness: 50 })
      }).toThrow('Layer index out of bounds')
    })

    it('should throw for index out of bounds (too high)', () => {
      const layerSet = store.actions.addLayerSet('Test', [createTestLayer()], 'wall')

      expect(() => {
        store.actions.updateLayerInSet(layerSet.id, 5, { thickness: 50 })
      }).toThrow('Layer index out of bounds')
    })

    it('should merge partial updates correctly', () => {
      const layerSet = store.actions.addLayerSet('Test', [createTestLayer({ name: 'Original', thickness: 30 })], 'wall')

      store.actions.updateLayerInSet(layerSet.id, 0, { thickness: 50 })

      const updated = store.actions.getLayerSetById(layerSet.id)
      expect(updated?.layers[0].name).toBe('Original')
      expect(updated?.layers[0].thickness).toBe(50)
    })

    it('should validate merged result', () => {
      const layerSet = store.actions.addLayerSet('Test', [createTestLayer({ thickness: 30 })], 'wall')

      expect(() => {
        store.actions.updateLayerInSet(layerSet.id, 0, { thickness: -10 })
      }).toThrow('Layer thickness cannot be negative')
    })

    it('should silently ignore non-existent layer set ID', () => {
      expect(() => {
        store.actions.updateLayerInSet('ls_nonexistent' as LayerSetId, 0, { thickness: 50 })
      }).not.toThrow()
    })
  })

  describe('removeLayerFromSet', () => {
    it('should remove layer at valid index', () => {
      const layerSet = store.actions.addLayerSet(
        'Test',
        [createTestLayer({ thickness: 20 }), createTestLayer({ thickness: 30 }), createTestLayer({ thickness: 40 })],
        'wall'
      )

      store.actions.removeLayerFromSet(layerSet.id, 1)

      const updated = store.actions.getLayerSetById(layerSet.id)
      expect(updated?.layers).toHaveLength(2)
      expect(updated?.layers[0].thickness).toBe(20)
      expect(updated?.layers[1].thickness).toBe(40)
    })

    it('should recalculate totalThickness', () => {
      const layerSet = store.actions.addLayerSet(
        'Test',
        [createTestLayer({ thickness: 100 }), createTestLayer({ thickness: 50 })],
        'wall'
      )

      store.actions.removeLayerFromSet(layerSet.id, 1)

      const updated = store.actions.getLayerSetById(layerSet.id)
      expect(updated?.totalThickness).toBe(100)
    })

    it('should throw for index out of bounds', () => {
      const layerSet = store.actions.addLayerSet('Test', [createTestLayer()], 'wall')

      expect(() => {
        store.actions.removeLayerFromSet(layerSet.id, 5)
      }).toThrow('Layer index out of bounds')
    })

    it('should silently ignore non-existent layer set ID', () => {
      expect(() => {
        store.actions.removeLayerFromSet('ls_nonexistent' as LayerSetId, 0)
      }).not.toThrow()
    })
  })

  describe('moveLayerInSet', () => {
    it('should move layer from one index to another', () => {
      const layerSet = store.actions.addLayerSet(
        'Test',
        [createTestLayer({ name: 'First' }), createTestLayer({ name: 'Second' }), createTestLayer({ name: 'Third' })],
        'wall'
      )

      store.actions.moveLayerInSet(layerSet.id, 0, 2)

      const updated = store.actions.getLayerSetById(layerSet.id)
      expect(updated?.layers[0].name).toBe('Second')
      expect(updated?.layers[1].name).toBe('Third')
      expect(updated?.layers[2].name).toBe('First')
    })

    it('should return same array if fromIndex equals toIndex', () => {
      const layerSet = store.actions.addLayerSet(
        'Test',
        [createTestLayer({ name: 'First' }), createTestLayer({ name: 'Second' })],
        'wall'
      )

      store.actions.moveLayerInSet(layerSet.id, 0, 0)

      const updated = store.actions.getLayerSetById(layerSet.id)
      expect(updated?.layers[0].name).toBe('First')
      expect(updated?.layers[1].name).toBe('Second')
    })

    it('should throw for fromIndex out of bounds', () => {
      const layerSet = store.actions.addLayerSet('Test', [createTestLayer()], 'wall')

      expect(() => {
        store.actions.moveLayerInSet(layerSet.id, 5, 0)
      }).toThrow('Layer index out of bounds')
    })

    it('should throw for toIndex out of bounds', () => {
      const layerSet = store.actions.addLayerSet('Test', [createTestLayer()], 'wall')

      expect(() => {
        store.actions.moveLayerInSet(layerSet.id, 0, 5)
      }).toThrow('Layer index out of bounds')
    })

    it('should silently ignore non-existent layer set ID', () => {
      expect(() => {
        store.actions.moveLayerInSet('ls_nonexistent' as LayerSetId, 0, 1)
      }).not.toThrow()
    })
  })

  describe('getLayerSetById', () => {
    it('should return layer set by ID', () => {
      const layerSet = store.actions.addLayerSet('Test', [], 'wall')

      const retrieved = store.actions.getLayerSetById(layerSet.id)

      expect(retrieved).toBe(layerSet)
    })

    it('should return null for non-existent ID', () => {
      const retrieved = store.actions.getLayerSetById('ls_nonexistent' as LayerSetId)

      expect(retrieved).toBeNull()
    })
  })

  describe('getAllLayerSets', () => {
    it('should return all layer sets as array', () => {
      store.actions.addLayerSet('Custom 1', [], 'wall')
      store.actions.addLayerSet('Custom 2', [], 'floor')

      const allSets = store.actions.getAllLayerSets()

      expect(allSets.length).toBeGreaterThanOrEqual(2)
      expect(allSets.some(ls => ls.name === 'Custom 1')).toBe(true)
      expect(allSets.some(ls => ls.name === 'Custom 2')).toBe(true)
    })

    it('should include default layer sets initially', () => {
      const allSets = store.actions.getAllLayerSets()

      expect(allSets.length).toBeGreaterThan(0)
    })
  })

  describe('getLayerSetsByUse', () => {
    it('should filter layer sets by use type', () => {
      store.actions.addLayerSet('Wall Set', [], 'wall')
      store.actions.addLayerSet('Floor Set', [], 'floor')
      store.actions.addLayerSet('Another Wall', [], 'wall')

      const wallSets = store.actions.getLayerSetsByUse('wall')
      const floorSets = store.actions.getLayerSetsByUse('floor')

      expect(wallSets.filter(ls => ls.name === 'Wall Set' || ls.name === 'Another Wall')).toHaveLength(2)
      expect(floorSets.filter(ls => ls.name === 'Floor Set')).toHaveLength(1)
    })

    it('should return empty array if no matches', () => {
      const roofSets = store.actions.getLayerSetsByUse('roof')

      const customRoofSets = roofSets.filter(ls => ls.name.includes('Custom'))
      expect(customRoofSets).toHaveLength(0)
    })
  })

  describe('resetLayerSetsToDefaults', () => {
    it('should restore all default layer sets', () => {
      const defaultsBefore = store.actions.getAllLayerSets().filter(ls => ls.nameKey).length

      store.actions.addLayerSet('Custom', [], 'wall')
      store.actions.resetLayerSetsToDefaults()

      const defaultsAfter = store.actions.getAllLayerSets().filter(ls => ls.nameKey).length
      expect(defaultsAfter).toBe(defaultsBefore)
    })

    it('should preserve custom layer sets', () => {
      const custom = store.actions.addLayerSet('My Custom Set', [], 'wall')

      store.actions.resetLayerSetsToDefaults()

      const found = store.actions.getLayerSetById(custom.id)
      expect(found).toBeDefined()
      expect(found?.name).toBe('My Custom Set')
    })
  })
})
