import { CopyIcon, InfoCircledIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import {
  Box,
  Callout,
  DropdownMenu,
  Flex,
  Grid,
  IconButton,
  SegmentedControl,
  Separator,
  Text,
  Tooltip
} from '@radix-ui/themes'
import { useCallback, useMemo, useState } from 'react'

import { OpeningPreview } from '@/building/components/inspectors/OpeningPreview'
import type { OpeningAssemblyId } from '@/building/model'
import type { OpeningType } from '@/building/model/model'
import { useActiveStoreyId, useModelActions, usePerimeters } from '@/building/store'
import { OpeningAssemblySelectWithEdit } from '@/construction/config/components/OpeningAssemblySelectWithEdit'
import { useDefaultOpeningAssemblyId, useOpeningAssemblyById } from '@/construction/config/store'
import { createWallStoreyContext } from '@/construction/storeys/context'
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
import { type Length } from '@/shared/geometry'
import { formatLength } from '@/shared/utils/formatting'

import type { AddOpeningTool } from './AddOpeningTool'

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
    width: 800,
    height: 2100,
    icon: <StandardDoorPresetIcon width={20} height={20} />
  },
  {
    label: 'Wide Door',
    type: 'door',
    width: 900,
    height: 2100,
    icon: <WideDoorPresetIcon width={20} height={20} />
  },
  {
    label: 'Double Door',
    type: 'door',
    width: 1600,
    height: 2100,
    icon: <DoubleDoorPresetIcon width={20} height={20} />
  },
  {
    label: 'Small Window',
    type: 'window',
    width: 800,
    height: 1200,
    sillHeight: 800,
    icon: <SmallWindowPresetIcon width={20} height={20} />
  },
  {
    label: 'Standard Window',
    type: 'window',
    width: 1200,
    height: 1200,
    sillHeight: 800,
    icon: <StandardWindowPresetIcon width={20} height={20} />
  },
  {
    label: 'Floor Window',
    type: 'window',
    width: 1200,
    height: 2000,
    sillHeight: 100,
    icon: <FloorWindowPresetIcon width={20} height={20} />
  }
]

interface ExistingConfig {
  label: string
  type: OpeningType
  width: Length // Finished clear width
  height: Length // Finished clear height
  sillHeight?: Length // Finished floor-to-sill height for windows
  assemblyId?: OpeningAssemblyId // Optional override for this specific opening
}

function AddOpeningToolInspectorImpl({ tool }: AddOpeningToolInspectorImplProps): React.JSX.Element {
  const { state } = useReactiveTool(tool)
  const [focusedField, setFocusedField] = useState<'width' | 'height' | 'sillHeight' | 'topHeight' | undefined>()

  // Get active storey for wall height
  const activeStoreyId = useActiveStoreyId()
  const { getStoreyById } = useModelActions()
  const activeStorey = useMemo(() => {
    return getStoreyById(activeStoreyId)
  }, [getStoreyById, activeStoreyId])

  const wallHeight = useMemo(() => {
    if (!activeStorey) return 2500
    const context = createWallStoreyContext(activeStorey.id, [])
    return context.finishedCeilingBottom - context.finishedFloorTop
  }, [activeStorey])

  // Opening assembly hooks
  const defaultOpeningAssemblyId = useDefaultOpeningAssemblyId()
  const currentAssemblyId = state.openingAssemblyId ?? defaultOpeningAssemblyId
  const currentAssembly = useOpeningAssemblyById(currentAssemblyId)

  // Get padding for current tool configuration
  const currentPadding = useMemo(() => {
    return currentAssembly?.padding ?? 15 // Default to 15mm if no assembly found
  }, [currentAssembly])

  // Conversion helper functions (UI layer responsibility)
  const getDisplayValue = useCallback(
    (value: number, type: 'width' | 'height' | 'sillHeight'): number => {
      if (state.dimensionMode === 'fitting') {
        return value
      }

      if (type === 'sillHeight') {
        return value + currentPadding
      }

      return Math.max(10, value - 2 * currentPadding)
    },
    [state.dimensionMode, currentPadding]
  )

  const convertInputToFitting = useCallback(
    (inputValue: number, type: 'width' | 'height' | 'sillHeight'): number => {
      if (state.dimensionMode === 'fitting') {
        return inputValue
      }

      if (type === 'sillHeight') {
        return inputValue - currentPadding
      }

      return inputValue + 2 * currentPadding
    },
    [state.dimensionMode, currentPadding]
  )

  const allPerimeters = usePerimeters()
  const allOpeningConfigs = useMemo(() => {
    const existingConfigs: Record<string, ExistingConfig> = {}
    for (const perimeter of allPerimeters) {
      for (const wall of perimeter.walls) {
        for (const opening of wall.openings) {
          const key = `${opening.openingAssemblyId}:${opening.type}:${opening.width}:${opening.height}:${opening.sillHeight}`
          if (!(key in existingConfigs)) {
            const label = `${formatLength(opening.width)} x ${formatLength(opening.height)}${opening.sillHeight ? ` SH ${formatLength(opening.sillHeight)}` : ''}`
            existingConfigs[key] = {
              label,
              assemblyId: opening.openingAssemblyId,
              type: opening.type,
              width: opening.width,
              height: opening.height,
              sillHeight: opening.sillHeight
            }
          }
        }
      }
    }
    return Object.values(existingConfigs).sort((a, b) => a.label.localeCompare(b.label))
  }, [allPerimeters])

  // Event handlers with stable references
  const handleTypeChange = useCallback(
    (newType: OpeningType) => {
      tool.setOpeningType(newType)
    },
    [tool]
  )

  const handlePresetOrCopyClick = useCallback(
    (preset: PresetConfig | ExistingConfig) => {
      tool.setOpeningType(preset.type)
      tool.setWidth(preset.width) // Presets are in finished dimensions
      tool.setHeight(preset.height)
      if (preset.sillHeight !== undefined) {
        tool.setSillHeight(preset.sillHeight)
      } else {
        tool.setSillHeight(undefined)
      }
      // If copying from existing opening, also copy its assembly override
      if ('assemblyId' in preset) {
        tool.setOpeningAssemblyId(preset.assemblyId)
      }
    },
    [tool]
  )

  const handleDimensionModeChange = useCallback(
    (mode: 'fitting' | 'finished') => {
      tool.setDimensionMode(mode)
    },
    [tool]
  )

  const handleAssemblyChange = useCallback(
    (assemblyId: OpeningAssemblyId | undefined) => {
      tool.setOpeningAssemblyId(assemblyId)
    },
    [tool]
  )

  return (
    <Flex direction="column" gap="4">
      {/* Informational Note */}
      <Callout.Root color="blue">
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>
          <Text size="1">
            Click on a wall to place an opening. Configure dimensions and type before placement. Use presets for common
            sizes.
          </Text>
        </Callout.Text>
      </Callout.Root>

      {/* Dimension Mode Toggle */}
      <Flex align="center" justify="between" gap="2">
        <Flex gap="1" align="center">
          <Text size="1" weight="medium" color="gray">
            Dimension Mode
          </Text>
          <Tooltip content="Fitting dimensions are the rough opening size. Finished dimensions are the actual door/window size after padding.">
            <InfoCircledIcon cursor="help" width={12} height={12} style={{ color: 'var(--gray-9)' }} />
          </Tooltip>
        </Flex>
        <SegmentedControl.Root value={state.dimensionMode} onValueChange={handleDimensionModeChange} size="1">
          <SegmentedControl.Item value="finished">Finished</SegmentedControl.Item>
          <SegmentedControl.Item value="fitting">Fitting</SegmentedControl.Item>
        </SegmentedControl.Root>
      </Flex>

      {/* Preview */}
      <Flex direction="column" align="center">
        <OpeningPreview
          opening={{
            type: state.openingType,
            width: state.width,
            height: state.height,
            sillHeight: state.sillHeight
          }}
          wallHeight={wallHeight}
          padding={currentPadding}
          highlightMode={state.dimensionMode}
          focusedField={focusedField}
        />
      </Flex>

      {/* Type Selection */}
      <Flex align="center" justify="between" gap="2">
        <Flex gap="1" align="center">
          <Text size="1" weight="medium" color="gray">
            Type
          </Text>
          <Tooltip content="Opening types don't influence the construction yet but are rendered differently.">
            <InfoCircledIcon cursor="help" width={12} height={12} style={{ color: 'var(--gray-9)' }} />
          </Tooltip>
        </Flex>
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

      <Flex align="center" gap="2">
        <Text size="1" weight="medium" color="gray">
          Padding
        </Text>
        <Text size="1" color="gray">
          {formatLength(currentPadding)}
        </Text>
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
          value={getDisplayValue(state.width, 'width')}
          onCommit={value => tool.setWidth(convertInputToFitting(value, 'width'))}
          unit="cm"
          min={100}
          max={5000}
          step={100}
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
          value={getDisplayValue(state.height, 'height')}
          onCommit={value => tool.setHeight(convertInputToFitting(value, 'height'))}
          unit="cm"
          min={100}
          max={4000}
          step={100}
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
          value={getDisplayValue(state.sillHeight ?? 0, 'sillHeight')}
          onCommit={value => tool.setSillHeight(convertInputToFitting(value, 'sillHeight'))}
          unit="cm"
          min={0}
          max={2000}
          step={100}
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
          value={getDisplayValue(state.sillHeight ?? 0, 'sillHeight') + getDisplayValue(state.height, 'height')}
          onCommit={value =>
            tool.setHeight(
              convertInputToFitting(value - getDisplayValue(state.sillHeight ?? 0, 'sillHeight'), 'height')
            )
          }
          unit="cm"
          min={getDisplayValue(state.sillHeight ?? 0, 'sillHeight') + 100}
          max={5000}
          step={100}
          size="1"
          style={{ width: '80px' }}
          onFocus={() => setFocusedField('topHeight')}
          onBlur={() => setFocusedField(undefined)}
        />
      </Grid>

      <Flex align="center" justify="end" gap="2">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger disabled={allOpeningConfigs.length === 0}>
            <IconButton size="2" title="Copy existing">
              <CopyIcon />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            {allOpeningConfigs.map((config, index) => (
              <DropdownMenu.Item key={index} onClick={() => handlePresetOrCopyClick(config)}>
                <Flex align="center" gap="2">
                  {(config.type === 'window' ? WindowIcon : config.type === 'door' ? DoorIcon : PassageIcon)({})}
                  <Text>{config.label}</Text>
                </Flex>
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </Flex>

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
              onClick={() => handlePresetOrCopyClick(preset)}
              title={`${preset.label}: ${formatLength(preset.width)} × ${formatLength(preset.height)}${preset.sillHeight ? `, sill: ${formatLength(preset.sillHeight)}` : ''}`}
            >
              {preset.icon}
            </IconButton>
          ))}
        </Grid>
      </Flex>

      <Separator size="4" />

      {/* Opening Assembly Selector */}
      <Flex direction="column" gap="1">
        <Flex gap="1" align="center">
          <Text size="1" weight="medium" color="gray">
            Opening Assembly
          </Text>
          <Tooltip content="Determines the padding and framing around openings.">
            <InfoCircledIcon cursor="help" width={12} height={12} style={{ color: 'var(--gray-9)' }} />
          </Tooltip>
        </Flex>
        <OpeningAssemblySelectWithEdit
          value={state.openingAssemblyId}
          onValueChange={handleAssemblyChange}
          allowDefault
          showDefaultIndicator
          size="2"
        />
      </Flex>
    </Flex>
  )
}
