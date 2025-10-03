import { useId } from 'react'

import type { OpeningType } from '@/building/model/model'
import { SvgMeasurementIndicator } from '@/construction/components/SvgMeasurementIndicator'
import type { Length } from '@/shared/geometry'
import { formatLength } from '@/shared/utils/formatLength'

export interface OpeningPreviewSimpleProps {
  opening: {
    type: OpeningType
    width: Length
    height: Length
    sillHeight?: Length
  }
  wallHeight: Length
  focusedField?: 'width' | 'height' | 'sillHeight' | 'topHeight'
}

export function OpeningPreviewSimple({
  opening,
  wallHeight,
  focusedField
}: OpeningPreviewSimpleProps): React.JSX.Element {
  // Generate unique ID for clip path
  const clipId = useId()

  // Calculate dimensions
  const openingWidth = opening.width
  const openingHeight = opening.height
  const sillHeight = opening.sillHeight || 0

  // Floor to top measurements (when sill exists)
  const floorToTop = sillHeight > 0 ? ((sillHeight + openingHeight) as Length) : 0

  // SVG viewport dimensions - aim for square preview area
  const svgSize = 200
  const svgWidth = svgSize
  const svgHeight = svgSize

  // Calculate scale based on what needs to fit
  const maxDimension = Math.max(openingWidth + 400, wallHeight)
  const scale = svgSize / maxDimension

  // Wall dimensions in SVG coordinates
  const wallHeightSvg = wallHeight * scale

  // Wall positioning (centered in SVG)
  const wallLeft = 0
  const wallTop = (svgHeight - wallHeightSvg) / 2
  const wallBottom = wallTop + wallHeightSvg

  // Opening positioning (centered horizontally in wall)
  const openingWidthSvg = openingWidth * scale
  const openingHeightSvg = openingHeight * scale
  const openingCenterX = svgWidth / 2
  const openingLeft = openingCenterX - openingWidthSvg / 2
  const openingBottom = wallBottom - sillHeight * scale
  const openingTop = openingBottom - openingHeightSvg

  const bottomHasSpace = (opening.sillHeight ?? 0) * scale > 16
  const sideHasSpace = (svgWidth - openingWidthSvg) / 2 > 16

  const area = (opening.width * opening.height) / (1000 * 1000)

  // Styling - simplified single mode
  const getStyle = () => ({
    fill: 'var(--gray-2)',
    stroke: 'var(--gray-10)',
    strokeWidth: 2
  })

  // Get color for measurement based on focus
  const getMeasurementColor = (field: 'width' | 'height' | 'sillHeight' | 'topHeight') => {
    return focusedField === field ? 'var(--accent-11)' : 'var(--gray-12)'
  }

  return (
    <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
      {/* Clip path definition */}
      <defs>
        <clipPath id={clipId}>
          <rect x={openingLeft} y={openingTop} width={openingWidthSvg} height={openingHeightSvg} />
        </clipPath>
      </defs>

      {/* Wall */}
      <rect
        x={wallLeft}
        y={wallTop}
        width={svgWidth}
        height={wallHeightSvg}
        fill="var(--gray-4)"
        stroke="var(--gray-8)"
        strokeWidth="1"
      />

      {/* Opening - clipped to show stroke on outside */}
      <rect
        x={openingLeft}
        y={openingTop}
        width={openingWidthSvg}
        height={openingHeightSvg}
        {...getStyle()}
        clipPath={`url(#${clipId})`}
      />

      {/* Opening type indicator */}
      {opening.type === 'door' && (
        <g>
          {/* Door handle */}
          <circle
            cx={openingLeft + openingWidthSvg - 12}
            cy={(openingTop + openingBottom) / 2}
            r="3"
            fill="var(--gray-8)"
            stroke="var(--gray-9)"
            strokeWidth="1"
          />
        </g>
      )}

      {opening.type === 'window' && (
        <g>
          {/* Window mullions */}
          <line
            x1={openingLeft + openingWidthSvg / 2}
            y1={openingTop}
            x2={openingLeft + openingWidthSvg / 2}
            y2={openingBottom}
            stroke="var(--gray-8)"
            strokeWidth="1"
          />
          <line
            x1={openingLeft}
            y1={openingTop + openingHeightSvg / 2}
            x2={openingLeft + openingWidthSvg}
            y2={openingTop + openingHeightSvg / 2}
            stroke="var(--gray-8)"
            strokeWidth="1"
          />
        </g>
      )}

      {/* Dimension lines */}

      {/* Width dimensions - bottom of opening */}
      <SvgMeasurementIndicator
        startPoint={[openingLeft, openingBottom]}
        endPoint={[openingLeft + openingWidthSvg, openingBottom]}
        label={formatLength(openingWidth)}
        offset={bottomHasSpace ? 8 : -8}
        color={getMeasurementColor('width')}
        fontSize={8}
        strokeWidth={1}
      />

      {/* Height dimensions - side of opening */}
      <SvgMeasurementIndicator
        startPoint={[openingLeft, openingTop]}
        endPoint={[openingLeft, openingBottom]}
        label={formatLength(openingHeight)}
        offset={sideHasSpace ? 8 : -8}
        color={getMeasurementColor('height')}
        fontSize={8}
        strokeWidth={1}
      />

      {/* Sill height dimensions */}
      {sillHeight > 0 && (
        <>
          <SvgMeasurementIndicator
            startPoint={[openingLeft, wallBottom]}
            endPoint={[openingLeft, openingBottom]}
            label={formatLength(sillHeight as Length)}
            offset={sideHasSpace ? -8 : 8}
            color={getMeasurementColor('sillHeight')}
            fontSize={7}
            strokeWidth={1}
          />

          {/* Floor to top measurements */}
          <SvgMeasurementIndicator
            startPoint={[openingLeft + openingWidthSvg, wallBottom]}
            endPoint={[openingLeft + openingWidthSvg, openingTop]}
            label={formatLength(floorToTop as Length)}
            offset={sideHasSpace ? 8 : -8}
            color={getMeasurementColor('topHeight')}
            fontSize={7}
            strokeWidth={1}
          />
        </>
      )}

      <text
        x={openingCenterX}
        y={(openingBottom + openingTop) / 2}
        fontSize={9}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--gray-11)"
      >
        {area.toFixed(2)}m²
      </text>
    </svg>
  )
}
