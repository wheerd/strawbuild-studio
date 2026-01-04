import { Grid } from '@radix-ui/themes'
import React, { useId, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { BaseModal } from '@/shared/components/BaseModal'
import { SVGViewport, type SVGViewportRef } from '@/shared/components/SVGViewport'
import { Bounds2D, type Polygon2D, type PolygonWithHoles2D, newVec2 } from '@/shared/geometry'
import { elementSizeRef } from '@/shared/hooks/useElementSize'

import { PolygonAngleIndicators } from './AngleIndicators'
import { DiagonalEdgeMeasurements } from './DiagonalEdgeMeasurements'
import { GridMeasurementSystem } from './GridMeasurementSystem'
import { calculateBeamSegments } from './utils/calculateBeamSegments'
import { CoordinateMapper } from './utils/coordinateMapper'
import { type ZigzagConfig, generateStraightEdgePoints, generateZigzagEdgePoints, pointsToSvgPath } from './zigzagPath'

function polygonToSvgPath(polygon: Polygon2D) {
  return `M${polygon.points.map(([px, py]) => `${px},${py}`).join(' L')} Z`
}

function polygonWithHolesToSvgPath(polygon: PolygonWithHoles2D) {
  return [polygon.outer, ...polygon.holes].map(polygonToSvgPath).join(' ')
}

/**
 * Centralized configuration for beam cut diagram visualization
 */
const BEAM_CUT_CONFIG = {
  /** Segmentation parameters for analyzing beam features */
  segmentation: {
    /** Buffer distance (mm) around features to include in segments */
    bufferDistance: 50,
    /** Minimum gap size (mm) to trigger a visual break */
    minGapSize: 500
  },

  /** Display parameters for rendering */
  display: {
    /** Visual width (mm) allocated for gap indicators */
    gapWidth: 60
  }
} as const

const ZIGZAG_WIDTH = 15
const ZIGZAG_EXTEND = 10
const ZIGZAG_MIN_PEAKS = 2
const ZIGZAG_PEAK_SIZE = 100

export function PartCutModal({
  polygon,
  trigger
}: {
  polygon: PolygonWithHoles2D
  trigger: React.ReactNode
}): React.JSX.Element {
  const { t } = useTranslation('construction')
  const viewportRef = useRef<SVGViewportRef>(null)
  const polygonId = useId()

  // Flip coordinates (swap X and Y)
  const flippedPolygon: PolygonWithHoles2D = useMemo(
    () => ({
      outer: { points: polygon.outer.points.map(p => newVec2(p[1], p[0])) },
      holes: polygon.holes.map(h => ({ points: h.points.map(p => newVec2(p[1], p[0])) }))
    }),
    [polygon]
  )

  const contentBounds = useMemo(() => Bounds2D.fromPoints(flippedPolygon.outer.points), [flippedPolygon])

  // Calculate beam segments (virtual coordinates only)
  const segments = useMemo(
    () =>
      calculateBeamSegments(
        flippedPolygon,
        contentBounds,
        BEAM_CUT_CONFIG.segmentation.bufferDistance,
        BEAM_CUT_CONFIG.segmentation.minGapSize
      ),
    [flippedPolygon, contentBounds]
  )

  // Create coordinate mapper with display gap width
  const coordinateMapper = useMemo(() => new CoordinateMapper(segments, BEAM_CUT_CONFIG.display.gapWidth), [segments])

  // Calculate display bounds (including gap spacing)
  const displayBounds = useMemo(() => {
    if (segments.length === 0) {
      return contentBounds
    }
    const displayWidth = coordinateMapper.getTotalDisplayWidth()
    return Bounds2D.fromMinMax(newVec2(0, contentBounds.min[1]), newVec2(displayWidth, contentBounds.max[1]))
  }, [segments, contentBounds, coordinateMapper])

  // Generate the full polygon path once (no clipping or transformation)
  const fullPolygonPath = useMemo(() => polygonWithHolesToSvgPath(flippedPolygon), [flippedPolygon])

  const [containerSize, containerRef] = elementSizeRef()

  const peakCount = Math.max(Math.ceil(contentBounds.height / ZIGZAG_PEAK_SIZE), ZIGZAG_MIN_PEAKS)
  const zigzagConf: ZigzagConfig = { width: ZIGZAG_WIDTH, peaks: peakCount, extend: ZIGZAG_EXTEND }
  const zigzags = useMemo(() => {
    const paths = []
    for (let i = 1; i < segments.length; i++) {
      const left = coordinateMapper.getSegmentDisplayEnd(i - 1)
      const right = coordinateMapper.getSegmentDisplayStart(i)

      paths.push(generateZigzagEdgePoints(left, displayBounds.min[1], displayBounds.max[1], zigzagConf))
      paths.push(generateZigzagEdgePoints(right, displayBounds.min[1], displayBounds.max[1], zigzagConf))
    }
    return paths
  }, [segments, coordinateMapper])
  // Generate unique clip path IDs for each segment
  const clipPaths = useMemo(
    () =>
      segments.map((_, index) => {
        const left =
          index === 0
            ? generateStraightEdgePoints(
                coordinateMapper.getSegmentDisplayStart(index),
                displayBounds.min[1],
                displayBounds.max[1],
                ZIGZAG_EXTEND
              )
            : zigzags[index * 2 - 1]
        const right =
          index === segments.length - 1
            ? generateStraightEdgePoints(
                coordinateMapper.getSegmentDisplayEnd(index),
                displayBounds.min[1],
                displayBounds.max[1],
                ZIGZAG_EXTEND
              )
            : [...zigzags[index * 2]]

        const combinedPath = [...left, ...right.reverse()]
        return {
          id: `segment-clip-${index}-${Math.random().toString(36).substring(2, 11)}`,
          path: pointsToSvgPath(combinedPath, true)
        }
      }),
    [segments]
  )

  return (
    <BaseModal
      height="90vh"
      width="95vw"
      maxHeight="90vh"
      maxWidth="95vw"
      title={t($ => $.partCutModal.partCutDiagram)}
      trigger={trigger}
    >
      <Grid rows="1fr" p="0">
        <div className="p0 m0" style={{ maxHeight: '80vh' }} ref={containerRef}>
          <SVGViewport
            ref={viewportRef}
            contentBounds={displayBounds}
            paddingAbsolute={40}
            resetButtonPosition="top-right"
            svgSize={containerSize}
          >
            <defs>
              <path id={polygonId} d={fullPolygonPath} />
              {/* Create clip paths for each segment with zigzag edges */}
              {clipPaths.map(cp => (
                <clipPath key={cp.id} id={cp.id}>
                  <path d={cp.path} />
                </clipPath>
              ))}
            </defs>

            {/* Render each segment with clipping - reusing the same polygon with offsets */}
            {segments.map((segment, index) => {
              // Calculate X offset to position this segment at its display location
              const displayStart = coordinateMapper.getSegmentDisplayStart(index)
              const xOffset = displayStart - segment.start

              return (
                <g key={`segment-${index}`} clipPath={`url(#${clipPaths[index].id})`}>
                  <g transform={`translate(${xOffset}, 0)`}>
                    <use
                      href={`#${polygonId}`}
                      stroke="var(--accent-9)"
                      strokeWidth="1"
                      fill="var(--accent-9)"
                      fillOpacity="0.5"
                      strokeLinejoin="miter"
                    />
                  </g>
                </g>
              )
            })}

            {zigzags.map((z, i) => (
              <path
                key={`zigzag-${i}`}
                d={pointsToSvgPath(z, false)}
                stroke="var(--gray-7)"
                strokeWidth="5"
                fill="none"
                opacity={0.8}
              />
            ))}

            {/* Render grid and measurements */}
            <GridMeasurementSystem
              polygon={flippedPolygon}
              displayBounds={displayBounds}
              coordinateMapper={coordinateMapper}
            />

            {/* Render angle indicators */}
            <PolygonAngleIndicators polygon={flippedPolygon} coordinateMapper={coordinateMapper} />

            {/* Render diagonal edge measurements */}
            <DiagonalEdgeMeasurements polygon={flippedPolygon} coordinateMapper={coordinateMapper} />
          </SVGViewport>
        </div>
      </Grid>
    </BaseModal>
  )
}
