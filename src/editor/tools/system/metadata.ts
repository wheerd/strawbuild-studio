import {
  AllSidesIcon,
  BorderAllIcon,
  BoxIcon,
  BoxModelIcon,
  CursorArrowIcon,
  DividerHorizontalIcon,
  MoveIcon,
  RocketIcon
} from '@radix-ui/react-icons'

import type { ToolGroup, ToolId, ToolMetadata } from './types'

export const TOOL_METADATA: Record<ToolId, ToolMetadata> = {
  'basic.select': {
    name: 'Select',
    icon: '↖',
    iconComponent: CursorArrowIcon,
    hotkey: 'v'
  },
  'basic.move': {
    name: 'Move',
    icon: '↔',
    iconComponent: MoveIcon,
    hotkey: 'm'
  },
  'basic.fit-to-view': {
    name: 'Fit to View',
    icon: '⊞',
    iconComponent: AllSidesIcon,
    hotkey: 'f'
  },
  'perimeter.add': {
    name: 'Building Perimeter',
    icon: '⬜',
    iconComponent: BorderAllIcon,
    hotkey: 'w'
  },
  'perimeter.preset': {
    name: 'Perimeter Presets',
    icon: '⬜',
    iconComponent: BoxModelIcon,
    hotkey: 'p'
  },
  'perimeter.add-opening': {
    name: 'Add Opening',
    icon: '🚪',
    iconComponent: BoxIcon,
    hotkey: 'o'
  },
  'perimeter.split-wall': {
    name: 'Split Wall',
    icon: '⫽',
    iconComponent: DividerHorizontalIcon,
    hotkey: 's'
  },
  'test.data': {
    name: 'Test Data',
    icon: '🏗️',
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
    name: 'Test Data',
    tools: ['test.data'] as const
  }
] as const

export const DEFAULT_TOOL: ToolId = 'basic.select'

export function getToolInfoById(toolId: ToolId): ToolMetadata {
  return TOOL_METADATA[toolId]
}
