import { GearIcon } from '@radix-ui/react-icons'
import * as Toolbar from '@radix-ui/react-toolbar'
import { Button, Flex, IconButton, Kbd, Separator, Text, Tooltip } from '@radix-ui/themes'
import React, { useCallback } from 'react'

import { ConfigurationModal } from '@/construction/config/components/ConfigurationModal'
import { TOOL_GROUPS, getToolInfoById } from '@/editor/tools/system/metadata'
import { replaceTool, useActiveToolId } from '@/editor/tools/system/store'
import type { ToolId } from '@/editor/tools/system/types'
import { Logo } from '@/shared/components/Logo'

export function MainToolbar(): React.JSX.Element {
  const activeToolId = useActiveToolId()

  const handleToolSelect = useCallback((toolId: ToolId) => {
    replaceTool(toolId)
  }, [])

  return (
    <Flex align="center" gap="4" style={{ borderBottom: '1px solid var(--gray-6)' }} data-testid="main-toolbar" p="3">
      {/* Logo - Compact version */}
      <Logo />

      {/* Tools positioned next to logo on the left */}
      <Toolbar.Root>
        <Flex align="center" gap="2">
          {TOOL_GROUPS.map((group, groupIndex) => (
            <React.Fragment key={groupIndex}>
              {groupIndex > 0 && <Separator orientation="vertical" size="2" />}

              <Flex align="center" gap="1">
                {/* Group of tools */}
                {group.tools.map(toolId => {
                  const toolInfo = getToolInfoById(toolId)
                  return (
                    <Tooltip
                      key={toolId}
                      content={
                        <Flex align="center" justify="between" gap="2" as="span">
                          <Text>{toolInfo.name}</Text>
                          {toolInfo.hotkey && <Kbd>{toolInfo.hotkey.toUpperCase()}</Kbd>}
                        </Flex>
                      }
                    >
                      <Toolbar.Button asChild>
                        <IconButton
                          size="2"
                          variant={activeToolId === toolId ? 'solid' : 'surface'}
                          onClick={() => handleToolSelect(toolId)}
                        >
                          {toolInfo.iconComponent ? <toolInfo.iconComponent /> : <Text>{toolInfo.icon}</Text>}
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

      {/* Configuration button on the right */}
      <Flex ml="auto">
        <ConfigurationModal
          trigger={
            <Button variant="surface" size="2">
              <GearIcon />
              Configuration
            </Button>
          }
        />
      </Flex>
    </Flex>
  )
}
