import { Flex } from '@radix-ui/themes'

import type { OpeningType } from '@/building/model/model'
import { SvgMeasurementIndicator } from '@/construction/components/SvgMeasurementIndicator'
import type { Length } from '@/shared/geometry'
import { formatLength } from '@/shared/utils/formatLength'

export interface OpeningPreviewProps {
  opening: {
    type: OpeningType
    width: Length
    height: Length
    sillHeight?: Length
  }
  wallHeight: Length
  padding: Length
  highlightMode: 'fitting' | 'finished'
  focusedField?: 'width' | 'height' | 'sillHeight'
}

export function OpeningPreview({
  opening,
  wallHeight,
  padding,
  highlightMode,
  focusedField
}: OpeningPreviewProps): React.JSX.Element {
  // Calculate dimensions
  const fittingWidth = opening.width
  const fittingHeight = opening.height
  const finishedWidthMm = (opening.width - 2 * padding) as Length
  const finishedHeightMm = (opening.height - 2 * padding) as Length
  const fittingSillHeight = opening.sillHeight || 0
  const finishedSillHeight = fittingSillHeight > 0 ? ((fittingSillHeight + padding) as Length) : 0

  // Floor to top measurements (when sill exists)
  const fittingFloorToTop = fittingSillHeight > 0 ? ((fittingSillHeight + fittingHeight) as Length) : 0
  const finishedFloorToTop = fittingSillHeight > 0 ? ((finishedSillHeight + finishedHeightMm) as Length) : 0

  // SVG viewport dimensions - aim for square preview area
  const svgSize = 200
  const svgWidth = svgSize
  const svgHeight = svgSize

  // Calculate scale based on what needs to fit
  // If opening is wider than wall is high, scale based on width; otherwise scale based on height
  const maxDimension = Math.max(fittingWidth + 400, wallHeight)
  const scale = svgSize / maxDimension

  // Wall dimensions in SVG coordinates
  const wallHeightSvg = wallHeight * scale

  // Wall positioning (centered in SVG)
  const wallLeft = 0
  const wallTop = (svgHeight - wallHeightSvg) / 2
  const wallBottom = wallTop + wallHeightSvg

  // Opening positioning (centered horizontally in wall)
  const openingWidthSvg = fittingWidth * scale
  const openingHeightSvg = fittingHeight * scale
  const openingCenterX = svgWidth / 2
  const openingLeft = openingCenterX - openingWidthSvg / 2
  const openingBottom = wallBottom - fittingSillHeight * scale
  const openingTop = openingBottom - openingHeightSvg

  // Finished opening (with padding)
  const paddingScaled = padding * scale
  const finishedLeft = openingLeft + paddingScaled
  const finishedBottom = openingBottom - paddingScaled
  const finishedTop = openingTop + paddingScaled
  const finishedWidthSvg = finishedWidthMm * scale
  const finishedHeightSvg = finishedHeightMm * scale
  const finishedRight = finishedLeft + finishedWidthSvg

  // Styling based on highlight mode and focus
  const getFittingStyle = () => ({
    fill: highlightMode === 'fitting' ? 'var(--blue-3)' : 'var(--gray-3)',
    stroke: highlightMode === 'fitting' ? 'var(--blue-8)' : 'var(--gray-6)',
    strokeWidth: highlightMode === 'fitting' ? 2 : 1,
    strokeDasharray: '4,2'
  })

  const getFinishedStyle = () => ({
    fill: highlightMode === 'finished' ? 'var(--green-3)' : 'var(--gray-2)',
    stroke: highlightMode === 'finished' ? 'var(--green-8)' : 'var(--gray-7)',
    strokeWidth: highlightMode === 'finished' ? 2 : 1
  })

  // Get color for measurement based on mode and focus
  const getMeasurementColor = (field: 'width' | 'height' | 'sillHeight', type: 'fitting' | 'finished') => {
    const isFocused = focusedField === field
    const isHighlighted = highlightMode === type

    if (isFocused) return 'var(--accent-11)'
    if (isHighlighted) {
      return type === 'fitting' ? 'var(--blue-11)' : 'var(--green-11)'
    }
    return 'var(--gray-8)'
  }

  return (
    <Flex direction="column" align="center">
      <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
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

        {/* Fitting Opening (rough opening) */}
        <rect x={openingLeft} y={openingTop} width={openingWidthSvg} height={openingHeightSvg} {...getFittingStyle()} />

        {/* Finished Opening (actual door/window) */}
        <rect
          x={finishedLeft}
          y={finishedTop}
          width={finishedWidthSvg}
          height={finishedHeightSvg}
          {...getFinishedStyle()}
        />

        {/* Opening type indicator */}
        {opening.type === 'door' && (
          <g>
            {/* Door swing arc */}
            <path
              d={`M ${finishedLeft + 5} ${finishedBottom - 5} A ${finishedWidthSvg - 10} ${finishedWidthSvg - 10} 0 0 1 ${finishedRight - 5} ${finishedTop + 5}`}
              fill="none"
              stroke="var(--gray-8)"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
          </g>
        )}

        {opening.type === 'window' && (
          <g>
            {/* Window mullions */}
            <line
              x1={finishedLeft + finishedWidthSvg / 2}
              y1={finishedTop}
              x2={finishedLeft + finishedWidthSvg / 2}
              y2={finishedBottom}
              stroke="var(--gray-8)"
              strokeWidth="1"
            />
            <line
              x1={finishedLeft}
              y1={finishedTop + finishedHeightSvg / 2}
              x2={finishedRight}
              y2={finishedTop + finishedHeightSvg / 2}
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
          label={formatLength(fittingWidth)}
          offset={12}
          color={getMeasurementColor('width', 'fitting')}
          fontSize={8}
          strokeWidth={1}
        />

        <SvgMeasurementIndicator
          startPoint={[finishedLeft, finishedBottom]}
          endPoint={[finishedRight, finishedBottom]}
          label={formatLength(finishedWidthMm)}
          offset={20}
          color={getMeasurementColor('width', 'finished')}
          fontSize={8}
          strokeWidth={1}
        />

        {/* Height dimensions - inside opening when space allows, otherwise on the side */}
        {openingHeightSvg > 40 ? (
          // Inside opening when there's space
          <>
            <text
              x={openingCenterX}
              y={openingTop + openingHeightSvg / 2 - 6}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={8}
              fontFamily="Arial"
              fontWeight="bold"
              style={{
                fill: getMeasurementColor('height', 'fitting'),
                filter: 'drop-shadow(1px 1px 2px rgba(255, 255, 255, 0.8))'
              }}
            >
              {formatLength(fittingHeight)}
            </text>
            <text
              x={openingCenterX}
              y={openingTop + openingHeightSvg / 2 + 6}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={8}
              fontFamily="Arial"
              fontWeight="bold"
              style={{
                fill: getMeasurementColor('height', 'finished'),
                filter: 'drop-shadow(1px 1px 2px rgba(255, 255, 255, 0.8))'
              }}
            >
              {formatLength(finishedHeightMm)}
            </text>
          </>
        ) : (
          // On the side when opening is too narrow
          <>
            <SvgMeasurementIndicator
              startPoint={[openingLeft, openingTop]}
              endPoint={[openingLeft, openingBottom]}
              label={formatLength(fittingHeight)}
              offset={-15}
              color={getMeasurementColor('height', 'fitting')}
              fontSize={8}
              strokeWidth={1}
            />

            <SvgMeasurementIndicator
              startPoint={[finishedLeft, finishedTop]}
              endPoint={[finishedLeft, finishedBottom]}
              label={formatLength(finishedHeightMm)}
              offset={-24}
              color={getMeasurementColor('height', 'finished')}
              fontSize={8}
              strokeWidth={1}
            />
          </>
        )}

        {/* Sill height dimensions - both fitting and finished */}
        {fittingSillHeight > 0 &&
          (fittingSillHeight * scale > 40 ? (
            // Show inside sill area when there's space
            <>
              <text
                x={openingLeft + openingWidthSvg / 2}
                y={wallBottom - (fittingSillHeight * scale) / 2 - 4}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={7}
                fontFamily="Arial"
                fontWeight="bold"
                style={{
                  fill: getMeasurementColor('sillHeight', 'fitting'),
                  filter: 'drop-shadow(1px 1px 2px rgba(255, 255, 255, 0.8))'
                }}
              >
                {formatLength(fittingSillHeight as Length)}
              </text>
              <text
                x={openingLeft + openingWidthSvg / 2}
                y={wallBottom - (fittingSillHeight * scale) / 2 + 4}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={7}
                fontFamily="Arial"
                fontWeight="bold"
                style={{
                  fill: getMeasurementColor('sillHeight', 'finished'),
                  filter: 'drop-shadow(1px 1px 2px rgba(255, 255, 255, 0.8))'
                }}
              >
                {formatLength(finishedSillHeight as Length)}
              </text>
            </>
          ) : (
            // Show on the side when sill is too low
            <>
              <SvgMeasurementIndicator
                startPoint={[openingLeft + openingWidthSvg, wallBottom]}
                endPoint={[openingLeft + openingWidthSvg, openingBottom]}
                label={formatLength(fittingSillHeight as Length)}
                offset={10}
                color={getMeasurementColor('sillHeight', 'fitting')}
                fontSize={7}
                strokeWidth={1}
              />
              <SvgMeasurementIndicator
                startPoint={[openingLeft + openingWidthSvg, wallBottom]}
                endPoint={[openingLeft + openingWidthSvg, openingBottom]}
                label={formatLength(finishedSillHeight as Length)}
                offset={18}
                color={getMeasurementColor('sillHeight', 'finished')}
                fontSize={7}
                strokeWidth={1}
              />
            </>
          ))}

        {/* Floor to top measurements - when sill exists */}
        {fittingSillHeight > 0 && fittingFloorToTop > 0 && (
          <>
            <SvgMeasurementIndicator
              startPoint={[wallLeft - 15, wallBottom]}
              endPoint={[wallLeft - 15, openingTop]}
              label={formatLength(fittingFloorToTop as Length)}
              offset={-8}
              color={getMeasurementColor('height', 'fitting')}
              fontSize={7}
              strokeWidth={1}
            />
            <SvgMeasurementIndicator
              startPoint={[wallLeft - 25, wallBottom]}
              endPoint={[wallLeft - 25, finishedTop]}
              label={formatLength(finishedFloorToTop as Length)}
              offset={-8}
              color={getMeasurementColor('height', 'finished')}
              fontSize={7}
              strokeWidth={1}
            />
          </>
        )}
      </svg>
    </Flex>
  )
}
