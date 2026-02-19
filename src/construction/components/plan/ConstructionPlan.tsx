import { Box, TriangleAlert, Group, Ruler } from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { CutAreaShape } from '@/construction/components/plan/CutAreaShape'
import { Measurements } from '@/construction/components/plan/Measurements'
import { sanitizeForCssClass } from '@/construction/components/plan/cssHelpers'
import { type FaceTree, geometryFaces } from '@/construction/components/plan/faceHelpers'
import { accumulateIssueWorldManifolds } from '@/construction/components/plan/issueHelpers'
import type { GroupOrElement } from '@/construction/elements'
import { bounds3Dto2D, createProjectionMatrix, projectPoint } from '@/construction/geometry'
import { type ProjectedOutline, projectManifoldToView } from '@/construction/manifoldProjection'
import type { ConstructionModel, HighlightedPolygon } from '@/construction/model'
import type { ConstructionIssue } from '@/construction/results'
import type { TagOrCategory } from '@/construction/tags'
import { MidCutXIcon, MidCutYIcon } from '@/shared/components/Icons'
import { SVGViewport, type SVGViewportRef } from '@/shared/components/SVGViewport'
import {
  Bounds2D,
  IDENTITY,
  type Plane3D,
  type Polygon2D,
  type PolygonWithHoles2D,
  type Transform,
  composeTransform
} from '@/shared/geometry'

import { CuboidAreaShape } from './CuboidAreaShape'
import { usePlanHighlight } from './PlanHighlightContext'
import { PolygonAreaShape } from './PolygonAreaShape'
import { SVGMaterialStyles } from './SVGMaterialStyles'
import { useTagVisibilityActions } from './TagVisibilityContext'
import { TagVisibilityMenu } from './TagVisibilityMenu'
import { VisibilityStyles } from './VisibilityStyles'

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
  currentViewIndex: number
  setCurrentViewIndex: (index: number) => void
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
  parentTransform: Transform = IDENTITY
): { element: GroupOrElement; worldTransform: Transform }[] {
  // Accumulate transform: parent * element
  const accumulatedTransform = composeTransform(parentTransform, element.transform)

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
  midCutActiveDefault = false,
  currentViewIndex,
  setCurrentViewIndex
}: ConstructionPlanProps): React.JSX.Element {
  const { t } = useTranslation('construction')
  const { toggleTagOrCategory, isTagOrCategoryVisible } = useTagVisibilityActions()
  const { hoveredIssueId, highlightedPartId } = usePlanHighlight()
  const viewportRef = useRef<SVGViewportRef>(null)
  const [midCutEnabled, setMidCutEnabled] = useState(midCutActiveDefault)
  const [hideAreas, setHideAreas] = useState(false)
  const [hideIssues, setHideIssues] = useState(false)
  const [hideMeasurements, setHideMeasurements] = useState(false)
  const [showStrawTypes, setShowStrawTypes] = useState(false)

  const currentView = views[currentViewIndex]?.view ?? views[0]?.view
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
  const cuboidAreas = model.areas.filter(a => a.type === 'cuboid')
  const cutAreas = model.areas.filter(a => a.type === 'cut')

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
      fill: var(--color-accent) !important;
      stroke: var(--color-accent-foreground) !important;
      outline-style: solid;
      outline-color: var(--color-primary);
      outline-width: 40px;
      filter: drop-shadow(0 0 20px var(--accent-a6));
      animation: pulse-part-highlight 2s ease-in-out infinite;
    }
  `
    : ''

  const otherStyles = [hoverStyles, partHighlightStyles].filter(Boolean).join('\n')

  // Auto-zoom to highlighted part
  useEffect(() => {
    if (!highlightedPartId) return

    // Use setTimeout to ensure this runs after any viewport resets
    const timeoutId = setTimeout(() => {
      // Find all elements with matching partId (filtered during traversal for efficiency)
      const matchingElements = model.elements.flatMap(el => collectElementsWithPartId(el, highlightedPartId))

      if (matchingElements.length === 0) return

      const elementBounds = matchingElements.map(({ element, worldTransform }) =>
        bounds3Dto2D(element.bounds, composeTransform(projectionMatrix, worldTransform))
      )
      const combinedBounds = Bounds2D.merge(...elementBounds)

      viewportRef.current?.zoomToBounds(combinedBounds, { padding: 0.15, animate: false })
    }, 100)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [highlightedPartId])

  return (
    <div className="relative h-full w-full">
      <SVGViewport
        ref={viewportRef}
        contentBounds={contentBounds}
        padding={0.05} // 5% padding for wall construction
        className={`h-full w-full ${midCutEnabled ? 'mid-cut-enabled' : ''} ${showStrawTypes ? 'show-straw-types' : ''}`}
        resetButtonPosition="top-right"
        svgSize={containerSize}
      >
        {/* Material styles for proper SVG rendering */}
        <SVGMaterialStyles />

        {/* Dynamic visibility and hover styles */}
        <defs>
          <VisibilityStyles
            hiddenTagsForView={hiddenTagsForView}
            hideAreas={hideAreas}
            hideIssues={hideIssues}
            hideMeasurements={hideMeasurements}
          />
          {otherStyles && <style>{otherStyles}</style>}
        </defs>

        {/* Cut Areas - Bottom */}
        {cutAreas
          .filter(p => p.renderPosition === 'bottom')
          .map((area, index) => (
            <CutAreaShape
              key={`cut-bottom-${index}`}
              cut={area}
              projection={projectionMatrix}
              worldBounds={model.bounds}
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
              worldBounds={model.bounds}
            />
          ))}
      </SVGViewport>

      {/* Overlay controls in top-left corner */}

      <div className="absolute top-3 left-3 z-10">
        <Card size="sm" variant="soft" className="bg-card shadow-md">
          <div className="-m-2 flex flex-col gap-2">
            {/* View selector - only show if multiple views */}
            {views.length > 1 && (
              <ToggleGroup
                type="single"
                variant="outline"
                value={currentViewIndex.toString()}
                onValueChange={value => {
                  if (value) {
                    setCurrentViewIndex(parseInt(value, 10))
                  }
                }}
                size="sm"
              >
                {views.map((viewOption, index) => (
                  <ToggleGroupItem key={index} value={index.toString()} className="h-7 text-xs">
                    {viewOption.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}

            <div className="grid grid-cols-6 items-center justify-center gap-1">
              {/* Mid-cut toggle */}
              <Button
                size="icon-xs"
                variant={midCutEnabled ? 'default' : 'outline'}
                title={t($ => $.plan.midCut)}
                onClick={() => {
                  setMidCutEnabled(!midCutEnabled)
                }}
              >
                {currentView.plane === 'xy' ? <MidCutYIcon /> : <MidCutXIcon />}
              </Button>

              {/* Area toggle */}
              <Button
                size="icon-xs"
                variant={hideAreas ? 'outline' : 'default'}
                title={t($ => $.plan.hideAreas)}
                onClick={() => {
                  setHideAreas(!hideAreas)
                }}
              >
                <Group />
              </Button>

              {/* Issues toggle */}
              <Button
                size="icon-xs"
                variant={hideIssues ? 'outline' : 'default'}
                title={t($ => $.plan.hideIssues)}
                onClick={() => {
                  setHideIssues(!hideIssues)
                }}
              >
                <TriangleAlert />
              </Button>

              {/* Measurements toggle */}
              <Button
                size="icon-xs"
                variant={hideMeasurements ? 'outline' : 'default'}
                title={t($ => $.plan.hideMeasurements)}
                onClick={() => {
                  setHideMeasurements(!hideMeasurements)
                }}
              >
                <Ruler />
              </Button>

              {/* Straw types toggle */}
              <Button
                size="icon-xs"
                variant={showStrawTypes ? 'default' : 'outline'}
                title={t($ => $.plan.showStrawTypes)}
                onClick={() => {
                  setShowStrawTypes(!showStrawTypes)
                }}
              >
                <Box />
              </Button>

              {/* Tag visibility menu */}
              <TagVisibilityMenu model={model} />
            </div>

            {showStrawTypes && (
              <div className="flex flex-col">
                <h4>{t($ => $.plan.strawTypesHeading)}</h4>
                <div className="grid grid-cols-2">
                  <span className="text-sm text-lime-600">{t($ => $.plan.strawTypes.fullBale)}</span>
                  <span className="text-sm text-purple-600">{t($ => $.plan.strawTypes.partialBale)}</span>
                  <span className="text-sm text-sky-600">{t($ => $.plan.strawTypes.flakes)}</span>
                  <span className="text-sm text-red-800">{t($ => $.plan.strawTypes.stuffed)}</span>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
