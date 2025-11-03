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

import type { RingBeamAssemblyId, WallAssemblyId } from '@/building/model/ids'
import type { PerimeterReferenceSide } from '@/building/model/model'
import { RingBeamAssemblySelectWithEdit } from '@/construction/config/components/RingBeamAssemblySelectWithEdit'
import { WallAssemblySelectWithEdit } from '@/construction/config/components/WallAssemblySelectWithEdit'
import { MeasurementInfo } from '@/editor/components/MeasurementInfo'
import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolInspectorProps } from '@/editor/tools/system/types'
import { LengthField } from '@/shared/components/LengthField'
import { formatLength } from '@/shared/utils/formatting'

import type { PerimeterTool } from './PerimeterTool'

export function PerimeterToolInspector({ tool }: ToolInspectorProps<PerimeterTool>): React.JSX.Element {
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
              Draw the <Text weight="bold">{state.referenceSide === 'inside' ? 'inside edge' : 'outside edge'}</Text> of
              your building perimeter. Click to place points, and close the shape by clicking the first point or
              pressing Enter.
            </Text>
          </Callout.Text>
        </Callout.Root>

        {/* Tool Properties */}
        <Grid columns="auto 1fr" gap="2">
          {/* Wall Assembly */}
          <Flex align="center" gap="1">
            <Label.Root>
              <Text size="1" weight="medium" color="gray">
                Wall Assembly
              </Text>
            </Label.Root>
            <MeasurementInfo highlightedAssembly="wallAssembly" />
          </Flex>
          <WallAssemblySelectWithEdit
            value={state.wallAssemblyId ?? undefined}
            onValueChange={(value: WallAssemblyId) => {
              tool.setAssembly(value)
            }}
            size="1"
          />

          {/* Wall Thickness */}
          <Flex align="center" gap="1">
            <Label.Root htmlFor="wall-thickness">
              <Text size="1" weight="medium" color="gray">
                Wall Thickness
              </Text>
            </Label.Root>
            <MeasurementInfo highlightedMeasurement="totalWallThickness" showFinishedSides />
          </Flex>
          <LengthField
            id="wall-thickness"
            value={state.wallThickness}
            onCommit={value => tool.setWallThickness(value)}
            min={50}
            max={1000}
            step={10}
            size="1"
            unit="mm"
          />

          <Flex align="center" gap="1">
            <Label.Root>
              <Text size="1" weight="medium" color="gray">
                Reference Side
              </Text>
            </Label.Root>
          </Flex>
          <SegmentedControl.Root
            size="1"
            value={state.referenceSide}
            onValueChange={value => tool.setReferenceSide(value as PerimeterReferenceSide)}
          >
            <SegmentedControl.Item value="inside">Inside</SegmentedControl.Item>
            <SegmentedControl.Item value="outside">Outside</SegmentedControl.Item>
          </SegmentedControl.Root>

          {/* Base Ring Beam */}
          <Flex align="center" gap="1">
            <Label.Root>
              <Text size="1" weight="medium" color="gray">
                Base Plate
              </Text>
            </Label.Root>
            <MeasurementInfo highlightedPart="basePlate" />
          </Flex>
          <RingBeamAssemblySelectWithEdit
            value={state.baseRingBeamAssemblyId ?? undefined}
            onValueChange={(value: RingBeamAssemblyId | undefined) => {
              tool.setBaseRingBeam(value)
            }}
            placeholder="None"
            size="1"
            allowNone
          />

          {/* Top Ring Beam */}
          <Flex align="center" gap="1">
            <Label.Root>
              <Text size="1" weight="medium" color="gray">
                Top Plate
              </Text>
            </Label.Root>
            <MeasurementInfo highlightedPart="topPlate" />
          </Flex>
          <RingBeamAssemblySelectWithEdit
            value={state.topRingBeamAssemblyId ?? undefined}
            onValueChange={(value: RingBeamAssemblyId | undefined) => {
              tool.setTopRingBeam(value)
            }}
            placeholder="None"
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
                Length Override
              </Text>
              <Flex align="center" gap="2">
                <Code size="1" color="blue">
                  {formatLength(state.lengthOverride)}
                </Code>
                <IconButton
                  size="1"
                  variant="ghost"
                  color="red"
                  onClick={() => tool.clearLengthOverride()}
                  title="Clear length override (Escape)"
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
            Controls:
          </Text>
          <Text size="1" color="gray">
            • Click to place corner points
          </Text>
          <Text size="1" color="gray">
            • Points snap to grid and existing geometry
          </Text>
          <Text size="1" color="gray">
            • Type numbers to set exact wall length
          </Text>
          {state.lengthOverride ? (
            <Text size="1" color="gray">
              • <Kbd>Esc</Kbd> to clear override
            </Text>
          ) : (
            <Text size="1" color="gray">
              • <Kbd>Esc</Kbd> to abort perimeter
            </Text>
          )}
          {state.points.length >= 3 && (
            <>
              <Text size="1" color="gray">
                • <Kbd>Enter</Kbd> to close perimeter
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
                  title="Complete perimeter (Enter)"
                  style={{ width: '100%' }}
                >
                  <Text size="1">✓ Complete Perimeter</Text>
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
                title="Cancel perimeter creation (Escape)"
                style={{ width: '100%' }}
              >
                <Text size="1">✕ Cancel Perimeter</Text>
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
