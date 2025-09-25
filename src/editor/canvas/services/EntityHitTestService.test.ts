import type Konva from 'konva'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createPerimeterId, createPerimeterWallId } from '@/building/model/ids'

import { EntityHitTestService } from './EntityHitTestService'

// Mock Konva Stage
const mockStage = {
  getIntersection: vi.fn()
} as unknown as Konva.Stage

// Mock Konva Node with entity attributes
const mockNodeWithEntity = {
  getAttrs: vi.fn(() => ({
    entityId: createPerimeterWallId(),
    entityType: 'perimeter-wall',
    parentIds: [createPerimeterId()]
  })),
  getParent: vi.fn(() => null)
} as unknown as Konva.Node

const mockNodeWithoutEntity = {
  getAttrs: vi.fn(() => ({})),
  getParent: vi.fn(() => null)
} as unknown as Konva.Node

describe('EntityHitTestService', () => {
  let service: EntityHitTestService

  beforeEach(() => {
    service = new EntityHitTestService()
    vi.clearAllMocks()
  })

  it('should return null when stage is not initialized', () => {
    const result = service.findEntityAt({ x: 100, y: 100 })
    expect(result).toBeNull()
  })

  it('should return null when no node is intersected', () => {
    service.initialize(mockStage)
    ;(mockStage.getIntersection as any).mockReturnValue(null)

    const result = service.findEntityAt({ x: 100, y: 100 })
    expect(result).toBeNull()
    expect(mockStage.getIntersection).toHaveBeenCalledWith({ x: 100, y: 100 })
  })

  it('should return null when intersected node has no entity attributes', () => {
    service.initialize(mockStage)
    ;(mockStage.getIntersection as any).mockReturnValue(mockNodeWithoutEntity)

    const result = service.findEntityAt({ x: 100, y: 100 })
    expect(result).toBeNull()
  })

  it('should return entity hit result when intersected node has entity attributes', () => {
    service.initialize(mockStage)
    ;(mockStage.getIntersection as any).mockReturnValue(mockNodeWithEntity)

    const pointerCoords = { x: 100, y: 100 }
    const result = service.findEntityAt(pointerCoords)

    expect(result).not.toBeNull()
    expect(result?.entityType).toBe('perimeter-wall')
    expect(result?.parentIds).toHaveLength(1)
    expect(result?.stagePoint).toEqual([100, 100])
    expect(result?.konvaNode).toBe(mockNodeWithEntity)
  })

  it('should check if service is initialized correctly', () => {
    expect(service.isInitialized()).toBe(false)

    service.initialize(mockStage)
    expect(service.isInitialized()).toBe(true)
  })

  it('should walk up node tree to find entity attributes', () => {
    const parentNodeWithEntity = {
      getAttrs: vi.fn(() => ({
        entityId: createPerimeterId(),
        entityType: 'perimeter',
        parentIds: []
      })),
      getParent: vi.fn(() => null)
    } as unknown as Konva.Node

    const childNodeWithoutEntity = {
      getAttrs: vi.fn(() => ({})),
      getParent: vi.fn(() => parentNodeWithEntity)
    } as unknown as Konva.Node

    service.initialize(mockStage)
    ;(mockStage.getIntersection as any).mockReturnValue(childNodeWithoutEntity)

    const result = service.findEntityAt({ x: 100, y: 100 })

    expect(result).not.toBeNull()
    expect(result?.entityType).toBe('perimeter')
    expect(result?.parentIds).toHaveLength(0)
    expect(childNodeWithoutEntity.getParent).toHaveBeenCalled()
  })

  it('should find entity using pointer coordinates', () => {
    service.initialize(mockStage)
    ;(mockStage.getIntersection as any).mockReturnValue(mockNodeWithEntity)

    const pointerCoords = { x: 150, y: 200 }
    const result = service.findEntityAt(pointerCoords)

    expect(result).not.toBeNull()
    expect(result?.entityType).toBe('perimeter-wall')
    expect(result?.stagePoint).toEqual([150, 200])
    expect(mockStage.getIntersection).toHaveBeenCalledWith(pointerCoords)
  })

  it('should return null when using pointer coordinates but stage not initialized', () => {
    const result = service.findEntityAt({ x: 100, y: 100 })
    expect(result).toBeNull()
  })
})
