import { describe, expect, it } from 'vitest'

import type { ToolSystem } from '@/editor/tools/system/ToolSystem'
import { newVec2 } from '@/shared/geometry'

import { IntermediateWallTool } from './IntermediateWallTool'

describe('IntermediateWallTool', () => {
  it('validates the effective endpoint when a length override is set', () => {
    const tool = new IntermediateWallTool({} as ToolSystem)
    tool.state.points = [newVec2(20, 20)]
    tool.state.pointer = newVec2(80, 20)
    ;(tool as any).validationPolygons = {
      perimeter: { points: [newVec2(0, 0), newVec2(100, 0), newVec2(100, 100), newVec2(0, 100)] }
    }

    tool.setLengthOverride(200)

    expect(tool.getPreviewPosition()).toEqual(newVec2(220, 20))
    expect(tool.state.isValid).toBe(false)
  })
})
