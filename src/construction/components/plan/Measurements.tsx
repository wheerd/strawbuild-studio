import { useMemo } from 'react'

import { SvgMeasurementIndicator } from '@/construction/components/SvgMeasurementIndicator'
import { useVisibleItems } from '@/construction/components/plan/TagVisibilityContext'
import { getTagClasses } from '@/construction/components/plan/cssHelpers'
import { type Projection, allPoints, bounds3Dto2D, projectPoint } from '@/construction/geometry'
import { type AutoMeasurement, type DirectMeasurement, processMeasurements } from '@/construction/measurements'
import type { ConstructionModel } from '@/construction/model'
import { Bounds2D, IDENTITY, type Vec3, distVec2, newVec2, newVec3 } from '@/shared/geometry'
import { useFormatters } from '@/shared/i18n/useFormatters'
import { assertUnreachable } from '@/shared/utils'

export interface MeasurementsProps {
  model: ConstructionModel
  projection: Projection
}

export function Measurements({ model, projection }: MeasurementsProps): React.JSX.Element {
  const { formatLength } = useFormatters()

  const planPoints = useMemo(() => {
    const elementPoints = model.elements.flatMap(e => Array.from(allPoints(e, projection, IDENTITY)))

    const areaPoints = model.areas
      .filter(area => area.type !== 'cut')
      .flatMap(area => {
        switch (area.type) {
          case 'cuboid': {
            const bounds2D = bounds3Dto2D(area.bounds, projection)
            const { min, max } = bounds2D
            return [newVec2(min[0], min[1]), newVec2(max[0], min[1]), newVec2(max[0], max[1]), newVec2(min[0], max[1])]
          }
          case 'polygon': {
            const polygonPoints = area.polygon.points.map(p => {
              let p3d: Vec3
              if (area.plane === 'xy') {
                p3d = newVec3(p[0], p[1], 0)
              } else if (area.plane === 'xz') {
                p3d = newVec3(p[0], 0, p[1])
              } else {
                p3d = newVec3(0, p[0], p[1])
              }
              const projected = projectPoint(p3d, projection)
              return newVec2(projected[0], projected[1])
            })
            const polygonBounds = Bounds2D.fromPoints(polygonPoints)
            return polygonBounds.isEmpty ? [] : polygonPoints
          }
          default:
            return assertUnreachable(area, 'Invalid area type')
        }
      })

    return [...elementPoints, ...areaPoints]
  }, [model.elements, model.areas, projection])

  // Filter only AutoMeasurement from model.measurements
  const autoMeasurements = model.measurements.filter((m): m is AutoMeasurement => 'extend1' in m)

  // Filter auto measurements by visibility - only visible measurements will be laid out
  const visibleAutoMeasurements = useVisibleItems(autoMeasurements)

  const processedMeasurements = useMemo(() => {
    return Array.from(processMeasurements(visibleAutoMeasurements, projection, planPoints))
  }, [visibleAutoMeasurements, projection, planPoints])

  const renderableMeasurements = processedMeasurements.flatMap(group =>
    group.lines.flatMap((line, rowIndex) =>
      line.map(measurement => {
        // Calculate distance-based offset: distance from chosen point to its projection on line + row offset
        const baseOffset = distVec2(measurement.startPoint, measurement.startOnLine)
        const rowOffset = 60 * (rowIndex + 1.2)
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

  const directMeasurements = model.measurements
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    .filter((m): m is DirectMeasurement => 'length' in m && m.length != null)
    .map(m => {
      const startProjected = projectPoint(m.startPoint, projection)
      const endProjected = projectPoint(m.endPoint, projection)

      return {
        startPoint: newVec2(startProjected[0], startProjected[1]),
        endPoint: newVec2(endProjected[0], endProjected[1]),
        label: m.label ?? formatLength(m.length),
        offset: m.offset * (projection[0] > 0 && startProjected[0] === endProjected[0] ? -60 : 60),
        tags: m.tags
      }
    })

  return (
    <g>
      {renderableMeasurements.map((measurement, index) => (
        <SvgMeasurementIndicator
          key={`measurement-${index}`}
          startPoint={measurement.startPoint}
          endPoint={measurement.endPoint}
          label={measurement.label}
          offset={measurement.offset}
          color="var(--gray-12)"
          fontSize={60}
          strokeWidth={10}
          className={getTagClasses(measurement.tags, 'measurement')}
        />
      ))}

      {directMeasurements.map((measurement, index) => (
        <SvgMeasurementIndicator
          key={`direct-measurement-${index}`}
          startPoint={measurement.startPoint}
          endPoint={measurement.endPoint}
          label={measurement.label}
          offset={measurement.offset}
          color="var(--gray-12)"
          fontSize={60}
          strokeWidth={10}
          className={getTagClasses(measurement.tags, 'measurement')}
        />
      ))}
    </g>
  )
}
