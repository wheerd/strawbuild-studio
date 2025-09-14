import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Stage, Layer } from 'react-konva/lib/ReactKonvaCore'
import { PerimeterShape } from './PerimeterShape'
import { PerimeterCornerShape } from './PerimeterCornerShape'
import { createLength, createVec2 } from '@/types/geometry'
import { createPerimeterId, createStoreyId, createPerimeterWallId, createPerimeterCornerId } from '@/types/ids'
import type { Perimeter } from '@/types/model'

describe('PerimeterShape', () => {
  const testPerimeter: Perimeter = {
    id: createPerimeterId(),
    storeyId: createStoreyId(),
    walls: [
      {
        id: createPerimeterWallId(),
        thickness: createLength(400),
        constructionType: 'cells-under-tension',
        openings: [],
        insideLength: createLength(1000),
        outsideLength: createLength(1000),
        wallLength: createLength(1000),
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
        id: createPerimeterWallId(),
        thickness: createLength(400),
        constructionType: 'infill',
        openings: [],
        insideLength: createLength(1000),
        outsideLength: createLength(1000),
        wallLength: createLength(1000),
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
        id: createPerimeterWallId(),
        thickness: createLength(400),
        constructionType: 'strawhenge',
        openings: [],
        insideLength: createLength(1000),
        outsideLength: createLength(1000),
        wallLength: createLength(1000),
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
        id: createPerimeterWallId(),
        thickness: createLength(400),
        constructionType: 'non-strawbale',
        openings: [],
        insideLength: createLength(1000),
        outsideLength: createLength(1000),
        wallLength: createLength(1000),
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
        id: createPerimeterCornerId(),
        insidePoint: createVec2(0, 0),
        outsidePoint: createVec2(1400, -400),
        belongsTo: 'next'
      },
      {
        id: createPerimeterCornerId(),
        insidePoint: createVec2(1000, 0),
        outsidePoint: createVec2(1400, 1400),
        belongsTo: 'previous'
      },
      {
        id: createPerimeterCornerId(),
        insidePoint: createVec2(1000, 1000),
        outsidePoint: createVec2(-400, 1400),
        belongsTo: 'next'
      },
      {
        id: createPerimeterCornerId(),
        insidePoint: createVec2(0, 1000),
        outsidePoint: createVec2(-400, -400),
        belongsTo: 'previous'
      }
    ]
  }

  it('should render perimeter shape without errors', () => {
    expect(() => {
      render(
        <Stage width={2000} height={2000}>
          <Layer>
            <PerimeterShape perimeter={testPerimeter} />
          </Layer>
        </Stage>
      )
    }).not.toThrow()
  })

  it('should render perimeter corner shape without errors', () => {
    expect(() => {
      render(
        <Stage width={2000} height={2000}>
          <Layer>
            <PerimeterCornerShape
              corner={testPerimeter.corners[0]}
              previousWall={testPerimeter.walls[3]}
              nextWall={testPerimeter.walls[0]}
              perimeterId={testPerimeter.id}
            />
          </Layer>
        </Stage>
      )
    }).not.toThrow()
  })
})
