import { useCallback } from 'react'
import * as Toolbar from '@radix-ui/react-toolbar'
import * as Tooltip from '@radix-ui/react-tooltip'
import * as Separator from '@radix-ui/react-separator'
import {
  useToolContext,
  useToolManager,
  useToolManagerState
} from '@/components/FloorPlanEditor/Tools/ToolSystem/ToolContext'

export function MainToolbar(): React.JSX.Element {
  const toolManager = useToolManager()
  const toolManagerState = useToolManagerState()
  const context = useToolContext()

  const handleToolSelect = useCallback(
    (toolId: string) => {
      toolManager.activateTool(toolId, context)
    },
    [toolManager, context]
  )

  // Group tools by category
  const toolGroups = Array.from(toolManagerState.toolGroups.values())

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm" data-testid="main-toolbar">
      <div className="px-4 py-3">
        <Tooltip.Provider>
          <Toolbar.Root className="flex items-center gap-1">
            {toolGroups.map((group, groupIndex) => (
              <div key={group.id} className="flex items-center">
                {groupIndex > 0 && <Separator.Root className="mx-2 h-6 w-px bg-gray-300" orientation="vertical" />}

                {/* Group of tools */}
                <div className="flex items-center gap-1">
                  {group.tools.map(tool => (
                    <Tooltip.Root key={tool.id}>
                      <Tooltip.Trigger asChild>
                        <Toolbar.Button
                          className={`
                            flex items-center justify-center w-10 h-10 rounded-md border transition-all duration-200
                            ${
                              toolManagerState.activeTool?.id === tool.id
                                ? 'bg-primary-500 text-white border-primary-500 shadow-md'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                            }
                          `}
                          onClick={() => handleToolSelect(tool.id)}
                        >
                          <span className="text-base leading-none">{tool.icon}</span>
                        </Toolbar.Button>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content
                          className="bg-gray-900 text-white text-sm px-3 py-2 rounded shadow-lg z-50 max-w-xs"
                          sideOffset={8}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span>{tool.name}</span>
                            {tool.hotkey && (
                              <kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">
                                {tool.hotkey.toUpperCase()}
                              </kbd>
                            )}
                          </div>
                          <Tooltip.Arrow className="fill-gray-900" />
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  ))}
                </div>
              </div>
            ))}
          </Toolbar.Root>
        </Tooltip.Provider>
      </div>
    </div>
  )
}
