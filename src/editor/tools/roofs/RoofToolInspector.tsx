import { InfoCircledIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import { Box, Button, Callout, Flex, Kbd, SegmentedControl, Separator, Text, TextField } from '@radix-ui/themes'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { RoofPreview } from '@/building/components/inspectors/RoofPreview'
import type { RoofType } from '@/building/model'
import { RoofAssemblySelectWithEdit } from '@/construction/config/components/RoofAssemblySelectWithEdit'
import { useDefaultRoofAssemblyId } from '@/construction/config/store'
import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolInspectorProps } from '@/editor/tools/system/types'
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
    <Box p="2">
      <Flex direction="column" gap="2">
        {/* Informational Note */}
        <Callout.Root color="blue">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            <Text size="1">{t($ => $.roof.info)}</Text>
          </Callout.Text>
        </Callout.Root>

        {/* Tool Properties */}
        <Flex direction="column" gap="2">
          <Flex justify="center">
            <RoofPreview slope={state.slope} type={state.type} />
          </Flex>

          {/* Assembly */}
          <Flex direction="column" gap="1">
            <Label.Root>
              <Text size="1" weight="medium" color="gray">
                {t($ => $.roof.assembly)}
              </Text>
            </Label.Root>
            <RoofAssemblySelectWithEdit
              value={state.assemblyId}
              onValueChange={assemblyId => tool.setAssemblyId(assemblyId)}
              showDefaultIndicator
              defaultAssemblyId={defaultAssemblyId}
              size="1"
            />
          </Flex>

          {/* Roof Type */}
          <Flex align="center" gap="2" justify="between">
            <Label.Root>
              <Text size="1" weight="medium" color="gray">
                {t($ => $.roof.type)}
              </Text>
            </Label.Root>
            <SegmentedControl.Root size="1" value={state.type} onValueChange={value => tool.setType(value as RoofType)}>
              <SegmentedControl.Item value="gable">{t($ => $.roof.typeGable)}</SegmentedControl.Item>
              <SegmentedControl.Item value="shed">{t($ => $.roof.typeShed)}</SegmentedControl.Item>
            </SegmentedControl.Root>
          </Flex>

          {/* Slope */}
          <Flex align="center" gap="2" justify="between">
            <Label.Root htmlFor="roof-slope">
              <Text size="1" weight="medium" color="gray">
                {t($ => $.roof.slope)}
              </Text>
            </Label.Root>

            <Flex align="center" gap="2">
              <TextField.Root
                id="roof-slope"
                type="number"
                value={state.slope.toFixed(3).replace(/\.?0+$/, '')}
                onChange={e => {
                  const value = parseFloat(e.target.value)
                  if (!isNaN(value) && value >= 0 && value <= 90) {
                    tool.setSlope(value)
                  }
                }}
                size="1"
                min={0}
                max={90}
                style={{ width: '6em', textAlign: 'right' }}
              >
                <TextField.Slot side="right">°</TextField.Slot>
              </TextField.Root>

              <TextField.Root
                id="roof-slope"
                type="number"
                value={(Math.tan(degreesToRadians(state.slope)) * 100).toFixed(3).replace(/\.?0+$/, '')}
                onChange={e => {
                  const value = parseFloat(e.target.value)
                  if (!isNaN(value)) {
                    tool.setSlope(radiansToDegrees(Math.atan(value / 100)))
                  }
                }}
                size="1"
                min={0}
                max={100}
                step={1}
                style={{ width: '6em', textAlign: 'right' }}
              >
                <TextField.Slot side="right">%</TextField.Slot>
              </TextField.Root>
            </Flex>
          </Flex>

          {/* Vertical Offset */}
          <Flex align="center" gap="2" justify="between">
            <Label.Root htmlFor="vertical-offset">
              <Text size="1" weight="medium" color="gray">
                {t($ => $.roof.verticalOffset)}
              </Text>
            </Label.Root>
            <LengthField
              id="vertical-offset"
              value={state.verticalOffset}
              onCommit={value => tool.setVerticalOffset(value)}
              min={-10000}
              max={10000}
              step={10}
              size="1"
              unit="mm"
              style={{ width: '5rem' }}
            />
          </Flex>

          {/* Overhang */}
          <Flex align="center" gap="2" justify="between">
            <Label.Root htmlFor="roof-overhang">
              <Text size="1" weight="medium" color="gray">
                {t($ => $.roof.overhang)}
              </Text>
            </Label.Root>
            <LengthField
              id="roof-overhang"
              value={state.overhang}
              onCommit={value => tool.setOverhang(value)}
              min={0}
              max={2000}
              step={10}
              size="1"
              unit="mm"
              style={{ width: '5rem' }}
            />
          </Flex>
        </Flex>

        {/* Help Text */}
        <Separator size="4" />
        <Flex direction="column" gap="2">
          <Text size="1" weight="medium">
            {t($ => $.roof.controlsHeading)}
          </Text>
          <Text size="1" color="gray">
            • {t($ => $.roof.controlPlace)}
          </Text>
          <Text size="1" color="gray">
            • {t($ => $.roof.controlSnap)}
          </Text>
          <Text size="1" color="gray">
            • <Kbd>{t($ => $.keyboard.esc)}</Kbd>{' '}
            {t($ => $.roof.controlEsc, {
              key: ''
            })
              .replace('{{key}}', '')
              .trim()}
          </Text>
          {state.points.length >= 3 && (
            <>
              <Text size="1" color="gray">
                • <Kbd>{t($ => $.keyboard.enter)}</Kbd>{' '}
                {t($ => $.roof.controlEnter, {
                  key: ''
                })
                  .replace('{{key}}', '')
                  .trim()}
              </Text>
              <Text size="1" color="gray">
                • {t($ => $.roof.controlClickFirst)}
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
                  onClick={() => tool.complete()}
                  disabled={!state.isClosingSegmentValid}
                  title={t($ => $.roof.completeTooltip)}
                  style={{ width: '100%' }}
                >
                  <Text size="1">{t($ => $.roof.completeRoof)}</Text>
                  <Kbd size="1" style={{ marginLeft: 'auto' }}>
                    {t($ => $.keyboard.enter)}
                  </Kbd>
                </Button>
              )}
              <Button
                size="2"
                color="red"
                variant="soft"
                onClick={() => tool.cancel()}
                title={t($ => $.roof.cancelTooltip)}
                style={{ width: '100%' }}
              >
                <Text size="1">{t($ => $.roof.cancelRoof)}</Text>
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
