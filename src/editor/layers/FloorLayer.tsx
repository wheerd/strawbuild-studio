import { useMemo } from 'react'

import {
  useFloorAreasOfActiveStorey,
  useFloorOpeningsOfActiveStorey,
  usePerimetersOfActiveStorey
} from '@/building/store'
import { useViewMode } from '@/editor/hooks/useViewMode'
import { FloorOpeningShape } from '@/editor/shapes/FloorOpeningShape'
import { subtractPolygons } from '@/shared/geometry'
import { polygonWithHolesToSvgPath } from '@/shared/utils/svg'

export function FloorLayer(): React.JSX.Element {
  const floorAreas = useFloorAreasOfActiveStorey()
  const floorOpenings = useFloorOpeningsOfActiveStorey()
  const perimeters = usePerimetersOfActiveStorey()
  const mode = useViewMode()

  const combinedPolygons = useMemo(() => {
    if (mode !== 'walls') {
      return []
    }
    const perimeterPolygons = perimeters.map(perimeter => perimeter.outerPolygon)
    const openingPolygons = floorOpenings.map(opening => opening.area)

    return subtractPolygons([...perimeterPolygons], openingPolygons)
  }, [mode, perimeters, floorAreas, floorOpenings])

  if (mode !== 'floors') {
    return (
      <g data-layer="floors">
        {combinedPolygons.map((polygon, index) => (
          <path
            key={index}
            d={polygonWithHolesToSvgPath(polygon)}
            fillRule="evenodd"
            fill="var(--color-gray-200)"
            stroke="var(--color-border)"
            strokeWidth={20}
            className="pointer-events-none"
          />
        ))}
      </g>
    )
  }

  return (
    <g data-layer="floors">
      {floorOpenings.map(opening => (
        <FloorOpeningShape key={opening.id} opening={opening} />
      ))}
    </g>
  )
}
