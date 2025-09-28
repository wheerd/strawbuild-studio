import React from 'react'

import { SvgMeasurementIndicator } from '@/construction/components/SvgMeasurementIndicator'
import { resolveDefaultMaterial } from '@/construction/walls'
import { SVGViewport } from '@/shared/components/SVGViewport'
import { type Plane3D, complementaryAxis } from '@/shared/geometry'
import { COLORS } from '@/shared/theme/colors'

import { bounds3Dto2D, createZOrder, project, projectRotation } from '../geometry'
import type { ConstructionModel } from '../model'
import { ConstructionElementShape } from './ConstructionElementShape'
import { ConstructionGroupElement } from './ConstructionGroupElement'

interface View {
  plane: Plane3D
  zOrder: 'min' | 'max'
  xDirection: 1 | -1
  yDirection: 1 | -1
}

interface ConstructionPlanProps {
  model: ConstructionModel
  view: View
  containerSize: { width: number; height: number }
}

export function ConstructionPlan({ model, view, containerSize }: ConstructionPlanProps): React.JSX.Element {
  const axis = complementaryAxis(view.plane)
  const projection = project(view.plane, view.xDirection, view.yDirection, view.zOrder === 'min' ? 1 : -1)
  const rotationProjection = projectRotation(view.plane, view.xDirection, view.yDirection)
  const zOrder = createZOrder(axis, view.zOrder)
  const sortedElements = [...model.elements].sort()
  const contentBounds = bounds3Dto2D(model.bounds, projection)

  return (
    <SVGViewport
      contentBounds={contentBounds}
      padding={0.05} // 5% padding for wall construction
      className="w-full h-full"
      resetButtonPosition="top-right"
      svgSize={containerSize}
    >
      {/* Construction elements */}
      {sortedElements.map(element =>
        'children' in element ? (
          <ConstructionGroupElement
            key={element.id}
            group={element}
            projection={projection}
            resolveMaterial={resolveDefaultMaterial}
            zOrder={zOrder}
            rotationProjection={rotationProjection}
          />
        ) : (
          <ConstructionElementShape
            key={element.id}
            projection={projection}
            rotationProjection={rotationProjection}
            element={element}
            resolveMaterial={resolveDefaultMaterial}
          />
        )
      )}

      {/* Measurements */}
      {model.measurements?.map((measurement, index) => {
        // Transform construction coordinates to SVG coordinates
        const svgStartPoint = projection(measurement.startPoint)
        const svgEndPoint = projection(measurement.endPoint)

        console.log(svgStartPoint, svgEndPoint)

        return svgStartPoint[2] === svgEndPoint[2] ? (
          <SvgMeasurementIndicator
            key={index}
            startPoint={svgStartPoint}
            endPoint={svgEndPoint}
            label={measurement.label}
            offset={0}
            color={COLORS.indicators.main}
            fontSize={60}
            strokeWidth={10}
          />
        ) : (
          <></>
        )
      })}
    </SVGViewport>
  )
}
