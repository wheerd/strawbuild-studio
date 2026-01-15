import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createPerimeterId, createPerimeterWallId } from '@/building/model/ids'
import { newVec2 } from '@/shared/geometry'

import { EntityHitTestService } from './EntityHitTestService'
import * as svgHitTesting from './svgHitTesting'

// Mock the svgHitTesting module
vi.mock('./svgHitTesting', () => ({
  findSvgEntityAt: vi.fn()
}))

describe('EntityHitTestService', () => {
  let service: EntityHitTestService

  beforeEach(() => {
    service = new EntityHitTestService()
    vi.clearAllMocks()
  })

  it('should return null when no element is found at coordinates', () => {
    vi.mocked(svgHitTesting.findSvgEntityAt).mockReturnValue(null)

    const result = service.findEntityAt(100, 100)

    expect(result).toBeNull()
    expect(svgHitTesting.findSvgEntityAt).toHaveBeenCalledWith(100, 100)
  })

  it('should return entity hit result when element is found', () => {
    const mockSvgElement = document.createElementNS('http://www.w3.org/2000/svg', 'polygon') as SVGElement
    const wallId = createPerimeterWallId()
    const perimeterId = createPerimeterId()

    vi.mocked(svgHitTesting.findSvgEntityAt).mockReturnValue({
      entityId: wallId,
      entityType: 'perimeter-wall',
      parentIds: [perimeterId],
      svgElement: mockSvgElement,
      clientPoint: { x: 100, y: 100 }
    })

    const result = service.findEntityAt(100, 100)

    expect(result).not.toBeNull()
    expect(result?.entityId).toBe(wallId)
    expect(result?.entityType).toBe('perimeter-wall')
    expect(result?.parentIds).toEqual([perimeterId])
    expect(result?.svgElement).toBe(mockSvgElement)
    expect(result?.clientPoint).toEqual({ x: 100, y: 100 })
    expect(result?.stagePoint).toEqual(newVec2(100, 100))
  })

  it('should handle backward compatibility method findEntityAtPointer', () => {
    const mockSvgElement = document.createElementNS('http://www.w3.org/2000/svg', 'polygon') as SVGElement
    const wallId = createPerimeterWallId()

    vi.mocked(svgHitTesting.findSvgEntityAt).mockReturnValue({
      entityId: wallId,
      entityType: 'perimeter-wall',
      parentIds: [],
      svgElement: mockSvgElement,
      clientPoint: { x: 150, y: 200 }
    })

    const result = service.findEntityAtPointer({ x: 150, y: 200 })

    expect(result).not.toBeNull()
    expect(result?.entityId).toBe(wallId)
    expect(svgHitTesting.findSvgEntityAt).toHaveBeenCalledWith(150, 200)
  })

  it('should report as initialized (no longer requires explicit initialization)', () => {
    expect(service.isInitialized()).toBe(true)
  })

  it('should handle initialize method as no-op (backward compatibility)', () => {
    expect(() => service.initialize()).not.toThrow()
    expect(service.isInitialized()).toBe(true)
  })
})
