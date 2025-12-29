import { InfoCircledIcon } from '@radix-ui/react-icons'
import { Box, Callout, Flex, Kbd, Text } from '@radix-ui/themes'
import { useTranslation } from 'react-i18next'

import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolInspectorProps } from '@/editor/tools/system/types'

import type { MoveTool } from './MoveTool'

export function MoveToolInspector({ tool }: ToolInspectorProps<MoveTool>): React.JSX.Element {
  const { t } = useTranslation('tool')
  const toolState = useReactiveTool(tool).getToolState()

  return (
    <Box p="2">
      <Flex direction="column" gap="3">
        {/* Informational Note */}
        <Callout.Root color="blue">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            <Text size="1">{t($ => $.move.info)}</Text>
          </Callout.Text>
        </Callout.Root>

        {/* Help Text */}
        <Flex direction="column" gap="2">
          <Text size="1" weight="medium">
            {t($ => $.move.controlsHeading)}
          </Text>
          <Text size="1" color="gray">
            • {t($ => $.move.controlDrag)}
          </Text>
          <Text size="1" color="gray">
            • {t($ => $.move.controlSnap)}
          </Text>
          <Text size="1" color="gray">
            • {t($ => $.move.controlPrecise)}
          </Text>
          <Text size="1" color="gray">
            •{' '}
            {t($ => $.move.controlCancel, {
              key: 'Esc'
            }).replace('{{key}}', '')}
            <Kbd>{t('Esc' as never)}</Kbd>
            {' to cancel ongoing movement'}
          </Text>
        </Flex>

        {/* Movement State Display */}
        {toolState.isMoving && (
          <Callout.Root color={toolState.isValid ? 'green' : 'red'}>
            <Callout.Text>
              <Text size="1" weight="medium">
                {toolState.isValid ? t($ => $.move.moving) : t($ => $.move.invalidPosition)}
              </Text>
            </Callout.Text>
          </Callout.Root>
        )}
      </Flex>
    </Box>
  )
}
