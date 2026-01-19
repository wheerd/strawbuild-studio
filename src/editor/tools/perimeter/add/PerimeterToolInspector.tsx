import { Cross2Icon, InfoCircledIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { PerimeterReferenceSide } from '@/building/model'
import type { RingBeamAssemblyId, WallAssemblyId } from '@/building/model/ids'
import { Button } from '@/components/ui/button'
import { Callout, CalloutIcon, CalloutText } from '@/components/ui/callout'
import { Kbd } from '@/components/ui/kbd'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Separator } from '@/components/ui/separator'
import { RingBeamAssemblySelectWithEdit } from '@/construction/config/components/RingBeamAssemblySelectWithEdit'
import { WallAssemblySelectWithEdit } from '@/construction/config/components/WallAssemblySelectWithEdit'
import { MeasurementInfo } from '@/editor/components/MeasurementInfo'
import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolInspectorProps } from '@/editor/tools/system/types'
import { LengthField } from '@/shared/components/LengthField'
import { useFormatters } from '@/shared/i18n/useFormatters'

import type { PerimeterTool } from './PerimeterTool'

export function PerimeterToolInspector({ tool }: ToolInspectorProps<PerimeterTool>): React.JSX.Element {
  const { t } = useTranslation('tool')
  const { formatLength } = useFormatters()
  const { state } = useReactiveTool(tool)

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
            <span className="text-xs">
              {t($ => $.perimeter.infoInside, {
                edge:
                  state.referenceSide === 'inside' ? t($ => $.perimeter.insideEdge) : t($ => $.perimeter.outsideEdge)
              })}
            </span>
          </CalloutText>
        </Callout>

        {/* Tool Properties */}
        <div className="grid grid-cols-[auto_1fr] gap-2">
          {/* Wall Assembly */}
          <div className="flex items-center gap-1">
            <Label.Root>
              <span className="text-muted-foreground text-xs font-medium">{t($ => $.perimeter.wallAssembly)}</span>
            </Label.Root>
            <MeasurementInfo highlightedAssembly="wallAssembly" />
          </div>
          <WallAssemblySelectWithEdit
            value={state.wallAssemblyId}
            onValueChange={(value: WallAssemblyId) => {
              tool.setAssembly(value)
            }}
            size="sm"
          />

          {/* Wall Thickness */}
          <div className="flex items-center gap-1">
            <Label.Root htmlFor="wall-thickness">
              <span className="text-muted-foreground text-xs font-medium">{t($ => $.perimeter.wallThickness)}</span>
            </Label.Root>
            <MeasurementInfo highlightedMeasurement="totalWallThickness" showFinishedSides />
          </div>
          <LengthField
            id="wall-thickness"
            value={state.wallThickness}
            onCommit={value => {
              tool.setWallThickness(value)
            }}
            min={50}
            max={1000}
            step={10}
            size="sm"
            unit="mm"
          />

          <div className="flex items-center gap-1">
            <Label.Root>
              <span className="text-muted-foreground text-xs font-medium">{t($ => $.perimeter.referenceSide)}</span>
            </Label.Root>
          </div>
          <SegmentedControl.Root
            size="sm"
            value={state.referenceSide}
            onValueChange={value => {
              tool.setReferenceSide(value as PerimeterReferenceSide)
            }}
          >
            <SegmentedControl.Item value="inside">{t($ => $.perimeter.referenceSideInside)}</SegmentedControl.Item>
            <SegmentedControl.Item value="outside">{t($ => $.perimeter.referenceSideOutside)}</SegmentedControl.Item>
          </SegmentedControl.Root>

          {/* Base Ring Beam */}
          <div className="flex items-center gap-1">
            <Label.Root>
              <span className="text-muted-foreground text-xs font-medium">{t($ => $.perimeter.basePlate)}</span>
            </Label.Root>
            <MeasurementInfo highlightedPart="basePlate" />
          </div>
          <RingBeamAssemblySelectWithEdit
            value={state.baseRingBeamAssemblyId ?? undefined}
            onValueChange={(value: RingBeamAssemblyId | undefined) => {
              tool.setBaseRingBeam(value)
            }}
            placeholder={t($ => $.perimeter.nonePlaceholder)}
            size="sm"
            allowNone
          />

          {/* Top Ring Beam */}
          <div className="flex items-center gap-1">
            <Label.Root>
              <span className="text-muted-foreground text-xs font-medium">{t($ => $.perimeter.topPlate)}</span>
            </Label.Root>
            <MeasurementInfo highlightedPart="topPlate" />
          </div>
          <RingBeamAssemblySelectWithEdit
            value={state.topRingBeamAssemblyId ?? undefined}
            onValueChange={(value: RingBeamAssemblyId | undefined) => {
              tool.setTopRingBeam(value)
            }}
            placeholder={t($ => $.perimeter.nonePlaceholder)}
            size="sm"
            allowNone
          />
        </div>

        {/* Length Override Display */}
        {state.lengthOverride && (
          <>
            <Separator />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-blue-600">{t($ => $.perimeter.lengthOverride)}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-blue-600">{formatLength(state.lengthOverride)}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive h-6 w-6"
                  onClick={() => {
                    tool.clearLengthOverride()
                  }}
                  title={t($ => $.perimeter.clearLengthOverride)}
                >
                  <Cross2Icon />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Help Text */}
        <Separator />
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium">{t($ => $.perimeter.controlsHeading)}</span>
          <span className="text-muted-foreground text-xs">• {t($ => $.perimeter.controlPlace)}</span>
          <span className="text-muted-foreground text-xs">• {t($ => $.perimeter.controlSnap)}</span>
          <span className="text-muted-foreground text-xs">• {t($ => $.perimeter.controlNumbers)}</span>
          {state.lengthOverride ? (
            <span className="text-muted-foreground text-xs">
              • <Kbd size="sm">{t($ => $.keyboard.esc)}</Kbd>{' '}
              {t($ => $.perimeter.controlEscOverride, {
                key: ''
              })
                .replace('{{key}}', '')
                .trim()}
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">
              • <Kbd size="sm">{t($ => $.keyboard.esc)}</Kbd>{' '}
              {t($ => $.perimeter.controlEscAbort, {
                key: ''
              })
                .replace('{{key}}', '')
                .trim()}
            </span>
          )}
          {state.points.length >= 3 && (
            <>
              <span className="text-muted-foreground text-xs">
                • <Kbd size="sm">{t($ => $.keyboard.enter)}</Kbd>{' '}
                {t($ => $.perimeter.controlEnter, {
                  key: ''
                })
                  .replace('{{key}}', '')
                  .trim()}
              </span>
              <span className="text-muted-foreground text-xs">• {t($ => $.perimeter.controlClickFirst)}</span>
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
                  title={t($ => $.perimeter.completeTooltip)}
                >
                  <span className="text-xs">{t($ => $.perimeter.completePerimeter)}</span>
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
                title={t($ => $.perimeter.cancelTooltip)}
              >
                <span className="text-xs">{t($ => $.perimeter.cancelPerimeter)}</span>
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
