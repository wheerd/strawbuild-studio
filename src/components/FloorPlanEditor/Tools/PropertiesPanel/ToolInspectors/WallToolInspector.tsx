import { useCallback } from 'react'
import type { ToolInspectorProps } from '../../ToolSystem/types'
import type { BaseWallTool, WallToolState } from '../../Categories/WallTools/BaseWallTool'

type WallTool = BaseWallTool

interface WallToolInspectorProps extends ToolInspectorProps {
  tool: WallTool
}

export function WallToolInspector({ tool, onPropertyChange }: WallToolInspectorProps): React.JSX.Element {
  const state = tool.state as WallToolState

  const handleThicknessChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.max(50, Math.min(1000, Number(e.target.value)))
      if ('setThickness' in tool) {
        tool.setThickness(value)
      }
      onPropertyChange('thickness', value)
    },
    [tool, onPropertyChange]
  )

  return (
    <div className="wall-tool-inspector">
      <h4>{tool.name} Settings</h4>

      {/* Thickness Setting */}
      <div className="property-group">
        <label htmlFor="wall-tool-thickness">Wall Thickness (mm)</label>
        <input
          id="wall-tool-thickness"
          type="number"
          value={state.thickness}
          onChange={handleThicknessChange}
          min="50"
          max="1000"
          step="10"
        />
      </div>

      {/* Drawing Status */}
      <div className="property-group">
        {state.startPoint && (
          <div className="drawing-help">
            <p>Click to place the end point of the wall.</p>
            <p>
              Press <kbd>Escape</kbd> to cancel.
            </p>
          </div>
        )}

        {!state.startPoint && (
          <div className="drawing-help">
            <p>Click to start drawing a wall.</p>
          </div>
        )}
      </div>
    </div>
  )
}
