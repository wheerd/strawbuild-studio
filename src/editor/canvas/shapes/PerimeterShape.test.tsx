import { render } from '@testing-library/react'
import { vec2 } from 'gl-matrix'
import { Layer, Stage } from 'react-konva/lib/ReactKonvaCore'
import { describe, expect, it } from 'vitest'

import {
  createPerimeterCornerId,
  createPerimeterId,
  createPerimeterWallId,
  createStoreyId,
  createWallAssemblyId
} from '@/building/model/ids'
import type { Perimeter } from '@/building/model/model'
import '@/shared/geometry'

import { PerimeterCornerShape } from './PerimeterCornerShape'
import { PerimeterShape } from './PerimeterShape'

describe('PerimeterShape', () => {
  const testPerimeter: Perimeter = {
    id: createPerimeterId(),
    storeyId: createStoreyId(),
    referenceSide: 'inside',
    referencePolygon: [
      vec2.fromValues(0, 0),
      vec2.fromValues(1000, 0),
      vec2.fromValues(1000, 1000),
      vec2.fromValues(0, 1000)
    ],
    walls: [
      {
        id: createPerimeterWallId(),
        thickness: 400,
        wallAssemblyId: createWallAssemblyId(),
        openings: [],
        insideLength: 1000,
        outsideLength: 1000,
        wallLength: 1000,
        insideLine: {
          start: vec2.fromValues(0, 0),
          end: vec2.fromValues(1000, 0)
        },
        outsideLine: {
          start: vec2.fromValues(0, -400),
          end: vec2.fromValues(1000, -400)
        },
        direction: vec2.fromValues(1, 0),
        outsideDirection: vec2.fromValues(0, -1)
      },
      {
        id: createPerimeterWallId(),
        thickness: 400,
        wallAssemblyId: createWallAssemblyId(),
        openings: [],
        insideLength: 1000,
        outsideLength: 1000,
        wallLength: 1000,
        insideLine: {
          start: vec2.fromValues(1000, 0),
          end: vec2.fromValues(1000, 1000)
        },
        outsideLine: {
          start: vec2.fromValues(1400, 0),
          end: vec2.fromValues(1400, 1000)
        },
        direction: vec2.fromValues(0, 1),
        outsideDirection: vec2.fromValues(1, 0)
      },
      {
        id: createPerimeterWallId(),
        thickness: 400,
        wallAssemblyId: createWallAssemblyId(),
        openings: [],
        insideLength: 1000,
        outsideLength: 1000,
        wallLength: 1000,
        insideLine: {
          start: vec2.fromValues(1000, 1000),
          end: vec2.fromValues(0, 1000)
        },
        outsideLine: {
          start: vec2.fromValues(1000, 1400),
          end: vec2.fromValues(0, 1400)
        },
        direction: vec2.fromValues(-1, 0),
        outsideDirection: vec2.fromValues(0, 1)
      },
      {
        id: createPerimeterWallId(),
        thickness: 400,
        wallAssemblyId: createWallAssemblyId(),
        openings: [],
        insideLength: 1000,
        outsideLength: 1000,
        wallLength: 1000,
        insideLine: {
          start: vec2.fromValues(0, 1000),
          end: vec2.fromValues(0, 0)
        },
        outsideLine: {
          start: vec2.fromValues(-400, 1000),
          end: vec2.fromValues(-400, 0)
        },
        direction: vec2.fromValues(0, -1),
        outsideDirection: vec2.fromValues(-1, 0)
      }
    ],
    corners: [
      {
        id: createPerimeterCornerId(),
        insidePoint: vec2.fromValues(0, 0),
        outsidePoint: vec2.fromValues(1400, -400),
        constructedByWall: 'next',
        interiorAngle: 90,
        exteriorAngle: 270
      },
      {
        id: createPerimeterCornerId(),
        insidePoint: vec2.fromValues(1000, 0),
        outsidePoint: vec2.fromValues(1400, 1400),
        constructedByWall: 'previous',
        interiorAngle: 90,
        exteriorAngle: 270
      },
      {
        id: createPerimeterCornerId(),
        insidePoint: vec2.fromValues(1000, 1000),
        outsidePoint: vec2.fromValues(-400, 1400),
        constructedByWall: 'next',
        interiorAngle: 90,
        exteriorAngle: 270
      },
      {
        id: createPerimeterCornerId(),
        insidePoint: vec2.fromValues(0, 1000),
        outsidePoint: vec2.fromValues(-400, -400),
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
