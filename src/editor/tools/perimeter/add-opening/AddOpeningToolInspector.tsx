import * as Label from '@radix-ui/react-label'
import { Box, Flex, Grid, IconButton, SegmentedControl, Separator, Text, Tooltip } from '@radix-ui/themes'
import { useCallback, useMemo, useState } from 'react'

import type { OpeningType } from '@/building/model/model'
import { useActiveStoreyId, useModelActions } from '@/building/store'
import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolInspectorProps } from '@/editor/tools/system/types'
import { LengthField } from '@/shared/components/LengthField'
import {
  DoorIcon,
  DoubleDoorPresetIcon,
  FloorWindowPresetIcon,
  PassageIcon,
  SmallWindowPresetIcon,
  StandardDoorPresetIcon,
  StandardWindowPresetIcon,
  WideDoorPresetIcon,
  WindowIcon
} from '@/shared/components/OpeningIcons'
import { type Length, createLength } from '@/shared/geometry'
import { formatLength } from '@/shared/utils/formatLength'

import type { AddOpeningTool } from './AddOpeningTool'
import { OpeningPreviewSimple } from './OpeningPreviewSimple'

export function AddOpeningToolInspector({ tool }: ToolInspectorProps<AddOpeningTool>): React.JSX.Element {
  return <AddOpeningToolInspectorImpl tool={tool} />
}

interface AddOpeningToolInspectorImplProps {
  tool: AddOpeningTool
}

// Quick preset buttons for common sizes
interface PresetConfig {
  label: string
  type: OpeningType
  width: Length
  height: Length
  sillHeight?: Length
  icon: React.JSX.Element
}

// All presets available for all opening types
const ALL_OPENING_PRESETS: PresetConfig[] = [
  {
    label: 'Standard Door',
    type: 'door',
    width: createLength(800),
    height: createLength(2100),
    icon: <StandardDoorPresetIcon width={20} height={20} />
  },
  {
    label: 'Wide Door',
    type: 'door',
    width: createLength(900),
    height: createLength(2100),
    icon: <WideDoorPresetIcon width={20} height={20} />
  },
  {
    label: 'Double Door',
    type: 'door',
    width: createLength(1600),
    height: createLength(2100),
    icon: <DoubleDoorPresetIcon width={20} height={20} />
  },
  {
    label: 'Small Window',
    type: 'window',
    width: createLength(800),
    height: createLength(1200),
    sillHeight: createLength(800),
    icon: <SmallWindowPresetIcon width={20} height={20} />
  },
  {
    label: 'Standard Window',
    type: 'window',
    width: createLength(1200),
    height: createLength(1200),
    sillHeight: createLength(800),
    icon: <StandardWindowPresetIcon width={20} height={20} />
  },
  {
    label: 'Floor Window',
    type: 'window',
    width: createLength(1200),
    height: createLength(2000),
    sillHeight: createLength(100),
    icon: <FloorWindowPresetIcon width={20} height={20} />
  }
]

function AddOpeningToolInspectorImpl({ tool }: AddOpeningToolInspectorImplProps): React.JSX.Element {
  const { state } = useReactiveTool(tool)
  const [focusedField, setFocusedField] = useState<'width' | 'height' | 'sillHeight' | 'topHeight' | undefined>()

  // Get active storey for wall height
  const activeStoreyId = useActiveStoreyId()
  const { getStoreyById } = useModelActions()
  const activeStorey = useMemo(() => {
    return getStoreyById(activeStoreyId)
  }, [getStoreyById, activeStoreyId])

  // Event handlers with stable references
  const handleTypeChange = useCallback(
    (newType: OpeningType) => {
      tool.setOpeningType(newType)
    },
    [tool]
  )

  const handlePresetClick = useCallback(
    (preset: PresetConfig) => {
      tool.setOpeningType(preset.type)
      tool.setWidth(preset.width)
      tool.setHeight(preset.height)
      if (preset.sillHeight !== undefined) {
        tool.setSillHeight(preset.sillHeight)
      } else {
        tool.setSillHeight(undefined)
      }
    },
    [tool]
  )

  return (
    <Flex direction="column" gap="4">
      {/* Preview */}
      <Flex direction="column" align="center">
        <OpeningPreviewSimple
          opening={{
            type: state.openingType,
            width: state.width,
            height: state.height,
            sillHeight: state.sillHeight
          }}
          wallHeight={activeStorey?.height || createLength(2500)} // Fallback height
          focusedField={focusedField}
        />
      </Flex>

      {/* Type Selection */}
      <Flex align="center" justify="between" gap="2">
        <Text size="1" weight="medium" color="gray">
          Type
        </Text>
        <SegmentedControl.Root value={state.openingType} onValueChange={handleTypeChange} size="2">
          <SegmentedControl.Item value="door">
            <Tooltip content="Door">
              <Box>
                <DoorIcon width={20} height={20} />
              </Box>
            </Tooltip>
          </SegmentedControl.Item>

          <SegmentedControl.Item value="window">
            <Tooltip content="Window">
              <Box>
                <WindowIcon width={20} height={20} />
              </Box>
            </Tooltip>
          </SegmentedControl.Item>

          <SegmentedControl.Item value="passage">
            <Tooltip content="Passage">
              <Box>
                <PassageIcon width={20} height={20} />
              </Box>
            </Tooltip>
          </SegmentedControl.Item>
        </SegmentedControl.Root>
      </Flex>

      {/* Dimension inputs in Radix Grid layout */}
      <Grid columns="auto min-content auto min-content" rows="2" gap="2" gapX="3" align="center">
        {/* Row 1, Column 1: Width Label */}
        <Label.Root htmlFor="opening-width">
          <Text size="1" weight="medium" color="gray">
            Width
          </Text>
        </Label.Root>

        {/* Row 1, Column 2: Width Input */}
        <LengthField
          value={state.width}
          onCommit={value => tool.setWidth(value)}
          unit="cm"
          min={createLength(100)}
          max={createLength(5000)}
          step={createLength(100)}
          size="1"
          style={{ width: '80px' }}
          onFocus={() => setFocusedField('width')}
          onBlur={() => setFocusedField(undefined)}
        />

        {/* Row 1, Column 3: Height Label */}
        <Label.Root htmlFor="opening-height">
          <Text size="1" weight="medium" color="gray">
            Height
          </Text>
        </Label.Root>

        {/* Row 1, Column 4: Height Input */}
        <LengthField
          value={state.height}
          onCommit={value => tool.setHeight(value)}
          unit="cm"
          min={createLength(100)}
          max={createLength(4000)}
          step={createLength(100)}
          size="1"
          style={{ width: '80px' }}
          onFocus={() => setFocusedField('height')}
          onBlur={() => setFocusedField(undefined)}
        />

        {/* Row 2, Column 1: Sill Height Label */}
        <Label.Root htmlFor="opening-sill-height">
          <Text size="1" weight="medium" color="gray">
            Sill
          </Text>
        </Label.Root>

        {/* Row 2, Column 2: Sill Height Input */}
        <LengthField
          value={(state.sillHeight ?? 0) as Length}
          onCommit={value => tool.setSillHeight(value)}
          unit="cm"
          min={createLength(0)}
          max={createLength(2000)}
          step={createLength(100)}
          size="1"
          style={{ width: '80px' }}
          onFocus={() => setFocusedField('sillHeight')}
          onBlur={() => setFocusedField(undefined)}
        />

        {/* Row 2, Column 3: Top Height Label */}
        <Label.Root htmlFor="opening-top-height">
          <Text size="1" weight="medium" color="gray">
            Top
          </Text>
        </Label.Root>

        {/* Row 2, Column 4: Top Height Input */}
        <LengthField
          value={((state.sillHeight ?? 0) + state.height) as Length}
          onCommit={value => tool.setHeight((value - (state.sillHeight ?? 0)) as Length)}
          unit="cm"
          min={((state.sillHeight ?? 0) + 100) as Length}
          max={createLength(5000)}
          step={createLength(100)}
          size="1"
          style={{ width: '80px' }}
          onFocus={() => setFocusedField('topHeight')}
          onBlur={() => setFocusedField(undefined)}
        />
      </Grid>

      <Separator size="4" />

      {/* Presets Section */}
      <Flex direction="column" gap="2">
        <Text size="1" weight="medium" color="gray">
          Presets
        </Text>
        <Grid columns="6" gap="1">
          {ALL_OPENING_PRESETS.map((preset: PresetConfig, index: number) => (
            <IconButton
              key={index}
              variant="surface"
              size="3"
              onClick={() => handlePresetClick(preset)}
              title={`${preset.label}: ${formatLength(preset.width)} × ${formatLength(preset.height)}${preset.sillHeight ? `, sill: ${formatLength(preset.sillHeight)}` : ''}`}
            >
              {preset.icon}
            </IconButton>
          ))}
        </Grid>
      </Flex>
    </Flex>
  )
}
