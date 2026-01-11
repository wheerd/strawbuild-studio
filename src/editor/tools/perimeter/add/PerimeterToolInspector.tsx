import { Cross2Icon, InfoCircledIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import {
  Box,
  Button,
  Callout,
  Code,
  Flex,
  Grid,
  IconButton,
  Kbd,
  SegmentedControl,
  Separator,
  Text
} from '@radix-ui/themes'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { PerimeterReferenceSide } from '@/building/model'
import type { RingBeamAssemblyId, WallAssemblyId } from '@/building/model/ids'
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
    <Box p="2">
      <Flex direction="column" gap="2">
        {/* Informational Note */}
        <Callout.Root color="blue">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            <Text size="1">
              {t($ => $.perimeter.infoInside, {
                edge:
                  state.referenceSide === 'inside' ? t($ => $.perimeter.insideEdge) : t($ => $.perimeter.outsideEdge)
              })}
            </Text>
          </Callout.Text>
        </Callout.Root>

        {/* Tool Properties */}
        <Grid columns="auto 1fr" gap="2">
          {/* Wall Assembly */}
          <Flex align="center" gap="1">
            <Label.Root>
              <Text size="1" weight="medium" color="gray">
                {t($ => $.perimeter.wallAssembly)}
              </Text>
            </Label.Root>
            <MeasurementInfo highlightedAssembly="wallAssembly" />
          </Flex>
          <WallAssemblySelectWithEdit
            value={state.wallAssemblyId}
            onValueChange={(value: WallAssemblyId) => {
              tool.setAssembly(value)
            }}
            size="1"
          />

          {/* Wall Thickness */}
          <Flex align="center" gap="1">
            <Label.Root htmlFor="wall-thickness">
              <Text size="1" weight="medium" color="gray">
                {t($ => $.perimeter.wallThickness)}
              </Text>
            </Label.Root>
            <MeasurementInfo highlightedMeasurement="totalWallThickness" showFinishedSides />
          </Flex>
          <LengthField
            id="wall-thickness"
            value={state.wallThickness}
            onCommit={value => {
              tool.setWallThickness(value)
            }}
            min={50}
            max={1000}
            step={10}
            size="1"
            unit="mm"
          />

          <Flex align="center" gap="1">
            <Label.Root>
              <Text size="1" weight="medium" color="gray">
                {t($ => $.perimeter.referenceSide)}
              </Text>
            </Label.Root>
          </Flex>
          <SegmentedControl.Root
            size="1"
            value={state.referenceSide}
            onValueChange={value => {
              tool.setReferenceSide(value as PerimeterReferenceSide)
            }}
          >
            <SegmentedControl.Item value="inside">{t($ => $.perimeter.referenceSideInside)}</SegmentedControl.Item>
            <SegmentedControl.Item value="outside">{t($ => $.perimeter.referenceSideOutside)}</SegmentedControl.Item>
          </SegmentedControl.Root>

          {/* Base Ring Beam */}
          <Flex align="center" gap="1">
            <Label.Root>
              <Text size="1" weight="medium" color="gray">
                {t($ => $.perimeter.basePlate)}
              </Text>
            </Label.Root>
            <MeasurementInfo highlightedPart="basePlate" />
          </Flex>
          <RingBeamAssemblySelectWithEdit
            value={state.baseRingBeamAssemblyId ?? undefined}
            onValueChange={(value: RingBeamAssemblyId | undefined) => {
              tool.setBaseRingBeam(value)
            }}
            placeholder={t($ => $.perimeter.nonePlaceholder)}
            size="1"
            allowNone
          />

          {/* Top Ring Beam */}
          <Flex align="center" gap="1">
            <Label.Root>
              <Text size="1" weight="medium" color="gray">
                {t($ => $.perimeter.topPlate)}
              </Text>
            </Label.Root>
            <MeasurementInfo highlightedPart="topPlate" />
          </Flex>
          <RingBeamAssemblySelectWithEdit
            value={state.topRingBeamAssemblyId ?? undefined}
            onValueChange={(value: RingBeamAssemblyId | undefined) => {
              tool.setTopRingBeam(value)
            }}
            placeholder={t($ => $.perimeter.nonePlaceholder)}
            size="1"
            allowNone
          />
        </Grid>

        {/* Length Override Display */}
        {state.lengthOverride && (
          <>
            <Separator size="4" />
            <Flex align="center" justify="between" gap="2">
              <Text size="1" weight="medium" color="blue">
                {t($ => $.perimeter.lengthOverride)}
              </Text>
              <Flex align="center" gap="2">
                <Code size="1" color="blue">
                  {formatLength(state.lengthOverride)}
                </Code>
                <IconButton
                  size="1"
                  variant="ghost"
                  color="red"
                  onClick={() => {
                    tool.clearLengthOverride()
                  }}
                  title={t($ => $.perimeter.clearLengthOverride)}
                >
                  <Cross2Icon />
                </IconButton>
              </Flex>
            </Flex>
          </>
        )}

        {/* Help Text */}
        <Separator size="4" />
        <Flex direction="column" gap="2">
          <Text size="1" weight="medium">
            {t($ => $.perimeter.controlsHeading)}
          </Text>
          <Text size="1" color="gray">
            • {t($ => $.perimeter.controlPlace)}
          </Text>
          <Text size="1" color="gray">
            • {t($ => $.perimeter.controlSnap)}
          </Text>
          <Text size="1" color="gray">
            • {t($ => $.perimeter.controlNumbers)}
          </Text>
          {state.lengthOverride ? (
            <Text size="1" color="gray">
              • <Kbd>{t($ => $.keyboard.esc)}</Kbd>{' '}
              {t($ => $.perimeter.controlEscOverride, {
                key: ''
              })
                .replace('{{key}}', '')
                .trim()}
            </Text>
          ) : (
            <Text size="1" color="gray">
              • <Kbd>{t($ => $.keyboard.esc)}</Kbd>{' '}
              {t($ => $.perimeter.controlEscAbort, {
                key: ''
              })
                .replace('{{key}}', '')
                .trim()}
            </Text>
          )}
          {state.points.length >= 3 && (
            <>
              <Text size="1" color="gray">
                • <Kbd>{t($ => $.keyboard.enter)}</Kbd>{' '}
                {t($ => $.perimeter.controlEnter, {
                  key: ''
                })
                  .replace('{{key}}', '')
                  .trim()}
              </Text>
              <Text size="1" color="gray">
                • {t($ => $.perimeter.controlClickFirst)}
              </Text>
            </>
          )}
        </Flex>

        {/* Actions */}
        {state.points.length > 0 && (
          <>
            <Separator size="4" />
            <Flex direction="column" gap="2">
              {state.points.length >= 3 && (
                <Button
                  size="2"
                  color="green"
                  onClick={() => {
                    tool.complete()
                  }}
                  disabled={!state.isClosingSegmentValid}
                  title={t($ => $.perimeter.completeTooltip)}
                  style={{ width: '100%' }}
                >
                  <Text size="1">{t($ => $.perimeter.completePerimeter)}</Text>
                  <Kbd size="1" style={{ marginLeft: 'auto' }}>
                    {t($ => $.keyboard.enter)}
                  </Kbd>
                </Button>
              )}
              <Button
                size="2"
                color="red"
                variant="soft"
                onClick={() => {
                  tool.cancel()
                }}
                title={t($ => $.perimeter.cancelTooltip)}
                style={{ width: '100%' }}
              >
                <Text size="1">{t($ => $.perimeter.cancelPerimeter)}</Text>
                <Kbd size="1" style={{ marginLeft: 'auto' }}>
                  {t($ => $.keyboard.esc)}
                </Kbd>
              </Button>
            </Flex>
          </>
        )}
      </Flex>
    </Box>
  )
}
