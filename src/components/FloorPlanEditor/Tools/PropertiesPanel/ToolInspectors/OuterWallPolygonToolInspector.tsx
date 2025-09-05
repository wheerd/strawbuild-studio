import { useCallback, useEffect, useState } from 'react'
import { createLength } from '@/types/geometry'
import { useDebouncedNumericInput } from '../../../hooks/useDebouncedInput'
import type { OuterWallConstructionType } from '@/types/model'
import type { ToolInspectorProps } from '../../ToolSystem/types'
import type { OuterWallPolygonTool } from '../../Categories/OuterWallTools/OuterWallPolygonTool'

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
  const { state } = tool

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

  // Event handlers with stable references
  const handleConstructionTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newType = e.target.value as OuterWallConstructionType
      tool.setConstructionType(newType)
    },
    [tool]
  )

  return (
    <div className="outer-wall-polygon-tool-inspector">
      <div className="inspector-header">
        <h3>Outer Wall Polygon Tool</h3>
      </div>

      <div className="inspector-content">
        <div className="property-section">
          {/* Construction Type */}
          <div className="property-group">
            <label htmlFor="construction-type">Construction Type</label>
            <select id="construction-type" value={state.constructionType} onChange={handleConstructionTypeChange}>
              {CONSTRUCTION_TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Wall Thickness */}
          <div className="property-group">
            <label htmlFor="wall-thickness">Wall Thickness (mm)</label>
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
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="property-section">
          <div className="keyboard-shortcuts">
            <div>
              <kbd>Enter</kbd> Complete polygon
            </div>
            <div>
              <kbd>Escape</kbd> Cancel polygon
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
