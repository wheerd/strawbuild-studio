import { vec2 } from 'gl-matrix'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { FloorArea, FloorOpening, Perimeter } from '@/building/model/model'

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
    const points = [vec2.fromValues(0, 0), vec2.fromValues(100, 0), vec2.fromValues(100, 100)]
    tool.state.points = points
    tool.state.isClosingSegmentValid = true

    tool.complete()

    expect(mockModelActions.addFloorArea).toHaveBeenCalledTimes(1)
    expect(mockModelActions.addFloorArea).toHaveBeenCalledWith('storey_1', { points })
  })

  it('extends snapping context with perimeter and floor geometry', () => {
    const perimeter = {
      id: 'perimeter_1',
      storeyId: 'storey_1',
      corners: [
        {
          id: 'corner_1',
          insidePoint: vec2.fromValues(0, 0),
          outsidePoint: vec2.fromValues(0, 0),
          constructedByWall: 'next',
          interiorAngle: 90,
          exteriorAngle: 270
        },
        {
          id: 'corner_2',
          insidePoint: vec2.fromValues(200, 0),
          outsidePoint: vec2.fromValues(200, 0),
          constructedByWall: 'next',
          interiorAngle: 90,
          exteriorAngle: 270
        }
      ],
      walls: [
        {
          id: 'wall_1',
          insideLine: { start: vec2.fromValues(0, 0), end: vec2.fromValues(200, 0) }
        }
      ]
    } as unknown as Perimeter

    const floorArea = {
      id: 'floorarea_1',
      storeyId: 'storey_1',
      area: {
        points: [vec2.fromValues(0, 0), vec2.fromValues(0, 200), vec2.fromValues(200, 200)]
      }
    } as FloorArea

    const floorOpening = {
      id: 'flooropening_1',
      storeyId: 'storey_1',
      area: {
        points: [vec2.fromValues(50, 50), vec2.fromValues(80, 50), vec2.fromValues(80, 80)]
      }
    } as FloorOpening

    mockModelActions.getPerimetersByStorey.mockReturnValue([perimeter])
    mockModelActions.getFloorAreasByStorey.mockReturnValue([floorArea])
    mockModelActions.getFloorOpeningsByStorey.mockReturnValue([floorOpening])

    const tool = new FloorAreaTool()
    const baseContext = {
      snapPoints: [] as vec2[],
      alignPoints: [] as vec2[],
      referenceLineSegments: []
    }

    const result = (
      tool as unknown as { extendSnapContext: (ctx: typeof baseContext) => typeof baseContext }
    ).extendSnapContext(baseContext)

    expect(result.snapPoints).toEqual(
      expect.arrayContaining([
        perimeter.corners[0].insidePoint,
        perimeter.corners[1].insidePoint,
        ...floorArea.area.points,
        ...floorOpening.area.points
      ])
    )
    expect(result.referenceLineSegments).toEqual(
      expect.arrayContaining([
        perimeter.walls[0].insideLine,
        expect.objectContaining({ start: floorArea.area.points[0], end: floorArea.area.points[1] })
      ])
    )
  })
})
