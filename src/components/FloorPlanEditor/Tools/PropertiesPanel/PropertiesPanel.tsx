import { useCurrentSelection, useSelectionPath } from '@/components/FloorPlanEditor/hooks/useSelectionStore'
import { useActiveTool } from '@/components/FloorPlanEditor/Tools/ToolSystem/ToolContext'
import { OuterWallInspector, PerimeterWallInspector, PerimeterCornerInspector, OpeningInspector } from './Inspectors'

import {
  isPerimeterId,
  isPerimeterWallId,
  isPerimeterCornerId,
  isOpeningId,
  type PerimeterWallId,
  type PerimeterId
} from '@/types/ids'
import { Box, Flex, Text, Tabs, Callout } from '@radix-ui/themes'
import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { usePropertiesPanel } from '@/hooks/usePropertiesPanel'

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
          <Box p="2">
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
            {selectedId && isPerimeterId(selectedId) && <OuterWallInspector key={selectedId} selectedId={selectedId} />}

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
          </Box>
        </Tabs.Content>

        <Tabs.Content value="tool">
          {activeTool?.inspectorComponent && <activeTool.inspectorComponent tool={activeTool} />}
          {!activeTool?.inspectorComponent && (
            <Box p="6">
              <Text align="center" color="gray" mb="2">
                No tool inspector
              </Text>
              <Text align="center" size="2" color="gray">
                Select a tool with configuration options
              </Text>
            </Box>
          )}
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  )
}
