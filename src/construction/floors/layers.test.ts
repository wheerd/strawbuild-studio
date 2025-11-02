import { describe, expect, it, vi } from 'vitest'

import { constructFloorLayers } from '@/construction/floors/layers'
import type { FloorAssemblyConfigBase, FloorLayersConfig } from '@/construction/floors/types'
import { TAG_FLOOR_LAYER_CEILING, TAG_FLOOR_LAYER_TOP } from '@/construction/tags'
import type { Polygon2D } from '@/shared/geometry'

vi.mock('@/shared/geometry', async importOriginal => {
  return {
    ...(await importOriginal()),
    subtractPolygons: vi.fn((subjects: Polygon2D[], clips: Polygon2D[]) => {
      if (subjects.length === 0) {
        return []
      }

      return [
        {
          outer: subjects[0],
          holes: clips
        }
      ]
    })
  }
})

const createLayersConfig = (topThickness: number, bottomThickness: number): FloorLayersConfig => ({
  topThickness,
  bottomThickness,
  topLayers: [
    {
      type: 'monolithic',
      name: 'Top Layer',
      material: 'material_top' as never,
      thickness: topThickness
    }
  ],
  bottomLayers: [
    {
      type: 'monolithic',
      name: 'Bottom Layer',
      material: 'material_bottom' as never,
      thickness: bottomThickness
    }
  ]
})

const createConfig = (layers: FloorLayersConfig): FloorAssemblyConfigBase => ({
  type: 'monolithic',
  layers
})

const square = [
  [0, 0],
  [3000, 0],
  [3000, 3000],
  [0, 3000]
]

describe('constructFloorLayers', () => {
  it('creates floor finish layers when top layers are configured', () => {
    const layers = createLayersConfig(40, 0)
    const results = Array.from(
      constructFloorLayers({
        finishedPolygon: { points: square },
        topHoles: [],
        ceilingHoles: [],
        currentFloorConfig: createConfig(layers),
        nextFloorConfig: null,
        floorTopOffset: 40,
        ceilingStartHeight: 0
      })
    )

    expect(results).not.toHaveLength(0)

    const hasTopLayer = results.some(
      result =>
        result.type === 'element' && 'children' in result.element && result.element.tags?.includes(TAG_FLOOR_LAYER_TOP)
    )

    expect(hasTopLayer).toBe(true)
  })

  it('creates ceiling finish layers when next floor bottom layers exist', () => {
    const layers = createLayersConfig(0, 30)
    const results = Array.from(
      constructFloorLayers({
        finishedPolygon: { points: square },
        topHoles: [],
        ceilingHoles: [],
        currentFloorConfig: createConfig(createLayersConfig(0, 0)),
        nextFloorConfig: createConfig(layers),
        floorTopOffset: 0,
        ceilingStartHeight: 3000
      })
    )

    expect(results).not.toHaveLength(0)

    const hasCeilingLayer = results.some(
      result =>
        result.type === 'element' &&
        'children' in result.element &&
        result.element.tags?.includes(TAG_FLOOR_LAYER_CEILING)
    )

    expect(hasCeilingLayer).toBe(true)
  })
})
