import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { FloorArea, FloorOpening, Perimeter, PerimeterWithGeometry } from '@/building/model'
import { type Vec2, newVec2 } from '@/shared/geometry'
import { partial } from '@/test/helpers'

import { FloorAreaTool } from './FloorAreaTool'

const mockModelActions = {
  addFloorArea: vi.fn(),
  addFloorOpening: vi.fn(),
  getActiveStoreyId: vi.fn(() => 'storey_1'),
  getPerimetersByStorey: vi.fn(() => [] as Perimeter[]),
  getFloorAreasByStorey: vi.fn(() => [] as FloorArea[]),
  getFloorOpeningsByStorey: vi.fn(() => [] as FloorOpening[])
}

vi.mock('@/building/store', () => ({
  getModelActions: () => mockModelActions
}))

describe('FloorAreaTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockModelActions.getActiveStoreyId.mockReturnValue('storey_1')
    mockModelActions.getPerimetersByStorey.mockReturnValue([])
    mockModelActions.getFloorAreasByStorey.mockReturnValue([])
    mockModelActions.getFloorOpeningsByStorey.mockReturnValue([])
  })

  it('calls addFloorArea when polygon is completed', () => {
    const tool = new FloorAreaTool()
    const points = [newVec2(0, 0), newVec2(100, 0), newVec2(100, 100)]
    tool.state.points = points
    tool.state.isClosingSegmentValid = true

    tool.complete()

    expect(mockModelActions.addFloorArea).toHaveBeenCalledTimes(1)
    expect(mockModelActions.addFloorArea).toHaveBeenCalledWith('storey_1', { points })
  })

  it('extends snapping context with perimeter and floor geometry', () => {
    const perimeter = partial<PerimeterWithGeometry>({
      outerPolygon: { points: [newVec2(1, 1), newVec2(2, 2), newVec2(3, 3)] }
    })

    const floorArea = partial<FloorArea>({
      area: { points: [newVec2(0, 0), newVec2(0, 200), newVec2(200, 200)] }
    })

    const floorOpening = partial<FloorOpening>({
      area: { points: [newVec2(50, 50), newVec2(80, 50), newVec2(80, 80)] }
    })

    mockModelActions.getPerimetersByStorey.mockReturnValue([perimeter])
    mockModelActions.getFloorAreasByStorey.mockReturnValue([floorArea])
    mockModelActions.getFloorOpeningsByStorey.mockReturnValue([floorOpening])

    const tool = new FloorAreaTool()
    const baseContext = {
      snapPoints: [] as Vec2[],
      alignPoints: [] as Vec2[],
      referenceLineSegments: []
    }

    const result = (
      tool as unknown as { extendSnapContext: (ctx: typeof baseContext) => typeof baseContext }
    ).extendSnapContext(baseContext)

    expect(result.snapPoints).toEqual(
      expect.arrayContaining([...perimeter.outerPolygon.points, ...floorArea.area.points, ...floorOpening.area.points])
    )
    expect(result.referenceLineSegments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ start: perimeter.outerPolygon.points[0], end: perimeter.outerPolygon.points[1] }),
        expect.objectContaining({ start: floorArea.area.points[0], end: floorArea.area.points[1] })
      ])
    )
  })
})
