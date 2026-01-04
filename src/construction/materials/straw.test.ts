import { keyFromSelector } from 'i18next'
import { describe, expect, it, vi } from 'vitest'

import { type ConfigActions, getConfigActions } from '@/construction/config'
import type { ConstructionElement } from '@/construction/elements'
import { WallConstructionArea } from '@/construction/geometry'
import { aggregateResults } from '@/construction/results'
import type { CuboidShape } from '@/construction/shapes'
import { getPosition, newVec3 } from '@/shared/geometry'

import type { MaterialId, StrawbaleMaterial } from './material'
import { strawbale } from './material'
import { getMaterialsActions } from './store'
import { constructStraw } from './straw'

vi.mock('@/construction/config', () => ({
  getConfigActions: vi.fn()
}))
vi.mock('@/construction/materials/store', () => ({
  getMaterialsActions: vi.fn()
}))

const mockGetDefaultStrawMaterial = vi.fn()
const mockGetMaterialById = vi.fn()

vi.mocked(getConfigActions).mockReturnValue({
  getDefaultStrawMaterial: mockGetDefaultStrawMaterial
} as any as ConfigActions)

vi.mocked(getMaterialsActions).mockReturnValue({
  getMaterialById: mockGetMaterialById
} as any)

const mockMaterialId = 'test-material' as MaterialId

const createMaterial = (overrides: Partial<StrawbaleMaterial> = {}): StrawbaleMaterial => ({
  ...strawbale,
  id: mockMaterialId,
  ...overrides
})

describe('constructStraw', () => {
  beforeEach(() => {
    mockGetDefaultStrawMaterial.mockReset()
    mockGetMaterialById.mockReset()
    mockGetDefaultStrawMaterial.mockReturnValue(mockMaterialId)
    mockGetMaterialById.mockReturnValue(createMaterial())
  })

  describe('perfect fit scenarios', () => {
    it('should create a single full strawbale when dimensions match exactly', () => {
      const position = newVec3(0, 0, 0)
      const size = newVec3(800, 360, 500)

      const results = [...constructStraw(new WallConstructionArea(position, size))]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(1)

      const bale = elements[0]
      expect('material' in bale).toBe(true) // Should be ConstructionElement
      const baleElement = bale as ConstructionElement
      expect(baleElement.material).toBe(mockMaterialId)
      expect(baleElement.shape.base?.type).toBe('cuboid')
      expect(getPosition(baleElement.transform)).toEqual(newVec3(0, 0, 0))
      expect((baleElement.shape.base as CuboidShape).size).toEqual(newVec3(800, 360, 500))
    })

    it('should create multiple bales in a horizontal row', () => {
      const position = newVec3(0, 0, 0)
      const size = newVec3(1800, 360, 500) // 2 bales wide

      const results = [...constructStraw(new WallConstructionArea(position, size))]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(2)
    })
  })

  describe('error conditions', () => {
    it('should generate error when wall is too thick for single strawbale', () => {
      const position = newVec3(0, 0, 0)
      const size = newVec3(800, 400, 500) // Thicker than bale width

      const results = [...constructStraw(new WallConstructionArea(position, size))]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(1)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(1)

      expect(keyFromSelector(errors[0].messageKey)).toBe('construction.straw.tooThick')
      expect(getPosition(elements[0].transform)).toEqual(position)
      expect(((elements[0] as ConstructionElement).shape.base as CuboidShape).size).toEqual(size)
    })

    it('should generate warning when wall is too thin for single strawbale', () => {
      const position = newVec3(0, 0, 0)
      const size = newVec3(800, 300, 500) // Thinner than bale width

      const results = [...constructStraw(new WallConstructionArea(position, size))]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(1)
      expect(elements).toHaveLength(1)

      expect(keyFromSelector(warnings[0].messageKey)).toBe('construction.straw.tooThin')
      expect(getPosition(elements[0].transform)).toEqual(position)
      expect(((elements[0] as ConstructionElement).shape.base as CuboidShape).size).toEqual(size)
    })
  })

  describe('different configurations', () => {
    it('should work with custom bale dimensions', () => {
      mockGetMaterialById.mockReturnValue(
        createMaterial({
          baleMinLength: 1000,
          baleMaxLength: 1000,
          baleHeight: 400,
          baleWidth: 300
        })
      )

      const position = newVec3(0, 0, 0)
      const size = newVec3(1000, 300, 400)

      const results = [...constructStraw(new WallConstructionArea(position, size))]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(elements).toHaveLength(1)

      const bale = elements[0] as ConstructionElement
      expect((bale.shape.base as CuboidShape).size).toEqual(newVec3(1000, 300, 400))
    })

    it('should use provided material ID', () => {
      const customMaterialId = 'custom-straw-material' as MaterialId
      mockGetMaterialById.mockImplementation(id => createMaterial({ id }))

      const position = newVec3(0, 0, 0)
      const size = newVec3(800, 360, 500)

      const results = [...constructStraw(new WallConstructionArea(position, size), customMaterialId)]
      const { elements } = aggregateResults(results)

      expect(mockGetMaterialById).toHaveBeenCalledWith(customMaterialId)
      expect((elements[0] as ConstructionElement).material).toBe(customMaterialId)
    })
  })

  describe('construction element properties', () => {
    it('should generate unique IDs for each bale', () => {
      const position = newVec3(0, 0, 0)
      const size = newVec3(1600, 360, 500) // 2 bales

      const results = [...constructStraw(new WallConstructionArea(position, size))]
      const { elements } = aggregateResults(results)

      expect(elements).toHaveLength(2)
      expect(elements[0].id).not.toBe(elements[1].id)
      expect(elements[0].id).toBeTruthy()
      expect(elements[1].id).toBeTruthy()
    })
  })
})
