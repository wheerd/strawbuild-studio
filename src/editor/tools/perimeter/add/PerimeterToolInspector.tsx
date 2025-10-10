import { Cross2Icon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import { Box, Button, Code, Flex, Grid, IconButton, Kbd, Separator, Text } from '@radix-ui/themes'
import { useEffect, useState } from 'react'

import type { PerimeterConstructionMethodId, RingBeamConstructionMethodId } from '@/building/model/ids'
import { PerimeterMethodSelect } from '@/construction/config/components/PerimeterMethodSelect'
import { RingBeamMethodSelect } from '@/construction/config/components/RingBeamMethodSelect'
import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolInspectorProps } from '@/editor/tools/system/types'
import { LengthField } from '@/shared/components/LengthField'
import type { Length } from '@/shared/geometry'
import { formatLength } from '@/shared/utils/formatLength'

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
        {/* Tool Properties */}
        <Grid columns="auto 1fr" gap="2">
          {/* Construction Method */}
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              Construction Method
            </Text>
          </Label.Root>
          <PerimeterMethodSelect
            value={state.constructionMethodId ?? undefined}
            onValueChange={(value: PerimeterConstructionMethodId) => {
              tool.setConstructionMethod(value)
            }}
            size="1"
          />

          {/* Wall Thickness */}
          <Label.Root htmlFor="wall-thickness">
            <Text size="1" weight="medium" color="gray">
              Wall Thickness
            </Text>
          </Label.Root>
          <LengthField
            id="wall-thickness"
            value={state.wallThickness}
            onCommit={value => tool.setWallThickness(value)}
            min={50 as Length}
            max={1000 as Length}
            step={10 as Length}
            size="1"
            unit="mm"
          />

          {/* Base Ring Beam */}
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              Base Plate
            </Text>
          </Label.Root>
          <RingBeamMethodSelect
            value={state.baseRingBeamMethodId ?? undefined}
            onValueChange={(value: RingBeamConstructionMethodId | undefined) => {
              tool.setBaseRingBeam(value)
            }}
            placeholder="None"
            size="1"
            allowNone
          />

          {/* Top Ring Beam */}
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              Top Plate
            </Text>
          </Label.Root>
          <RingBeamMethodSelect
            value={state.topRingBeamMethodId ?? undefined}
            onValueChange={(value: RingBeamConstructionMethodId | undefined) => {
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
            • Click to place points
          </Text>
          <Text size="1" color="gray">
            • Type numbers for length override
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
                  disabled={!state.isClosingLineValid}
                  title="Complete polygon (Enter)"
                  style={{ width: '100%' }}
                >
                  <Text size="1">✓ Complete Polygon</Text>
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
                title="Cancel polygon creation (Escape)"
                style={{ width: '100%' }}
              >
                <Text size="1">✕ Cancel Polygon</Text>
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
