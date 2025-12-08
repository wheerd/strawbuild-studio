import { mat4, vec2, vec3 } from 'gl-matrix'
import { useMemo } from 'react'

import { SvgMeasurementIndicator } from '@/construction/components/SvgMeasurementIndicator'
import { getTagClasses } from '@/construction/components/cssHelpers'
import { type Projection, allPoints, bounds3Dto2D, projectPoint, transformBounds } from '@/construction/geometry'
import { type AutoMeasurement, type DirectMeasurement, processMeasurements } from '@/construction/measurements'
import type { ConstructionModel } from '@/construction/model'
import { formatLength } from '@/shared/utils/formatting'

export interface MeasurementsProps {
  model: ConstructionModel
  projection: Projection
}

export function Measurements({ model, projection }: MeasurementsProps): React.JSX.Element {
  const planPoints = useMemo(() => {
    const elementPoints = model.elements.flatMap(e => Array.from(allPoints(e, projection, mat4.create())))

    const areaPoints = model.areas
      .filter(area => area.type !== 'cut')
      .flatMap(area => {
        if (area.type === 'cuboid') {
          const transformedBounds = transformBounds(area.bounds, area.transform)
          const bounds2D = bounds3Dto2D(transformedBounds, projection)
          const { min, max } = bounds2D
          return [
            vec2.fromValues(min[0], min[1]),
            vec2.fromValues(max[0], min[1]),
            vec2.fromValues(max[0], max[1]),
            vec2.fromValues(min[0], max[1])
          ]
        } else if (area.type === 'polygon') {
          return area.polygon.points.map(p => {
            let p3d: vec3
            if (area.plane === 'xy') {
              p3d = vec3.fromValues(p[0], p[1], 0)
            } else if (area.plane === 'xz') {
              p3d = vec3.fromValues(p[0], 0, p[1])
            } else {
              p3d = vec3.fromValues(0, p[0], p[1])
            }
            const projected = projectPoint(p3d, projection)
            return vec2.fromValues(projected[0], projected[1])
          })
        }
        return []
      })

    return [...elementPoints, ...areaPoints]
  }, [model.elements, model.areas, projection])

  // Filter only AutoMeasurement from model.measurements
  const autoMeasurements = model.measurements.filter((m): m is AutoMeasurement => 'size' in m)

  const processedMeasurements = useMemo(() => {
    return Array.from(processMeasurements(autoMeasurements, projection, planPoints))
  }, [autoMeasurements, projection, planPoints])

  const renderableMeasurements = processedMeasurements.flatMap(group =>
    group.lines.flatMap((line, rowIndex) =>
      line.map(measurement => {
        // Calculate distance-based offset: distance from chosen point to its projection on line + row offset
        const baseOffset = vec2.distance(measurement.startPoint, measurement.startOnLine)
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
    .filter((m): m is DirectMeasurement => 'label' in m)
    .map(m => {
      const startProjected = projectPoint(m.startPoint, projection)
      const endProjected = projectPoint(m.endPoint, projection)
      return {
        ...m,
        startPoint: vec2.fromValues(startProjected[0], startProjected[1]),
        endPoint: vec2.fromValues(endProjected[0], endProjected[1]),
        offset: m.offset * 60
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
          color="var(--color-text)"
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
          color="var(--color-text)"
          fontSize={60}
          strokeWidth={10}
          className={getTagClasses(measurement.tags, 'measurement')}
        />
      ))}
    </g>
  )
}
