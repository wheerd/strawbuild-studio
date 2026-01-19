import { Cross2Icon, InfoCircledIcon } from '@radix-ui/react-icons'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Callout, CalloutIcon, CalloutText } from '@/components/ui/callout'
import { Kbd } from '@/components/ui/kbd'
import { Separator } from '@/components/ui/separator'
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
    <div className="p-2">
      <div className="flex flex-col gap-2">
        <Callout color="blue">
          <CalloutIcon>
            <InfoCircledIcon />
          </CalloutIcon>
          <CalloutText>
            <span className="text-xs">
              <span className="font-bold">{title}:</span> {description}
            </span>
          </CalloutText>
        </Callout>

        {state.lengthOverride && (
          <>
            <Separator />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                {t($ => $.simplePolygon.lengthOverride)}
              </span>
              <div className="flex items-center gap-2">
                <code className="font-mono text-xs text-blue-600 dark:text-blue-400">
                  {formatLength(state.lengthOverride)}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => {
                    tool.clearLengthOverride()
                  }}
                  title={t($ => $.simplePolygon.clearLengthOverride)}
                >
                  <Cross2Icon />
                </Button>
              </div>
            </div>
          </>
        )}

        <Separator />
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium">{t($ => $.simplePolygon.controlsHeading)}</span>
          <span className="text-xs text-muted-foreground">• {t($ => $.simplePolygon.controlPlace)}</span>
          <span className="text-xs text-muted-foreground">• {t($ => $.simplePolygon.controlSnap)}</span>
          <span className="text-xs text-muted-foreground">• {t($ => $.simplePolygon.controlNumbers)}</span>
          <span className="text-xs text-muted-foreground">
            • <Kbd size="sm">{t($ => $.keyboard.esc)}</Kbd>{' '}
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
          </span>
          {state.points.length >= minimumPoints && (
            <span className="text-xs text-muted-foreground">
              • <Kbd size="sm">{t($ => $.keyboard.enter)}</Kbd>{' '}
              {t($ => $.simplePolygon.controlEnter, {
                key: ''
              })
                .replace('{{key}}', '')
                .trim()}
            </span>
          )}
        </div>

        {hasPolygon && (
          <>
            <Separator />
            <div className="flex flex-col gap-2">
              {state.points.length >= minimumPoints && (
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    tool.complete()
                  }}
                  disabled={!canComplete}
                  title={t($ => $.simplePolygon.completeShape)}
                >
                  <span className="text-xs">{completeLabel}</span>
                  <Kbd size="sm" className="ml-auto">
                    {t($ => $.keyboard.enter)}
                  </Kbd>
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
                onClick={() => {
                  tool.cancel()
                }}
                title={t($ => $.simplePolygon.cancelDrawing)}
              >
                <span className="text-xs">{cancelLabel}</span>
                <Kbd size="sm" className="ml-auto">
                  {t($ => $.keyboard.esc)}
                </Kbd>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
