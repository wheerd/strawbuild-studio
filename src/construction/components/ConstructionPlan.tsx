import { ExclamationTriangleIcon, GroupIcon, RulerHorizontalIcon } from '@radix-ui/react-icons'
import { Box, Card, Flex, Grid, IconButton, SegmentedControl } from '@radix-ui/themes'
import { mat4, vec3 } from 'gl-matrix'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { CutAreaShape } from '@/construction/components/CutAreaShape'
import { Measurements } from '@/construction/components/Measurements'
import { sanitizeForCssClass } from '@/construction/components/cssHelpers'
import { type FaceTree, geometryFaces } from '@/construction/components/faceHelpers'
import { accumulateIssueWorldManifolds } from '@/construction/components/issueHelpers'
import type { GroupOrElement } from '@/construction/elements'
import { bounds3Dto2D, createProjectionMatrix, projectPoint } from '@/construction/geometry'
import { type ProjectedOutline, projectManifoldToView } from '@/construction/manifoldProjection'
import type { ConstructionModel, HighlightedCuboid, HighlightedCut, HighlightedPolygon } from '@/construction/model'
import type { ConstructionIssue } from '@/construction/results'
import { MidCutXIcon, MidCutYIcon } from '@/shared/components/Icons'
import { SVGViewport, type SVGViewportRef } from '@/shared/components/SVGViewport'
import { Bounds3D } from '@/shared/geometry'
import { type Plane3D, type Polygon2D, type PolygonWithHoles2D } from '@/shared/geometry'

import { CuboidAreaShape } from './CuboidAreaShape'
import { PolygonAreaShape } from './PolygonAreaShape'
import { SVGMaterialStyles } from './SVGMaterialStyles'
import { TagVisibilityMenu } from './TagVisibilityMenu'
import { usePlanHighlight } from './context/PlanHighlightContext'
import { type TagOrCategory, useTagVisibility } from './context/TagVisibilityContext'

export interface View {
  plane: Plane3D
  zOrder: 'ascending' | 'descending'
  xDirection: 1 | -1
}

export interface ViewOption {
  view: View
  label: string
  alwaysHiddenTags?: TagOrCategory[]
  toggleHideTags?: TagOrCategory[]
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
  return `M${polygon.points.map(([px, py]) => `${px},${py}`).join(' L')} Z`
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

// Helper to recursively collect elements matching a partId with their accumulated transforms
function collectElementsWithPartId(
  element: GroupOrElement,
  partId: string,
  parentTransform: mat4 = mat4.create()
): Array<{ element: GroupOrElement; worldTransform: mat4 }> {
  // Accumulate transform: parent * element
  const accumulatedTransform = mat4.multiply(mat4.create(), parentTransform, element.transform)

  if ('bounds' in element) {
    // Check if this element matches the partId
    if (element.partInfo && 'id' in element.partInfo && element.partInfo.id === partId) {
      return [{ element, worldTransform: accumulatedTransform }]
    }
  }

  // Recursively collect from children
  if ('children' in element) {
    return element.children.flatMap(child => collectElementsWithPartId(child, partId, accumulatedTransform))
  }

  return []
}

export function ConstructionPlan({
  model,
  views,
  containerSize,
  midCutActiveDefault = false
}: ConstructionPlanProps): React.JSX.Element {
  const { hiddenTagIds, toggleTagOrCategory, isTagOrCategoryVisible } = useTagVisibility()
  const { hoveredIssueId, highlightedPartId } = usePlanHighlight()
  const viewportRef = useRef<SVGViewportRef>(null)
  const [currentViewIndex, setCurrentViewIndex] = useState(0)
  const [midCutEnabled, setMidCutEnabled] = useState(midCutActiveDefault)
  const [hideAreas, setHideAreas] = useState(false)
  const [hideIssues, setHideIssues] = useState(false)
  const [hideMeasurements, setHideMeasurements] = useState(false)

  const currentView = views[currentViewIndex]?.view || views[0]?.view
  const hiddenTagsForView = views[currentViewIndex]?.alwaysHiddenTags ?? []

  const previousViewIndexRef = useRef<number | null>(null)

  useEffect(() => {
    // Only run this effect when we switch to a different view
    if (previousViewIndexRef.current === currentViewIndex) {
      return
    }

    // Un-toggle tags from the previous view (show them again)
    const previousToggledTags =
      previousViewIndexRef.current !== null ? (views[previousViewIndexRef.current]?.toggleHideTags ?? []) : []
    for (const tag of previousToggledTags) {
      if (!isTagOrCategoryVisible(tag)) {
        toggleTagOrCategory(tag)
      }
    }

    // Toggle tags for the new view (hide them)
    const toggledTagsForView = views[currentViewIndex]?.toggleHideTags ?? []
    for (const tag of toggledTagsForView) {
      if (isTagOrCategoryVisible(tag)) {
        toggleTagOrCategory(tag)
      }
    }

    previousViewIndexRef.current = currentViewIndex
  }, [currentViewIndex])

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

  // Stage 1: Accumulate world-space manifolds for issues (view-independent)
  const issueWorldManifolds = useMemo(() => {
    return accumulateIssueWorldManifolds(model.elements)
  }, [model.elements])

  // Stage 2: Project world manifolds to current view (view-dependent)
  const errorOutlines = useMemo(() => {
    return model.errors
      .map(error => {
        const worldManifold = issueWorldManifolds.get(error.id)
        if (!worldManifold) return null

        const outline = projectManifoldToView(worldManifold, projectionMatrix)
        if (!outline) return null

        return { error, outline }
      })
      .filter((e): e is { error: ConstructionIssue; outline: ProjectedOutline } => e !== null)
  }, [model.errors, issueWorldManifolds, projectionMatrix])

  const warningOutlines = useMemo(() => {
    return model.warnings
      .map(warning => {
        const worldManifold = issueWorldManifolds.get(warning.id)
        if (!worldManifold) return null

        const outline = projectManifoldToView(worldManifold, projectionMatrix)
        if (!outline) return null

        return { warning, outline }
      })
      .filter((w): w is { warning: ConstructionIssue; outline: ProjectedOutline } => w !== null)
  }, [model.warnings, issueWorldManifolds, projectionMatrix])

  const polygonAreas = model.areas.filter(
    a => a.type === 'polygon' && a.plane === currentView.plane
  ) as HighlightedPolygon[]
  const cuboidAreas = model.areas.filter(a => a.type === 'cuboid') as HighlightedCuboid[]
  const cutAreas = model.areas.filter(a => a.type === 'cut') as HighlightedCut[]

  const getCssClassForTag = (tagId: string): string => (tagId.includes('_') ? `tag__${tagId}` : `tag-cat__${tagId}`)

  const visibilityStyles = Array.from(hiddenTagIds)
    .concat(hiddenTagsForView)
    .map(tagId => getCssClassForTag(tagId))
    .concat(hideAreas ? ['area-polygon', 'area-cuboid', 'area-cut'] : [])
    .concat(hideIssues ? ['construction-warning', 'construction-error'] : [])
    .concat(hideMeasurements ? ['measurement'] : [])
    .map(cssClass => `.${cssClass} { display: none; }`)
    .join('\n')

  // Generate hover styles for issue highlighting
  const hoverStyles =
    hoveredIssueId && !hideIssues
      ? `
    .construction-error:not(.issue-${hoveredIssueId}),
    .construction-warning:not(.issue-${hoveredIssueId}) {
      stroke-opacity: 0.5;
      transition: stroke-opacity 0.2s ease;
    }
    .construction-error.issue-${hoveredIssueId},
    .construction-warning.issue-${hoveredIssueId} {
      animation: pulse-highlight 1.5s ease-in-out infinite;
    }
  `
      : ''

  // Generate highlighting styles for selected part
  const partHighlightStyles = highlightedPartId
    ? `
    .part-${sanitizeForCssClass(highlightedPartId)} path {
      stroke: var(--accent-9);
      stroke-width: 40;
      filter: drop-shadow(0 0 20px var(--accent-a6));
      animation: pulse-part-highlight 2s ease-in-out infinite;
    }
  `
    : ''

  const allStyles = [visibilityStyles, hoverStyles, partHighlightStyles].filter(Boolean).join('\n')

  // Auto-zoom to highlighted part
  useEffect(() => {
    if (!highlightedPartId) return

    // Use setTimeout to ensure this runs after any viewport resets
    const timeoutId = setTimeout(() => {
      // Find all elements with matching partId (filtered during traversal for efficiency)
      const matchingElements = model.elements.flatMap(el => collectElementsWithPartId(el, highlightedPartId))

      if (matchingElements.length === 0) return

      // Calculate combined bounds of all matching elements in world space
      const worldBounds = matchingElements.map(({ element, worldTransform }) => {
        // Transform the element's bounds to world space
        const min = vec3.transformMat4(vec3.create(), element.bounds.min, worldTransform)
        const max = vec3.transformMat4(vec3.create(), element.bounds.max, worldTransform)

        // After transformation, min might not be min anymore, so we need to recalculate
        const actualMin = vec3.fromValues(Math.min(min[0], max[0]), Math.min(min[1], max[1]), Math.min(min[2], max[2]))
        const actualMax = vec3.fromValues(Math.max(min[0], max[0]), Math.max(min[1], max[1]), Math.max(min[2], max[2]))

        return Bounds3D.fromMinMax(actualMin, actualMax)
      })
      const combinedBounds = Bounds3D.merge(...worldBounds)

      // Project to 2D and zoom with padding
      const bounds2D = bounds3Dto2D(combinedBounds, projectionMatrix)
      viewportRef.current?.zoomToBounds(bounds2D, { padding: 0.15, animate: false })
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [highlightedPartId, model.elements, projectionMatrix])

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

        {/* Dynamic visibility and hover styles */}
        {allStyles && (
          <defs>
            <style>{allStyles}</style>
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
        {warningOutlines.map(({ warning, outline }) => (
          <g key={`warning-${warning.id}`} className={`construction-warning issue-${warning.id}`}>
            {outline.polygons.map((polygon, polyIndex) => (
              <path key={polyIndex} d={polygonToSvgPath(polygon)} />
            ))}
          </g>
        ))}

        {/* Errors */}
        {errorOutlines.map(({ error, outline }) => (
          <g key={`error-${error.id}`} className={`construction-error issue-${error.id}`}>
            {outline.polygons.map((polygon, polyIndex) => (
              <path key={polyIndex} d={polygonToSvgPath(polygon)} />
            ))}
          </g>
        ))}

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
