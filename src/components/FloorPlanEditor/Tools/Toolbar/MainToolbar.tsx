import React, { useCallback } from 'react'
import * as Toolbar from '@radix-ui/react-toolbar'
import { Flex, Tooltip, Kbd, IconButton, Text, Separator } from '@radix-ui/themes'
import {
  useToolContext,
  useToolManager,
  useToolManagerState
} from '@/components/FloorPlanEditor/Tools/ToolSystem/ToolContext'
import { Logo } from '@/components/Logo'

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
    <Flex align="center" gap="4" style={{ borderBottom: '1px solid var(--gray-6)' }} data-testid="main-toolbar" p="3">
      {/* Logo - Compact version */}
      <Logo />

      {/* Tools positioned next to logo on the left */}
      <Toolbar.Root>
        <Flex align="center" gap="2">
          {toolGroups.map((group, groupIndex) => (
            <React.Fragment key={group.id}>
              {groupIndex > 0 && <Separator orientation="vertical" size="2" />}

              <Flex align="center" gap="1">
                {/* Group of tools */}
                {group.tools.map(tool => (
                  <Tooltip
                    key={tool.id}
                    content={
                      <Flex align="center" justify="between" gap="2">
                        <Text>{tool.name}</Text>
                        {tool.hotkey && <Kbd>{tool.hotkey.toUpperCase()}</Kbd>}
                      </Flex>
                    }
                  >
                    <Toolbar.Button asChild>
                      <IconButton
                        size="2"
                        variant={toolManagerState.activeTool?.id === tool.id ? 'solid' : 'surface'}
                        onClick={() => handleToolSelect(tool.id)}
                      >
                        {tool.iconComponent ? <tool.iconComponent /> : <Text>{tool.icon}</Text>}
                      </IconButton>
                    </Toolbar.Button>
                  </Tooltip>
                ))}
              </Flex>
            </React.Fragment>
          ))}
        </Flex>
      </Toolbar.Root>
    </Flex>
  )
}
