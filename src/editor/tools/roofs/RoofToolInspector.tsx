import { InfoCircledIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { RoofPreview } from '@/building/components/inspectors/RoofPreview'
import type { RoofType } from '@/building/model'
import { Button } from '@/components/ui/button'
import { Callout, CalloutIcon, CalloutText } from '@/components/ui/callout'
import { Kbd } from '@/components/ui/kbd'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Separator } from '@/components/ui/separator'
import { RoofAssemblySelectWithEdit } from '@/construction/config/components/RoofAssemblySelectWithEdit'
import { useDefaultRoofAssemblyId } from '@/construction/config/store'
import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolInspectorProps } from '@/editor/tools/system/types'
import { cn } from '@/lib/utils'
import { LengthField } from '@/shared/components/LengthField'
import { degreesToRadians, radiansToDegrees } from '@/shared/geometry'

import type { RoofTool } from './RoofTool'

export function RoofToolInspector({ tool }: ToolInspectorProps<RoofTool>): React.JSX.Element {
  const { t } = useTranslation('tool')
  const { state } = useReactiveTool(tool)
  const defaultAssemblyId = useDefaultRoofAssemblyId()

  // Force re-renders when tool state changes
  const [, forceUpdate] = useState({})

  useEffect(
    () =>
      tool.onRenderNeeded(() => {
        forceUpdate({})
      }),
    [tool]
  )

  return (
    <div className="p-2">
      <div className="flex flex-col gap-2">
        {/* Informational Note */}
        <Callout color="blue">
          <CalloutIcon>
            <InfoCircledIcon />
          </CalloutIcon>
          <CalloutText>
            <span className="text-xs">{t($ => $.roof.info)}</span>
          </CalloutText>
        </Callout>

        {/* Tool Properties */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-center">
            <RoofPreview slope={state.slope} type={state.type} />
          </div>

          {/* Assembly */}
          <div className="flex flex-col gap-1">
            <Label.Root>
              <span className="text-muted-foreground text-xs font-medium">{t($ => $.roof.assembly)}</span>
            </Label.Root>
            <RoofAssemblySelectWithEdit
              value={state.assemblyId}
              onValueChange={assemblyId => {
                tool.setAssemblyId(assemblyId)
              }}
              showDefaultIndicator
              defaultAssemblyId={defaultAssemblyId}
              size="sm"
            />
          </div>

          {/* Roof Type */}
          <div className="flex items-center justify-between gap-2">
            <Label.Root>
              <span className="text-muted-foreground text-xs font-medium">{t($ => $.roof.type)}</span>
            </Label.Root>
            <SegmentedControl.Root
              size="sm"
              value={state.type}
              onValueChange={value => {
                tool.setType(value as RoofType)
              }}
            >
              <SegmentedControl.Item value="gable">{t($ => $.roof.typeGable)}</SegmentedControl.Item>
              <SegmentedControl.Item value="shed">{t($ => $.roof.typeShed)}</SegmentedControl.Item>
            </SegmentedControl.Root>
          </div>

          {/* Slope */}
          <div className="flex items-center justify-between gap-2">
            <Label.Root htmlFor="roof-slope">
              <span className="text-muted-foreground text-xs font-medium">{t($ => $.roof.slope)}</span>
            </Label.Root>

            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'border-input bg-background flex h-7 items-center rounded-md border text-xs',
                  'focus-within:ring-ring focus-within:ring-2 focus-within:ring-offset-2'
                )}
                style={{ width: '6em' }}
              >
                <input
                  id="roof-slope"
                  type="number"
                  value={state.slope.toFixed(3).replace(/\.?0+$/, '')}
                  onChange={e => {
                    const value = parseFloat(e.target.value)
                    if (!isNaN(value) && value >= 0 && value <= 90) {
                      tool.setSlope(value)
                    }
                  }}
                  min={0}
                  max={90}
                  className="flex h-full min-w-0 flex-1 bg-transparent px-2 text-right text-xs outline-none"
                />
                <span className="text-muted-foreground px-1">°</span>
              </div>

              <div
                className={cn(
                  'border-input bg-background flex h-7 items-center rounded-md border text-xs',
                  'focus-within:ring-ring focus-within:ring-2 focus-within:ring-offset-2'
                )}
                style={{ width: '6em' }}
              >
                <input
                  type="number"
                  value={(Math.tan(degreesToRadians(state.slope)) * 100).toFixed(3).replace(/\.?0+$/, '')}
                  onChange={e => {
                    const value = parseFloat(e.target.value)
                    if (!isNaN(value)) {
                      tool.setSlope(radiansToDegrees(Math.atan(value / 100)))
                    }
                  }}
                  min={0}
                  max={100}
                  step={1}
                  className="flex h-full min-w-0 flex-1 bg-transparent px-2 text-right text-xs outline-none"
                />
                <span className="text-muted-foreground px-1">%</span>
              </div>
            </div>
          </div>

          {/* Vertical Offset */}
          <div className="flex items-center justify-between gap-2">
            <Label.Root htmlFor="vertical-offset">
              <span className="text-muted-foreground text-xs font-medium">{t($ => $.roof.verticalOffset)}</span>
            </Label.Root>
            <LengthField
              id="vertical-offset"
              value={state.verticalOffset}
              onCommit={value => {
                tool.setVerticalOffset(value)
              }}
              min={-10000}
              max={10000}
              step={10}
              size="sm"
              unit="mm"
              style={{ width: '5rem' }}
            />
          </div>

          {/* Overhang */}
          <div className="flex items-center justify-between gap-2">
            <Label.Root htmlFor="roof-overhang">
              <span className="text-muted-foreground text-xs font-medium">{t($ => $.roof.overhang)}</span>
            </Label.Root>
            <LengthField
              id="roof-overhang"
              value={state.overhang}
              onCommit={value => {
                tool.setOverhang(value)
              }}
              min={0}
              max={2000}
              step={10}
              size="sm"
              unit="mm"
              style={{ width: '5rem' }}
            />
          </div>
        </div>

        {/* Help Text */}
        <Separator />
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium">{t($ => $.roof.controlsHeading)}</span>
          <span className="text-muted-foreground text-xs">• {t($ => $.roof.controlPlace)}</span>
          <span className="text-muted-foreground text-xs">• {t($ => $.roof.controlSnap)}</span>
          <span className="text-muted-foreground text-xs">
            • <Kbd size="sm">{t($ => $.keyboard.esc)}</Kbd>{' '}
            {t($ => $.roof.controlEsc, {
              key: ''
            })
              .replace('{{key}}', '')
              .trim()}
          </span>
          {state.points.length >= 3 && (
            <>
              <span className="text-muted-foreground text-xs">
                • <Kbd size="sm">{t($ => $.keyboard.enter)}</Kbd>{' '}
                {t($ => $.roof.controlEnter, {
                  key: ''
                })
                  .replace('{{key}}', '')
                  .trim()}
              </span>
              <span className="text-muted-foreground text-xs">• {t($ => $.roof.controlClickFirst)}</span>
            </>
          )}
        </div>

        {/* Actions */}
        {state.points.length > 0 && (
          <>
            <Separator />
            <div className="flex flex-col gap-2">
              {state.points.length >= 3 && (
                <Button
                  size="sm"
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    tool.complete()
                  }}
                  disabled={!state.isClosingSegmentValid}
                  title={t($ => $.roof.completeTooltip)}
                >
                  <span className="text-xs">{t($ => $.roof.completeRoof)}</span>
                  <Kbd size="sm" className="ml-auto">
                    {t($ => $.keyboard.enter)}
                  </Kbd>
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                className="text-destructive w-full"
                onClick={() => {
                  tool.cancel()
                }}
                title={t($ => $.roof.cancelTooltip)}
              >
                <span className="text-xs">{t($ => $.roof.cancelRoof)}</span>
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
