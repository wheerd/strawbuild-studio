import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PlanHighlightProvider } from '@/construction/components/plan/PlanHighlightContext'
import type { ConstructionModel, HighlightedCuboid, HighlightedPolygon } from '@/construction/model'
import { Bounds3D, IDENTITY, fromTrans, newVec2, newVec3 } from '@/shared/geometry'

import { ConstructionPlan, TOP_VIEW, type ViewOption } from './ConstructionPlan'
import { TagVisibilityProvider } from './TagVisibilityContext'

describe('ConstructionPlan', () => {
  it('should render polygon areas correctly', () => {
    const polygonArea: HighlightedPolygon = {
      type: 'polygon',
      areaType: 'inner-perimeter',
      polygon: {
        points: [newVec2(0, 0), newVec2(100, 0), newVec2(100, 100), newVec2(0, 100)]
      },
      plane: 'xy',
      renderPosition: 'bottom'
    }

    const model: ConstructionModel = {
      elements: [],
      measurements: [],
      areas: [polygonArea],
      errors: [],
      warnings: [],
      bounds: Bounds3D.fromMinMax(newVec3(0, 0, 0), newVec3(100, 100, 100))
    }

    const views: ViewOption[] = [{ view: TOP_VIEW, label: 'Top' }]
    const { container } = render(
      <Theme>
        <PlanHighlightProvider>
          <TagVisibilityProvider>
            <ConstructionPlan
              model={model}
              views={views}
              containerSize={{ width: 800, height: 600 }}
              currentViewIndex={0}
              setCurrentViewIndex={vi.fn()}
            />
          </TagVisibilityProvider>
        </PlanHighlightProvider>
      </Theme>
    )

    // Check that the polygon path is rendered
    const polygonPath = container.querySelector('path[d*="M 0 0"]')
    expect(polygonPath).toBeTruthy()

    // Check that the path is closed (ends with Z)
    const pathData = polygonPath?.getAttribute('d')
    expect(pathData).toMatch(/Z$/)
  })

  it('should handle different plane orientations for polygons', () => {
    const polygonArea: HighlightedPolygon = {
      type: 'polygon',
      areaType: 'inner-perimeter',
      polygon: {
        points: [newVec2(0, 0), newVec2(50, 0), newVec2(50, 50)]
      },
      plane: 'xy',
      renderPosition: 'top'
    }

    const model: ConstructionModel = {
      elements: [],
      measurements: [],
      areas: [polygonArea],
      errors: [],
      warnings: [],
      bounds: Bounds3D.fromMinMax(newVec3(0, 0, 0), newVec3(50, 50, 50))
    }

    const views: ViewOption[] = [{ view: TOP_VIEW, label: 'Top' }]
    const { container } = render(
      <Theme>
        <PlanHighlightProvider>
          <TagVisibilityProvider>
            <ConstructionPlan
              model={model}
              views={views}
              containerSize={{ width: 800, height: 600 }}
              currentViewIndex={0}
              setCurrentViewIndex={vi.fn()}
            />
          </TagVisibilityProvider>
        </PlanHighlightProvider>
      </Theme>
    )

    // Check that a path element is rendered
    const polygonPaths = container.querySelectorAll('path')
    expect(polygonPaths.length).toBeGreaterThan(0)
  })

  it('should render cuboid areas with bottom/top render positions', () => {
    const bottomCuboid: HighlightedCuboid = {
      type: 'cuboid',
      areaType: 'corner',
      transform: IDENTITY,
      size: newVec3(50, 50, 10),
      bounds: Bounds3D.fromMinMax(newVec3(0, 0, 0), newVec3(50, 50, 10)),
      renderPosition: 'bottom'
    }

    const topCuboid: HighlightedCuboid = {
      type: 'cuboid',
      areaType: 'corner',
      size: newVec3(50, 50, 10),
      transform: fromTrans(newVec3(60, 0, 0)),
      bounds: Bounds3D.fromMinMax(newVec3(60, 0, 0), newVec3(110, 50, 10)),
      renderPosition: 'top'
    }

    const model: ConstructionModel = {
      elements: [],
      measurements: [],
      areas: [bottomCuboid, topCuboid],
      errors: [],
      warnings: [],
      bounds: Bounds3D.fromMinMax(newVec3(0, 0, 0), newVec3(110, 50, 10))
    }

    const views: ViewOption[] = [{ view: TOP_VIEW, label: 'Top' }]
    const { container } = render(
      <Theme>
        <PlanHighlightProvider>
          <TagVisibilityProvider>
            <ConstructionPlan
              model={model}
              views={views}
              containerSize={{ width: 800, height: 600 }}
              currentViewIndex={0}
              setCurrentViewIndex={vi.fn()}
            />
          </TagVisibilityProvider>
        </PlanHighlightProvider>
      </Theme>
    )

    // Check that paths are rendered for both areas
    const cuboidPaths = container.querySelectorAll('.area-cuboid path')
    expect(cuboidPaths.length).toBeGreaterThanOrEqual(2)

    // Check that labels are rendered (both have areaType 'corner')
    // In tests, translations are mocked to return the key path
    const texts = container.querySelectorAll('.area-cuboid text')
    const labelTexts = Array.from(texts).filter(text => text.textContent === 'areaTypes.corner')
    expect(labelTexts.length).toBe(2)
  })
})
