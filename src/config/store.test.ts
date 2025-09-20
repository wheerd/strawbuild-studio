import { describe, it, expect, beforeEach } from 'vitest'
import { useConfigStore } from './store'
import { createMaterialId } from '@/construction'
import { createLength } from '@/types/geometry'
import type { RingBeamConfig } from '@/construction'

describe('ConfigStore', () => {
  describe('Default Ring Beam Method', () => {
    it('should initialize with a default ring beam construction method', () => {
      // Check the initial state (don't clear first)
      const methods = useConfigStore.getState().getAllRingBeamConstructionMethods()

      expect(methods.length).toBeGreaterThanOrEqual(1)

      const defaultMethod = methods.find(m => m.name === 'Standard Ring Beam 36cm')
      expect(defaultMethod).toBeDefined()
      expect(defaultMethod!.config.type).toBe('full')
      expect(defaultMethod!.config.height).toBe(60)
      if (defaultMethod!.config.type === 'full') {
        expect(defaultMethod!.config.width).toBe(360)
        expect(defaultMethod!.config.offsetFromEdge).toBe(30)
      }
      expect(defaultMethod!.config.material).toBeDefined()
    })
  })

  describe('Ring Beam Construction Methods', () => {
    beforeEach(() => {
      // Clear the store manually for CRUD tests
      useConfigStore.setState({ ringBeamConstructionMethods: new Map() })
    })
    it('should add a full ring beam construction method', () => {
      const store = useConfigStore.getState()
      const material = createMaterialId()
      const config: RingBeamConfig = {
        type: 'full',
        height: createLength(60),
        width: createLength(360),
        material,
        offsetFromEdge: createLength(0)
      }

      const method = store.addRingBeamConstructionMethod('Standard Ring Beam', config)

      expect(method.name).toBe('Standard Ring Beam')
      expect(method.config).toEqual(config)

      const allMethods = store.getAllRingBeamConstructionMethods()
      expect(allMethods).toHaveLength(1)
      expect(allMethods[0]).toEqual(method)
    })

    it('should add a double ring beam construction method', () => {
      const store = useConfigStore.getState()
      const material = createMaterialId()
      const infillMaterial = createMaterialId()
      const config: RingBeamConfig = {
        type: 'double',
        height: createLength(60),
        thickness: createLength(120),
        material,
        infillMaterial,
        offsetFromEdge: createLength(50),
        spacing: createLength(100)
      }

      const method = store.addRingBeamConstructionMethod('Double Ring Beam', config)

      expect(method.name).toBe('Double Ring Beam')
      expect(method.config).toEqual(config)
    })

    it('should throw error for empty name', () => {
      const store = useConfigStore.getState()
      const material = createMaterialId()
      const config: RingBeamConfig = {
        type: 'full',
        height: createLength(60),
        width: createLength(360),
        material,
        offsetFromEdge: createLength(0)
      }

      expect(() => {
        store.addRingBeamConstructionMethod('', config)
      }).toThrow('Ring beam construction method name cannot be empty')
    })

    it('should throw error for invalid height', () => {
      const store = useConfigStore.getState()
      const material = createMaterialId()
      const config: RingBeamConfig = {
        type: 'full',
        height: createLength(0),
        width: createLength(360),
        material,
        offsetFromEdge: createLength(0)
      }

      expect(() => {
        store.addRingBeamConstructionMethod('Test', config)
      }).toThrow('Ring beam height must be greater than 0')
    })

    it('should allow duplicate names', () => {
      const store = useConfigStore.getState()
      const material = createMaterialId()
      const config: RingBeamConfig = {
        type: 'full',
        height: createLength(60),
        width: createLength(360),
        material,
        offsetFromEdge: createLength(0)
      }

      const method1 = store.addRingBeamConstructionMethod('Same Name', config)
      const method2 = store.addRingBeamConstructionMethod('Same Name', config)

      expect(method1.name).toBe('Same Name')
      expect(method2.name).toBe('Same Name')
      expect(method1.id).not.toBe(method2.id)
      expect(store.getAllRingBeamConstructionMethods()).toHaveLength(2)
    })

    it('should remove a ring beam construction method', () => {
      const store = useConfigStore.getState()
      const material = createMaterialId()
      const config: RingBeamConfig = {
        type: 'full',
        height: createLength(60),
        width: createLength(360),
        material,
        offsetFromEdge: createLength(0)
      }

      const method = store.addRingBeamConstructionMethod('To Remove', config)
      expect(store.getAllRingBeamConstructionMethods()).toHaveLength(1)

      store.removeRingBeamConstructionMethod(method.id)
      expect(store.getAllRingBeamConstructionMethods()).toHaveLength(0)
    })

    it('should update ring beam construction method name', () => {
      const store = useConfigStore.getState()
      const material = createMaterialId()
      const config: RingBeamConfig = {
        type: 'full',
        height: createLength(60),
        width: createLength(360),
        material,
        offsetFromEdge: createLength(0)
      }

      const method = store.addRingBeamConstructionMethod('Original', config)

      store.updateRingBeamConstructionMethodName(method.id, 'Updated')

      const updated = store.getRingBeamConstructionMethodById(method.id)
      expect(updated?.name).toBe('Updated')
      expect(updated?.config).toEqual(config) // Config should remain unchanged
    })

    it('should update ring beam construction method config', () => {
      const store = useConfigStore.getState()
      const material = createMaterialId()
      const originalConfig: RingBeamConfig = {
        type: 'full',
        height: createLength(60),
        width: createLength(360),
        material,
        offsetFromEdge: createLength(0)
      }

      const method = store.addRingBeamConstructionMethod('Test Method', originalConfig)

      const newMaterial = createMaterialId()
      const newConfig: RingBeamConfig = {
        type: 'full',
        height: createLength(80),
        width: createLength(400),
        material: newMaterial,
        offsetFromEdge: createLength(10)
      }

      store.updateRingBeamConstructionMethodConfig(method.id, newConfig)

      const updated = store.getRingBeamConstructionMethodById(method.id)
      expect(updated?.name).toBe('Test Method') // Name should remain unchanged
      expect(updated?.config).toEqual(newConfig)
    })

    it('should handle validation errors for invalid config', () => {
      const store = useConfigStore.getState()
      const material = createMaterialId()
      const invalidConfig: RingBeamConfig = {
        type: 'full',
        height: createLength(0), // Invalid height
        width: createLength(360),
        material,
        offsetFromEdge: createLength(0)
      }

      expect(() => {
        store.addRingBeamConstructionMethod('Invalid Config', invalidConfig)
      }).toThrow('Ring beam height must be greater than 0')
    })

    it('should allow negative offset from edge', () => {
      const store = useConfigStore.getState()
      const material = createMaterialId()
      const config: RingBeamConfig = {
        type: 'full',
        height: createLength(60),
        width: createLength(360),
        material,
        offsetFromEdge: createLength(-50)
      }

      const method = store.addRingBeamConstructionMethod('Negative Offset Method', config)

      expect(method.config.type).toBe('full')
      if (method.config.type === 'full') {
        expect(method.config.offsetFromEdge).toBe(createLength(-50))
        expect(Number(method.config.offsetFromEdge)).toBe(-50)
      }
    })
  })
})
