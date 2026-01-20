import type { PerimeterWithGeometry } from '@/building/model'
import { useViewMode } from '@/editor/hooks/useViewMode'
import { PerimeterWallEntitiesShape } from '@/editor/shapes/PerimeterWallEntitiesShape'
import { polygonToSvgPath } from '@/shared/utils/svg'

import { PerimeterCornerShape } from './PerimeterCornerShape'
import { PerimeterWallShape } from './PerimeterWallShape'

export function PerimeterShape({ perimeter }: { perimeter: PerimeterWithGeometry }): React.JSX.Element {
  const mode = useViewMode()

  const innerPath = polygonToSvgPath(perimeter.innerPolygon)
  const outerPath = polygonToSvgPath(perimeter.outerPolygon)

  // In non-walls mode, show simplified dashed outlines
  if (mode !== 'walls') {
    return (
      <g
        data-entity-id={perimeter.id}
        data-entity-type="perimeter"
        data-parent-ids="[]"
        className="pointer-events-none"
      >
        {/* Outer polygon fill */}
        <path d={outerPath} className="fill-muted opacity-30" />

        {/* Outer polygon stroke */}
        <path
          d={outerPath}
          className="stroke-border-contrast fill-none stroke-40 opacity-60"
          strokeDasharray="120 60"
        />

        {/* Inner polygon stroke */}
        <path
          d={innerPath}
          className="stroke-border-contrast fill-none stroke-40 opacity-60"
          strokeDasharray="120 60"
        />
      </g>
    )
  }

  // In walls mode, render detailed walls and corners
  return (
    <g data-entity-id={perimeter.id} data-entity-type="perimeter" data-parent-ids="[]">
      {/* Invisible hit area for perimeter selection */}
      <path d={innerPath} fill="black" opacity={0} />

      {/* Render each wall */}
      {perimeter.wallIds.map(id => (
        <PerimeterWallShape key={`wall-${id}`} wallId={id} />
      ))}

      {/* Render corner shapes */}
      {perimeter.cornerIds.map(id => (
        <PerimeterCornerShape key={`corner-${id}`} cornerId={id} />
      ))}

      {/* Render each walls entities */}
      {perimeter.wallIds.map(id => (
        <PerimeterWallEntitiesShape key={`wall-entities-${id}`} wallId={id} />
      ))}
    </g>
  )
}
