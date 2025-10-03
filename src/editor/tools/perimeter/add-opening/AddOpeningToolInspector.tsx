import * as Label from '@radix-ui/react-label'
import { Box, Flex, Grid, IconButton, SegmentedControl, Separator, Text, TextField, Tooltip } from '@radix-ui/themes'
import { useCallback, useMemo, useState } from 'react'

import type { OpeningType } from '@/building/model/model'
import { useActiveStoreyId, useModelActions } from '@/building/store'
import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolInspectorProps } from '@/editor/tools/system/types'
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
import { useDebouncedNumericInput } from '@/shared/hooks/useDebouncedInput'
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

  // Debounced input handlers for numeric values
  const widthInput = useDebouncedNumericInput(
    state.width,
    useCallback(
      (value: number) => {
        tool.setWidth(createLength(value))
      },
      [tool]
    ),
    {
      debounceMs: 300,
      min: 100,
      max: 5000,
      step: 10
    }
  )

  const heightInput = useDebouncedNumericInput(
    state.height,
    useCallback(
      (value: number) => {
        tool.setHeight(createLength(value))
      },
      [tool]
    ),
    {
      debounceMs: 300,
      min: 100,
      max: 4000,
      step: 10
    }
  )

  const sillHeightInput = useDebouncedNumericInput(
    state.sillHeight || 0,
    useCallback(
      (value: number) => {
        const sillHeight = value === 0 ? undefined : createLength(value)
        tool.setSillHeight(sillHeight)
      },
      [tool]
    ),
    {
      debounceMs: 300,
      min: 0,
      max: 2000,
      step: 10
    }
  )

  // Top height input - floor to top measurement
  const currentTopHeight = (state.sillHeight || 0) + state.height
  const topHeightInput = useDebouncedNumericInput(
    currentTopHeight,
    useCallback(
      (value: number) => {
        const newHeight = value - (state.sillHeight || 0)
        tool.setHeight(createLength(Math.max(100, newHeight)))
      },
      [tool, state.sillHeight]
    ),
    {
      debounceMs: 300,
      min: Math.max(state.sillHeight || 0, 100),
      max: 5000,
      step: 10
    }
  )

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
        <TextField.Root
          id="opening-width"
          type="number"
          value={widthInput.value.toString()}
          onChange={e => widthInput.handleChange(e.target.value)}
          onBlur={() => {
            widthInput.handleBlur()
            setFocusedField(undefined)
          }}
          onFocus={() => setFocusedField('width')}
          onKeyDown={widthInput.handleKeyDown}
          min="100"
          max="5000"
          step="10"
          size="1"
          style={{ textAlign: 'right', width: '80px' }}
        >
          <TextField.Slot side="right" pl="1">
            mm
          </TextField.Slot>
        </TextField.Root>

        {/* Row 1, Column 3: Height Label */}
        <Label.Root htmlFor="opening-height">
          <Text size="1" weight="medium" color="gray">
            Height
          </Text>
        </Label.Root>

        {/* Row 1, Column 4: Height Input */}
        <TextField.Root
          id="opening-height"
          type="number"
          value={heightInput.value.toString()}
          onChange={e => heightInput.handleChange(e.target.value)}
          onBlur={() => {
            heightInput.handleBlur()
            setFocusedField(undefined)
          }}
          onFocus={() => setFocusedField('height')}
          onKeyDown={heightInput.handleKeyDown}
          min="100"
          max="4000"
          step="10"
          size="1"
          style={{ textAlign: 'right', width: '80px' }}
        >
          <TextField.Slot side="right" pl="1">
            mm
          </TextField.Slot>
        </TextField.Root>

        {/* Row 2, Column 1: Sill Height Label */}
        <Label.Root htmlFor="opening-sill-height">
          <Text size="1" weight="medium" color="gray">
            Sill
          </Text>
        </Label.Root>

        {/* Row 2, Column 2: Sill Height Input */}
        <TextField.Root
          id="opening-sill-height"
          type="number"
          value={sillHeightInput.value.toString()}
          onChange={e => sillHeightInput.handleChange(e.target.value)}
          onBlur={() => {
            sillHeightInput.handleBlur()
            setFocusedField(undefined)
          }}
          onFocus={() => setFocusedField('sillHeight')}
          onKeyDown={sillHeightInput.handleKeyDown}
          min="0"
          max="2000"
          step="10"
          size="1"
          style={{ textAlign: 'right', width: '80px' }}
        >
          <TextField.Slot side="right" pl="1">
            mm
          </TextField.Slot>
        </TextField.Root>

        {/* Row 2, Column 3: Top Height Label */}
        <Label.Root htmlFor="opening-top-height">
          <Text size="1" weight="medium" color="gray">
            Top
          </Text>
        </Label.Root>

        {/* Row 2, Column 4: Top Height Input */}
        <TextField.Root
          id="opening-top-height"
          type="number"
          value={topHeightInput.value.toString()}
          onChange={e => topHeightInput.handleChange(e.target.value)}
          onBlur={() => {
            topHeightInput.handleBlur()
            setFocusedField(undefined)
          }}
          onFocus={() => setFocusedField('topHeight')}
          onKeyDown={topHeightInput.handleKeyDown}
          min={Math.max(state.sillHeight || 0, 100)}
          max="5000"
          step="10"
          size="1"
          style={{ textAlign: 'right', width: '80px' }}
        >
          <TextField.Slot side="right" pl="1">
            mm
          </TextField.Slot>
        </TextField.Root>
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
