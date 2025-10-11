import { useMemo } from 'react'

import { SvgMeasurementIndicator } from '@/construction/components/SvgMeasurementIndicator'
import { getTagClasses } from '@/construction/components/cssHelpers'
import { type Projection, allPoints } from '@/construction/geometry'
import { type AutoMeasurement, type DirectMeasurement, processMeasurements } from '@/construction/measurements'
import type { ConstructionModel } from '@/construction/model'
import { distance } from '@/shared/geometry'
import { formatLength } from '@/shared/utils/formatLength'

export interface MeasurementsProps {
  model: ConstructionModel
  projection: Projection
}

export function Measurements({ model, projection }: MeasurementsProps): React.JSX.Element {
  const planPoints = useMemo(
    () => model.elements.flatMap(e => Array.from(allPoints(e, projection))),
    [model.elements, projection]
  )

  // Filter only AutoMeasurement from model.measurements
  const autoMeasurements = model.measurements.filter((m): m is AutoMeasurement => 'size' in m)

  const processedMeasurements = useMemo(() => {
    return Array.from(processMeasurements(autoMeasurements, projection, planPoints))
  }, [autoMeasurements, projection, planPoints])

  const renderableMeasurements = processedMeasurements.flatMap(group =>
    group.lines.flatMap((line, rowIndex) =>
      line.map(measurement => {
        // Calculate distance-based offset: distance from chosen point to its projection on line + row offset
        const baseOffset = distance(measurement.startPoint, measurement.startOnLine)
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
    .map(m => ({
      ...m,
      startPoint: projection(m.startPoint),
      endPoint: projection(m.endPoint),
      offset: m.offset * 60
    }))

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
