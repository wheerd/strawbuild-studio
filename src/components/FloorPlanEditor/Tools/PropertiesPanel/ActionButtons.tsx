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
    <div className="p-4 border-t border-gray-200 bg-white">
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700">Actions</h4>

        <div className="grid gap-2">
          {contextActions.map((action, index) => {
            const isEnabled = action.enabled ? action.enabled() : true

            return (
              <button
                key={`${action.label}-${index}`}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all
                  ${
                    isEnabled
                      ? 'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }
                `}
                onClick={() => action.action()}
                disabled={!isEnabled}
                title={action.hotkey ? `${action.label} (${action.hotkey})` : action.label}
              >
                {action.icon && <span className="text-base leading-none">{action.icon}</span>}
                <span className="flex-1 text-left">{action.label}</span>
                {action.hotkey && (
                  <kbd
                    className={`
                    px-1.5 py-0.5 rounded text-xs font-mono
                    ${isEnabled ? 'bg-primary-400/30 text-primary-100' : 'bg-gray-200 text-gray-400'}
                  `}
                  >
                    {action.hotkey}
                  </kbd>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
