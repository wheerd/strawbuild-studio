import { InfoCircledIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import { Box, Button, Callout, Flex, Grid, Kbd, SegmentedControl, Separator, Text, TextField } from '@radix-ui/themes'
import { useEffect, useState } from 'react'

import type { RoofType } from '@/building/model'
import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolInspectorProps } from '@/editor/tools/system/types'
import { LengthField } from '@/shared/components/LengthField'

import type { RoofTool } from './RoofTool'

export function RoofToolInspector({ tool }: ToolInspectorProps<RoofTool>): React.JSX.Element {
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
              Draw the roof outline by clicking to place points. The roof direction will be perpendicular to the first
              edge.
            </Text>
          </Callout.Text>
        </Callout.Root>

        {/* Tool Properties */}
        <Grid columns="auto 1fr" gap="2">
          {/* Roof Type */}
          <Flex align="center" gap="1">
            <Label.Root>
              <Text size="1" weight="medium" color="gray">
                Type
              </Text>
            </Label.Root>
          </Flex>
          <SegmentedControl.Root size="1" value={state.type} onValueChange={value => tool.setType(value as RoofType)}>
            <SegmentedControl.Item value="gable">Gable</SegmentedControl.Item>
            <SegmentedControl.Item value="shed">Shed</SegmentedControl.Item>
          </SegmentedControl.Root>

          {/* Slope */}
          <Flex align="center" gap="1">
            <Label.Root htmlFor="roof-slope">
              <Text size="1" weight="medium" color="gray">
                Slope (°)
              </Text>
            </Label.Root>
          </Flex>
          <TextField.Root
            id="roof-slope"
            type="number"
            value={state.slope.toString()}
            onChange={e => {
              const value = parseFloat(e.target.value)
              if (!isNaN(value) && value >= 0 && value <= 90) {
                tool.setSlope(value)
              }
            }}
            size="1"
            style={{ width: '5rem' }}
          />

          {/* Ridge Height */}
          <Flex align="center" gap="1">
            <Label.Root htmlFor="ridge-height">
              <Text size="1" weight="medium" color="gray">
                Ridge Height
              </Text>
            </Label.Root>
          </Flex>
          <LengthField
            id="ridge-height"
            value={state.ridgeHeight}
            onCommit={value => tool.setRidgeHeight(value)}
            min={0}
            max={10000}
            step={10}
            size="1"
            unit="mm"
            style={{ width: '5rem' }}
          />

          {/* Overhang */}
          <Flex align="center" gap="1">
            <Label.Root htmlFor="roof-overhang">
              <Text size="1" weight="medium" color="gray">
                Overhang
              </Text>
            </Label.Root>
          </Flex>
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
        </Grid>

        {/* Help Text */}
        <Separator size="4" />
        <Flex direction="column" gap="2">
          <Text size="1" weight="medium">
            Controls:
          </Text>
          <Text size="1" color="gray">
            • Click to place corner points
          </Text>
          <Text size="1" color="gray">
            • Points snap to perimeter edges and other geometry
          </Text>
          <Text size="1" color="gray">
            • <Kbd>Esc</Kbd> to abort roof
          </Text>
          {state.points.length >= 3 && (
            <>
              <Text size="1" color="gray">
                • <Kbd>Enter</Kbd> to close roof
              </Text>
              <Text size="1" color="gray">
                • Click first point to close
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
                  title="Complete roof (Enter)"
                  style={{ width: '100%' }}
                >
                  <Text size="1">✓ Complete Roof</Text>
                  <Kbd size="1" style={{ marginLeft: 'auto' }}>
                    Enter
                  </Kbd>
                </Button>
              )}
              <Button
                size="2"
                color="red"
                variant="soft"
                onClick={() => tool.cancel()}
                title="Cancel roof creation (Escape)"
                style={{ width: '100%' }}
              >
                <Text size="1">✕ Cancel Roof</Text>
                <Kbd size="1" style={{ marginLeft: 'auto' }}>
                  Esc
                </Kbd>
              </Button>
            </Flex>
          </>
        )}
      </Flex>
    </Box>
  )
}
