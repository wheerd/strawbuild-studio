import { InfoCircledIcon } from '@radix-ui/react-icons'
import { Button, Callout, Flex, Heading, Kbd, Text } from '@radix-ui/themes'
import { useTranslation } from 'react-i18next'

import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolInspectorProps } from '@/editor/tools/system/types'

import type { SplitWallTool } from './SplitWallTool'

export function SplitWallToolInspector({ tool }: ToolInspectorProps<SplitWallTool>): React.JSX.Element {
  const { t } = useTranslation('tool')
  const { state } = useReactiveTool(tool)

  if (!state.selectedWallId) {
    return (
      <Flex direction="column" gap="3">
        <Heading size="2">{t($ => $.splitWall.title)}</Heading>
        <Callout.Root color="blue">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            <Text size="1">{t($ => $.splitWall.info)}</Text>
          </Callout.Text>
        </Callout.Root>
        <Text size="2" color="gray">
          {t($ => $.splitWall.selectWall)}
        </Text>
      </Flex>
    )
  }

  const splitError = state.splitError

  return (
    <Flex direction="column" gap="4">
      <Heading size="2">{t($ => $.splitWall.title)}</Heading>
      {state.isValidSplit && (
        <Callout.Root color="green">
          <Callout.Text>{t($ => $.splitWall.readyToSplit)}</Callout.Text>
        </Callout.Root>
      )}
      {!state.isValidSplit && splitError != null && (
        <Callout.Root color="red">
          <Callout.Text>{t($ => $.splitWall.errors[splitError])}</Callout.Text>
        </Callout.Root>
      )}
      {/* Action Buttons */}
      <Flex direction="column" gap="2">
        <Button onClick={() => tool.commitSplit()} disabled={!state.isValidSplit} size="2">
          {t($ => $.splitWall.splitWall)} <Kbd>{t($ => $.keyboard.enter)}</Kbd>
        </Button>
        <Button variant="soft" onClick={() => tool.cancel()} size="2">
          {t($ => $.splitWall.cancel)} <Kbd>{t($ => $.keyboard.esc)}</Kbd>
        </Button>
      </Flex>
      {/* Instructions */}
      <Flex direction="column" gap="1">
        <Text size="1" color="gray">
          • {t($ => $.splitWall.controlHover)}
        </Text>
        <Text size="1" color="gray">
          • {t($ => $.splitWall.controlClick)}
        </Text>
        <Text size="1" color="gray">
          • {t($ => $.splitWall.controlMeasurements)}
        </Text>
        <Text size="1" color="gray">
          • {t($ => $.splitWall.controlConfirm)}
        </Text>
      </Flex>
    </Flex>
  )
}
