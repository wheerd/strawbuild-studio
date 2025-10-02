import * as Select from '@radix-ui/react-select'
import { IconButton } from '@radix-ui/themes'
import { useCallback } from 'react'

import {
  DoubleSizeIcon,
  FloorSizeIcon,
  LargeSizeIcon,
  SmallSizeIcon,
  StandardSizeIcon,
  WideSizeIcon
} from '@/building/components/inspectors/OpeningIcons'
import type { OpeningType } from '@/building/model/model'
import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolInspectorProps } from '@/editor/tools/system/types'
import { type Length, createLength } from '@/shared/geometry'
import { useDebouncedNumericInput } from '@/shared/hooks/useDebouncedInput'
import { formatLength } from '@/shared/utils/formatLength'

import type { AddOpeningTool } from './AddOpeningTool'

export function AddOpeningToolInspector({ tool }: ToolInspectorProps<AddOpeningTool>): React.JSX.Element {
  return <AddOpeningToolInspectorImpl tool={tool} />
}

interface AddOpeningToolInspectorImplProps {
  tool: AddOpeningTool
}

// Opening type options
const OPENING_TYPE_OPTIONS: { value: OpeningType; label: string }[] = [
  { value: 'door', label: 'Door' },
  { value: 'window', label: 'Window' },
  { value: 'passage', label: 'Passage' }
]

// Quick preset buttons for common sizes (in mm)
interface PresetConfig {
  label: string
  width: Length
  height: Length
  sillHeight?: Length
  icon: string
}

// All presets available for all opening types
const ALL_OPENING_PRESETS: PresetConfig[] = [
  { label: 'Standard Door', width: createLength(800), height: createLength(2100), icon: 'standard' },
  { label: 'Wide Door', width: createLength(900), height: createLength(2100), icon: 'wide' },
  { label: 'Double Door', width: createLength(1600), height: createLength(2100), icon: 'double' },
  {
    label: 'Small Window',
    width: createLength(800),
    height: createLength(1200),
    sillHeight: createLength(800),
    icon: 'small'
  },
  {
    label: 'Standard Window',
    width: createLength(1200),
    height: createLength(1200),
    sillHeight: createLength(800),
    icon: 'standard'
  },
  {
    label: 'Floor Window',
    width: createLength(1200),
    height: createLength(2000),
    sillHeight: createLength(100),
    icon: 'floor'
  }
]

// Helper function to get the appropriate icon component
function getPresetIcon(iconType: string): React.JSX.Element {
  switch (iconType) {
    case 'standard':
      return <StandardSizeIcon width={20} height={20} />
    case 'wide':
      return <WideSizeIcon width={20} height={20} />
    case 'double':
      return <DoubleSizeIcon width={20} height={20} />
    case 'small':
      return <SmallSizeIcon width={20} height={20} />
    case 'large':
      return <LargeSizeIcon width={20} height={20} />
    case 'floor':
      return <FloorSizeIcon width={20} height={20} />
    default:
      return <StandardSizeIcon width={20} height={20} />
  }
}

function AddOpeningToolInspectorImpl({ tool }: AddOpeningToolInspectorImplProps): React.JSX.Element {
  const { state } = useReactiveTool(tool)

  // Debounced input handlers for numeric values
  const widthInput = useDebouncedNumericInput(
    state.width,
    useCallback(
      (value: number) => {
        tool.setWidth(createLength(value))
      },
      [tool]
    ),
    {
      debounceMs: 300,
      min: 100,
      max: 5000,
      step: 10
    }
  )

  const heightInput = useDebouncedNumericInput(
    state.height,
    useCallback(
      (value: number) => {
        tool.setHeight(createLength(value))
      },
      [tool]
    ),
    {
      debounceMs: 300,
      min: 100,
      max: 4000,
      step: 10
    }
  )

  const sillHeightInput = useDebouncedNumericInput(
    state.sillHeight || 0,
    useCallback(
      (value: number) => {
        const sillHeight = value === 0 ? undefined : createLength(value)
        tool.setSillHeight(sillHeight)
      },
      [tool]
    ),
    {
      debounceMs: 300,
      min: 0,
      max: 2000,
      step: 10
    }
  )

  // Event handlers with stable references
  const handleTypeChange = useCallback(
    (newType: OpeningType) => {
      tool.setOpeningType(newType)
    },
    [tool]
  )

  const handlePresetClick = useCallback(
    (preset: PresetConfig) => {
      tool.setWidth(createLength(preset.width))
      tool.setHeight(createLength(preset.height))
      if (preset.sillHeight !== undefined) {
        tool.setSillHeight(createLength(preset.sillHeight))
      } else {
        tool.setSillHeight(undefined)
      }
    },
    [tool]
  )

  return (
    <div className="p-2">
      <div className="space-y-3">
        {/* Opening Type */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <label className="text-xs font-medium text-gray-600 flex-shrink-0">Type</label>
            <Select.Root value={state.openingType} onValueChange={handleTypeChange}>
              <Select.Trigger className="flex-1 max-w-24 flex items-center justify-between px-2 py-1.5 bg-white border border-gray-300 rounded text-xs text-gray-800 hover:border-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200">
                <Select.Value />
                <Select.Icon className="text-gray-600">⌄</Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content className="bg-white border border-gray-300 rounded-md shadow-lg z-50 overflow-hidden">
                  <Select.Viewport className="p-1">
                    {OPENING_TYPE_OPTIONS.map(option => (
                      <Select.Item
                        key={option.value}
                        value={option.value}
                        className="flex items-center px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 hover:outline-none cursor-pointer rounded"
                      >
                        <Select.ItemText>{option.label}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>

          {/* Quick Presets - Available for all types */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Presets</label>
            <div className="grid grid-cols-6 gap-1">
              {ALL_OPENING_PRESETS.map((preset: PresetConfig, index: number) => (
                <IconButton
                  key={index}
                  variant="surface"
                  size="3"
                  onClick={() => handlePresetClick(preset)}
                  title={`${preset.label}: ${formatLength(preset.width)} × ${formatLength(preset.height)}${preset.sillHeight ? `, sill: ${formatLength(preset.sillHeight)}` : ''}`}
                >
                  {getPresetIcon(preset.icon)}
                </IconButton>
              ))}
            </div>
          </div>
        </div>

        {/* Dimensions */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="opening-width" className="text-xs font-medium text-gray-600 flex-shrink-0">
              Width
            </label>
            <div className="relative flex-1 max-w-24">
              <input
                id="opening-width"
                type="number"
                value={widthInput.value}
                onChange={e => widthInput.handleChange(e.target.value)}
                onBlur={widthInput.handleBlur}
                onKeyDown={widthInput.handleKeyDown}
                min="100"
                max="5000"
                step="10"
                className="unit-input w-full pl-2 py-1.5 pr-8 bg-white border border-gray-300 rounded text-xs text-right hover:border-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
                mm
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <label htmlFor="opening-height" className="text-xs font-medium text-gray-600 flex-shrink-0">
              Height
            </label>
            <div className="relative flex-1 max-w-24">
              <input
                id="opening-height"
                type="number"
                value={heightInput.value}
                onChange={e => heightInput.handleChange(e.target.value)}
                onBlur={heightInput.handleBlur}
                onKeyDown={heightInput.handleKeyDown}
                min="100"
                max="4000"
                step="10"
                className="unit-input w-full pl-2 py-1.5 pr-8 bg-white border border-gray-300 rounded text-xs text-right hover:border-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
                mm
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="sill-height" className="text-xs font-medium text-gray-600 flex-shrink-0">
                Sill Height
              </label>
              <div className="relative flex-1 max-w-24">
                <input
                  id="sill-height"
                  type="number"
                  value={sillHeightInput.value}
                  onChange={e => sillHeightInput.handleChange(e.target.value)}
                  onBlur={sillHeightInput.handleBlur}
                  onKeyDown={sillHeightInput.handleKeyDown}
                  min="0"
                  max="2000"
                  step="10"
                  className="unit-input w-full pl-2 py-1.5 pr-8 bg-white border border-gray-300 rounded text-xs text-right hover:border-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
                  mm
                </span>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {state.openingType === 'window'
                ? 'Height of window sill above floor level'
                : state.openingType === 'door'
                  ? 'Height of door threshold above floor level (usually 0)'
                  : 'Height of bottom edge above floor level (usually 0)'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
