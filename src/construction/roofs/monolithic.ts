import type { vec2 } from 'gl-matrix'

import { createUnsupportedModel } from '@/construction/model'
import { type Length, type LineSegment2D, type Polygon2D } from '@/shared/geometry'

import type { MonolithicRoofConfig, RoofAssembly } from './types'

export class MonolithicRoofAssembly implements RoofAssembly<MonolithicRoofConfig> {
  construct = (_polygon: Polygon2D, _config: MonolithicRoofConfig) => {
    return createUnsupportedModel('Not yet supported.', 'unsupported-roof-monolithic')
  }

  getTopOffset = (_config: MonolithicRoofConfig): Length => {
    throw new Error('Not implemented')
  }

  getBottomOffsets = (_config: MonolithicRoofConfig, _wallLine: LineSegment2D): vec2[] => {
    throw new Error('Not implemented')
  }

  getConstructionThickness = (_config: MonolithicRoofConfig): Length => {
    throw new Error('Not implemented')
  }
}
