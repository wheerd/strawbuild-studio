import { type Mock, type Mocked, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  OpeningWithGeometry,
  PerimeterWallWithGeometry,
  RingBeamAssemblyId,
  WallEntity,
  WallPostWithGeometry
} from '@/building/model'
import { type StoreyId, createOpeningId, createWallAssemblyId, createWallPostId } from '@/building/model/ids'
import { type StoreActions, getModelActions } from '@/building/store'
import { type OpeningAssemblyConfig, getConfigActions } from '@/construction/config'
import type { FloorAssembly } from '@/construction/floors'
import { WallConstructionArea } from '@/construction/geometry'
import { constructWallPost } from '@/construction/materials/posts'
import { resolveOpeningAssembly, resolveOpeningConfig } from '@/construction/openings/resolver'
import type { OpeningAssembly } from '@/construction/openings/types'
import { aggregateResults, yieldElement } from '@/construction/results'
import { resolveRingBeamAssembly } from '@/construction/ringBeams'
import { createCuboid } from '@/construction/shapes'
import type { StoreyContext } from '@/construction/storeys/context'
import {
  TAG_OPENING_SPACING,
  TAG_RING_BEAM_HEIGHT,
  TAG_WALL_CONSTRUCTION_HEIGHT,
  TAG_WALL_HEIGHT,
  TAG_WALL_LENGTH
} from '@/construction/tags'
import type { SegmentInfillMethod, WallLayersConfig } from '@/construction/walls'
import { Bounds3D, IDENTITY, type Length, type Vec3, ZERO_VEC2, newVec2, newVec3 } from '@/shared/geometry'
import { partial } from '@/test/helpers'

import type { WallCornerInfo } from './construction'
import { calculateWallCornerInfo, getWallContext } from './corners/corners'
import { type WallSegmentConstruction, segmentedWallConstruction } from './segmentation'

// Mock dependencies
vi.mock('./corners/corners', () => ({
  getWallContext: vi.fn(),
  calculateWallCornerInfo: vi.fn()
}))

vi.mock('@/construction/floors', () => ({
  FLOOR_ASSEMBLIES: {
    monolithic: {
      getTopOffset: vi.fn(() => 0),
      getBottomOffset: vi.fn(() => 0)
    },
    joist: {
      getTopOffset: vi.fn(() => 0),
      getBottomOffset: vi.fn(() => 0)
    }
  }
}))

vi.mock('@/construction/config', () => ({
  getConfigActions: vi.fn()
}))

vi.mock('@/shared/utils/formatLength', () => ({
  formatLength: vi.fn((length: Length) => `${length}mm`)
}))

vi.mock('@/construction/openings/resolver', () => ({
  resolveOpeningAssembly: vi.fn(),
  resolveOpeningConfig: vi.fn()
}))

vi.mock('@/construction/ringBeams', () => ({
  resolveRingBeamAssembly: vi.fn()
}))

vi.mock('@/construction/materials/posts', () => ({
  constructWallPost: vi.fn()
}))

const mockResolveOpeningAssembly = vi.mocked(resolveOpeningAssembly)
const mockResolveOpeningConfig = vi.mocked(resolveOpeningConfig)
const mockGetWallContext = vi.mocked(getWallContext)
const mockCalculateWallCornerInfo = vi.mocked(calculateWallCornerInfo)
const mockGetConfigActions = vi.mocked(getConfigActions)
const mockResolveRingBeamAssembly = vi.mocked(resolveRingBeamAssembly)
const mockConstructWallPost = vi.mocked(constructWallPost)

vi.mock('@/building/store', () => ({
  getModelActions: vi.fn()
}))

const mockOpenings: OpeningWithGeometry[] = []
const mockPosts: WallPostWithGeometry[] = []

vi.mocked(getModelActions).mockReturnValue(
  partial<StoreActions>({
    getWallOpeningById: id => mockOpenings.find(o => o.id === id)!,
    getWallPostById: id => mockPosts.find(p => p.id === id)!,
    getRoofsByStorey: () => []
  })
)

// Test data helpers
function createMockWall(
  id: string,
  wallLength: Length,
  thickness: Length,
  entities: WallEntity[] = []
): PerimeterWallWithGeometry {
  return {
    id: id as any,
    perimeterId: 'test-perimeter' as any,
    startCornerId: 'start-corner' as any,
    endCornerId: 'end-corner' as any,
    polygon: { points: [] },
    wallAssemblyId: createWallAssemblyId(),
    topRingBeamAssemblyId: 'top-assembly' as RingBeamAssemblyId,
    baseRingBeamAssemblyId: 'base-assembly' as RingBeamAssemblyId,
    thickness,
    wallLength,
    insideLength: wallLength,
    outsideLength: wallLength,
    entityIds: entities.map(e => e.id),
    insideLine: {
      start: ZERO_VEC2,
      end: newVec2(wallLength, 0)
    },
    outsideLine: {
      start: newVec2(0, thickness),
      end: newVec2(wallLength, thickness)
    },
    direction: newVec2(1, 0),
    outsideDirection: newVec2(0, 1)
  }
}

function createMockOpening(
  centerOffsetFromWallStart: Length,
  width: Length,
  height: Length = 1200,
  sillHeight: Length = 900
): OpeningWithGeometry {
  return partial<OpeningWithGeometry>({
    id: createOpeningId(),
    type: 'opening',
    openingType: 'window',
    centerOffsetFromWallStart,
    width,
    height,
    sillHeight
  })
}

function createMockPost(
  centerOffsetFromWallStart: Length,
  width: Length = 60,
  thickness: Length = 360,
  replacesPosts = true
) {
  return partial<WallPostWithGeometry>({
    id: createWallPostId(),
    type: 'post',
    centerOffsetFromWallStart,
    width,
    thickness,
    replacesPosts
  })
}

function createMockCornerInfo(
  extensionStart: Length = 0,
  extensionEnd: Length = 0,
  constructionLength: Length = 3000
): WallCornerInfo {
  return {
    startCorner: {
      id: 'start-corner' as any,
      constructedByThisWall: true,
      extensionDistance: extensionStart
    },
    endCorner: {
      id: 'end-corner' as any,
      constructedByThisWall: true,
      extensionDistance: extensionEnd
    },
    extensionStart,
    extensionEnd,
    constructionLength,
    constructionInsideLine: {
      start: newVec2(-extensionStart, 0),
      end: newVec2(constructionLength - extensionStart, 0)
    },
    constructionOutsideLine: {
      start: newVec2(-extensionStart, 300),
      end: newVec2(constructionLength - extensionStart, 300)
    }
  }
}

function createMockLayers(): WallLayersConfig {
  return {
    insideThickness: 30,
    insideLayers: [],
    outsideThickness: 50,
    outsideLayers: []
  }
}

function createMockStoreyContext(storeyHeight: Length = 2500, wallHeight: Length = 2000): StoreyContext {
  return {
    storeyId: 'storey-id' as StoreyId,
    storeyHeight,
    roofBottom: wallHeight + 100,
    wallTop: wallHeight + 100,
    ceilingConstructionBottom: wallHeight + 90,
    finishedCeilingBottom: wallHeight + 80,
    finishedFloorTop: 120,
    floorConstructionTop: 110,
    wallBottom: 100,
    floorBottom: 0,
    floorAssembly: {} as FloorAssembly,
    perimeterContexts: []
  }
}

describe('segmentedWallConstruction', () => {
  let mockWallConstruction: Mocked<WallSegmentConstruction>
  let mockInfillMethod: Mock<SegmentInfillMethod>
  let mockOpeningConstruction: Mock<OpeningAssembly['construct']>
  let mockGetRingBeamAssemblyById: ReturnType<typeof vi.fn>
  let mockGetOpeningAssemblyById: Mock<() => OpeningAssemblyConfig>

  // Helper to create expected WallConstructionArea matcher
  function expectArea(position: Vec3, size: Vec3) {
    return expect.objectContaining({
      position: expect.objectContaining({
        0: position[0],
        1: position[1],
        2: position[2]
      }),
      size: expect.objectContaining({
        0: size[0],
        1: size[1],
        2: size[2]
      })
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock corner calculation
    mockGetWallContext.mockReturnValue({
      startCorner: {
        id: 'start' as any,
        perimeterId: 'unused' as any,
        nextWallId: 'unused' as any,
        previousWallId: 'unused' as any,
        referencePoint: ZERO_VEC2,
        polygon: { points: [] },
        insidePoint: ZERO_VEC2,
        outsidePoint: newVec2(0, 300),
        constructedByWall: 'next',
        interiorAngle: 90,
        exteriorAngle: 270
      },
      endCorner: {
        id: 'end' as any,
        perimeterId: 'unused' as any,
        nextWallId: 'unused' as any,
        previousWallId: 'unused' as any,
        referencePoint: ZERO_VEC2,
        polygon: { points: [] },
        insidePoint: newVec2(3000, 0),
        outsidePoint: newVec2(3000, 300),
        constructedByWall: 'previous',
        interiorAngle: 90,
        exteriorAngle: 270
      },
      previousWall: {} as any,
      nextWall: {} as any
    })

    mockCalculateWallCornerInfo.mockReturnValue(createMockCornerInfo())

    // Mock config actions
    mockGetRingBeamAssemblyById = vi.fn()
    mockGetOpeningAssemblyById = vi.fn()
    mockGetConfigActions.mockReturnValue({
      getRingBeamAssemblyById: mockGetRingBeamAssemblyById,
      getOpeningAssemblyById: mockGetOpeningAssemblyById
    } as any)

    // Mock ring beam assemblies
    mockGetRingBeamAssemblyById.mockReturnValue({
      id: 'ring-beam'
    })
    mockResolveRingBeamAssembly.mockReturnValue({
      construct: vi.fn(),
      height: 60
    })

    // Mock ring beam assemblies
    mockGetOpeningAssemblyById.mockReturnValue({
      padding: 15
    } as any)

    // Mock construction functions
    mockWallConstruction = vi.fn(function* (
      _area: WallConstructionArea,
      _startsWithStand: boolean,
      _endsWithStand: boolean,
      _startAtEnd: boolean
    ) {
      yield* yieldElement({
        id: 'wall-element' as any,
        material: 'material' as any,
        shape: createCuboid(newVec3(100, 100, 100)),
        transform: IDENTITY,
        bounds: Bounds3D.fromMinMax(newVec3(0, 0, 0), newVec3(100, 100, 100))
      })
    })

    mockOpeningConstruction = vi.fn(function* (
      _area: WallConstructionArea,
      _adjustedHeader: Length,
      _adjustedSill: Length,
      _infill: SegmentInfillMethod
    ) {
      yield* yieldElement({
        id: 'opening-element' as any,
        material: 'material' as any,
        shape: createCuboid(newVec3(50, 50, 50)),
        transform: IDENTITY,
        bounds: Bounds3D.fromMinMax(newVec3(0, 0, 0), newVec3(50, 50, 50))
      })
    })

    mockInfillMethod = vi.fn()

    mockResolveOpeningAssembly.mockReturnValue({
      construct: mockOpeningConstruction as any,
      segmentationPadding: 0,
      needsWallStands: true
    })

    mockResolveOpeningConfig.mockReturnValue({
      padding: 15
    } as any)
  })

  describe('basic functionality', () => {
    it('should generate corner areas, measurements, and wall construction for wall with no openings', () => {
      const wall = createMockWall('wall-1', 3000, 300)
      const storeyHeight = 3000
      const wallHeight = 2500
      const layers = createMockLayers()

      const results = [
        ...segmentedWallConstruction(
          wall,
          createMockStoreyContext(storeyHeight, wallHeight),
          layers,
          mockWallConstruction,
          mockInfillMethod
        )
      ]
      const { elements, measurements, areas } = aggregateResults(results)

      // Should generate areas
      expect(areas).toHaveLength(5)
      expect(areas.flatMap(a => a.areaType)).toEqual(
        expect.arrayContaining(['corner', 'corner', 'bottom-plate', 'top-plate', 'floor-level'])
      )

      // Should generate wall length/height measurement
      expect(measurements).toHaveLength(8)
      expect(measurements.flatMap(m => m.tags)).toEqual(
        expect.arrayContaining([TAG_WALL_LENGTH, TAG_WALL_HEIGHT, TAG_WALL_CONSTRUCTION_HEIGHT, TAG_RING_BEAM_HEIGHT])
      )

      // Should call wall construction once for entire wall
      expect(mockWallConstruction).toHaveBeenCalledTimes(1)
      expect(mockWallConstruction).toHaveBeenCalledWith(
        expectArea(
          newVec3(-0, 30, 60), // position: [-extensionStart, insideThickness, basePlateHeight]
          newVec3(3000, 220, 2380) // size: [constructionLength, thickness-layers, wallHeight-plates]
        ),
        true, // startsWithStand
        true, // endsWithStand
        false // startAtEnd
      )

      // Should not call opening construction
      expect(mockOpeningConstruction).not.toHaveBeenCalled()

      // Should include wall construction elements
      expect(elements).toHaveLength(1)
      expect(elements[0].id).toBe('wall-element')
    })

    it('should handle extensions from corner info', () => {
      const wall = createMockWall('wall-1', 3000, 300)
      const wallHeight = 2500
      const layers = createMockLayers()

      // Mock corner info with extensions
      const cornerInfo = createMockCornerInfo(100, 150, 3250)
      mockCalculateWallCornerInfo.mockReturnValue(cornerInfo)

      const results = [
        ...segmentedWallConstruction(
          wall,
          createMockStoreyContext(3000, wallHeight),
          layers,
          mockWallConstruction,
          mockInfillMethod
        )
      ]
      const { measurements } = aggregateResults(results)

      // Should include extensions in wall construction
      expect(mockWallConstruction).toHaveBeenCalledWith(
        expectArea(
          newVec3(-100, 30, 60), // position includes start extension
          newVec3(3250, 220, 2380) // size includes total construction length
        ),
        true,
        true,
        true // startAtEnd = true when extensionEnd > 0
      )

      // Measurement should reflect construction length
      expect(measurements[0].endPoint[0] - measurements[0].startPoint[0]).toBe(3250)
    })

    it('should calculate positions based on ring beam heights', () => {
      const wall = {
        ...createMockWall('wall-1', 3000, 300),
        baseRingBeamAssemblyId: 'base-assembly' as any,
        topRingBeamAssemblyId: 'top-assembly' as any
      }
      const wallHeight = 2500
      const layers = createMockLayers()

      // Mock different ring beam heights
      mockResolveRingBeamAssembly
        .mockReturnValueOnce({ construct: vi.fn(), height: 80 }) // base
        .mockReturnValueOnce({ construct: vi.fn(), height: 100 }) // top

      const results = [
        ...segmentedWallConstruction(
          wall,
          createMockStoreyContext(3000, wallHeight),
          layers,
          mockWallConstruction,
          mockInfillMethod
        )
      ]
      aggregateResults(results)

      // Should call wall construction once
      expect(mockWallConstruction).toHaveBeenCalledTimes(1)
      expect(mockWallConstruction).toHaveBeenCalledWith(
        expectArea(
          newVec3(-0, 30, 80), // z position = base plate height
          newVec3(3000, 220, 2320) // z size = wallHeight - base - top
        ),
        true,
        true,
        false
      )
    })
  })

  describe('opening handling', () => {
    it('should create segments for wall with single opening in middle', () => {
      const opening = createMockOpening(1400, 800)
      mockOpenings.push(opening)
      const wall = createMockWall('wall-1', 3000, 300, [opening])
      const wallHeight = 2500
      const layers = createMockLayers()

      const results = [
        ...segmentedWallConstruction(
          wall,
          createMockStoreyContext(3000, wallHeight),
          layers,
          mockWallConstruction,
          mockInfillMethod
        )
      ]
      const { measurements } = aggregateResults(results)

      // Should call wall construction twice (before and after opening)
      expect(mockWallConstruction).toHaveBeenCalledTimes(2)

      // First wall segment (before opening)
      expect(mockWallConstruction).toHaveBeenNthCalledWith(
        1,
        expectArea(newVec3(0, 30, 60), newVec3(1000, 220, 2380)),
        true,
        true,
        false
      )

      // Second wall segment (after opening)
      expect(mockWallConstruction).toHaveBeenNthCalledWith(
        2,
        expectArea(
          newVec3(1800, 30, 60), // 1000 + 800
          newVec3(1200, 220, 2380) // 3000 - 1800
        ),
        true,
        true,
        true
      )

      // Should call opening construction once
      expect(mockOpeningConstruction).toHaveBeenCalledTimes(1)
      expect(mockOpeningConstruction).toHaveBeenCalledWith(
        expectArea(newVec3(1000, 30, 60), newVec3(800, 220, 2380)),
        2060,
        860,
        mockInfillMethod
      )

      // Should generate segment measurements for both wall segments
      const segmentMeasurements = measurements.filter(m => m.tags?.includes(TAG_OPENING_SPACING))
      expect(segmentMeasurements).toHaveLength(2)
    })

    it('should handle opening at start of wall', () => {
      const opening = createMockOpening(400, 800)
      mockOpenings.push(opening)
      const wall = createMockWall('wall-1', 3000, 300, [opening])
      const wallHeight = 2500
      const layers = createMockLayers()

      const results = [
        ...segmentedWallConstruction(
          wall,
          createMockStoreyContext(3000, wallHeight),
          layers,
          mockWallConstruction,
          mockInfillMethod
        )
      ]
      aggregateResults(results)

      // Should call wall construction once (after opening)
      expect(mockWallConstruction).toHaveBeenCalledTimes(1)
      expect(mockWallConstruction).toHaveBeenCalledWith(
        expectArea(newVec3(800, 30, 60), newVec3(2200, 220, 2380)),
        true,
        true,
        true
      )

      // Should call opening construction once
      expect(mockOpeningConstruction).toHaveBeenCalledWith(
        expectArea(newVec3(0, 30, 60), newVec3(800, 220, 2380)),
        2060,
        860,
        mockInfillMethod
      )
    })

    it('should handle opening at end of wall', () => {
      const opening = createMockOpening(2600, 800)
      mockOpenings.push(opening)
      const wall = createMockWall('wall-1', 3000, 300, [opening])
      const wallHeight = 2500
      const layers = createMockLayers()

      const results = [
        ...segmentedWallConstruction(
          wall,
          createMockStoreyContext(3000, wallHeight),
          layers,
          mockWallConstruction,
          mockInfillMethod
        )
      ]
      aggregateResults(results)

      // Should call wall construction once (before opening)
      expect(mockWallConstruction).toHaveBeenCalledTimes(1)
      expect(mockWallConstruction).toHaveBeenCalledWith(
        expectArea(newVec3(0, 30, 60), newVec3(2200, 220, 2380)),
        true,
        true,
        false
      )

      // Should call opening construction once
      expect(mockOpeningConstruction).toHaveBeenCalledWith(
        expectArea(newVec3(2200, 30, 60), newVec3(800, 220, 2380)),
        2060,
        860,
        mockInfillMethod
      )
    })

    it('should merge adjacent openings with same sill and header heights', () => {
      const opening1 = createMockOpening(1400, 800, 1200, 900)
      const opening2 = createMockOpening(2100, 600, 1200, 900)
      mockOpenings.push(opening1, opening2)
      const wall = createMockWall('wall-1', 4000, 300, [opening1, opening2])
      const wallHeight = 2500
      const layers = createMockLayers()

      const results = [
        ...segmentedWallConstruction(
          wall,
          createMockStoreyContext(3000, wallHeight),
          layers,
          mockWallConstruction,
          mockInfillMethod
        )
      ]
      aggregateResults(results)

      // Should call opening construction once with both openings merged
      expect(mockOpeningConstruction).toHaveBeenCalledTimes(1)
      expect(mockOpeningConstruction).toHaveBeenCalledWith(
        expectArea(
          newVec3(1000, 30, 60),
          newVec3(1400, 220, 2380) // combined width: 800 + 600
        ),
        2060,
        860,
        mockInfillMethod
      )
    })

    it('should not merge adjacent openings with different sill heights', () => {
      const opening1 = createMockOpening(1000, 800, 1200, 900)
      const opening2 = createMockOpening(1800, 600, 1200, 1000) // different sill
      mockOpenings.push(opening1, opening2)
      const wall = createMockWall('wall-1', 4000, 300, [opening1, opening2])
      const wallHeight = 2500
      const layers = createMockLayers()

      const results = [
        ...segmentedWallConstruction(
          wall,
          createMockStoreyContext(3000, wallHeight),
          layers,
          mockWallConstruction,
          mockInfillMethod
        )
      ]
      aggregateResults(results)

      // Should call opening construction twice - separate openings
      expect(mockOpeningConstruction).toHaveBeenCalledTimes(2)
    })

    it('should not merge adjacent openings with different header heights', () => {
      const opening1 = createMockOpening(1000, 800, 1200, 900)
      const opening2 = createMockOpening(1800, 600, 1300, 900) // different height
      mockOpenings.push(opening1, opening2)
      const wall = createMockWall('wall-1', 4000, 300, [opening1, opening2])
      const wallHeight = 2500
      const layers = createMockLayers()

      const results = [
        ...segmentedWallConstruction(
          wall,
          createMockStoreyContext(3000, wallHeight),
          layers,
          mockWallConstruction,
          mockInfillMethod
        )
      ]
      aggregateResults(results)

      // Should call opening construction twice
      expect(mockOpeningConstruction).toHaveBeenCalledTimes(2)
    })

    it('should sort openings by position', () => {
      // Create openings in wrong order
      const opening1 = createMockOpening(2300, 600)
      const opening2 = createMockOpening(900, 800)
      mockOpenings.push(opening1, opening2)
      const wall = createMockWall('wall-1', 4000, 300, [opening1, opening2])
      const wallHeight = 2500
      const layers = createMockLayers()

      const results = [
        ...segmentedWallConstruction(
          wall,
          createMockStoreyContext(3000, wallHeight),
          layers,
          mockWallConstruction,
          mockInfillMethod
        )
      ]
      aggregateResults(results)

      // Should process opening2 first (at position 500), then opening1 (at position 2000)
      expect(mockOpeningConstruction).toHaveBeenNthCalledWith(
        1,
        expectArea(newVec3(500, 30, 60), newVec3(800, 220, 2380)),
        2060,
        860,
        mockInfillMethod
      )
      expect(mockOpeningConstruction).toHaveBeenNthCalledWith(
        2,
        expectArea(newVec3(2000, 30, 60), newVec3(600, 220, 2380)),
        2060,
        860,
        mockInfillMethod
      )
    })
  })

  describe('ring beam integration', () => {
    it('should handle missing ring beam assemblies gracefully', () => {
      const wall = {
        ...createMockWall('wall-1', 3000, 300),
        baseRingBeamAssemblyId: undefined,
        topRingBeamAssemblyId: undefined
      }

      const wallHeight = 2500
      const layers = createMockLayers()

      mockGetRingBeamAssemblyById.mockReturnValue(null)

      const results = [
        ...segmentedWallConstruction(
          wall,
          createMockStoreyContext(3000, wallHeight),
          layers,
          mockWallConstruction,
          mockInfillMethod
        )
      ]
      aggregateResults(results)

      // Should use 0 height for missing ring beams
      expect(mockWallConstruction).toHaveBeenCalledTimes(1)
      expect(mockWallConstruction).toHaveBeenCalledWith(
        expectArea(
          newVec3(-0, 30, 0), // z = 0 when no base plate
          newVec3(3000, 220, 2500) // full wall height when no plates
        ),
        true,
        true,
        false
      )
    })

    it('should call getRingBeamAssemblyById with correct IDs', () => {
      const wall = {
        ...createMockWall('wall-1', 3000, 300),
        baseRingBeamAssemblyId: 'base-assembly-id' as any,
        topRingBeamAssemblyId: 'top-assembly-id' as any
      }

      const wallHeight = 2500
      const layers = createMockLayers()

      const results = [
        ...segmentedWallConstruction(
          wall,
          createMockStoreyContext(3000, wallHeight),
          layers,
          mockWallConstruction,
          mockInfillMethod
        )
      ]
      aggregateResults(results)

      expect(mockGetRingBeamAssemblyById).toHaveBeenCalledWith('base-assembly-id')
      expect(mockGetRingBeamAssemblyById).toHaveBeenCalledWith('top-assembly-id')
    })
  })

  describe('corner area generation', () => {
    it('should generate corner areas based on corner info', () => {
      const wall = createMockWall('wall-1', 3000, 300)
      const wallHeight = 2500
      const layers = createMockLayers()

      const cornerInfo = createMockCornerInfo(100, 150)
      mockCalculateWallCornerInfo.mockReturnValue(cornerInfo)

      const results = [
        ...segmentedWallConstruction(
          wall,
          createMockStoreyContext(3000, wallHeight),
          layers,
          mockWallConstruction,
          mockInfillMethod
        )
      ]
      const { areas } = aggregateResults(results)

      expect(areas.length).toBeGreaterThanOrEqual(2)

      const corners = areas.filter(a => a.areaType === 'corner')

      // Start corner area
      expect(corners[0]).toEqual({
        type: 'polygon',
        areaType: 'corner',
        renderPosition: 'top',
        plane: 'xz',
        polygon: {
          points: [newVec2(-100, 0), newVec2(-100, 2500), newVec2(0, 2500), newVec2(0, 0)]
        },
        cancelKey: 'corner-start-corner'
      })

      // End corner area
      expect(corners[1]).toEqual({
        type: 'polygon',
        areaType: 'corner',
        renderPosition: 'top',
        plane: 'xz',
        polygon: {
          points: [newVec2(3000, 0), newVec2(3000, 2500), newVec2(3150, 2500), newVec2(3150, 0)]
        },
        cancelKey: 'corner-end-corner'
      })
    })
  })

  describe('post handling', () => {
    beforeEach(() => {
      // Mock post construction to yield a simple element
      mockConstructWallPost.mockImplementation(function* () {
        yield* yieldElement({
          id: 'post-element' as any,
          material: 'wood' as any,
          shape: createCuboid(newVec3(60, 220, 2380)),
          transform: IDENTITY,
          bounds: Bounds3D.fromMinMax(newVec3(0, 0, 0), newVec3(60, 220, 2380))
        })
      })
    })

    it('should create segments for wall with single post in middle', () => {
      const post = createMockPost(1500, 60, 360, true)
      mockPosts.push(post)
      const wall = createMockWall('wall-1', 3000, 300, [post])
      const wallHeight = 2500
      const layers = createMockLayers()

      const results = [
        ...segmentedWallConstruction(
          wall,
          createMockStoreyContext(3000, wallHeight),
          layers,
          mockWallConstruction,
          mockInfillMethod
        )
      ]
      const { measurements } = aggregateResults(results)

      // Should call wall construction twice (before and after post)
      expect(mockWallConstruction).toHaveBeenCalledTimes(2)

      // First wall segment (before post)
      expect(mockWallConstruction).toHaveBeenNthCalledWith(
        1,
        expectArea(newVec3(0, 30, 60), newVec3(1470, 220, 2380)), // 1500 - 30 (half of 60mm post width)
        true,
        false, // post replacesPosts=true, so no stand needed
        false
      )

      // Second wall segment (after post)
      expect(mockWallConstruction).toHaveBeenNthCalledWith(
        2,
        expectArea(
          newVec3(1530, 30, 60), // 1500 + 30 (half of 60mm post width)
          newVec3(1470, 220, 2380) // 3000 - 1530
        ),
        false, // post replacesPosts=true, so no stand needed
        true,
        true
      )

      // Should call post construction once
      expect(mockConstructWallPost).toHaveBeenCalledTimes(1)
      expect(mockConstructWallPost).toHaveBeenCalledWith(
        expectArea(newVec3(1470, 30, 60), newVec3(60, 220, 2380)),
        post
      )

      // Should generate segment measurements for overall wall
      const segmentMeasurements = measurements.filter(m => m.tags?.includes(TAG_OPENING_SPACING))
      expect(segmentMeasurements).toHaveLength(1)
    })

    it('should handle post with replacesPosts=false (requires wall stands)', () => {
      const post = createMockPost(1500, 60, 360, false) // replacesPosts=false
      mockPosts.push(post)
      const wall = createMockWall('wall-1', 3000, 300, [post])
      const wallHeight = 2500
      const layers = createMockLayers()

      const results = [
        ...segmentedWallConstruction(
          wall,
          createMockStoreyContext(3000, wallHeight),
          layers,
          mockWallConstruction,
          mockInfillMethod
        )
      ]
      aggregateResults(results)

      // Should call wall construction twice with stands at post position
      expect(mockWallConstruction).toHaveBeenCalledTimes(2)

      // First segment should END with stand (replacesPosts=false means stand needed)
      expect(mockWallConstruction).toHaveBeenNthCalledWith(
        1,
        expectArea(newVec3(0, 30, 60), newVec3(1470, 220, 2380)),
        true,
        true, // replacesPosts=false, so stand needed
        false
      )

      // Second segment should START with stand
      expect(mockWallConstruction).toHaveBeenNthCalledWith(
        2,
        expectArea(newVec3(1530, 30, 60), newVec3(1470, 220, 2380)),
        true, // replacesPosts=false, so stand needed
        true,
        true
      )
    })

    it('should handle wall with post and opening (post before opening)', () => {
      const post = createMockPost(900, 60, 360, true)
      mockPosts.push(post)
      const opening = createMockOpening(2000, 800)
      mockOpenings.push(opening)
      const wall = createMockWall('wall-1', 4000, 300, [post, opening])
      const wallHeight = 2500
      const layers = createMockLayers()

      const results = [
        ...segmentedWallConstruction(
          wall,
          createMockStoreyContext(3000, wallHeight),
          layers,
          mockWallConstruction,
          mockInfillMethod
        )
      ]
      const aggregated = aggregateResults(results)

      // Should call wall construction 3 times (before post, between post and opening, after opening)
      expect(mockWallConstruction).toHaveBeenCalledTimes(3)

      // Should call post construction once
      expect(mockConstructWallPost).toHaveBeenCalledTimes(1)

      // Should call opening construction once
      expect(mockOpeningConstruction).toHaveBeenCalledTimes(1)

      // One opening spacing measurements on each side of opening
      const segmentMeasurements = aggregated.measurements.filter(m => m.tags?.includes(TAG_OPENING_SPACING))
      expect(segmentMeasurements).toHaveLength(2)
    })

    it('should handle wall with post and opening (post after opening)', () => {
      const opening = createMockOpening(1000, 800)
      mockOpenings.push(opening)
      const post = createMockPost(2500, 60, 360, true)
      mockPosts.push(post)
      const wall = createMockWall('wall-1', 4000, 300, [post, opening])
      const wallHeight = 2500
      const layers = createMockLayers()

      const results = [
        ...segmentedWallConstruction(
          wall,
          createMockStoreyContext(3000, wallHeight),
          layers,
          mockWallConstruction,
          mockInfillMethod
        )
      ]
      const aggregated = aggregateResults(results)

      // Should call wall construction 3 times
      expect(mockWallConstruction).toHaveBeenCalledTimes(3)

      // Should call opening construction once
      expect(mockOpeningConstruction).toHaveBeenCalledTimes(1)

      // Should call post construction once
      expect(mockConstructWallPost).toHaveBeenCalledTimes(1)

      // One opening spacing measurements on each side of opening
      const segmentMeasurements = aggregated.measurements.filter(m => m.tags?.includes(TAG_OPENING_SPACING))
      expect(segmentMeasurements).toHaveLength(2)
    })

    it('should handle multiple posts on wall', () => {
      const post1 = createMockPost(1000, 60, 360, true)
      const post2 = createMockPost(2000, 60, 360, true)
      mockPosts.push(post1, post2)
      const wall = createMockWall('wall-1', 3000, 300, [post1, post2])
      const wallHeight = 2500
      const layers = createMockLayers()

      const results = [
        ...segmentedWallConstruction(
          wall,
          createMockStoreyContext(3000, wallHeight),
          layers,
          mockWallConstruction,
          mockInfillMethod
        )
      ]
      aggregateResults(results)

      // Should call wall construction 3 times (before first post, between posts, after second post)
      expect(mockWallConstruction).toHaveBeenCalledTimes(3)

      // Should call post construction twice
      expect(mockConstructWallPost).toHaveBeenCalledTimes(2)
    })

    it('should process posts and openings in correct position order', () => {
      // Create items in intentionally wrong order to test sorting
      const opening = createMockOpening(2500, 600)
      mockOpenings.push(opening)
      const post = createMockPost(1000, 60)
      mockPosts.push(post)
      const wall = createMockWall('wall-1', 4000, 300, [post, opening])
      const wallHeight = 2500
      const layers = createMockLayers()

      const results = [
        ...segmentedWallConstruction(
          wall,
          createMockStoreyContext(3000, wallHeight),
          layers,
          mockWallConstruction,
          mockInfillMethod
        )
      ]
      aggregateResults(results)

      // Should process post first (at 1000), then opening (at 2500)
      // Wall construction should be called 3 times: before post, between post and opening, after opening
      expect(mockWallConstruction).toHaveBeenCalledTimes(3)

      // Verify post is constructed before opening
      const postCallIndex = mockConstructWallPost.mock.invocationCallOrder[0]
      const openingCallIndex = mockOpeningConstruction.mock.invocationCallOrder[0]
      expect(postCallIndex).toBeLessThan(openingCallIndex)
    })
  })
})
