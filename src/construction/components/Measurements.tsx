import { useMemo } from 'react'

import { SvgMeasurementIndicator } from '@/construction/components/SvgMeasurementIndicator'
import type { GroupOrElement } from '@/construction/elements'
import { type Projection, transform } from '@/construction/geometry'
import { type AutoMeasurement, type DirectMeasurement, processMeasurements } from '@/construction/measurements'
import type { ConstructionModel } from '@/construction/model'
import { type Vec2, distance } from '@/shared/geometry'
import { COLORS } from '@/shared/theme/colors'
import { formatLength } from '@/shared/utils/formatLength'

export interface MeasurementsProps {
  model: ConstructionModel
  projection: Projection
}

function* allPoints(element: GroupOrElement, projection: Projection): Generator<Vec2> {
  if ('shape' in element) {
    yield projection(transform(element.shape.bounds.min, element.transform))
    yield projection(transform([element.shape.bounds.min[0], element.bounds.max[1]], element.transform))
    yield projection(transform(element.shape.bounds.max, element.transform))
    yield projection(transform([element.shape.bounds.max[0], element.bounds.min[1]], element.transform))
  } else if ('children' in element) {
    for (const child of element.children) {
      for (const p of allPoints(child, projection)) {
        yield transform(p, element.transform)
      }
    }
  }
}

export function Measurements({ model, projection }: MeasurementsProps): React.JSX.Element {
  const planPoints = useMemo(
    () => model.elements.flatMap(e => Array.from(allPoints(e, projection))),
    [model.elements, projection]
  )

  // Filter only AutoMeasurement from model.measurements
  const autoMeasurements = model.measurements.filter((m): m is AutoMeasurement => 'size' in m)

  const processedMeasurements = useMemo(() => {
    return processMeasurements(autoMeasurements, projection, planPoints)
  }, [autoMeasurements, projection, planPoints])

  // Convert processed measurements back to renderable format
  const renderableMeasurements: {
    startPoint: Vec2
    endPoint: Vec2
    label: string
    offset: number
    classes: string[]
  }[] = []

  for (const [, { left, right }] of processedMeasurements) {
    // Process left side measurements
    left.lines.forEach((line, rowIndex) => {
      line.forEach(measurement => {
        // Calculate distance-based offset: distance from chosen point to its projection on line + row offset
        const baseOffset = distance(measurement.startPoint, measurement.startOnLine)
        const rowOffset = 60 * (rowIndex + 1)
        const totalOffset = baseOffset + rowOffset

        renderableMeasurements.push({
          startPoint: measurement.startPoint,
          endPoint: measurement.endPoint,
          label: formatLength(measurement.length),
          offset: totalOffset,
          classes: measurement.tags?.flatMap(t => [`tag__${t.id}`, `tag-cat__${t.category}`]) ?? []
        })
      })
    })

    // Process right side measurements
    right.lines.forEach((line, rowIndex) => {
      line.forEach(measurement => {
        // Calculate distance-based offset: distance from chosen point to its projection on line + row offset
        const baseOffset = distance(measurement.startPoint, measurement.startOnLine)
        const rowOffset = 60 * (rowIndex + 1)
        const totalOffset = baseOffset + rowOffset

        renderableMeasurements.push({
          startPoint: measurement.startPoint,
          endPoint: measurement.endPoint,
          label: formatLength(measurement.length),
          offset: totalOffset,
          classes: measurement.tags?.flatMap(t => [`tag__${t.id}`, `tag-cat__${t.category}`]) ?? []
        })
      })
    })
  }

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
          color={COLORS.indicators.main}
          fontSize={60}
          strokeWidth={10}
          className={measurement.classes.join(' ')}
        />
      ))}

      {directMeasurements.map((measurement, index) => (
        <SvgMeasurementIndicator
          key={`direct-measurement-${index}`}
          startPoint={measurement.startPoint}
          endPoint={measurement.endPoint}
          label={measurement.label}
          offset={measurement.offset}
          color={COLORS.indicators.main}
          fontSize={60}
          strokeWidth={10}
        />
      ))}
    </g>
  )
}
