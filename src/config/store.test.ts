import { describe, it, expect, beforeEach } from 'vitest'
import { useConfigStore } from './store'
import { createMaterialId } from '@/construction'
import { createLength } from '@/types/geometry'

describe('ConfigStore', () => {
  beforeEach(() => {
    // Clear the store manually since reset function is removed
    useConfigStore.setState({ ringBeamConstructionMethods: new Map() })
  })

  describe('Ring Beam Construction Methods', () => {
    it('should add a ring beam construction method', () => {
      const store = useConfigStore.getState()
      const material = createMaterialId()
      const height = createLength(200)

      const method = store.addRingBeamConstructionMethod('Standard Ring Beam', material, height)

      expect(method.name).toBe('Standard Ring Beam')
      expect(method.material).toBe(material)
      expect(method.height).toBe(height)
      expect(method.width).toBeUndefined()
      expect(method.offsetFromEdge).toBeUndefined()

      const allMethods = store.getAllRingBeamConstructionMethods()
      expect(allMethods).toHaveLength(1)
      expect(allMethods[0]).toEqual(method)
    })

    it('should add a ring beam construction method with optional parameters', () => {
      const store = useConfigStore.getState()
      const material = createMaterialId()
      const height = createLength(200)
      const width = createLength(300)
      const offsetFromEdge = createLength(50)

      const method = store.addRingBeamConstructionMethod('Custom Ring Beam', material, height, width, offsetFromEdge)

      expect(method.name).toBe('Custom Ring Beam')
      expect(method.material).toBe(material)
      expect(method.height).toBe(height)
      expect(method.width).toBe(width)
      expect(method.offsetFromEdge).toBe(offsetFromEdge)
    })

    it('should throw error for empty name', () => {
      const store = useConfigStore.getState()
      const material = createMaterialId()
      const height = createLength(200)

      expect(() => {
        store.addRingBeamConstructionMethod('', material, height)
      }).toThrow('Ring beam construction method name cannot be empty')
    })

    it('should throw error for invalid height', () => {
      const store = useConfigStore.getState()
      const material = createMaterialId()
      const height = createLength(0)

      expect(() => {
        store.addRingBeamConstructionMethod('Test', material, height)
      }).toThrow('Height must be greater than 0')
    })

    it('should allow duplicate names', () => {
      const store = useConfigStore.getState()
      const material = createMaterialId()
      const height = createLength(200)

      const method1 = store.addRingBeamConstructionMethod('Same Name', material, height)
      const method2 = store.addRingBeamConstructionMethod('Same Name', material, height)

      expect(method1.name).toBe('Same Name')
      expect(method2.name).toBe('Same Name')
      expect(method1.id).not.toBe(method2.id)
      expect(store.getAllRingBeamConstructionMethods()).toHaveLength(2)
    })

    it('should remove a ring beam construction method', () => {
      const store = useConfigStore.getState()
      const material = createMaterialId()
      const height = createLength(200)

      const method = store.addRingBeamConstructionMethod('To Remove', material, height)
      expect(store.getAllRingBeamConstructionMethods()).toHaveLength(1)

      store.removeRingBeamConstructionMethod(method.id)
      expect(store.getAllRingBeamConstructionMethods()).toHaveLength(0)
    })

    it('should update a ring beam construction method', () => {
      const store = useConfigStore.getState()
      const material = createMaterialId()
      const height = createLength(200)

      const method = store.addRingBeamConstructionMethod('Original', material, height)

      const newHeight = createLength(300)
      const newWidth = createLength(400)

      store.updateRingBeamConstructionMethod(method.id, {
        name: 'Updated',
        height: newHeight,
        width: newWidth
      })

      const updated = store.getRingBeamConstructionMethodById(method.id)
      expect(updated?.name).toBe('Updated')
      expect(updated?.height).toBe(newHeight)
      expect(updated?.width).toBe(newWidth)
      expect(updated?.material).toBe(material) // Should remain unchanged
    })

    it('should get methods by material', () => {
      const store = useConfigStore.getState()
      const material1 = createMaterialId()
      const material2 = createMaterialId()
      const height = createLength(200)

      store.addRingBeamConstructionMethod('Method 1', material1, height)
      store.addRingBeamConstructionMethod('Method 2', material1, height)
      store.addRingBeamConstructionMethod('Method 3', material2, height)

      const material1Methods = store.getRingBeamConstructionMethodsByMaterial(material1)
      expect(material1Methods).toHaveLength(2)

      const material2Methods = store.getRingBeamConstructionMethodsByMaterial(material2)
      expect(material2Methods).toHaveLength(1)
    })

    it('should allow negative offset from edge', () => {
      const store = useConfigStore.getState()
      const material = createMaterialId()
      const height = createLength(200)
      const negativeOffset = createLength(-50)

      const method = store.addRingBeamConstructionMethod(
        'Negative Offset Method',
        material,
        height,
        undefined,
        negativeOffset
      )

      expect(method.offsetFromEdge).toBe(negativeOffset)
      expect(Number(method.offsetFromEdge)).toBe(-50)
    })
  })
})
