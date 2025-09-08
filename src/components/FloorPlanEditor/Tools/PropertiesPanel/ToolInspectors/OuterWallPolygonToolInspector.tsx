import { useCallback, useEffect, useState } from 'react'
import * as Select from '@radix-ui/react-select'
import { createLength } from '@/types/geometry'
import { useDebouncedNumericInput } from '@/components/FloorPlanEditor/hooks/useDebouncedInput'
import type { OuterWallConstructionType } from '@/types/model'
import type { ToolInspectorProps } from '@/components/FloorPlanEditor/Tools/ToolSystem/types'
import type { OuterWallPolygonTool } from '@/components/FloorPlanEditor/Tools/Categories/OuterWallTools/OuterWallPolygonTool'
import { useReactiveTool } from '@/components/FloorPlanEditor/Tools/hooks/useReactiveTool'

// Construction type options
const CONSTRUCTION_TYPE_OPTIONS: { value: OuterWallConstructionType; label: string }[] = [
  {
    value: 'cells-under-tension',
    label: 'CUT'
  },
  {
    value: 'infill',
    label: 'Infill'
  },
  {
    value: 'strawhenge',
    label: 'Strawhenge'
  },
  {
    value: 'non-strawbale',
    label: 'Non-Strawbale'
  }
]

export function OuterWallPolygonToolInspector({ tool }: ToolInspectorProps<OuterWallPolygonTool>): React.JSX.Element {
  const { state } = useReactiveTool(tool)

  // Force re-renders when tool state changes
  const [, forceUpdate] = useState({})

  useEffect(
    () =>
      tool.onRenderNeeded(() => {
        forceUpdate({})
      }),
    [tool]
  )

  // Debounced input handler for wall thickness
  const thicknessInput = useDebouncedNumericInput(
    state.wallThickness,
    useCallback(
      (value: number) => {
        tool.setWallThickness(createLength(value))
      },
      [tool]
    ),
    {
      debounceMs: 300,
      min: 50,
      max: 1000,
      step: 10
    }
  )

  return (
    <div className="p-2">
      <div className="space-y-3">
        {/* Tool Properties */}
        <div className="space-y-2">
          <div className="space-y-1.5">
            {/* Construction Type */}
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-medium text-gray-600 flex-shrink-0">Construction Type</label>
              <Select.Root
                value={state.constructionType}
                onValueChange={(value: OuterWallConstructionType) => {
                  tool.setConstructionType(value)
                }}
              >
                <Select.Trigger className="flex-1 max-w-24 flex items-center justify-between px-2 py-1.5 bg-white border border-gray-300 rounded text-xs text-gray-800 hover:border-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200">
                  <Select.Value />
                  <Select.Icon className="text-gray-600">⌄</Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-white border border-gray-300 rounded-md shadow-lg z-50 overflow-hidden">
                    <Select.Viewport className="p-1">
                      {CONSTRUCTION_TYPE_OPTIONS.map(option => (
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

            {/* Wall Thickness */}
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="wall-thickness" className="text-xs font-medium text-gray-600 flex-shrink-0">
                Wall Thickness
              </label>
              <div className="relative flex-1 max-w-24">
                <input
                  id="wall-thickness"
                  type="number"
                  value={thicknessInput.value}
                  onChange={e => thicknessInput.handleChange(e.target.value)}
                  onBlur={thicknessInput.handleBlur}
                  onKeyDown={thicknessInput.handleKeyDown}
                  min="50"
                  max="1000"
                  step="10"
                  className="unit-input w-full pl-2 py-1.5 pr-8 bg-white border border-gray-300 rounded text-xs text-right hover:border-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200"
                  onWheel={e => e.currentTarget.blur()}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
                  mm
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-gray-600">Keyboard Shortcuts</h5>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <kbd className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-mono">Enter</kbd>
              <span className="text-gray-600">Complete polygon</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <kbd className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-mono">Escape</kbd>
              <span className="text-gray-600">Cancel polygon</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
