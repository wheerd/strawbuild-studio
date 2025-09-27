import * as Toolbar from '@radix-ui/react-toolbar'
import { Flex, IconButton, Kbd, Separator, Text, Tooltip } from '@radix-ui/themes'
import React, { useCallback } from 'react'

import { TOOL_DEFINITIONS, TOOL_GROUPS, type ToolId } from '@/editor/tools/store/toolDefinitions'
import { pushTool, useActiveToolId } from '@/editor/tools/store/toolStore'
import { Logo } from '@/shared/components/Logo'

export function NewMainToolbar(): React.JSX.Element {
  const activeToolId = useActiveToolId()

  const handleToolSelect = useCallback((toolId: ToolId) => {
    pushTool(toolId)
  }, [])

  return (
    <Flex align="center" gap="4" style={{ borderBottom: '1px solid var(--gray-6)' }} data-testid="main-toolbar" p="3">
      {/* Logo - Compact version */}
      <Logo />

      {/* Tools positioned next to logo on the left */}
      <Toolbar.Root>
        <Flex align="center" gap="2">
          {TOOL_GROUPS.map((group, groupIndex) => (
            <React.Fragment key={group.name}>
              {groupIndex > 0 && <Separator orientation="vertical" size="2" />}

              <Flex align="center" gap="1">
                {/* Group of tools */}
                {group.tools.map(toolId => {
                  const tool = TOOL_DEFINITIONS[toolId]
                  return (
                    <Tooltip
                      key={toolId}
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
                          variant={activeToolId === toolId ? 'solid' : 'surface'}
                          onClick={() => handleToolSelect(toolId)}
                        >
                          {tool.iconComponent ? <tool.iconComponent /> : <Text>{tool.icon}</Text>}
                        </IconButton>
                      </Toolbar.Button>
                    </Tooltip>
                  )
                })}
              </Flex>
            </React.Fragment>
          ))}
        </Flex>
      </Toolbar.Root>
    </Flex>
  )
}
