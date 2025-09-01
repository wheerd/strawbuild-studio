import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Stage, Layer } from 'react-konva'
import { OuterWallShape } from './OuterWallShape'
import { OuterCornerShape } from './OuterCornerShape'
import { createLength, createVec2 } from '@/types/geometry'
import { createOuterWallId, createFloorId } from '@/types/ids'
import type { OuterWallPolygon } from '@/types/model'

describe('OuterWallShape', () => {
  const testOuterWall: OuterWallPolygon = {
    id: createOuterWallId(),
    floorId: createFloorId(),
    boundary: [createVec2(0, 0), createVec2(1000, 0), createVec2(1000, 1000), createVec2(0, 1000)],
    segments: [
      {
        thickness: createLength(400),
        constructionType: 'cells-under-tension',
        openings: [],
        insideLength: createLength(1000),
        outsideLength: createLength(1000),
        insideLine: {
          start: createVec2(0, 0),
          end: createVec2(1000, 0)
        },
        outsideLine: {
          start: createVec2(0, -400),
          end: createVec2(1000, -400)
        },
        direction: createVec2(1, 0),
        outsideDirection: createVec2(0, -1)
      },
      {
        thickness: createLength(400),
        constructionType: 'infill',
        openings: [],
        insideLength: createLength(1000),
        outsideLength: createLength(1000),
        insideLine: {
          start: createVec2(1000, 0),
          end: createVec2(1000, 1000)
        },
        outsideLine: {
          start: createVec2(1400, 0),
          end: createVec2(1400, 1000)
        },
        direction: createVec2(0, 1),
        outsideDirection: createVec2(1, 0)
      },
      {
        thickness: createLength(400),
        constructionType: 'strawhenge',
        openings: [],
        insideLength: createLength(1000),
        outsideLength: createLength(1000),
        insideLine: {
          start: createVec2(1000, 1000),
          end: createVec2(0, 1000)
        },
        outsideLine: {
          start: createVec2(1000, 1400),
          end: createVec2(0, 1400)
        },
        direction: createVec2(-1, 0),
        outsideDirection: createVec2(0, 1)
      },
      {
        thickness: createLength(400),
        constructionType: 'non-strawbale',
        openings: [],
        insideLength: createLength(1000),
        outsideLength: createLength(1000),
        insideLine: {
          start: createVec2(0, 1000),
          end: createVec2(0, 0)
        },
        outsideLine: {
          start: createVec2(-400, 1000),
          end: createVec2(-400, 0)
        },
        direction: createVec2(0, -1),
        outsideDirection: createVec2(-1, 0)
      }
    ],
    corners: [
      {
        outsidePoint: createVec2(1400, -400),
        belongsTo: 'next'
      },
      {
        outsidePoint: createVec2(1400, 1400),
        belongsTo: 'previous'
      },
      {
        outsidePoint: createVec2(-400, 1400),
        belongsTo: 'next'
      },
      {
        outsidePoint: createVec2(-400, -400),
        belongsTo: 'previous'
      }
    ]
  }

  it('should render outer wall shape without errors', () => {
    expect(() => {
      render(
        <Stage width={2000} height={2000}>
          <Layer>
            <OuterWallShape outerWall={testOuterWall} />
          </Layer>
        </Stage>
      )
    }).not.toThrow()
  })

  it('should render outer wall shape with selected segment', () => {
    expect(() => {
      render(
        <Stage width={2000} height={2000}>
          <Layer>
            <OuterWallShape outerWall={testOuterWall} selectedSegmentIndex={0} />
          </Layer>
        </Stage>
      )
    }).not.toThrow()
  })

  it('should render outer corner shape without errors', () => {
    expect(() => {
      render(
        <Stage width={2000} height={2000}>
          <Layer>
            <OuterCornerShape
              corner={testOuterWall.corners[0]}
              cornerIndex={0}
              boundaryPoint={testOuterWall.boundary[0]}
              previousSegment={testOuterWall.segments[3]}
              nextSegment={testOuterWall.segments[0]}
              isSelected={false}
            />
          </Layer>
        </Stage>
      )
    }).not.toThrow()
  })

  it('should render selected outer corner shape without errors', () => {
    expect(() => {
      render(
        <Stage width={2000} height={2000}>
          <Layer>
            <OuterCornerShape
              corner={testOuterWall.corners[0]}
              cornerIndex={0}
              boundaryPoint={testOuterWall.boundary[0]}
              previousSegment={testOuterWall.segments[3]}
              nextSegment={testOuterWall.segments[0]}
              isSelected={true}
            />
          </Layer>
        </Stage>
      )
    }).not.toThrow()
  })
})
