import { useState, useEffect } from 'react'
import { useCurrentSelection, useSelectionPath } from '@/components/FloorPlanEditor/hooks/useSelectionStore'
import { useActiveTool } from '@/components/FloorPlanEditor/Tools/ToolSystem/ToolContext'
import { useModelActions } from '@/model/store'
import { getEntityDisplayName } from '@/utils/entityDisplay'

export type PropertiesPanelTab = 'selection' | 'tool'

interface UsePropertiesPanelReturn {
  activeTab: PropertiesPanelTab
  setActiveTab: (tab: PropertiesPanelTab) => void
  selectionTabEnabled: boolean
  toolTabEnabled: boolean
  selectionTabLabel: string
  toolTabLabel: string
  selectionTabIcon: string
  toolTabIcon: string
}

export function usePropertiesPanel(): UsePropertiesPanelReturn {
  const selectedId = useCurrentSelection()
  const selectionPath = useSelectionPath()
  const activeTool = useActiveTool()
  const modelActions = useModelActions()

  const [activeTab, setActiveTab] = useState<PropertiesPanelTab>('selection')

  // Determine tab states
  const selectionTabEnabled = selectedId !== null
  const toolTabEnabled = activeTool?.inspectorComponent !== undefined

  // Auto-switch to tool tab when a tool with inspector is activated
  useEffect(() => {
    if (toolTabEnabled && activeTool) {
      setActiveTab('tool')
    } else if (selectionTabEnabled) {
      setActiveTab('selection')
    }
  }, [toolTabEnabled, selectionTabEnabled, activeTool])

  // Generate tab labels
  const entityDisplayName = getEntityDisplayName(selectionPath, selectedId, modelActions)
  const selectionTabLabel = entityDisplayName
  const toolTabLabel = activeTool?.name || 'Tool'

  // Tab icons
  const selectionTabIcon = '↖' // Select tool icon
  const toolTabIcon = activeTool?.icon || '🔧'

  return {
    activeTab,
    setActiveTab,
    selectionTabEnabled,
    toolTabEnabled,
    selectionTabLabel,
    toolTabLabel,
    selectionTabIcon,
    toolTabIcon
  }
}
