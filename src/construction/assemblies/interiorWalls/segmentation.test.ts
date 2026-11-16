import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { OpeningWithGeometry, WallPostWithGeometry } from '@/building/model'
import { createOpeningAssemblyId, createOpeningId, createWallPostId } from '@/building/model/ids'
import { type StoreActions, getModelActions } from '@/building/store'
import { resolveOpeningAssembly, resolveOpeningConfig } from '@/construction/assemblies/openings'
import type { OpeningAssembly } from '@/construction/assemblies/openings/types'
import { constructWallPost } from '@/construction/assemblies/perimeterWalls/posts'
import { WallConstructionArea } from '@/construction/assemblies/utils/WallConstructionArea'
import type { ConstructionResult } from '@/construction/model/results'
import { TAG_OPENING_DOOR, TAG_OPENING_SPACING, TAG_OPENING_WINDOW } from '@/construction/model/tags'
import type { Length } from '@/shared/geometry'
import { newVec3 } from '@/shared/geometry'
import { partial } from '@/test/helpers'

import { constructInteriorWallSegments } from './segmentation'

vi.mock('@/building/store', () => ({
  getModelActions: vi.fn()
}))

vi.mock('@/construction/assemblies/openings', () => ({
  resolveOpeningAssembly: vi.fn(),
  resolveOpeningConfig: vi.fn()
}))

vi.mock('@/construction/assemblies/perimeterWalls/posts', () => ({
  constructWallPost: vi.fn()
}))

const mockGetModelActions = vi.mocked(getModelActions)
const mockResolveOpeningAssembly = vi.mocked(resolveOpeningAssembly)
const mockResolveOpeningConfig = vi.mocked(resolveOpeningConfig)
const mockConstructWallPost = vi.mocked(constructWallPost)

const openingAssemblyId = createOpeningAssemblyId()
function* emptyResults(): Generator<ConstructionResult> {
  yield* []
}

const mockOpeningConstruct = vi.fn<OpeningAssembly['construct']>(() => emptyResults())
const openingAssembly = partial<OpeningAssembly>({
  getSegmentationPadding: vi.fn(() => 20),
  needsWallStands: vi.fn(() => true),
  construct: mockOpeningConstruct
})

const openings = new Map<string, OpeningWithGeometry>()
const posts = new Map<string, WallPostWithGeometry>()

function createArea(): WallConstructionArea {
  return new WallConstructionArea(newVec3(0, 0, 0), newVec3(3000, 300, 2400))
}

function createOpening(
  centerOffsetFromWallStart: Length,
  width: Length,
  overrides: Partial<OpeningWithGeometry> = {}
): OpeningWithGeometry {
  const opening = partial<OpeningWithGeometry>({
    id: createOpeningId(),
    type: 'opening',
    openingType: 'window',
    centerOffsetFromWallStart,
    width,
    height: 1000,
    sillHeight: 500,
    openingAssemblyId,
    ...overrides
  })
  openings.set(opening.id, opening)
  return opening
}

function createPost(centerOffsetFromWallStart: Length, overrides: Partial<WallPostWithGeometry> = {}) {
  const post = partial<WallPostWithGeometry>({
    id: createWallPostId(),
    type: 'post',
    centerOffsetFromWallStart,
    width: 100,
    thickness: 300,
    replacesPosts: true,
    material: 'material_post' as never,
    infillMaterial: 'material_infill' as never,
    ...overrides
  })
  posts.set(post.id, post)
  return post
}

function recordSegments() {
  const calls: {
    area: WallConstructionArea
    startsWithStud: boolean
    endsWithStud: boolean
    startAtEnd: boolean
  }[] = []

  const construct = function* (
    area: WallConstructionArea,
    startsWithStud: boolean,
    endsWithStud: boolean,
    startAtEnd: boolean
  ): Generator<ConstructionResult> {
    calls.push({ area, startsWithStud, endsWithStud, startAtEnd })
    yield* []
  }

  return { calls, construct }
}

function measurementLength(result: ConstructionResult): number {
  if (result.type !== 'measurement') throw new Error('Expected a measurement')
  return result.measurement.endPoint[0] - result.measurement.startPoint[0]
}

function areaResults(results: ConstructionResult[]) {
  return results.filter(result => result.type === 'area')
}

beforeEach(() => {
  openings.clear()
  posts.clear()
  vi.clearAllMocks()

  mockGetModelActions.mockReturnValue(
    partial<StoreActions>({
      getWallOpeningById: id => openings.get(id)!,
      getWallPostById: id => posts.get(id)!
    })
  )
  mockResolveOpeningAssembly.mockReturnValue(openingAssembly)
  mockResolveOpeningConfig.mockReturnValue({ padding: 10 } as never)
  mockConstructWallPost.mockImplementation(() => emptyResults())
})

describe('constructInteriorWallSegments', () => {
  it('constructs one segment when the wall has no entities', () => {
    const area = createArea()
    const segments = recordSegments()

    const results = Array.from(constructInteriorWallSegments(area, true, false, segments.construct, []))

    expect(results).toHaveLength(0)
    expect(segments.calls).toEqual([
      {
        area,
        startsWithStud: true,
        endsWithStud: false,
        startAtEnd: true
      }
    ])
  })

  it('splits around an opening and emits spacing measurements', () => {
    const opening = createOpening(1500, 400)
    const segments = recordSegments()

    const results = Array.from(
      constructInteriorWallSegments(createArea(), true, false, segments.construct, [opening.id], openingAssemblyId)
    )

    expect(
      segments.calls.map(call => ({
        position: call.area.position[0],
        width: call.area.size[0],
        startsWithStud: call.startsWithStud,
        endsWithStud: call.endsWithStud,
        startAtEnd: call.startAtEnd
      }))
    ).toEqual([
      { position: 0, width: 1280, startsWithStud: true, endsWithStud: true, startAtEnd: true },
      { position: 1720, width: 1280, startsWithStud: true, endsWithStud: false, startAtEnd: false }
    ])

    const spacingMeasurements = results.filter(
      result => result.type === 'measurement' && result.measurement.tags?.includes(TAG_OPENING_SPACING)
    )
    expect(spacingMeasurements).toHaveLength(2)
    expect(spacingMeasurements.map(measurementLength)).toEqual([1280, 1280])

    const areas = areaResults(results)
    expect(areas).toHaveLength(1)
    expect(areas[0].area.type).toBe('cuboid')
    if (areas[0].area.type !== 'cuboid') return
    expect(areas[0].area.sourceId).toBe(opening.id)
    expect(areas[0].area.tags).toContain(TAG_OPENING_WINDOW)
    expect(areas[0].area.transform[12]).toBe(1310)
    expect(areas[0].area.size).toEqual(newVec3(380, 300, 980))
  })

  it('does not create empty segments at the wall boundaries', () => {
    const opening = createOpening(220, 400, { openingType: 'door' })
    const segments = recordSegments()

    const results = Array.from(
      constructInteriorWallSegments(createArea(), true, true, segments.construct, [opening.id], openingAssemblyId)
    )

    expect(segments.calls).toHaveLength(1)
    expect(segments.calls[0].area.position[0]).toBe(440)
    expect(segments.calls[0].area.size[0]).toBe(2560)
    expect(segments.calls[0].startAtEnd).toBe(false)
    expect(areaResults(results)[0].area.tags).toContain(TAG_OPENING_DOOR)
  })

  it('merges adjacent compatible openings into one opening assembly call', () => {
    const first = createOpening(700, 400)
    const second = createOpening(1100, 400)
    const segments = recordSegments()

    Array.from(
      constructInteriorWallSegments(
        createArea(),
        false,
        false,
        segments.construct,
        [second.id, first.id],
        openingAssemblyId
      )
    )

    expect(mockOpeningConstruct).toHaveBeenCalledTimes(1)
    expect(mockOpeningConstruct.mock.calls[0][4]).toEqual([first, second])
  })

  it('does not merge adjacent openings with different assembly IDs', () => {
    const first = createOpening(700, 400)
    const second = createOpening(1100, 400, { openingAssemblyId: createOpeningAssemblyId() })
    const segments = recordSegments()

    Array.from(
      constructInteriorWallSegments(
        createArea(),
        false,
        false,
        segments.construct,
        [first.id, second.id],
        openingAssemblyId
      )
    )

    expect(mockOpeningConstruct).toHaveBeenCalledTimes(2)
  })

  it('constructs posts with adjusted areas and updates boundary stud flags', () => {
    const post = createPost(1500)
    const segments = recordSegments()

    Array.from(constructInteriorWallSegments(createArea(), true, true, segments.construct, [post.id]))

    expect(mockConstructWallPost).toHaveBeenCalledTimes(1)
    const postArea = mockConstructWallPost.mock.calls[0][0]
    expect(postArea.position[0]).toBe(1450)
    expect(postArea.size[0]).toBe(100)
    expect(
      segments.calls.map(call => [call.area.position[0], call.area.size[0], call.endsWithStud, call.startAtEnd])
    ).toEqual([
      [0, 1450, false, true],
      [1550, 1450, true, false]
    ])
  })

  it('requires boundary stands around posts that do not replace posts', () => {
    const post = createPost(1500, { replacesPosts: false })
    const segments = recordSegments()

    Array.from(constructInteriorWallSegments(createArea(), false, false, segments.construct, [post.id]))

    expect(segments.calls.map(call => [call.startsWithStud, call.endsWithStud])).toEqual([
      [false, true],
      [true, false]
    ])
  })
})
