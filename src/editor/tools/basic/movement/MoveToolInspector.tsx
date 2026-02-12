import { InfoCircledIcon } from '@radix-ui/react-icons'
import { useTranslation } from 'react-i18next'

import { Callout, CalloutIcon, CalloutText } from '@/components/ui/callout'
import { Kbd } from '@/components/ui/kbd'
import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolInspectorProps } from '@/editor/tools/system/types'

import type { MoveTool } from './MoveTool'

export function MoveToolInspector({ tool }: ToolInspectorProps<MoveTool>): React.JSX.Element {
  const { t } = useTranslation('tool')
  const toolState = useReactiveTool(tool).getToolState()

  return (
    <div className="p-2">
      <div className="flex flex-col gap-3">
        {/* Constraint Warning */}
        {toolState.hoveredBehavior && !toolState.canMoveHoveredEntity && (
          <Callout color="orange">
            <CalloutIcon>
              <InfoCircledIcon />
            </CalloutIcon>
            <CalloutText>
              <span className="text-xs">{t($ => $.move.constrainedEntity)}</span>
            </CalloutText>
          </Callout>
        )}

        {/* Informational Note */}
        <Callout color="blue">
          <CalloutIcon>
            <InfoCircledIcon />
          </CalloutIcon>
          <CalloutText>
            <span className="text-xs">{t($ => $.move.info)}</span>
          </CalloutText>
        </Callout>

        {/* Help Text */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium">{t($ => $.move.controlsHeading)}</span>
          <span className="text-muted-foreground text-xs">• {t($ => $.move.controlDrag)}</span>
          <span className="text-muted-foreground text-xs">• {t($ => $.move.controlSnap)}</span>
          <span className="text-muted-foreground text-xs">• {t($ => $.move.controlPrecise)}</span>
          <span className="text-muted-foreground text-xs">
            •{' '}
            {t($ => $.move.controlCancel, {
              key: 'Esc'
            }).replace('{{key}}', '')}
            <Kbd>{t($ => $.keyboard.esc)}</Kbd>
            {' to cancel ongoing movement'}
          </span>
        </div>

        {/* Movement State Display */}
        {toolState.isMoving && (
          <Callout color={toolState.isValid ? 'green' : 'red'}>
            <CalloutText>
              <span className="text-xs font-medium">
                {toolState.isValid ? t($ => $.move.moving) : t($ => $.move.invalidPosition)}
              </span>
            </CalloutText>
          </Callout>
        )}
      </div>
    </div>
  )
}
