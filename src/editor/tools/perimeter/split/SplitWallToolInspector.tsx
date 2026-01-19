import { InfoCircledIcon } from '@radix-ui/react-icons'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Callout, CalloutIcon, CalloutText } from '@/components/ui/callout'
import { Kbd } from '@/components/ui/kbd'
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
        <Callout color="blue">
          <CalloutIcon>
            <InfoCircledIcon />
          </CalloutIcon>
          <CalloutText>
            <span className="text-sm">{t($ => $.splitWall.info)}</span>
          </CalloutText>
        </Callout>
        <span className="text-base text-gray-900">{t($ => $.splitWall.selectWall)}</span>
      </div>
    )
  }

  const splitError = state.splitError

  return (
    <div className="flex flex-col gap-4">
      <h2>{t($ => $.splitWall.title)}</h2>
      {state.isValidSplit && (
        <Callout color="green">
          <CalloutText>{t($ => $.splitWall.readyToSplit)}</CalloutText>
        </Callout>
      )}
      {!state.isValidSplit && splitError != null && (
        <Callout className="text-destructive">
          <CalloutText>{t($ => $.splitWall.errors[splitError])}</CalloutText>
        </Callout>
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
