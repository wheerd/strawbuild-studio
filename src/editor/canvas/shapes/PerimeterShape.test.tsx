import { render } from '@testing-library/react'
import { Layer, Stage } from 'react-konva/lib/ReactKonvaCore'
import { describe, expect, it } from 'vitest'

import {
  createPerimeterConstructionMethodId,
  createPerimeterCornerId,
  createPerimeterId,
  createPerimeterWallId,
  createStoreyId
} from '@/building/model/ids'
import type { Perimeter } from '@/building/model/model'
import { createLength, createVec2 } from '@/shared/geometry'

import { PerimeterCornerShape } from './PerimeterCornerShape'
import { PerimeterShape } from './PerimeterShape'

describe('PerimeterShape', () => {
  const testPerimeter: Perimeter = {
    id: createPerimeterId(),
    storeyId: createStoreyId(),
    walls: [
      {
        id: createPerimeterWallId(),
        thickness: createLength(400),
        constructionMethodId: createPerimeterConstructionMethodId(),
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
        constructionMethodId: createPerimeterConstructionMethodId(),
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
        constructionMethodId: createPerimeterConstructionMethodId(),
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
        constructionMethodId: createPerimeterConstructionMethodId(),
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
        constuctedByWall: 'next'
      },
      {
        id: createPerimeterCornerId(),
        insidePoint: createVec2(1000, 0),
        outsidePoint: createVec2(1400, 1400),
        constuctedByWall: 'previous'
      },
      {
        id: createPerimeterCornerId(),
        insidePoint: createVec2(1000, 1000),
        outsidePoint: createVec2(-400, 1400),
        constuctedByWall: 'next'
      },
      {
        id: createPerimeterCornerId(),
        insidePoint: createVec2(0, 1000),
        outsidePoint: createVec2(-400, -400),
        constuctedByWall: 'previous'
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
