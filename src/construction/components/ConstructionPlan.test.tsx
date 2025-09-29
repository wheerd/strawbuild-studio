import { render } from '@testing-library/react'
import { vec3 } from 'gl-matrix'
import { describe, expect, it } from 'vitest'

import type { ConstructionModel, HighlightedCuboid, HighlightedPolygon } from '@/construction/model'
import { createVec2 } from '@/shared/geometry'

import { ConstructionPlan, TOP_VIEW } from './ConstructionPlan'

describe('ConstructionPlan', () => {
  it('should render polygon areas correctly', () => {
    const polygonArea: HighlightedPolygon = {
      type: 'polygon',
      areaType: 'inner-perimeter',
      label: 'Test Polygon',
      polygon: {
        points: [createVec2(0, 0), createVec2(100, 0), createVec2(100, 100), createVec2(0, 100)]
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
      bounds: {
        min: vec3.fromValues(0, 0, 0),
        max: vec3.fromValues(100, 100, 100)
      }
    }

    const { container } = render(
      <ConstructionPlan model={model} view={TOP_VIEW} containerSize={{ width: 800, height: 600 }} />
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
        points: [createVec2(0, 0), createVec2(50, 0), createVec2(50, 50)]
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
      bounds: {
        min: vec3.fromValues(0, 0, 0),
        max: vec3.fromValues(50, 50, 50)
      }
    }

    const { container } = render(
      <ConstructionPlan model={model} view={TOP_VIEW} containerSize={{ width: 800, height: 600 }} />
    )

    // Check that a path element is rendered
    const polygonPaths = container.querySelectorAll('path')
    expect(polygonPaths.length).toBeGreaterThan(0)
  })

  it('should render cuboid areas with bottom/top render positions', () => {
    const bottomCuboid: HighlightedCuboid = {
      type: 'cuboid',
      areaType: 'corner',
      label: 'Bottom Area',
      transform: { position: vec3.fromValues(0, 0, 0), rotation: vec3.fromValues(0, 0, 0) },
      bounds: {
        min: vec3.fromValues(0, 0, 0),
        max: vec3.fromValues(50, 50, 10)
      },
      renderPosition: 'bottom'
    }

    const topCuboid: HighlightedCuboid = {
      type: 'cuboid',
      areaType: 'corner',
      label: 'Top Area',
      transform: { position: vec3.fromValues(60, 0, 0), rotation: vec3.fromValues(0, 0, 0) },
      bounds: {
        min: vec3.fromValues(60, 0, 0),
        max: vec3.fromValues(110, 50, 10)
      },
      renderPosition: 'top'
    }

    const model: ConstructionModel = {
      elements: [],
      measurements: [],
      areas: [bottomCuboid, topCuboid],
      errors: [],
      warnings: [],
      bounds: {
        min: vec3.fromValues(0, 0, 0),
        max: vec3.fromValues(110, 50, 10)
      }
    }

    const { container } = render(
      <ConstructionPlan model={model} view={TOP_VIEW} containerSize={{ width: 800, height: 600 }} />
    )

    // Check that rectangles are rendered for both areas
    const rectangles = container.querySelectorAll('rect')
    expect(rectangles.length).toBeGreaterThanOrEqual(2)

    // Check that labels are rendered
    const texts = container.querySelectorAll('text')
    const labelTexts = Array.from(texts).filter(
      text => text.textContent === 'Bottom Area' || text.textContent === 'Top Area'
    )
    expect(labelTexts.length).toBe(2)
  })
})
