import { useCallback, useState } from 'react'
import {
  useToolContext,
  useToolManager,
  useToolManagerState
} from '@/components/FloorPlanEditor/Tools/ToolSystem/ToolContext'

export function MainToolbar(): React.JSX.Element {
  const toolManager = useToolManager()
  const toolManagerState = useToolManagerState()
  const context = useToolContext()

  // Track active tab (tool group)
  const [activeTab, setActiveTab] = useState<string | null>(null)

  const handleToolSelect = useCallback(
    (toolId: string) => {
      toolManager.activateTool(toolId, context)
    },
    [toolManager]
  )

  const handleTabSelect = useCallback(
    (groupId: string) => {
      setActiveTab(groupId)
      // Optionally activate the default tool for the group when tab is clicked
      toolManager.activateDefaultToolForGroup(groupId, context)
    },
    [toolManager]
  )

  // Group tools by category
  const toolGroups = Array.from(toolManagerState.toolGroups.values())

  // Auto-select the first tab and determine active tab based on current tool
  const currentActiveGroup = toolManagerState.activeTool
    ? toolGroups.find(group => group.tools.some(tool => tool.id === toolManagerState.activeTool?.id))
    : null

  const effectiveActiveTab = activeTab || currentActiveGroup?.id || toolGroups[0]?.id

  return (
    <div className="tabbed-toolbar" data-testid="main-toolbar">
      {/* Tab Headers - Tool Groups */}
      <div className="toolbar-tabs">
        {toolGroups.map(group => (
          <button
            key={group.id}
            className={`tab-button ${effectiveActiveTab === group.id ? 'active' : ''}`}
            onClick={() => handleTabSelect(group.id)}
          >
            <span className="tab-icon">{group.icon}</span>
            <span className="tab-label">{group.name}</span>
          </button>
        ))}
      </div>

      {/* Tab Content - Tools in Active Group */}
      <div className="toolbar-content">
        {toolGroups
          .filter(group => group.id === effectiveActiveTab)
          .map(group => (
            <div key={group.id} className="tool-group-content">
              {group.tools.map(tool => (
                <button
                  key={tool.id}
                  className={`tool-button ${toolManagerState.activeTool?.id === tool.id ? 'active' : ''}`}
                  onClick={() => handleToolSelect(tool.id)}
                  title={`${tool.name}${tool.hotkey ? ` (${tool.hotkey})` : ''}`}
                >
                  <span className="tool-icon">{tool.icon}</span>
                  <span className="tool-label">{tool.name}</span>
                  {tool.hotkey && <span className="tool-hotkey">{tool.hotkey}</span>}
                </button>
              ))}
            </div>
          ))}
      </div>
    </div>
  )
}
