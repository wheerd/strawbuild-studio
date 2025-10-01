import { Box, Button, Flex, SegmentedControl } from '@radix-ui/themes'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { SvgMeasurementIndicator } from '@/construction/components/SvgMeasurementIndicator'
import { type CutFunction, bounds3Dto2D, createZOrder, project, projectRotation } from '@/construction/geometry'
import type { ConstructionModel, HighlightedCuboid, HighlightedPolygon } from '@/construction/model'
import { SVGViewport, type SVGViewportRef } from '@/shared/components/SVGViewport'
import { type Plane3D, add, complementaryAxis, direction, distance } from '@/shared/geometry'
import { COLORS } from '@/shared/theme/colors'

import { ConstructionElementShape } from './ConstructionElementShape'
import { ConstructionGroupElement } from './ConstructionGroupElement'
import { CuboidAreaShape } from './CuboidAreaShape'
import { PolygonAreaShape } from './PolygonAreaShape'
import { SVGMaterialStyles } from './SVGMaterialStyles'

export interface View {
  plane: Plane3D
  zOrder: 'ascending' | 'descending'
  xDirection: 1 | -1
}

export interface ViewOption {
  view: View
  label: string
}

export const TOP_VIEW: View = { plane: 'xy', xDirection: -1, zOrder: 'descending' }
export const FRONT_VIEW: View = { plane: 'xz', xDirection: 1, zOrder: 'descending' }
export const BACK_VIEW: View = { plane: 'xz', xDirection: -1, zOrder: 'ascending' }

interface ConstructionPlanProps {
  model: ConstructionModel
  views: ViewOption[]
  containerSize: { width: number; height: number }
}

export function ConstructionPlan({ model, views, containerSize }: ConstructionPlanProps): React.JSX.Element {
  const viewportRef = useRef<SVGViewportRef>(null)
  const [currentViewIndex, setCurrentViewIndex] = useState(0)
  const [midCutEnabled, setMidCutEnabled] = useState(false)

  const currentView = views[currentViewIndex]?.view || views[0]?.view

  useEffect(() => viewportRef.current?.fitToContent(), [currentView])

  const axis = complementaryAxis(currentView.plane)
  const projection = project(currentView.plane)
  const rotationProjection = projectRotation(currentView.plane)
  const zOrder = createZOrder(axis, currentView.zOrder)
  const sortedElements = [...model.elements].sort(zOrder)
  const contentBounds = bounds3Dto2D(model.bounds, projection)

  // Calculate cut position when enabled
  const zCutOffset = useMemo(() => {
    const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2
    // Cut at middle of model depth
    return (model.bounds.min[axisIndex] + model.bounds.max[axisIndex]) / 2
  }, [axis, model.bounds])

  // Create cut function
  // Always applies the above-cut class to elements which are then hidden based on midCutEnabled
  const aboveCut: CutFunction = useMemo(() => {
    const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2
    if (currentView.zOrder === 'ascending') {
      // For ascending z-order: hide elements whose front face is beyond cut
      return element => element.bounds.max[axisIndex] + (element.transform?.position[axisIndex] ?? 0) < zCutOffset
    } else {
      // For descending z-order: hide elements whose back face is beyond cut
      return element => element.bounds.min[axisIndex] + (element.transform?.position[axisIndex] ?? 0) > zCutOffset
    }
  }, [zCutOffset, axis, currentView.zOrder])

  const polygonAreas = model.areas.filter(
    a => a.type === 'polygon' && a.plane === currentView.plane
  ) as HighlightedPolygon[]
  const cuboidAreas = model.areas.filter(a => a.type === 'cuboid') as HighlightedCuboid[]

  return (
    <div className="relative w-full h-full">
      <SVGViewport
        ref={viewportRef}
        contentBounds={contentBounds}
        padding={0.05} // 5% padding for wall construction
        className={`w-full h-full ${midCutEnabled ? 'mid-cut-enabled' : ''}`}
        resetButtonPosition="top-right"
        svgSize={containerSize}
        flipX={currentView.xDirection !== -1}
      >
        {/* Material styles for proper SVG rendering */}
        <SVGMaterialStyles />

        {/* Polygon Areas - Bottom */}
        {polygonAreas
          .filter(p => p.renderPosition === 'bottom')
          .map((area, index) => (
            <PolygonAreaShape key={`polygon-bottom-${index}`} polygon={area} projection={projection} />
          ))}

        {/* Cuboid Areas - Bottom */}
        {cuboidAreas
          .filter(a => a.renderPosition === 'bottom')
          .map((area, index) => (
            <CuboidAreaShape
              key={`cuboid-bottom-${index}`}
              cuboid={area}
              projection={projection}
              rotationProjection={rotationProjection}
            />
          ))}

        {/* Construction elements */}
        {sortedElements.map(element =>
          'children' in element ? (
            <ConstructionGroupElement
              key={element.id}
              group={element}
              projection={projection}
              zOrder={zOrder}
              rotationProjection={rotationProjection}
              aboveCut={aboveCut}
            />
          ) : (
            <ConstructionElementShape
              key={element.id}
              projection={projection}
              rotationProjection={rotationProjection}
              element={element}
              aboveCut={aboveCut}
            />
          )
        )}

        {/* Warnings */}
        {model.warnings?.map((warning, index) => {
          if (warning.bounds) {
            const bounds2D = bounds3Dto2D(warning.bounds, projection)
            return (
              <rect
                key={`warning-${index}`}
                x={bounds2D.min[0]}
                y={bounds2D.min[1]}
                width={bounds2D.max[0] - bounds2D.min[0]}
                height={bounds2D.max[1] - bounds2D.min[1]}
                stroke={COLORS.ui.warning}
                strokeWidth={30}
                fill={`${COLORS.ui.warning}88`}
                strokeDasharray="100,100"
              />
            )
          }
          return null
        })}

        {/* Errors */}
        {model.errors?.map((error, index) => {
          if (error.bounds) {
            const bounds2D = bounds3Dto2D(error.bounds, projection)
            return (
              <rect
                key={`error-${index}`}
                x={bounds2D.min[0]}
                y={bounds2D.min[1]}
                width={bounds2D.max[0] - bounds2D.min[0]}
                height={bounds2D.max[1] - bounds2D.min[1]}
                stroke={COLORS.ui.danger}
                strokeWidth={50}
                fill={`${COLORS.ui.danger}AA`}
                strokeDasharray="100,100"
              />
            )
          }
          return null
        })}

        {/* Measurements */}
        {model.measurements?.map((measurement, index) => {
          const svgStartPoint = projection(measurement.startPoint)
          const svgEndPoint = projection(measurement.endPoint)

          const dir = direction(measurement.startPoint, measurement.endPoint)
          const svgDir = direction(svgStartPoint, svgEndPoint)

          const offsetSign = distance(add(dir, svgDir), [0, 0, 0]) === 0 ? -1 : 1

          return svgStartPoint[2] === svgEndPoint[2] ? (
            <SvgMeasurementIndicator
              key={`measurement-${index}`}
              startPoint={svgStartPoint}
              endPoint={svgEndPoint}
              label={measurement.label}
              offset={(measurement.offset ?? 0) * 60 * offsetSign}
              color={COLORS.indicators.main}
              fontSize={60}
              strokeWidth={10}
            />
          ) : (
            <></>
          )
        })}

        {/* Cuboid Areas - Top */}
        {cuboidAreas
          .filter(a => a.renderPosition === 'top')
          .map((area, index) => (
            <CuboidAreaShape
              key={`cuboid-top-${index}`}
              cuboid={area}
              projection={projection}
              rotationProjection={rotationProjection}
            />
          ))}

        {/* Polygon Areas - Top */}
        {polygonAreas
          .filter(p => p.renderPosition === 'top')
          .map((area, index) => (
            <PolygonAreaShape key={`polygon-top-${index}`} polygon={area} projection={projection} />
          ))}
      </SVGViewport>

      {/* Overlay controls in top-left corner */}
      <Box position="absolute" top="3" left="3" p="1" className="z-10 shadow-md bg-panel rounded-2">
        <Flex direction="column" gap="2">
          {/* View selector - only show if multiple views */}
          {views.length > 1 && (
            <SegmentedControl.Root
              value={currentViewIndex.toString()}
              onValueChange={value => setCurrentViewIndex(parseInt(value, 10))}
              size="1"
            >
              {views.map((viewOption, index) => (
                <SegmentedControl.Item key={index} value={index.toString()}>
                  {viewOption.label}
                </SegmentedControl.Item>
              ))}
            </SegmentedControl.Root>
          )}

          {/* Mid-cut toggle */}
          <Button
            variant={midCutEnabled ? 'solid' : 'outline'}
            size="1"
            onClick={() => setMidCutEnabled(!midCutEnabled)}
          >
            Mid Cut
          </Button>
        </Flex>
      </Box>
    </div>
  )
}
