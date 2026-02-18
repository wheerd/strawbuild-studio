import { beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_MATERIALS } from '@/construction/materials/defaults'
import { createMaterialId } from '@/construction/materials/material'

import { getMaterialsActions, getMaterialsState, setMaterialsState } from './store'

describe('Materials Store', () => {
  beforeEach(() => {
    // Reset store to default materials for each test
    setMaterialsState({ materials: { ...DEFAULT_MATERIALS } })
  })

  describe('initialization', () => {
    it('should initialize with default materials', () => {
      const state = getMaterialsState()
      const materialIds = Object.keys(state.materials)
      const defaultMaterialIds = Object.keys(DEFAULT_MATERIALS)

      expect(materialIds).toHaveLength(defaultMaterialIds.length)
      expect(materialIds.sort()).toEqual(defaultMaterialIds.sort())
    })
  })

  describe('addMaterial', () => {
    it('should add a new dimensional material', () => {
      const actions = getMaterialsActions()
      const newMaterial = actions.addMaterial({
        type: 'dimensional',
        name: 'Test Wood',
        color: '#ff0000',
        crossSections: [{ smallerLength: 50, biggerLength: 100 }],
        lengths: [3000, 5000]
      })

      expect(newMaterial.id).toBeDefined()
      expect(newMaterial.name).toBe('Test Wood')
      expect(newMaterial.type).toBe('dimensional')

      const state = getMaterialsState()
      expect(state.materials[newMaterial.id]).toEqual(newMaterial)
    })

    it('should add a new generic material', () => {
      const actions = getMaterialsActions()
      const newMaterial = actions.addMaterial({
        type: 'generic',
        name: 'Test Generic',
        color: '#00ff00'
      })

      expect(newMaterial.type).toBe('generic')
      expect(newMaterial.name).toBe('Test Generic')
    })

    it('should throw error for empty name', () => {
      const actions = getMaterialsActions()
      expect(() => {
        actions.addMaterial({
          type: 'generic',
          name: '',
          color: '#ff0000'
        })
      }).toThrow('Material name cannot be empty')
    })

    it('should throw error for invalid dimensions', () => {
      const actions = getMaterialsActions()
      expect(() => {
        actions.addMaterial({
          type: 'dimensional',
          name: 'Invalid Wood',
          color: '#ff0000',
          crossSections: [{ smallerLength: -100, biggerLength: 50 }],
          lengths: [3000]
        })
      }).toThrow('Cross section dimensions must be positive numbers')
    })
  })

  describe('updateMaterial', () => {
    it('should update material properties', () => {
      const actions = getMaterialsActions()
      const material = actions.addMaterial({
        type: 'generic',
        name: 'Test Material',
        color: '#ff0000'
      })

      actions.updateMaterial(material.id, {
        name: 'Updated Material',
        color: '#00ff00'
      })

      const state = getMaterialsState()
      const updatedMaterial = state.materials[material.id]
      expect(updatedMaterial.name).toBe('Updated Material')
      expect(updatedMaterial.color).toBe('#00ff00')
      expect(updatedMaterial.type).toBe('generic') // Type should not change
    })

    it('should prevent duplicate names', () => {
      const actions = getMaterialsActions()
      actions.addMaterial({
        type: 'generic',
        name: 'Material One',
        color: '#ff0000'
      })

      const material2 = actions.addMaterial({
        type: 'generic',
        name: 'Material Two',
        color: '#00ff00'
      })

      expect(() => {
        actions.updateMaterial(material2.id, { name: 'Material One' })
      }).toThrow('A material with this name already exists')
    })
  })

  describe('duplicateMaterial', () => {
    it('should create a copy with new name', () => {
      const actions = getMaterialsActions()
      const original = actions.addMaterial({
        type: 'dimensional',
        name: 'Original Wood',
        color: '#ff0000',
        crossSections: [{ smallerLength: 60, biggerLength: 360 }],
        lengths: [5000]
      })

      const duplicate = actions.duplicateMaterial(original.id, 'Copied Wood')

      expect(duplicate.id).not.toBe(original.id)
      expect(duplicate.name).toBe('Copied Wood')
      expect(duplicate.color).toBe(original.color)
      expect(duplicate.type).toBe(original.type)
      expect.assert(duplicate.type === 'dimensional')
      expect(duplicate.crossSections).toHaveLength(1)
      expect(duplicate.crossSections[0]).toEqual({ smallerLength: 60, biggerLength: 360 })
    })

    it('should prevent duplicate names when duplicating', () => {
      const actions = getMaterialsActions()
      const material = actions.addMaterial({
        type: 'generic',
        name: 'Test Material',
        color: '#ff0000'
      })

      expect(() => {
        actions.duplicateMaterial(material.id, 'Test Material')
      }).toThrow('A material with this name already exists')
    })
  })

  describe('removeMaterial', () => {
    it('should remove material from store', () => {
      const actions = getMaterialsActions()
      const material = actions.addMaterial({
        type: 'generic',
        name: 'To Remove',
        color: '#ff0000'
      })

      let state = getMaterialsState()
      expect(state.materials[material.id]).toBeDefined()

      actions.removeMaterial(material.id)

      state = getMaterialsState()
      expect(state.materials[material.id]).toBeUndefined()
    })
  })

  describe('queries', () => {
    it('should get material by id', () => {
      const actions = getMaterialsActions()
      const material = actions.addMaterial({
        type: 'generic',
        name: 'Query Test',
        color: '#ff0000'
      })

      const found = actions.getMaterialById(material.id)
      expect(found).toEqual(material)

      const notFound = actions.getMaterialById(createMaterialId())
      expect(notFound).toBeNull()
    })

    it('should get materials by type', () => {
      const actions = getMaterialsActions()

      actions.addMaterial({
        type: 'generic',
        name: 'Generic 1',
        color: '#ff0000'
      })

      actions.addMaterial({
        type: 'dimensional',
        name: 'Dimensional 1',
        color: '#00ff00',
        crossSections: [{ smallerLength: 50, biggerLength: 100 }],
        lengths: [3000]
      })

      actions.addMaterial({
        type: 'generic',
        name: 'Generic 2',
        color: '#0000ff'
      })

      const genericMaterials = actions.getMaterialsByType('generic')
      const dimensionalMaterials = actions.getMaterialsByType('dimensional')

      // Should include our added generics + default generics
      expect(genericMaterials.length).toBeGreaterThanOrEqual(2)
      expect(dimensionalMaterials.length).toBeGreaterThanOrEqual(1)

      expect(genericMaterials.every(m => m.type === 'generic')).toBe(true)
      expect(dimensionalMaterials.every(m => m.type === 'dimensional')).toBe(true)
    })
  })
})
