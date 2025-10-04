import { useMemo } from 'react'

import { SvgMeasurementIndicator } from '@/construction/components/SvgMeasurementIndicator'
import type { GroupOrElement } from '@/construction/elements'
import { type Projection, transform } from '@/construction/geometry'
import type { Measurement } from '@/construction/measurements'
import type { ConstructionModel } from '@/construction/model'
import { type Vec2, computeBoundsLine, direction, distanceToInfiniteLine } from '@/shared/geometry'
import { COLORS } from '@/shared/theme/colors'

export interface MeasurementsProps {
  model: ConstructionModel
  projection: Projection
}

const EPSILON = 1e-5

function* allPoints(element: GroupOrElement, projection: Projection): Generator<Vec2> {
  if ('shape' in element) {
    if (element.shape.type === 'cuboid') {
      yield projection(transform(element.shape.bounds.min, element.transform))
      yield projection(transform([element.shape.bounds.min[0], element.bounds.max[1]], element.transform))
      yield projection(transform(element.shape.bounds.max, element.transform))
      yield projection(transform([element.shape.bounds.max[0], element.bounds.min[1]], element.transform))
    }
  } else if ('children' in element) {
    for (const child of element.children) {
      for (const p of allPoints(child, projection)) {
        yield transform(p, element.transform)
      }
    }
  }
}

export function Measurements({ model, projection }: MeasurementsProps): React.JSX.Element {
  const groupedMeasurements = new Map<Vec2, Measurement[]>()
  for (const measurement of model.measurements) {
    let dir = direction(measurement.startPoint, measurement.endPoint)
    if (dir[0] == 0 && dir[1] == 0) continue
    if (dir[0] < 0 || (dir[0] === 0 && dir[1] < 0)) {
      dir[0] = -dir[0]
      dir[1] = -dir[1]
    }
    let existingGroup: Measurement[] | null = null
    for (const [groupDir, group] of groupedMeasurements.entries()) {
      if (Math.abs(groupDir[0] - dir[0]) < EPSILON && Math.abs(groupDir[1] - dir[1]) < EPSILON) {
        existingGroup = group
        break
      }
    }
    if (!existingGroup) {
      existingGroup = []
      groupedMeasurements.set(dir, existingGroup)
    }
    existingGroup.push(measurement)
  }

  const planPoints = useMemo(
    () => model.elements.flatMap(e => Array.from(allPoints(e, projection))),
    [model.elements, projection]
  )

  const actualMeasurements: Measurement[] = []
  for (const [groupDir, group] of groupedMeasurements.entries()) {
    const { left, right } = computeBoundsLine(groupDir, planPoints)
    console.log('left', left, 'right', right)
    for (const measurement of group) {
      const start = projection(measurement.startPoint)
      const end = projection(measurement.endPoint)
      const dLeft = distanceToInfiniteLine(start, left)
      const dRight = distanceToInfiniteLine(start, right)
      console.log(start, dLeft, end, dRight)

      const dir = direction(start, end)
      const sign = Math.abs(dir[0] - groupDir[0]) < EPSILON && Math.abs(dir[1] - groupDir[1]) < EPSILON ? -1 : 1

      if (dLeft < dRight) {
        actualMeasurements.push({
          ...measurement,
          offset: sign * -dLeft + 60 * (measurement.offset ?? 0)
        })
      } else {
        actualMeasurements.push({
          ...measurement,
          offset: sign * dRight - 60 * (measurement.offset ?? 0)
        })
      }
    }
  }

  return (
    <g>
      {actualMeasurements?.map((measurement, index) => {
        const svgStartPoint = projection(measurement.startPoint)
        const svgEndPoint = projection(measurement.endPoint)

        return svgStartPoint[2] === svgEndPoint[2] ? (
          <SvgMeasurementIndicator
            key={`measurement-${index}`}
            startPoint={svgStartPoint}
            endPoint={svgEndPoint}
            label={measurement.label}
            offset={measurement.offset}
            color={COLORS.indicators.main}
            fontSize={60}
            strokeWidth={10}
          />
        ) : (
          <></>
        )
      })}
    </g>
  )
}
