import { describe, expect, it, vi } from 'vitest'

import { constructFloorLayers } from '@/construction/floors/layers'
import type { FloorAssemblyConfigBase, FloorLayersConfig } from '@/construction/floors/types'
import { TAG_FLOOR_LAYER_BOTTOM, TAG_FLOOR_LAYER_TOP, TAG_LAYERS } from '@/construction/tags'
import { type Polygon2D, newVec2 } from '@/shared/geometry'

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

const square = [newVec2(0, 0), newVec2(3000, 0), newVec2(3000, 3000), newVec2(0, 3000)]

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

    const topGroupResult = results.find(
      result =>
        result.type === 'element' && 'children' in result.element && result.element.tags?.includes(TAG_FLOOR_LAYER_TOP)
    )

    expect(topGroupResult).toBeDefined()
    if (!topGroupResult || topGroupResult.type !== 'element' || !('children' in topGroupResult.element)) {
      throw new Error('Expected top layer group')
    }

    const topGroup = topGroupResult.element

    expect(topGroup.tags).toContain(TAG_LAYERS)
    const customTag = topGroup.tags?.find(tag => tag.category === 'floor-layer' && tag.id !== TAG_FLOOR_LAYER_TOP.id)
    expect(customTag?.label).toBe('Top Layer')
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

    const ceilingGroupResult = results.find(
      result =>
        result.type === 'element' &&
        'children' in result.element &&
        result.element.tags?.includes(TAG_FLOOR_LAYER_BOTTOM)
    )

    expect(ceilingGroupResult).toBeDefined()
    if (!ceilingGroupResult || ceilingGroupResult.type !== 'element' || !('children' in ceilingGroupResult.element)) {
      throw new Error('Expected ceiling layer group')
    }

    const ceilingGroup = ceilingGroupResult.element

    expect(ceilingGroup.tags).toContain(TAG_LAYERS)
    const customTag = ceilingGroup.tags?.find(
      tag => tag.category === 'floor-layer' && tag.id !== TAG_FLOOR_LAYER_BOTTOM.id
    )
    expect(customTag?.label).toBe('Bottom Layer')
  })
})
