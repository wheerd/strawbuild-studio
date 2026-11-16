import { describe, expect, it, vi } from 'vitest'

import type { PerimeterId } from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { getPerimeterContextCached } from '@/construction/context/perimeterContextCache'
import { getWallStoreyContextCached } from '@/construction/context/storeys'
import { type Polygon2D, newVec2 } from '@/shared/geometry'

import { buildFloorCoreModel } from './builders'

vi.mock('@/building/store', () => ({
  getModelActions: vi.fn()
}))

vi.mock('@/construction/context/perimeterContextCache', () => ({
  getPerimeterContextCached: vi.fn()
}))

vi.mock('@/construction/context/storeys', () => ({
  getWallStoreyContextCached: vi.fn()
}))

vi.mock('@/construction/model/model', () => ({
  mergeModels: vi.fn((...models: unknown[]) => models[0]),
  transformModel: vi.fn((model: unknown) => model)
}))

vi.mock('@/construction/model/results', () => ({
  assignDeterministicIdsToModel: vi.fn(),
  resultsToModel: vi.fn(() => ({
    elements: [],
    measurements: [],
    areas: [],
    errors: [],
    warnings: {},
    bounds: {}
  }))
}))

const subtractPolygons = vi.hoisted(() => vi.fn((subjects: Polygon2D[], _clips: Polygon2D[]) => subjects))

vi.mock('@/shared/geometry', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/geometry')>()),
  intersectPolygons: vi.fn((subjects: Polygon2D[]) => subjects),
  subtractPolygons
}))

describe('buildFloorCoreModel', () => {
  it('subtracts partitions from the storey below when constructing the ceiling', () => {
    const currentPerimeterId = 'current-perimeter' as PerimeterId
    const belowPerimeterId = 'below-perimeter' as PerimeterId
    const currentStoreyId = 'current-storey'
    const belowStoreyId = 'below-storey'
    const currentPartition = { points: [newVec2(10, 10)] }
    const belowPartition = { points: [newVec2(20, 20)] }
    const floorHole = { points: [newVec2(30, 30)] }

    vi.mocked(getModelActions).mockReturnValue({
      getPerimeterById: vi.fn(() => ({ storeyId: currentStoreyId })),
      getStoreyBelow: vi.fn(() => ({ id: belowStoreyId })),
      getPerimetersByStorey: vi.fn(() => [{ id: belowPerimeterId }])
    } as never)

    vi.mocked(getPerimeterContextCached).mockImplementation(id => {
      if (id === currentPerimeterId) {
        return {
          outerFinishedPolygon: { points: [] },
          innerFinishedPolygon: { points: [] },
          floorOpenings: [floorHole],
          interiorWallAreas: [currentPartition]
        } as never
      }

      return {
        innerFinishedPolygon: { points: [] },
        interiorWallAreas: [belowPartition]
      } as never
    })

    const emptyModel = {
      elements: [],
      measurements: [],
      areas: [],
      errors: [],
      warnings: [],
      bounds: {}
    }
    const constructLayers = function* () {
      yield* []
    }

    vi.mocked(getWallStoreyContextCached).mockReturnValue({
      wallBottom: 0,
      floorConstructionTop: 0,
      finishedFloorBottom: 0,
      floorAssembly: {
        tags: [],
        construct: vi.fn(() => emptyModel),
        constructFloorLayers: constructLayers,
        constructCeilingLayers: constructLayers
      }
    } as never)

    subtractPolygons.mockClear()

    buildFloorCoreModel(currentPerimeterId)

    expect(subtractPolygons).toHaveBeenCalledTimes(2)
    expect(subtractPolygons.mock.calls[1][1]).toEqual([floorHole, belowPartition])
    expect(subtractPolygons.mock.calls[1][1]).not.toContain(currentPartition)
  })
})
