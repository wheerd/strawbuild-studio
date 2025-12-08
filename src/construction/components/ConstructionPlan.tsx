import { ExclamationTriangleIcon, GroupIcon, RulerHorizontalIcon } from '@radix-ui/react-icons'
import { Box, Card, Flex, Grid, IconButton, SegmentedControl } from '@radix-ui/themes'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { CutAreaShape } from '@/construction/components/CutAreaShape'
import { Measurements } from '@/construction/components/Measurements'
import { type FaceTree, geometryFaces } from '@/construction/components/faceHelpers'
import { bounds3Dto2D, createProjectionMatrix, projectPoint } from '@/construction/geometry'
import type { ConstructionModel, HighlightedCuboid, HighlightedCut, HighlightedPolygon } from '@/construction/model'
import { MidCutXIcon, MidCutYIcon } from '@/shared/components/Icons'
import { SVGViewport, type SVGViewportRef } from '@/shared/components/SVGViewport'
import { type Plane3D, type Polygon2D, type PolygonWithHoles2D } from '@/shared/geometry'

import { CuboidAreaShape } from './CuboidAreaShape'
import { PolygonAreaShape } from './PolygonAreaShape'
import { SVGMaterialStyles } from './SVGMaterialStyles'
import { TagVisibilityMenu } from './TagVisibilityMenu'
import { useTagVisibility } from './context/TagVisibilityContext'

export interface View {
  plane: Plane3D
  zOrder: 'ascending' | 'descending'
  xDirection: 1 | -1
}

export interface ViewOption {
  view: View
  label: string
}

export const TOP_VIEW: View = { plane: 'xy', xDirection: 1, zOrder: 'descending' }
export const FRONT_VIEW: View = { plane: 'xz', xDirection: -1, zOrder: 'descending' }
export const BACK_VIEW: View = { plane: 'xz', xDirection: 1, zOrder: 'ascending' }
export const LEFT_VIEW: View = { plane: 'yz', xDirection: 1, zOrder: 'ascending' }

interface ConstructionPlanProps {
  model: ConstructionModel
  views: ViewOption[]
  containerSize: { width: number; height: number }
  midCutActiveDefault?: boolean
}

function polygonToSvgPath(polygon: Polygon2D) {
  return `M${polygon.points.map(([px, py]) => `${px},${py}`).join(' L')}`
}

function polygonWithHolesToSvgPath(polygon: PolygonWithHoles2D) {
  return [polygon.outer, ...polygon.holes].map(polygonToSvgPath).join(' ')
}

export function FaceTreeElement({ tree }: { tree: FaceTree }): React.JSX.Element {
  return (
    <g className={tree.className}>
      {'polygon' in tree && <path className="apply-material" d={polygonWithHolesToSvgPath(tree.polygon)} />}
      {'children' in tree && tree.children.map((child, index) => <FaceTreeElement key={index} tree={child} />)}
    </g>
  )
}

export function ConstructionPlan({
  model,
  views,
  containerSize,
  midCutActiveDefault = false
}: ConstructionPlanProps): React.JSX.Element {
  const { hiddenTagIds } = useTagVisibility()
  const viewportRef = useRef<SVGViewportRef>(null)
  const [currentViewIndex, setCurrentViewIndex] = useState(0)
  const [midCutEnabled, setMidCutEnabled] = useState(midCutActiveDefault)
  const [hideAreas, setHideAreas] = useState(false)
  const [hideIssues, setHideIssues] = useState(false)
  const [hideMeasurements, setHideMeasurements] = useState(false)

  const currentView = views[currentViewIndex]?.view || views[0]?.view

  useEffect(() => viewportRef.current?.fitToContent(), [currentView])

  const projectionMatrix = useMemo(
    () =>
      createProjectionMatrix(currentView.plane, currentView.zOrder === 'ascending' ? -1 : 1, currentView.xDirection),
    [currentView]
  )
  const contentBounds = bounds3Dto2D(model.bounds, projectionMatrix)

  // Calculate cut position when enabled
  const zCutOffset = useMemo(() => {
    // Cut at middle of model depth
    return projectPoint(model.bounds.center, projectionMatrix)[2]
  }, [projectionMatrix, model.bounds])

  const faces = useMemo(() => {
    const allFaces = model.elements.flatMap(element => Array.from(geometryFaces(element, projectionMatrix)))
    const zOrder = (a: FaceTree, b: FaceTree) => a.zIndex - b.zIndex
    const aboveCut = (a: FaceTree) => a.zIndex > zCutOffset
    return allFaces
      .sort(zOrder)
      .map(face => ({ ...face, className: face.className + (aboveCut(face) ? ' above-cut' : '') }))
  }, [model.elements, projectionMatrix, currentView.zOrder, zCutOffset])

  const polygonAreas = model.areas.filter(
    a => a.type === 'polygon' && a.plane === currentView.plane
  ) as HighlightedPolygon[]
  const cuboidAreas = model.areas.filter(a => a.type === 'cuboid') as HighlightedCuboid[]
  const cutAreas = model.areas.filter(a => a.type === 'cut') as HighlightedCut[]

  const getCssClassForTag = (tagId: string): string => (tagId.includes('_') ? `tag__${tagId}` : `tag-cat__${tagId}`)

  const visibilityStyles = Array.from(hiddenTagIds)
    .map(tagId => getCssClassForTag(tagId))
    .concat(hideAreas ? ['area-polygon', 'area-cuboid', 'area-cut'] : [])
    .concat(hideIssues ? ['construction-warning', 'construction-error'] : [])
    .concat(hideMeasurements ? ['measurement'] : [])
    .map(cssClass => `.${cssClass} { display: none; }`)
    .join('\n')

  return (
    <div className="relative w-full h-full">
      <SVGViewport
        ref={viewportRef}
        contentBounds={contentBounds}
        padding={0.05} // 5% padding for wall construction
        className={`w-full h-full ${midCutEnabled ? 'mid-cut-enabled' : ''}`}
        resetButtonPosition="top-right"
        svgSize={containerSize}
      >
        {/* Material styles for proper SVG rendering */}
        <SVGMaterialStyles />

        {/* Dynamic visibility styles */}
        {visibilityStyles && (
          <defs>
            <style>{visibilityStyles}</style>
          </defs>
        )}

        {/* Cut Areas - Bottom */}
        {cutAreas
          .filter(p => p.renderPosition === 'bottom')
          .map((area, index) => (
            <CutAreaShape
              key={`cut-bottom-${index}`}
              cut={area}
              projection={projectionMatrix}
              viewportBounds={contentBounds}
            />
          ))}

        {/* Polygon Areas - Bottom */}
        {polygonAreas
          .filter(p => p.renderPosition === 'bottom')
          .map((area, index) => (
            <PolygonAreaShape key={`polygon-bottom-${index}`} polygon={area} projection={projectionMatrix} />
          ))}

        {/* Cuboid Areas - Bottom */}
        {cuboidAreas
          .filter(a => a.renderPosition === 'bottom')
          .map((area, index) => (
            <CuboidAreaShape key={`cuboid-bottom-${index}`} cuboid={area} projection={projectionMatrix} />
          ))}

        {/* Construction element faces */}
        {faces.map((face, index) => (
          <FaceTreeElement key={`face${index}`} tree={face} />
        ))}

        {/* Warnings */}
        {model.warnings?.map((warning, index) => {
          if (!warning.bounds) return null
          const bounds2D = bounds3Dto2D(warning.bounds, projectionMatrix)
          const { min } = bounds2D
          const { width, height } = bounds2D
          return (
            <rect
              className="construction-warning"
              key={`warning-${index}`}
              x={min[0]}
              y={min[1]}
              width={width}
              height={height}
              stroke="var(--color-warning)"
              strokeWidth={30}
              fill="var(--color-warning-light)"
              strokeDasharray="100,100"
            />
          )
        })}

        {/* Errors */}
        {model.errors?.map((error, index) => {
          if (!error.bounds) return null
          const bounds2D = bounds3Dto2D(error.bounds, projectionMatrix)
          const { min } = bounds2D
          const { width, height } = bounds2D
          return (
            <rect
              className="construction-error"
              key={`error-${index}`}
              x={min[0]}
              y={min[1]}
              width={width}
              height={height}
              stroke="var(--color-danger)"
              strokeWidth={50}
              fill="var(--color-danger-light)"
              strokeDasharray="100,100"
            />
          )
        })}

        {/* Measurements */}
        <Measurements model={model} projection={projectionMatrix} />

        {/* Cuboid Areas - Top */}
        {cuboidAreas
          .filter(a => a.renderPosition === 'top')
          .map((area, index) => (
            <CuboidAreaShape key={`cuboid-top-${index}`} cuboid={area} projection={projectionMatrix} />
          ))}

        {/* Polygon Areas - Top */}
        {polygonAreas
          .filter(p => p.renderPosition === 'top')
          .map((area, index) => (
            <PolygonAreaShape key={`polygon-top-${index}`} polygon={area} projection={projectionMatrix} />
          ))}

        {/* Cut Areas - Top */}
        {cutAreas
          .filter(p => p.renderPosition === 'top')
          .map((area, index) => (
            <CutAreaShape
              key={`cut-top-${index}`}
              cut={area}
              projection={projectionMatrix}
              viewportBounds={contentBounds}
            />
          ))}
      </SVGViewport>

      {/* Overlay controls in top-left corner */}

      <Box position="absolute" top="3" left="3" className="z-10">
        <Card size="1" variant="surface" className="shadow-md">
          <Flex direction="column" gap="2" m="-2">
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

            <Grid columns="5" gap="1">
              {/* Mid-cut toggle */}
              <IconButton
                variant={midCutEnabled ? 'solid' : 'outline'}
                size="1"
                title="Mid Cut"
                onClick={() => setMidCutEnabled(!midCutEnabled)}
              >
                {currentView.plane === 'xy' ? <MidCutYIcon /> : <MidCutXIcon />}
              </IconButton>

              {/* Area toggle */}
              <IconButton
                variant={hideAreas ? 'outline' : 'solid'}
                size="1"
                title="Hide Areas"
                onClick={() => setHideAreas(!hideAreas)}
              >
                <GroupIcon />
              </IconButton>

              {/* Issues toggle */}
              <IconButton
                variant={hideIssues ? 'outline' : 'solid'}
                size="1"
                title="Hide Issues"
                onClick={() => setHideIssues(!hideIssues)}
              >
                <ExclamationTriangleIcon />
              </IconButton>

              {/* Measurements toggle */}
              <IconButton
                variant={hideMeasurements ? 'outline' : 'solid'}
                size="1"
                title="Hide Measurements"
                onClick={() => setHideMeasurements(!hideMeasurements)}
              >
                <RulerHorizontalIcon />
              </IconButton>

              {/* Tag visibility menu */}
              <TagVisibilityMenu model={model} />
            </Grid>
          </Flex>
        </Card>
      </Box>
    </div>
  )
}
