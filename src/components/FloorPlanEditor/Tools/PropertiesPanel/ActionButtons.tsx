import { useMemo } from 'react'
import type { Tool, ContextAction } from '@/components/FloorPlanEditor/Tools/ToolSystem/types'
import { useToolContext } from '@/components/FloorPlanEditor/Tools/ToolSystem'

interface ActionButtonsProps {
  tool?: Tool | null
}

export function ActionButtons({ tool }: ActionButtonsProps): React.JSX.Element {
  const context = useToolContext()

  // Get context actions from tool
  const contextActions = useMemo(() => {
    const actions: ContextAction[] = []

    // Add tool-specific actions
    if (tool && 'getContextActions' in tool && tool.getContextActions) {
      const toolActions = tool.getContextActions(context)
      actions.push(...toolActions)
    }

    return actions
  }, [tool, context])

  if (contextActions.length === 0) {
    return <></>
  }

  return (
    <div className="action-buttons">
      <h4>Actions</h4>

      <div className="action-grid">
        {contextActions.map((action, index) => {
          const isEnabled = action.enabled ? action.enabled() : true

          return (
            <button
              key={`${action.label}-${index}`}
              className={`action-button ${!isEnabled ? 'disabled' : ''}`}
              onClick={() => action.action()}
              disabled={!isEnabled}
              title={action.hotkey ? `${action.label} (${action.hotkey})` : action.label}
            >
              {action.icon && <span className="action-icon">{action.icon}</span>}
              <span className="action-label">{action.label}</span>
              {action.hotkey && <span className="action-hotkey">{action.hotkey}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
