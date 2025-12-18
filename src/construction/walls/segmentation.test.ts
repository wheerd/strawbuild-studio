import { vec3 } from 'gl-matrix'
import { type Mock, type Mocked, beforeEach, describe, expect, it, vi } from 'vitest'

import { createOpeningId, createPerimeterId, createWallAssemblyId } from '@/building/model/ids'
import type { Opening, Perimeter, PerimeterWall } from '@/building/model/model'
import { type OpeningAssemblyConfig, getConfigActions } from '@/construction/config'
import { IDENTITY, WallConstructionArea } from '@/construction/geometry'
import { resolveOpeningAssembly, resolveOpeningConfig } from '@/construction/openings/resolver'
import type { OpeningAssembly } from '@/construction/openings/types'
import { aggregateResults, yieldElement } from '@/construction/results'
import { createCuboid } from '@/construction/shapes'
import {
  TAG_OPENING_SPACING,
  TAG_RING_BEAM_HEIGHT,
  TAG_WALL_CONSTRUCTION_HEIGHT,
  TAG_WALL_HEIGHT,
  TAG_WALL_LENGTH
} from '@/construction/tags'
import type { InfillMethod, WallLayersConfig, WallSegmentConstruction } from '@/construction/walls'
import { newVec2 } from '@/shared/geometry'
import { Bounds3D, type Length } from '@/shared/geometry'

import type { WallCornerInfo } from './construction'
import { calculateWallCornerInfo, getWallContext } from './corners/corners'
import { type WallStoreyContext, segmentedWallConstruction } from './segmentation'

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

const mockResolveOpeningAssembly = vi.mocked(resolveOpeningAssembly)
const mockResolveOpeningConfig = vi.mocked(resolveOpeningConfig)
const mockGetWallContext = vi.mocked(getWallContext)
const mockCalculateWallCornerInfo = vi.mocked(calculateWallCornerInfo)
const mockGetConfigActions = vi.mocked(getConfigActions)

// Test data helpers
function createMockWall(id: string, wallLength: Length, thickness: Length, openings: Opening[] = []): PerimeterWall {
  return {
    id: id as any,
    wallAssemblyId: createWallAssemblyId(),
    thickness,
    wallLength,
    insideLength: wallLength,
    outsideLength: wallLength,
    openings,
    insideLine: {
      start: newVec2(0, 0),
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

function createMockPerimeter(walls: PerimeterWall[]): Perimeter {
  return {
    id: createPerimeterId(),
    storeyId: 'test-storey' as any,
    referenceSide: 'inside',
    referencePolygon: [],
    walls,
    corners: [],
    baseRingBeamAssemblyId: 'base-assembly' as any,
    topRingBeamAssemblyId: 'top-assembly' as any
  } as Perimeter
}

function createMockOpening(
  centerOffsetFromWallStart: Length,
  width: Length,
  height: Length = 1200,
  sillHeight: Length = 900
): Opening {
  return {
    id: createOpeningId(),
    type: 'window',
    centerOffsetFromWallStart,
    width,
    height,
    sillHeight
  }
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

function createMockStoreyContext(storeyHeight: Length = 2500, ceilingHeight: Length = 2000): WallStoreyContext {
  return {
    storeyHeight,
    floorConstructionThickness: 0,
    ceilingHeight,
    floorTopOffset: 0,
    ceilingBottomOffset: 0,
    ceilingBottomConstructionOffset: 0,
    floorTopConstructionOffset: 0,
    perimeterContexts: []
  }
}

describe('segmentedWallConstruction', () => {
  let mockWallConstruction: Mocked<WallSegmentConstruction>
  let mockInfillMethod: Mock<InfillMethod>
  let mockOpeningConstruction: Mock<OpeningAssembly<any>['construct']>
  let mockGetRingBeamAssemblyById: ReturnType<typeof vi.fn>
  let mockGetOpeningAssemblyById: Mock<() => OpeningAssemblyConfig>

  // Helper to create expected WallConstructionArea matcher
  function expectArea(position: vec3, size: vec3) {
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
        insidePoint: newVec2(0, 0),
        outsidePoint: newVec2(0, 300),
        constructedByWall: 'next',
        interiorAngle: 90,
        exteriorAngle: 270
      },
      endCorner: {
        id: 'end' as any,
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
        shape: createCuboid(vec3.fromValues(100, 100, 100)),
        transform: IDENTITY,
        bounds: Bounds3D.fromMinMax(vec3.fromValues(0, 0, 0), vec3.fromValues(100, 100, 100))
      })
    })

    mockOpeningConstruction = vi.fn(function* (
      _area: WallConstructionArea,
      _adjustedHeader: Length,
      _adjustedSill: Length,
      _config: any,
      _infill: InfillMethod
    ) {
      yield* yieldElement({
        id: 'opening-element' as any,
        material: 'material' as any,
        shape: createCuboid(vec3.fromValues(50, 50, 50)),
        transform: IDENTITY,
        bounds: Bounds3D.fromMinMax(vec3.fromValues(0, 0, 0), vec3.fromValues(50, 50, 50))
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
      const perimeter = createMockPerimeter([wall])
      const storeyHeight = 3000
      const wallHeight = 2500
      const layers = createMockLayers()

      const results = [
        ...segmentedWallConstruction(
          wall,
          perimeter,
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
      expect(measurements).toHaveLength(5)
      expect(measurements.flatMap(m => m.tags)).toEqual(
        expect.arrayContaining([TAG_WALL_LENGTH, TAG_WALL_HEIGHT, TAG_WALL_CONSTRUCTION_HEIGHT, TAG_RING_BEAM_HEIGHT])
      )

      // Should call wall construction once for entire wall
      expect(mockWallConstruction).toHaveBeenCalledTimes(1)
      expect(mockWallConstruction).toHaveBeenCalledWith(
        expectArea(
          vec3.fromValues(-0, 30, 60), // position: [-extensionStart, insideThickness, basePlateHeight]
          vec3.fromValues(3000, 220, 2380) // size: [constructionLength, thickness-layers, wallHeight-plates]
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
      const perimeter = createMockPerimeter([wall])
      const wallHeight = 2500
      const layers = createMockLayers()

      // Mock corner info with extensions
      const cornerInfo = createMockCornerInfo(100, 150, 3250)
      mockCalculateWallCornerInfo.mockReturnValue(cornerInfo)

      const results = [
        ...segmentedWallConstruction(
          wall,
          perimeter,
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
          vec3.fromValues(-100, 30, 60), // position includes start extension
          vec3.fromValues(3250, 220, 2380) // size includes total construction length
        ),
        true,
        true,
        true // startAtEnd = true when extensionEnd > 0
      )

      // Measurement should reflect construction length
      expect(measurements[0].endPoint[0] - measurements[0].startPoint[0]).toBe(3250)
    })

    it('should calculate positions based on ring beam heights', () => {
      const wall = createMockWall('wall-1', 3000, 300)
      const perimeter = createMockPerimeter([wall])
      const wallHeight = 2500
      const layers = createMockLayers()

      // Mock different ring beam heights
      mockGetRingBeamAssemblyById
        .mockReturnValueOnce({ height: 80 }) // base
        .mockReturnValueOnce({ height: 100 }) // top

      const results = [
        ...segmentedWallConstruction(
          wall,
          perimeter,
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
          vec3.fromValues(-0, 30, 80), // z position = base plate height
          vec3.fromValues(3000, 220, 2320) // z size = wallHeight - base - top
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
      const wall = createMockWall('wall-1', 3000, 300, [opening])
      const perimeter = createMockPerimeter([wall])
      const wallHeight = 2500
      const layers = createMockLayers()

      const results = [
        ...segmentedWallConstruction(
          wall,
          perimeter,
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
        expectArea(vec3.fromValues(0, 30, 60), vec3.fromValues(985, 220, 2380)),
        true,
        true,
        false
      )

      // Second wall segment (after opening)
      expect(mockWallConstruction).toHaveBeenNthCalledWith(
        2,
        expectArea(
          vec3.fromValues(1815, 30, 60), // 1000 + 800
          vec3.fromValues(1185, 220, 2380) // 3000 - 1800
        ),
        true,
        true,
        true
      )

      // Should call opening construction once
      expect(mockOpeningConstruction).toHaveBeenCalledTimes(1)
      expect(mockOpeningConstruction).toHaveBeenCalledWith(
        expectArea(vec3.fromValues(985, 30, 60), vec3.fromValues(830, 220, 2380)),
        2055,
        825,
        mockInfillMethod
      )

      // Should generate segment measurements for both wall segments
      const segmentMeasurements = measurements.filter(m => m.tags?.includes(TAG_OPENING_SPACING))
      expect(segmentMeasurements).toHaveLength(2)
    })

    it('should handle opening at start of wall', () => {
      const opening = createMockOpening(400, 800)
      const wall = createMockWall('wall-1', 3000, 300, [opening])
      const perimeter = createMockPerimeter([wall])
      const wallHeight = 2500
      const layers = createMockLayers()

      const results = [
        ...segmentedWallConstruction(
          wall,
          perimeter,
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
        expectArea(vec3.fromValues(815, 30, 60), vec3.fromValues(2185, 220, 2380)),
        true,
        true,
        true
      )

      // Should call opening construction once
      expect(mockOpeningConstruction).toHaveBeenCalledWith(
        expectArea(vec3.fromValues(-15, 30, 60), vec3.fromValues(830, 220, 2380)),
        2055,
        825,
        mockInfillMethod
      )
    })

    it('should handle opening at end of wall', () => {
      const opening = createMockOpening(2600, 800)
      const wall = createMockWall('wall-1', 3000, 300, [opening])
      const perimeter = createMockPerimeter([wall])
      const wallHeight = 2500
      const layers = createMockLayers()

      const results = [
        ...segmentedWallConstruction(
          wall,
          perimeter,
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
        expectArea(vec3.fromValues(0, 30, 60), vec3.fromValues(2185, 220, 2380)),
        true,
        true,
        false
      )

      // Should call opening construction once
      expect(mockOpeningConstruction).toHaveBeenCalledWith(
        expectArea(vec3.fromValues(2185, 30, 60), vec3.fromValues(815, 220, 2380)),
        2055,
        825,
        mockInfillMethod
      )
    })

    it('should merge adjacent openings with same sill and header heights', () => {
      const opening1 = createMockOpening(1400, 800, 1200, 900)
      const opening2 = createMockOpening(2100, 600, 1200, 900)
      const wall = createMockWall('wall-1', 4000, 300, [opening1, opening2])
      const perimeter = createMockPerimeter([wall])
      const wallHeight = 2500
      const layers = createMockLayers()

      const results = [
        ...segmentedWallConstruction(
          wall,
          perimeter,
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
          vec3.fromValues(985, 30, 60),
          vec3.fromValues(1430, 220, 2380) // combined width: 800 + 600
        ),
        2055,
        825,
        mockInfillMethod
      )
    })

    it('should not merge adjacent openings with different sill heights', () => {
      const opening1 = createMockOpening(1000, 800, 1200, 900)
      const opening2 = createMockOpening(1800, 600, 1200, 1000) // different sill
      const wall = createMockWall('wall-1', 4000, 300, [opening1, opening2])
      const perimeter = createMockPerimeter([wall])
      const wallHeight = 2500
      const layers = createMockLayers()

      const results = [
        ...segmentedWallConstruction(
          wall,
          perimeter,
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
      const wall = createMockWall('wall-1', 4000, 300, [opening1, opening2])
      const perimeter = createMockPerimeter([wall])
      const wallHeight = 2500
      const layers = createMockLayers()

      const results = [
        ...segmentedWallConstruction(
          wall,
          perimeter,
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
      const wall = createMockWall('wall-1', 4000, 300, [opening1, opening2])
      const perimeter = createMockPerimeter([wall])
      const wallHeight = 2500
      const layers = createMockLayers()

      const results = [
        ...segmentedWallConstruction(
          wall,
          perimeter,
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
        expectArea(vec3.fromValues(485, 30, 60), vec3.fromValues(830, 220, 2380)),
        2055,
        825,
        mockInfillMethod
      )
      expect(mockOpeningConstruction).toHaveBeenNthCalledWith(
        2,
        expectArea(vec3.fromValues(1985, 30, 60), vec3.fromValues(630, 220, 2380)),
        2055,
        825,
        mockInfillMethod
      )
    })
  })

  describe('ring beam integration', () => {
    it('should handle missing ring beam assemblies gracefully', () => {
      const wall = createMockWall('wall-1', 3000, 300)
      const perimeter = createMockPerimeter([wall])
      perimeter.baseRingBeamAssemblyId = undefined
      perimeter.topRingBeamAssemblyId = undefined

      const wallHeight = 2500
      const layers = createMockLayers()

      mockGetRingBeamAssemblyById.mockReturnValue(null)

      const results = [
        ...segmentedWallConstruction(
          wall,
          perimeter,
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
          vec3.fromValues(-0, 30, 0), // z = 0 when no base plate
          vec3.fromValues(3000, 220, 2500) // full wall height when no plates
        ),
        true,
        true,
        false
      )
    })

    it('should call getRingBeamAssemblyById with correct IDs', () => {
      const wall = createMockWall('wall-1', 3000, 300)
      const perimeter = createMockPerimeter([wall])
      perimeter.baseRingBeamAssemblyId = 'base-assembly-id' as any
      perimeter.topRingBeamAssemblyId = 'top-assembly-id' as any

      const wallHeight = 2500
      const layers = createMockLayers()

      const results = [
        ...segmentedWallConstruction(
          wall,
          perimeter,
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
      const perimeter = createMockPerimeter([wall])
      const wallHeight = 2500
      const layers = createMockLayers()

      const cornerInfo = createMockCornerInfo(100, 150)
      mockCalculateWallCornerInfo.mockReturnValue(cornerInfo)

      const results = [
        ...segmentedWallConstruction(
          wall,
          perimeter,
          createMockStoreyContext(3000, wallHeight),
          layers,
          mockWallConstruction,
          mockInfillMethod
        )
      ]
      const { areas } = aggregateResults(results)

      expect(areas.length).toBeGreaterThanOrEqual(2)

      // Start corner area
      expect(areas[0]).toEqual({
        type: 'polygon',
        areaType: 'corner',
        renderPosition: 'top',
        label: 'Corner',
        plane: 'xz',
        polygon: {
          points: [newVec2(-100, 0), newVec2(-100, 2500), newVec2(0, 2500), newVec2(0, 0)]
        },
        cancelKey: 'corner-start-corner'
      })

      // End corner area
      expect(areas[1]).toEqual({
        type: 'polygon',
        areaType: 'corner',
        renderPosition: 'top',
        label: 'Corner',
        plane: 'xz',
        polygon: {
          points: [newVec2(3000, 0), newVec2(3000, 2500), newVec2(3150, 2500), newVec2(3150, 0)]
        },
        cancelKey: 'corner-end-corner'
      })
    })
  })
})
