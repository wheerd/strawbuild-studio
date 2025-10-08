import { useMemo } from 'react'
import { Layer } from 'react-konva/lib/ReactKonvaCore'

import { useActiveStoreyId, useModelActions, usePerimetersOfActiveStorey } from '@/building/store'
import { PerimeterGhostShape } from '@/editor/canvas/shapes/PerimeterGhostShape'
import { PerimeterShape } from '@/editor/canvas/shapes/PerimeterShape'

export function PerimeterLayer(): React.JSX.Element {
  const { getPerimetersByStorey, getStoreysOrderedByLevel } = useModelActions()
  const perimeters = usePerimetersOfActiveStorey()
  const activeStorey = useActiveStoreyId()

  const lowerPerimeters = useMemo(() => {
    const storeys = getStoreysOrderedByLevel()
    const storeyIndex = storeys.findIndex(s => s.id === activeStorey)
    const lowerStorey = storeyIndex > 0 ? storeys[storeyIndex - 1] : null
    return lowerStorey ? getPerimetersByStorey(lowerStorey.id) : []
  }, [activeStorey])

  return (
    <Layer name="perimeters">
      {lowerPerimeters.map(perimeter => (
        <PerimeterGhostShape key={perimeter.id} perimeter={perimeter} />
      ))}
      {perimeters.map(perimeter => (
        <PerimeterShape key={perimeter.id} perimeter={perimeter} />
      ))}
    </Layer>
  )
}
