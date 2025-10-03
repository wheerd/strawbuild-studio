import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { Box, Callout, Flex, Tabs, Text } from '@radix-ui/themes'
import { useEffect, useState } from 'react'

import {
  OpeningInspector,
  PerimeterCornerInspector,
  PerimeterInspector,
  PerimeterWallInspector
} from '@/building/components/inspectors'
import {
  type PerimeterId,
  type PerimeterWallId,
  isOpeningId,
  isPerimeterCornerId,
  isPerimeterId,
  isPerimeterWallId
} from '@/building/model/ids'
import { useModelActions } from '@/building/store'
import { useCurrentSelection, useSelectionPath } from '@/editor/hooks/useSelectionStore'
import { type ToolId, getToolInfoById } from '@/editor/tools'
import { useActiveTool } from '@/editor/tools/system/store'
import { getEntityDisplayName } from '@/shared/utils/entityDisplay'

export function PropertiesPanel(): React.JSX.Element {
  const selectedId = useCurrentSelection()
  const selectionPath = useSelectionPath()
  const activeTool = useActiveTool()
  const {
    activeTab,
    setActiveTab,
    selectionTabEnabled,
    toolTabEnabled,
    selectionTabLabel,
    toolTabLabel,
    selectionTabIcon,
    toolTabIcon
  } = usePropertiesPanel()

  return (
    <Box height="100%" style={{ borderLeft: '1px solid var(--gray-6)' }}>
      <Tabs.Root value={activeTab} onValueChange={value => setActiveTab(value as 'selection' | 'tool')}>
        <Tabs.List>
          <Tabs.Trigger value="selection" disabled={!selectionTabEnabled}>
            <Flex align="center" gap="2">
              {selectionTabIcon}
              <Text>{selectionTabLabel}</Text>
            </Flex>
          </Tabs.Trigger>
          <Tabs.Trigger value="tool" disabled={!toolTabEnabled}>
            <Flex align="center" gap="2">
              {toolTabIcon}
              <Text>{toolTabLabel}</Text>
            </Flex>
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="selection">
          <Flex direction="column" p="2" gap="2">
            {!selectedId && (
              <>
                <Text align="center" color="gray" mb="2">
                  No entity selected
                </Text>
                <Text align="center" size="2" color="gray">
                  Select a wall, room, or point to view its properties
                </Text>
              </>
            )}

            {/* Perimeter entities */}
            {selectedId && isPerimeterId(selectedId) && <PerimeterInspector key={selectedId} selectedId={selectedId} />}

            {selectedId && isPerimeterWallId(selectedId) && (
              <PerimeterWallInspector
                key={selectedId}
                perimeterId={selectionPath[0] as PerimeterId}
                wallId={selectedId}
              />
            )}

            {selectedId && isPerimeterCornerId(selectedId) && (
              <PerimeterCornerInspector
                key={selectedId}
                perimeterId={selectionPath[0] as PerimeterId}
                cornerId={selectedId}
              />
            )}

            {selectedId && isOpeningId(selectedId) && (
              <OpeningInspector
                key={selectedId}
                perimeterId={selectionPath[0] as PerimeterId}
                wallId={selectionPath[1] as PerimeterWallId}
                openingId={selectedId}
              />
            )}

            {/* Unknown entity type */}
            {selectedId &&
              !isPerimeterId(selectedId) &&
              !isPerimeterWallId(selectedId) &&
              !isPerimeterCornerId(selectedId) &&
              !isOpeningId(selectedId) && (
                <Callout.Root color="amber">
                  <Callout.Icon>
                    <ExclamationTriangleIcon />
                  </Callout.Icon>
                  <Callout.Text>
                    <Text weight="bold">Unknown Entity Type</Text>
                    <br />
                    Entity type not recognized: {typeof selectedId}
                  </Callout.Text>
                </Callout.Root>
              )}
          </Flex>
        </Tabs.Content>

        <Tabs.Content value="tool">
          <Flex direction="column" p="2" gap="2">
            {activeTool?.inspectorComponent && <activeTool.inspectorComponent tool={activeTool} />}
            {!activeTool?.inspectorComponent && (
              <>
                <Text align="center" color="gray" mb="2">
                  No tool inspector
                </Text>
                <Text align="center" size="2" color="gray">
                  Select a tool with configuration options
                </Text>
              </>
            )}
          </Flex>
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  )
}

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
  const toolInfo = activeTool ? getToolInfoById(activeTool.id as ToolId) : null
  const toolTabLabel = toolInfo?.name || 'Tool'

  // Tab icons
  const selectionTabIcon = '↖' // Select tool icon
  const toolTabIcon = toolInfo?.icon || '🔧'

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
