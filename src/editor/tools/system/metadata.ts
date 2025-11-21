import { CursorArrowIcon, MoveIcon, RocketIcon } from '@radix-ui/react-icons'

import { ROOFS_FEATURE_ENABLED } from '@/construction/config/store/types'
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
    name: 'Select',
    iconComponent: CursorArrowIcon,
    hotkey: 'v'
  },
  'basic.move': {
    name: 'Move',
    iconComponent: MoveIcon,
    hotkey: 'm'
  },
  'basic.fit-to-view': {
    name: 'Fit to View',
    iconComponent: FitToViewIcon,
    hotkey: 'f'
  },
  'floors.add-area': {
    name: 'Floor Area',
    iconComponent: FloorAreaIcon
  },
  'floors.add-opening': {
    name: 'Floor Opening',
    iconComponent: FloorOpeningIcon
  },
  'perimeter.add': {
    name: 'Building Perimeter',
    iconComponent: PerimeterDrawIcon,
    hotkey: 'w'
  },
  'perimeter.preset': {
    name: 'Perimeter Presets',
    iconComponent: PerimeterPresetsIcon,
    hotkey: 'p'
  },
  'perimeter.add-opening': {
    name: 'Add Opening',
    iconComponent: OpeningsIcon,
    hotkey: 'o'
  },
  'perimeter.split-wall': {
    name: 'Split Wall',
    iconComponent: SplitWallIcon,
    hotkey: 's'
  },
  'roofs.add-roof': {
    name: 'Roof',
    iconComponent: RoofIcon,
    hotkey: 'r'
  },
  'test.data': {
    name: 'Test Data',
    iconComponent: RocketIcon,
    hotkey: 't'
  }
} as const

export const TOOL_GROUPS: ToolGroup[] = [
  {
    name: 'Basic',
    tools: ['basic.select', 'basic.move', 'basic.fit-to-view'] as const
  },
  {
    name: 'Perimeter',
    tools: ['perimeter.add', 'perimeter.preset', 'perimeter.add-opening', 'perimeter.split-wall'] as const
  },
  {
    name: 'Floors',
    tools: ['floors.add-area', 'floors.add-opening'] as const
  },
  ...(ROOFS_FEATURE_ENABLED
    ? [
        {
          name: 'Roofs',
          tools: ['roofs.add-roof'] satisfies ToolId[]
        }
      ]
    : []),
  {
    name: 'Test Data',
    tools: ['test.data'] as const
  }
] as const

export const DEFAULT_TOOL: ToolId = 'basic.select'

export function getToolInfoById(toolId: ToolId): ToolMetadata {
  return TOOL_METADATA[toolId]
}
