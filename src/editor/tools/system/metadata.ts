import { BetweenVerticalStart, MousePointer, Move, Rocket } from 'lucide-react'

import {
  FitToViewIcon,
  FloorAreaIcon,
  FloorOpeningIcon,
  OpeningsIcon,
  PerimeterDrawIcon,
  PerimeterPresetsIcon,
  RoofIcon,
  SplitWallIcon
} from '@/shared/components/Icons'

import type { ToolGroup, ToolId, ToolMetadata } from './types'

export const TOOL_METADATA: Record<ToolId, ToolMetadata> = {
  'basic.select': {
    nameKey: 'basicSelect',
    iconComponent: MousePointer,
    hotkey: 'v'
  },
  'basic.move': {
    nameKey: 'basicMove',
    iconComponent: Move,
    hotkey: 'm'
  },
  'basic.fit-to-view': {
    nameKey: 'basicFitToView',
    iconComponent: FitToViewIcon,
    hotkey: 'f'
  },
  'floors.add-area': {
    nameKey: 'floorsAddArea',
    iconComponent: FloorAreaIcon
  },
  'floors.add-opening': {
    nameKey: 'floorsAddOpening',
    iconComponent: FloorOpeningIcon
  },
  'perimeter.add': {
    nameKey: 'perimeterAdd',
    iconComponent: PerimeterDrawIcon,
    hotkey: 'w'
  },
  'perimeter.preset': {
    nameKey: 'perimeterPreset',
    iconComponent: PerimeterPresetsIcon,
    hotkey: 'p'
  },
  'perimeter.add-opening': {
    nameKey: 'perimeterAddOpening',
    iconComponent: OpeningsIcon,
    hotkey: 'o'
  },
  'perimeter.add-post': {
    nameKey: 'perimeterAddPost',
    iconComponent: BetweenVerticalStart,
    hotkey: 'shift+p'
  },
  'perimeter.split-wall': {
    nameKey: 'perimeterSplitWall',
    iconComponent: SplitWallIcon,
    hotkey: 's'
  },
  'roofs.add-roof': {
    nameKey: 'roofsAddRoof',
    iconComponent: RoofIcon,
    hotkey: 'r'
  },
  'test.data': {
    nameKey: 'testData',
    iconComponent: Rocket,
    hotkey: 't'
  }
} as const

export const TOOL_GROUPS: ToolGroup[] = [
  {
    nameKey: 'basic',
    tools: ['basic.select', 'basic.move', 'basic.fit-to-view'] as const
  },
  {
    nameKey: 'perimeter',
    tools: [
      'perimeter.add',
      'perimeter.preset',
      'perimeter.add-opening',
      'perimeter.add-post',
      'perimeter.split-wall'
    ] as const
  },
  {
    nameKey: 'floors',
    tools: ['floors.add-opening'] as const
  },
  {
    nameKey: 'roofs',
    tools: ['roofs.add-roof'] satisfies ToolId[]
  },
  {
    nameKey: 'test',
    tools: ['test.data'] as const
  }
] as const

export const DEFAULT_TOOL: ToolId = 'basic.select'

export function getToolInfoById(toolId: ToolId): ToolMetadata {
  return TOOL_METADATA[toolId]
}
