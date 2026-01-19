import { InfoCircledIcon } from '@radix-ui/react-icons'
import { Button, Callout, Kbd } from '@radix-ui/themes'
import { useTranslation } from 'react-i18next'

import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolInspectorProps } from '@/editor/tools/system/types'

import type { SplitWallTool } from './SplitWallTool'

export function SplitWallToolInspector({ tool }: ToolInspectorProps<SplitWallTool>): React.JSX.Element {
  const { t } = useTranslation('tool')
  const { state } = useReactiveTool(tool)

  if (!state.selectedWallId) {
    return (
      <div className="flex flex-col gap-3">
        <h2>{t($ => $.splitWall.title)}</h2>
        <Callout.Root color="blue">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            <span className="text-sm">{t($ => $.splitWall.info)}</span>
          </Callout.Text>
        </Callout.Root>
        <span className="text-base text-gray-900">{t($ => $.splitWall.selectWall)}</span>
      </div>
    )
  }

  const splitError = state.splitError

  return (
    <div className="flex flex-col gap-4">
      <h2>{t($ => $.splitWall.title)}</h2>
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
      <div className="flex flex-col gap-2">
        <Button onClick={() => tool.commitSplit()} disabled={!state.isValidSplit} size="2">
          {t($ => $.splitWall.splitWall)} <Kbd>{t($ => $.keyboard.enter)}</Kbd>
        </Button>
        <Button
          variant="soft"
          onClick={() => {
            tool.cancel()
          }}
          size="2"
        >
          {t($ => $.splitWall.cancel)} <Kbd>{t($ => $.keyboard.esc)}</Kbd>
        </Button>
      </div>
      {/* Instructions */}
      <div className="flex flex-col gap-1">
        <span className="text-sm text-gray-900">• {t($ => $.splitWall.controlHover)}</span>
        <span className="text-sm text-gray-900">• {t($ => $.splitWall.controlClick)}</span>
        <span className="text-sm text-gray-900">• {t($ => $.splitWall.controlMeasurements)}</span>
        <span className="text-sm text-gray-900">• {t($ => $.splitWall.controlConfirm)}</span>
      </div>
    </div>
  )
}
