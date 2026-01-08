import { render } from '@testing-library/react'
import { Layer, Stage } from 'react-konva/lib/ReactKonvaCore'
import { describe, expect, it } from 'vitest'

import type { Perimeter } from '@/building/model'
import {
  createPerimeterCornerId,
  createPerimeterId,
  createPerimeterWallId,
  createStoreyId,
  createWallAssemblyId
} from '@/building/model/ids'
import { ZERO_VEC2, newVec2 } from '@/shared/geometry'

import { PerimeterCornerShape } from './PerimeterCornerShape'
import { PerimeterShape } from './PerimeterShape'

describe('PerimeterShape', () => {
  const testPerimeter: Perimeter = {
    id: createPerimeterId(),
    storeyId: createStoreyId(),
    referenceSide: 'inside',
    referencePolygon: [newVec2(0, 0), newVec2(1000, 0), newVec2(1000, 1000), newVec2(0, 1000)],
    walls: [
      {
        id: createPerimeterWallId(),
        thickness: 400,
        wallAssemblyId: createWallAssemblyId(),
        openings: [],
        posts: [],
        insideLength: 1000,
        outsideLength: 1000,
        wallLength: 1000,
        insideLine: {
          start: ZERO_VEC2,
          end: newVec2(1000, 0)
        },
        outsideLine: {
          start: newVec2(0, -400),
          end: newVec2(1000, -400)
        },
        direction: newVec2(1, 0),
        outsideDirection: newVec2(0, -1)
      },
      {
        id: createPerimeterWallId(),
        thickness: 400,
        wallAssemblyId: createWallAssemblyId(),
        openings: [],
        posts: [],
        insideLength: 1000,
        outsideLength: 1000,
        wallLength: 1000,
        insideLine: {
          start: newVec2(1000, 0),
          end: newVec2(1000, 1000)
        },
        outsideLine: {
          start: newVec2(1400, 0),
          end: newVec2(1400, 1000)
        },
        direction: newVec2(0, 1),
        outsideDirection: newVec2(1, 0)
      },
      {
        id: createPerimeterWallId(),
        thickness: 400,
        wallAssemblyId: createWallAssemblyId(),
        openings: [],
        posts: [],
        insideLength: 1000,
        outsideLength: 1000,
        wallLength: 1000,
        insideLine: {
          start: newVec2(1000, 1000),
          end: newVec2(0, 1000)
        },
        outsideLine: {
          start: newVec2(1000, 1400),
          end: newVec2(0, 1400)
        },
        direction: newVec2(-1, 0),
        outsideDirection: newVec2(0, 1)
      },
      {
        id: createPerimeterWallId(),
        thickness: 400,
        wallAssemblyId: createWallAssemblyId(),
        openings: [],
        posts: [],
        insideLength: 1000,
        outsideLength: 1000,
        wallLength: 1000,
        insideLine: {
          start: newVec2(0, 1000),
          end: ZERO_VEC2
        },
        outsideLine: {
          start: newVec2(-400, 1000),
          end: newVec2(-400, 0)
        },
        direction: newVec2(0, -1),
        outsideDirection: newVec2(-1, 0)
      }
    ],
    corners: [
      {
        id: createPerimeterCornerId(),
        insidePoint: ZERO_VEC2,
        outsidePoint: newVec2(1400, -400),
        constructedByWall: 'next',
        interiorAngle: 90,
        exteriorAngle: 270
      },
      {
        id: createPerimeterCornerId(),
        insidePoint: newVec2(1000, 0),
        outsidePoint: newVec2(1400, 1400),
        constructedByWall: 'previous',
        interiorAngle: 90,
        exteriorAngle: 270
      },
      {
        id: createPerimeterCornerId(),
        insidePoint: newVec2(1000, 1000),
        outsidePoint: newVec2(-400, 1400),
        constructedByWall: 'next',
        interiorAngle: 90,
        exteriorAngle: 270
      },
      {
        id: createPerimeterCornerId(),
        insidePoint: newVec2(0, 1000),
        outsidePoint: newVec2(-400, -400),
        constructedByWall: 'previous',
        interiorAngle: 90,
        exteriorAngle: 270
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
