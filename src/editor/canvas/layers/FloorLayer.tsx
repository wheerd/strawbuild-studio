import type { vec2 } from 'gl-matrix'
import { useMemo } from 'react'
import { Layer, Path } from 'react-konva/lib/ReactKonvaCore'

import {
  useFloorAreasOfActiveStorey,
  useFloorOpeningsOfActiveStorey,
  usePerimetersOfActiveStorey
} from '@/building/store'
import { FloorOpeningShape } from '@/editor/canvas/shapes/FloorOpeningShape'
import { useViewMode } from '@/editor/hooks/useViewMode'
import { subtractPolygons } from '@/shared/geometry'
import type { PolygonWithHoles2D } from '@/shared/geometry'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'

function polygonWithHolesToPath(polygon: PolygonWithHoles2D): string {
  const toPathSegment = (points: vec2[]): string => {
    if (points.length === 0) {
      return ''
    }
    const segments = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x},${y}`).join(' ')
    return `${segments} Z`
  }

  const outerPath = toPathSegment(polygon.outer.points)
  const holesPath = polygon.holes.map(hole => toPathSegment(hole.points)).join(' ')
  return `${outerPath} ${holesPath}`.trim()
}

export function FloorLayer(): React.JSX.Element | null {
  const floorAreas = useFloorAreasOfActiveStorey()
  const floorOpenings = useFloorOpeningsOfActiveStorey()
  const perimeters = usePerimetersOfActiveStorey()
  const mode = useViewMode()
  const theme = useCanvasTheme()

  const combinedPolygons = useMemo(() => {
    if (mode !== 'walls') {
      return []
    }
    const perimeterPolygons = perimeters.map(perimeter => ({
      points: perimeter.corners.map(corner => corner.outsidePoint)
    }))
    const openingPolygons = floorOpenings.map(opening => opening.area)

    return subtractPolygons([...perimeterPolygons], openingPolygons)
  }, [mode, perimeters, floorAreas, floorOpenings])

  if (mode !== 'floors') {
    if (combinedPolygons.length === 0) {
      return null
    }

    return (
      <Layer name="floors">
        {combinedPolygons.map((polygon, index) => (
          <Path
            key={index}
            data={polygonWithHolesToPath(polygon)}
            fillRule="evenodd"
            fill={theme.bgSubtle}
            stroke={theme.border}
            strokeWidth={20}
            listening={false}
          />
        ))}
      </Layer>
    )
  }

  return (
    <Layer name="floors">
      {floorOpenings.map(opening => (
        <FloorOpeningShape key={opening.id} opening={opening} />
      ))}
    </Layer>
  )
}
