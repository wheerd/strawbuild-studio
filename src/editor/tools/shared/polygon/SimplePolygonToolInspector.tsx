import { Cross2Icon, InfoCircledIcon } from '@radix-ui/react-icons'
import { Box, Button, Callout, Code, Flex, IconButton, Kbd, Separator, Text } from '@radix-ui/themes'
import { useEffect, useState } from 'react'

import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolImplementation, ToolInspectorProps } from '@/editor/tools/system/types'
import { formatLength } from '@/shared/utils/formatLength'

import type { BasePolygonTool, PolygonToolStateBase } from './BasePolygonTool'

interface SimplePolygonToolInspectorProps<TTool extends BasePolygonTool<PolygonToolStateBase> & ToolImplementation>
  extends ToolInspectorProps<TTool> {
  title: string
  description: React.ReactNode
  completeLabel: string
  cancelLabel: string
}

export function SimplePolygonToolInspector<TTool extends BasePolygonTool<PolygonToolStateBase> & ToolImplementation>({
  tool,
  title,
  description,
  completeLabel,
  cancelLabel
}: SimplePolygonToolInspectorProps<TTool>): React.JSX.Element {
  const { state } = useReactiveTool(tool)
  const [, forceUpdate] = useState({})

  useEffect(
    () =>
      tool.onRenderNeeded(() => {
        forceUpdate({})
      }),
    [tool]
  )

  const minimumPoints = tool.getMinimumPointCount()
  const hasPolygon = state.points.length > 0
  const canComplete = hasPolygon && state.points.length >= minimumPoints && state.isClosingSegmentValid

  return (
    <Box p="2">
      <Flex direction="column" gap="2">
        <Callout.Root color="blue">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            <Text size="1">
              <Text weight="bold">{title}:</Text> {description}
            </Text>
          </Callout.Text>
        </Callout.Root>

        {state.lengthOverride && (
          <>
            <Separator size="4" />
            <Flex align="center" justify="between" gap="2">
              <Text size="1" weight="medium" color="blue">
                Length Override
              </Text>
              <Flex align="center" gap="2">
                <Code size="1" color="blue">
                  {formatLength(state.lengthOverride)}
                </Code>
                <IconButton
                  size="1"
                  variant="ghost"
                  color="red"
                  onClick={() => tool.clearLengthOverride()}
                  title="Clear length override (Escape)"
                >
                  <Cross2Icon />
                </IconButton>
              </Flex>
            </Flex>
          </>
        )}

        <Separator size="4" />
        <Flex direction="column" gap="2">
          <Text size="1" weight="medium">
            Controls:
          </Text>
          <Text size="1" color="gray">
            • Click to place polygon points
          </Text>
          <Text size="1" color="gray">
            • Points snap to grid, perimeters, and existing geometry
          </Text>
          <Text size="1" color="gray">
            • Type numbers to set exact segment lengths
          </Text>
          <Text size="1" color="gray">
            • <Kbd>Esc</Kbd> to {state.lengthOverride ? 'clear length override' : 'cancel drawing'}
          </Text>
          {state.points.length >= minimumPoints && (
            <Text size="1" color="gray">
              • <Kbd>Enter</Kbd> to complete shape
            </Text>
          )}
        </Flex>

        {hasPolygon && (
          <>
            <Separator size="4" />
            <Flex direction="column" gap="2">
              {state.points.length >= minimumPoints && (
                <Button
                  size="2"
                  color="green"
                  onClick={() => tool.complete()}
                  disabled={!canComplete}
                  title="Complete shape (Enter)"
                  style={{ width: '100%' }}
                >
                  <Text size="1">{completeLabel}</Text>
                  <Kbd size="1" style={{ marginLeft: 'auto' }}>
                    Enter
                  </Kbd>
                </Button>
              )}
              <Button
                size="2"
                color="red"
                variant="soft"
                onClick={() => tool.cancel()}
                title="Cancel drawing (Escape)"
                style={{ width: '100%' }}
              >
                <Text size="1">{cancelLabel}</Text>
                <Kbd size="1" style={{ marginLeft: 'auto' }}>
                  Esc
                </Kbd>
              </Button>
            </Flex>
          </>
        )}
      </Flex>
    </Box>
  )
}
