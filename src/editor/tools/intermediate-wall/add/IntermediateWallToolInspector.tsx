import * as Label from '@radix-ui/react-label'
import { Info, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolInspectorProps } from '@/editor/tools/system/types'
import { InteriorWallAssemblySelectWithEdit } from '@/config/ui/interior-wall-assembly/InteriorWallAssemblySelectWithEdit'
import { useFormatters } from '@/shared/i18n/useFormatters'
import { LengthField } from '@/shared/ui/LengthField'
import { MeasurementInfo } from '@/shared/ui/MeasurementInfo'
import { Button } from '@/shared/ui/components/button'
import { Callout, CalloutIcon, CalloutText } from '@/shared/ui/components/callout'
import { Kbd } from '@/shared/ui/components/kbd'
import { Separator } from '@/shared/ui/components/separator'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/components/toggle-group'

import type { IntermediateWallAlignment, IntermediateWallTool } from './IntermediateWallTool'

export function IntermediateWallToolInspector({ tool }: ToolInspectorProps<IntermediateWallTool>): React.JSX.Element {
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
            <Info />
          </CalloutIcon>
          <CalloutText>
            <span className="text-xs">
              {state.alignment === 'left' ? t($ => $.intermediateWall.infoLeft) : t($ => $.intermediateWall.infoRight)}
            </span>
          </CalloutText>
        </Callout>

         {/* Tool Properties */}
         <div className="grid grid-cols-[auto_1fr] gap-2">
           <div className="flex items-center gap-1">
             <Label.Root>
               <span className="text-muted-foreground text-xs font-medium">{t($ => $.intermediateWall.wallAssembly)}</span>
             </Label.Root>
           </div>
           <InteriorWallAssemblySelectWithEdit
             value={state.wallAssemblyId}
             onValueChange={value => {
               tool.setAssembly(value)
             }}
             size="sm"
           />

           {/* Wall Thickness */}
          <div className="flex items-center gap-1">
            <Label.Root htmlFor="wall-thickness">
              <span className="text-muted-foreground text-xs font-medium">
                {t($ => $.intermediateWall.wallThickness)}
              </span>
            </Label.Root>
            <MeasurementInfo highlightedMeasurement="totalWallThickness" showFinishedSides />
          </div>
          <div className="flex items-center gap-1">
            <LengthField
              id="wall-thickness"
              value={state.thickness}
              onCommit={value => {
                tool.setThickness(value)
              }}
              min={10}
              max={undefined}
              step={10}
              size="sm"
              unit="mm"
              className="grow"
            />
          </div>

          <div className="flex items-center gap-1">
            <Label.Root>
              <span className="text-muted-foreground text-xs font-medium">
                {t($ => $.intermediateWall.referenceSide)}
              </span>
            </Label.Root>
          </div>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={state.alignment}
            onValueChange={value => {
              if (value) {
                tool.setAlignment(value as IntermediateWallAlignment)
              }
            }}
          >
            <ToggleGroupItem value="left">{t($ => $.intermediateWall.referenceSideLeft)}</ToggleGroupItem>
            <ToggleGroupItem value="right">{t($ => $.intermediateWall.referenceSideRight)}</ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Length Override Display */}
        {state.lengthOverride && (
          <>
            <Separator />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-blue-600">{t($ => $.intermediateWall.lengthOverride)}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-blue-600">{formatLength(state.lengthOverride)}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive h-6 w-6"
                  onClick={() => {
                    tool.clearLengthOverride()
                  }}
                  title={t($ => $.intermediateWall.clearLengthOverride)}
                >
                  <X />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Help Text */}
        <Separator />
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium">{t($ => $.intermediateWall.controlsHeading)}</span>
          <span className="text-muted-foreground text-xs">• {t($ => $.intermediateWall.controlPlace)}</span>
          <span className="text-muted-foreground text-xs">• {t($ => $.intermediateWall.controlSnap)}</span>
          <span className="text-muted-foreground text-xs">• {t($ => $.intermediateWall.controlNumbers)}</span>
          {state.lengthOverride ? (
            <span className="text-muted-foreground text-xs">
              •{' '}
              <Trans ns="tool" i18nKey={$ => $.intermediateWall.controlEscOverride} components={{ kbd: <Kbd /> }}>
                <Kbd size="sm">Escape</Kbd> to cancel length override
              </Trans>
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">
              •{' '}
              <Trans ns="tool" i18nKey={$ => $.intermediateWall.controlEscAbort} components={{ kbd: <Kbd /> }}>
                <Kbd size="sm">Escape</Kbd> to cancel wall
              </Trans>
            </span>
          )}
          {state.points.length >= 2 && (
            <>
              <span className="text-muted-foreground text-xs">
                •{' '}
                <Trans ns="tool" i18nKey={$ => $.intermediateWall.controlEnter} components={{ kbd: <Kbd size="sm" /> }}>
                  <Kbd size="sm">Enter</Kbd> to complete wall
                </Trans>
              </span>
              <span className="text-muted-foreground text-xs">• {t($ => $.intermediateWall.controlClickFirst)}</span>
            </>
          )}
        </div>

        {/* Actions */}
        {state.points.length > 0 && (
          <>
            <Separator />
            <div className="flex flex-col gap-2">
              {state.points.length >= 2 && (
                <Button
                  size="sm"
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    tool.complete()
                  }}
                  disabled={!state.isValid}
                  title={t($ => $.intermediateWall.completeTooltip)}
                >
                  <span className="text-xs">{t($ => $.intermediateWall.completeWall)}</span>
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
                title={t($ => $.intermediateWall.cancelTooltip)}
              >
                <span className="text-xs">{t($ => $.intermediateWall.cancelWall)}</span>
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
