import { Grid } from '@radix-ui/themes'
import { mat4, vec3 } from 'gl-matrix'
import React, { useMemo, useRef } from 'react'

import { SvgMeasurementIndicator } from '@/construction/components/SvgMeasurementIndicator'
import { type AutoMeasurement, processMeasurements } from '@/construction/measurements'
import { BaseModal } from '@/shared/components/BaseModal'
import { SVGViewport, type SVGViewportRef } from '@/shared/components/SVGViewport'
import { distVec2, newVec2 } from '@/shared/geometry'
import { Bounds2D, type Polygon2D, type PolygonWithHoles2D } from '@/shared/geometry'
import { elementSizeRef } from '@/shared/hooks/useElementSize'
import { formatLength } from '@/shared/utils/formatting'

function polygonToSvgPath(polygon: Polygon2D) {
  return `M${polygon.points.map(([px, py]) => `${px},${py}`).join(' L')} Z`
}

function polygonWithHolesToSvgPath(polygon: PolygonWithHoles2D) {
  return [polygon.outer, ...polygon.holes].map(polygonToSvgPath).join(' ')
}

export function PartCutModal({
  polygon,
  trigger
}: {
  polygon: PolygonWithHoles2D
  trigger: React.ReactNode
}): React.JSX.Element {
  const viewportRef = useRef<SVGViewportRef>(null)

  const flippedPolygon: PolygonWithHoles2D = {
    outer: { points: polygon.outer.points.map(p => newVec2(p[1], p[0])) },
    holes: polygon.holes.map(h => ({ points: h.points.map(p => newVec2(p[1], p[0])) }))
  }

  const polygonPath = useMemo(() => polygonWithHolesToSvgPath(flippedPolygon), [flippedPolygon])

  const contentBounds = Bounds2D.fromPoints(flippedPolygon.outer.points)
  const [containerSize, containerRef] = elementSizeRef()

  return (
    <BaseModal height="80vh" width="80vw" maxHeight="80vh" maxWidth="80vw" title="Part Cut Diagram" trigger={trigger}>
      <Grid rows="1fr" p="0">
        <div className="p0 m0" style={{ maxHeight: '400px' }} ref={containerRef}>
          <SVGViewport
            ref={viewportRef}
            contentBounds={contentBounds}
            padding={0.05}
            resetButtonPosition="top-right"
            svgSize={containerSize}
          >
            <rect
              x={0}
              y={0}
              width={contentBounds.size[0]}
              height={contentBounds.size[1]}
              fill="none"
              stroke="var(--gray-10)"
              strokeDasharray="3 1"
              strokeWidth="1"
            />
            <path
              d={polygonPath}
              stroke="var(--accent-9)"
              strokeWidth="1"
              fill="var(--accent-9)"
              fillOpacity="0.5"
              strokeLinejoin="miter"
            />

            <Measurements bounds={contentBounds} polygon={flippedPolygon} />
          </SVGViewport>
        </div>
      </Grid>
    </BaseModal>
  )
}

function Measurements({ bounds, polygon }: { bounds: Bounds2D; polygon: PolygonWithHoles2D }): React.JSX.Element {
  const cornerPoints = [
    bounds.min,
    bounds.max,
    newVec2(bounds.min[0], bounds.max[1]),
    newVec2(bounds.max[0], bounds.min[1])
  ]
  const bounds3D = bounds.toBounds3D('xy', 0, 1)

  const measurements = useMemo(() => {
    const fullLength: AutoMeasurement = {
      startPoint: bounds3D.min,
      endPoint: vec3.fromValues(bounds3D.max[0], bounds3D.min[1], 0),
      extend1: vec3.fromValues(bounds3D.min[0], bounds3D.max[1], 0)
    }
    const fullHeight: AutoMeasurement = {
      startPoint: bounds3D.min,
      endPoint: vec3.fromValues(bounds3D.min[0], bounds3D.max[1], 0),
      extend1: vec3.fromValues(bounds3D.max[0], bounds3D.min[1], 0)
    }

    const allPoints = polygon.outer.points.concat(polygon.holes.flatMap(h => h.points))
    const horizontalPoints = allPoints.filter(p => p[0] > bounds.min[0] && p[0] < bounds.max[0])
    const verticalPoints = allPoints.filter(p => p[1] > bounds.min[1] && p[1] < bounds.max[1])

    const autoMeasurements = [fullLength, fullHeight]

    const orderedHorizontal = Object.values(groupBy(horizontalPoints, p => p[0])).sort((a, b) => a[0][0] - b[0][0])

    orderedHorizontal.forEach((ps, i) => {
      const x = ps[0][0]
      const percentile = (x - bounds.min[0]) / bounds.size[0]
      const ys = ps.map(p => p[1])
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)
      if (i === 0 || (percentile > 0.2 && percentile < 0.8)) {
        autoMeasurements.push({
          startPoint: vec3.fromValues(bounds3D.min[0], minY, 0),
          endPoint: vec3.fromValues(ps[0][0], minY, 0),
          extend1: vec3.fromValues(bounds3D.min[0], maxY, 0)
        })
      }
      if (i === orderedHorizontal.length - 1 || (percentile > 0.2 && percentile < 0.8)) {
        autoMeasurements.push({
          startPoint: vec3.fromValues(bounds3D.max[0], minY, 0),
          endPoint: vec3.fromValues(ps[0][0], minY, 0),
          extend1: vec3.fromValues(bounds3D.max[0], maxY, 0)
        })
      }
      if (i > 0) {
        const previous = orderedHorizontal[i - 1]
        const prevX = previous[0][0]
        const prevYs = previous.map(p => p[1])
        const prevMinY = Math.min(...prevYs, minY)
        const prevMaxY = Math.max(...prevYs, maxY)
        autoMeasurements.push({
          startPoint: vec3.fromValues(prevX, prevMinY, 0),
          endPoint: vec3.fromValues(ps[0][0], prevMinY, 0),
          extend1: vec3.fromValues(prevX, prevMaxY, 0)
        })
      }
    })

    Object.values(groupBy(verticalPoints, p => p[1])).forEach(ps => {
      const xs = ps.map(p => p[0])
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      autoMeasurements.push({
        startPoint: vec3.fromValues(minX, bounds3D.min[1], 0),
        endPoint: vec3.fromValues(minX, ps[0][1], 0),
        extend1: vec3.fromValues(maxX, bounds3D.min[1], 0)
      })
      autoMeasurements.push({
        startPoint: vec3.fromValues(minX, bounds3D.max[1], 0),
        endPoint: vec3.fromValues(minX, ps[0][1], 0),
        extend1: vec3.fromValues(maxX, bounds3D.max[1], 0)
      })
    })

    return autoMeasurements
  }, [bounds3D, polygon])

  const projection = mat4.create()
  mat4.identity(projection)
  const processedMeasurements = useMemo(() => {
    return Array.from(processMeasurements(measurements, projection, cornerPoints))
  }, [measurements, projection, cornerPoints])

  const renderableMeasurements = processedMeasurements.flatMap(group =>
    group.lines.flatMap((line, rowIndex) =>
      line.map(measurement => {
        // Calculate distance-based offset: distance from chosen point to its projection on line + row offset
        const baseOffset = distVec2(measurement.startPoint, measurement.startOnLine)
        const rowOffset = 10 * (rowIndex + 1.2)
        const totalOffset = baseOffset + rowOffset

        return {
          startPoint: measurement.startPoint,
          endPoint: measurement.endPoint,
          label: formatLength(measurement.length),
          offset: totalOffset,
          tags: measurement.tags
        }
      })
    )
  )

  return (
    <g>
      {renderableMeasurements.map((measurement, index) => (
        <SvgMeasurementIndicator
          key={`measurement-${index}`}
          startPoint={measurement.startPoint}
          endPoint={measurement.endPoint}
          label={measurement.label}
          offset={measurement.offset}
          color="var(--color-text)"
          fontSize={10}
          strokeWidth={2}
        />
      ))}
    </g>
  )
}

const groupBy = function <T, K extends PropertyKey>(
  xs: T[],
  keySelector: (item: T, index: number) => K
): Record<K, T[]> {
  return xs.reduce(
    (rv, x, i) => {
      ;(rv[keySelector(x, i)] ??= []).push(x)
      return rv
    },
    {} as Record<K, T[]>
  )
}
