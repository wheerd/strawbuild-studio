import * as Label from '@radix-ui/react-label'
import { Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { RoofPreview } from '@/building/components/inspectors/RoofPreview'
import type { RoofType } from '@/building/model'
import { Button } from '@/components/ui/button'
import { Callout, CalloutIcon, CalloutText } from '@/components/ui/callout'
import { Kbd } from '@/components/ui/kbd'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { RoofAssemblySelectWithEdit } from '@/construction/config/components/RoofAssemblySelectWithEdit'
import { useDefaultRoofAssemblyId } from '@/construction/config/store'
import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolInspectorProps } from '@/editor/tools/system/types'
import { LengthField } from '@/shared/components/LengthField'
import { NumberField } from '@/shared/components/NumberField'
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
            <Info />
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
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={state.type}
              onValueChange={value => {
                if (value) {
                  tool.setType(value as RoofType)
                }
              }}
            >
              <ToggleGroupItem value="gable">{t($ => $.roof.typeGable)}</ToggleGroupItem>
              <ToggleGroupItem value="shed">{t($ => $.roof.typeShed)}</ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Slope */}
          <div className="flex items-center justify-between gap-2">
            <Label.Root htmlFor="roof-slope">
              <span className="text-muted-foreground text-xs font-medium">{t($ => $.roof.slope)}</span>
            </Label.Root>

            <div className="flex items-center gap-2">
              <NumberField.Root
                value={state.slope}
                onChange={value => {
                  if (value != null && value >= 0 && value <= 90) {
                    tool.setSlope(value)
                  }
                }}
                precision={2}
                size="sm"
              >
                <NumberField.Input id="roof-slope" className="w-15" min={0} max={90} />
                <NumberField.Slot side="right">°</NumberField.Slot>
                <NumberField.Spinner />
              </NumberField.Root>

              <NumberField.Root
                value={Math.tan(degreesToRadians(state.slope)) * 100}
                onChange={value => {
                  if (value != null) {
                    tool.setSlope(radiansToDegrees(Math.atan(value / 100)))
                  }
                }}
                precision={2}
                size="sm"
              >
                <NumberField.Input className="w-15" min={0} max={100} step={1} />
                <NumberField.Slot side="right">%</NumberField.Slot>
                <NumberField.Spinner />
              </NumberField.Root>
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
              unit="cm"
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
              unit="cm"
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
