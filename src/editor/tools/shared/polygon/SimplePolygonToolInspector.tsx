import { Cross2Icon, InfoCircledIcon } from '@radix-ui/react-icons'
import { Box, Button, Callout, Code, Flex, IconButton, Kbd, Separator, Text } from '@radix-ui/themes'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolImplementation, ToolInspectorProps } from '@/editor/tools/system/types'
import { useFormatters } from '@/shared/i18n/useFormatters'

import type { BasePolygonTool, PolygonToolStateBase } from './BasePolygonTool'

interface SimplePolygonToolInspectorProps<
  TTool extends BasePolygonTool<PolygonToolStateBase> & ToolImplementation
> extends ToolInspectorProps<TTool> {
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
  const { t } = useTranslation('tool')
  const { formatLength } = useFormatters()
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
                {t($ => $.simplePolygon.lengthOverride)}
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
                  title={t($ => $.simplePolygon.clearLengthOverride)}
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
            {t($ => $.simplePolygon.controlsHeading)}
          </Text>
          <Text size="1" color="gray">
            • {t($ => $.simplePolygon.controlPlace)}
          </Text>
          <Text size="1" color="gray">
            • {t($ => $.simplePolygon.controlSnap)}
          </Text>
          <Text size="1" color="gray">
            • {t($ => $.simplePolygon.controlNumbers)}
          </Text>
          <Text size="1" color="gray">
            • <Kbd>{t($ => $.keyboard.esc)}</Kbd>{' '}
            {state.lengthOverride
              ? t($ => $.simplePolygon.controlEscOverride, {
                  key: ''
                })
                  .replace('{{key}}', '')
                  .trim()
              : t($ => $.simplePolygon.controlEscCancel, {
                  key: ''
                })
                  .replace('{{key}}', '')
                  .trim()}
          </Text>
          {state.points.length >= minimumPoints && (
            <Text size="1" color="gray">
              • <Kbd>{t($ => $.keyboard.enter)}</Kbd>{' '}
              {t($ => $.simplePolygon.controlEnter, {
                key: ''
              })
                .replace('{{key}}', '')
                .trim()}
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
                  title={t($ => $.simplePolygon.completeShape)}
                  style={{ width: '100%' }}
                >
                  <Text size="1">{completeLabel}</Text>
                  <Kbd size="1" style={{ marginLeft: 'auto' }}>
                    {t($ => $.keyboard.enter)}
                  </Kbd>
                </Button>
              )}
              <Button
                size="2"
                color="red"
                variant="soft"
                onClick={() => tool.cancel()}
                title={t($ => $.simplePolygon.cancelDrawing)}
                style={{ width: '100%' }}
              >
                <Text size="1">{cancelLabel}</Text>
                <Kbd size="1" style={{ marginLeft: 'auto' }}>
                  {t($ => $.keyboard.esc)}
                </Kbd>
              </Button>
            </Flex>
          </>
        )}
      </Flex>
    </Box>
  )
}
