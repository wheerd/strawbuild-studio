import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { FloorArea, FloorOpening, Perimeter, PerimeterWithGeometry } from '@/building/model'
import { type Vec2, newVec2 } from '@/shared/geometry'
import { partial } from '@/test/helpers'

import { FloorOpeningTool } from './FloorOpeningTool'

const mockModelActions = {
  addFloorArea: vi.fn(),
  addFloorOpening: vi.fn(),
  getActiveStoreyId: vi.fn(() => 'storey_opening'),
  getPerimetersByStorey: vi.fn(() => [] as Perimeter[]),
  getFloorAreasByStorey: vi.fn(() => [] as FloorArea[]),
  getFloorOpeningsByStorey: vi.fn(() => [] as FloorOpening[])
}

vi.mock('@/building/store', () => ({
  getModelActions: () => mockModelActions
}))

describe('FloorOpeningTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockModelActions.getActiveStoreyId.mockReturnValue('storey_opening')
    mockModelActions.getPerimetersByStorey.mockReturnValue([])
    mockModelActions.getFloorAreasByStorey.mockReturnValue([])
    mockModelActions.getFloorOpeningsByStorey.mockReturnValue([])
  })

  it('calls addFloorOpening when polygon is completed', () => {
    const tool = new FloorOpeningTool()
    const points = [newVec2(10, 10), newVec2(50, 10), newVec2(50, 50)]
    tool.state.points = points
    tool.state.isClosingSegmentValid = true

    tool.complete()

    expect(mockModelActions.addFloorOpening).toHaveBeenCalledTimes(1)
    expect(mockModelActions.addFloorOpening).toHaveBeenCalledWith('storey_opening', { points })
  })

  it('reuses floor and perimeter geometry for snapping context', () => {
    const perimeter = partial<PerimeterWithGeometry>({
      outerPolygon: { points: [newVec2(1, 1), newVec2(2, 2), newVec2(3, 3)] }
    })

    const floorArea = {
      id: 'floorarea_existing',
      storeyId: 'storey_opening',
      area: { points: [newVec2(0, 0), newVec2(0, 120), newVec2(120, 120)] }
    } as FloorArea

    const floorOpening = {
      id: 'flooropening_existing',
      storeyId: 'storey_opening',
      area: { points: [newVec2(20, 20), newVec2(40, 20), newVec2(40, 40)] }
    } as FloorOpening

    mockModelActions.getPerimetersByStorey.mockReturnValue([perimeter])
    mockModelActions.getFloorAreasByStorey.mockReturnValue([floorArea])
    mockModelActions.getFloorOpeningsByStorey.mockReturnValue([floorOpening])

    const tool = new FloorOpeningTool()
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
        expect.objectContaining({ start: floorOpening.area.points[0], end: floorOpening.area.points[1] })
      ])
    )
  })
})
