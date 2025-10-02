import { InfoCircledIcon, TrashIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import * as Tooltip from '@radix-ui/react-tooltip'
import {
  Box,
  Button,
  Callout,
  DataList,
  Flex,
  Heading,
  SegmentedControl,
  Separator,
  Text,
  TextField
} from '@radix-ui/themes'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type { OpeningId, PerimeterId, PerimeterWallId } from '@/building/model/ids'
import type { OpeningType } from '@/building/model/model'
import { useModelActions, usePerimeterById } from '@/building/store'
import { usePerimeterConstructionMethodById } from '@/construction/config/store'
import { useSelectionStore } from '@/editor/hooks/useSelectionStore'
import { createLength } from '@/shared/geometry'
import { useDebouncedNumericInput } from '@/shared/hooks/useDebouncedInput'

import { DoorIcon, PassageIcon, WindowIcon } from './OpeningIcons'
import { OpeningPreview } from './OpeningPreview'

interface OpeningInspectorProps {
  perimeterId: PerimeterId
  wallId: PerimeterWallId
  openingId: OpeningId
}

export function OpeningInspector({ perimeterId, wallId, openingId }: OpeningInspectorProps): React.JSX.Element {
  // Get model store functions - use specific selectors for stable references
  const select = useSelectionStore()
  const {
    updatePerimeterWallOpening: updateOpening,
    removePerimeterWallOpening: removeOpeningFromOuterWall,
    getStoreyById
  } = useModelActions()

  // Get perimeter from store
  const perimeter = usePerimeterById(perimeterId)

  // Get storey for wall height
  const storey = useMemo(() => {
    return perimeter ? getStoreyById(perimeter.storeyId) : null
  }, [perimeter, getStoreyById])

  // Use useMemo to find wall and opening within the wall object
  const wall = useMemo(() => {
    return perimeter?.walls.find(w => w.id === wallId)
  }, [perimeter, wallId])

  const opening = useMemo(() => {
    return wall?.openings.find(o => o.id === openingId)
  }, [wall, openingId])

  // Get construction method for padding config
  const constructionMethod = usePerimeterConstructionMethodById(wall?.constructionMethodId || ('' as any))

  // Preview state
  const [highlightMode, setHighlightMode] = useState<'fitting' | 'finished'>('fitting')
  const [focusedField, setFocusedField] = useState<'width' | 'height' | 'sillHeight' | undefined>()

  // Dimension input mode - whether user is inputting fitting or finished dimensions
  const [dimensionInputMode, setDimensionInputMode] = useState<'fitting' | 'finished'>('fitting')

  // Sync dimension input mode with highlight mode
  useEffect(() => {
    setHighlightMode(dimensionInputMode)
  }, [dimensionInputMode])

  // Helper functions for dimension conversion
  const getDisplayValue = useCallback(
    (fittingValue: number, type: 'width' | 'height' | 'sillHeight') => {
      if (!constructionMethod) return fittingValue
      const padding = constructionMethod.config.openings.padding

      if (dimensionInputMode === 'fitting') {
        return fittingValue
      } else {
        // Convert to finished dimensions
        if (type === 'sillHeight') {
          // Sill height: finished = fitting + padding (sill sits on padding)
          return fittingValue > 0 ? fittingValue + padding : 0
        } else {
          // Width/Height: finished = fitting - 2×padding
          return Math.max(0, fittingValue - 2 * padding)
        }
      }
    },
    [constructionMethod, dimensionInputMode]
  )

  const convertToFittingValue = useCallback(
    (inputValue: number, type: 'width' | 'height' | 'sillHeight') => {
      if (!constructionMethod) return inputValue
      const padding = constructionMethod.config.openings.padding

      if (dimensionInputMode === 'fitting') {
        return inputValue
      } else {
        // Convert from finished to fitting dimensions
        if (type === 'sillHeight') {
          // Sill height: fitting = finished - padding (remove padding offset)
          return Math.max(0, inputValue - padding)
        } else {
          // Width/Height: fitting = finished + 2×padding
          return inputValue + 2 * padding
        }
      }
    },
    [constructionMethod, dimensionInputMode]
  )

  // Debounced input handlers for numeric values
  const widthInput = useDebouncedNumericInput(
    getDisplayValue(opening?.width || 0, 'width'),
    useCallback(
      (value: number) => {
        const fittingValue = convertToFittingValue(value, 'width')
        updateOpening(perimeterId, wallId, openingId, { width: createLength(fittingValue) })
      },
      [updateOpening, perimeterId, wallId, openingId, convertToFittingValue]
    ),
    {
      debounceMs: 300,
      min: dimensionInputMode === 'fitting' ? 100 : 50, // Allow smaller finished dimensions
      max: 5000,
      step: 10
    }
  )

  const heightInput = useDebouncedNumericInput(
    getDisplayValue(opening?.height || 0, 'height'),
    useCallback(
      (value: number) => {
        const fittingValue = convertToFittingValue(value, 'height')
        updateOpening(perimeterId, wallId, openingId, { height: createLength(fittingValue) })
      },
      [updateOpening, perimeterId, wallId, openingId, convertToFittingValue]
    ),
    {
      debounceMs: 300,
      min: dimensionInputMode === 'fitting' ? 100 : 50, // Allow smaller finished dimensions
      max: 4000,
      step: 10
    }
  )

  const sillHeightInput = useDebouncedNumericInput(
    getDisplayValue(opening?.sillHeight || 0, 'sillHeight'),
    useCallback(
      (value: number) => {
        const fittingValue = convertToFittingValue(value, 'sillHeight')
        updateOpening(perimeterId, wallId, openingId, {
          sillHeight: fittingValue === 0 ? undefined : createLength(fittingValue)
        })
      },
      [updateOpening, perimeterId, wallId, openingId, convertToFittingValue]
    ),
    {
      debounceMs: 300,
      min: 0,
      max: 2000,
      step: 10
    }
  )

  // If opening not found, show error
  if (!opening || !wall || !perimeter || !perimeterId || !wallId) {
    return (
      <Box p="2">
        <Callout.Root color="red">
          <Callout.Text>
            <Text weight="bold">Opening Not Found</Text>
            <br />
            Opening with ID {openingId} could not be found.
          </Callout.Text>
        </Callout.Root>
      </Box>
    )
  }

  // Event handlers with stable references
  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newType = e.target.value as OpeningType
      // Selects can update immediately since they don't have focus issues
      updateOpening(perimeterId, wallId, openingId, { type: newType })
    },
    [updateOpening, perimeterId, wallId, openingId]
  )

  const handleRemoveOpening = useCallback(() => {
    if (confirm('Are you sure you want to remove this opening?')) {
      select.popSelection()
      removeOpeningFromOuterWall(perimeterId, wallId, openingId)
    }
  }, [removeOpeningFromOuterWall, perimeterId, wallId, openingId])

  const area = (opening.width * opening.height) / (1000 * 1000)

  return (
    <Flex direction="column" gap="4">
      {/* Preview */}
      {opening && storey && constructionMethod && (
        <Flex direction="column" align="center">
          <OpeningPreview
            opening={opening}
            wallHeight={storey.height}
            padding={constructionMethod.config.openings.padding}
            highlightMode={highlightMode}
            focusedField={focusedField}
          />
        </Flex>
      )}

      {/* Basic Properties */}
      <Flex direction="column" gap="3">
        <Flex align="center" justify="between" gap="2">
          <Text size="1" weight="medium" color="gray">
            Type
          </Text>
          <SegmentedControl.Root
            value={opening.type}
            onValueChange={(value: OpeningType) =>
              handleTypeChange({ target: { value } } as React.ChangeEvent<HTMLSelectElement>)
            }
            size="1"
          >
            <SegmentedControl.Item value="door">
              <DoorIcon width={16} height={16} />
            </SegmentedControl.Item>
            <SegmentedControl.Item value="window">
              <WindowIcon width={16} height={16} />
            </SegmentedControl.Item>
            <SegmentedControl.Item value="passage">
              <PassageIcon width={16} height={16} />
            </SegmentedControl.Item>
          </SegmentedControl.Root>
        </Flex>

        {/* Dimension Input Mode Toggle - Compact Layout */}
        <Flex align="center" justify="between" gap="2">
          <Flex align="center" gap="1">
            <Text size="1" weight="medium" color="gray">
              Dimension Mode
            </Text>
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <InfoCircledIcon width={12} height={12} style={{ color: 'var(--gray-9)' }} />
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content className="bg-gray-900 text-white text-xs px-2 py-1 rounded max-w-48">
                    {dimensionInputMode === 'fitting'
                      ? 'Raw opening size (what gets cut)'
                      : 'Actual door/window size (with padding)'}
                    <Tooltip.Arrow className="fill-gray-900" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          </Flex>
          <SegmentedControl.Root
            value={dimensionInputMode}
            onValueChange={(value: 'fitting' | 'finished') => setDimensionInputMode(value)}
            size="1"
          >
            <SegmentedControl.Item value="fitting">Fitting</SegmentedControl.Item>
            <SegmentedControl.Item value="finished">Finished</SegmentedControl.Item>
          </SegmentedControl.Root>
        </Flex>

        <Flex align="center" justify="between" gap="3">
          <Label.Root htmlFor="opening-width">
            <Text size="1" weight="medium" color="gray">
              Width
            </Text>
          </Label.Root>
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
            style={{ width: '5rem', textAlign: 'right' }}
          >
            <TextField.Slot side="right" pl="1">
              mm
            </TextField.Slot>
          </TextField.Root>
        </Flex>

        <Flex align="center" justify="between" gap="3">
          <Label.Root htmlFor="opening-height">
            <Text size="1" weight="medium" color="gray">
              Height
            </Text>
          </Label.Root>
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
            style={{ width: '5rem', textAlign: 'right' }}
          >
            <TextField.Slot side="right" pl="1">
              mm
            </TextField.Slot>
          </TextField.Root>
        </Flex>

        <Flex direction="column" gap="1">
          <Flex align="center" justify="between" gap="3">
            <Label.Root htmlFor="opening-sill-height">
              <Text size="1" weight="medium" color="gray">
                Sill Height
              </Text>
            </Label.Root>
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
              style={{ width: '5rem', textAlign: 'right' }}
            >
              <TextField.Slot side="right" pl="1">
                mm
              </TextField.Slot>
            </TextField.Root>
          </Flex>
        </Flex>
      </Flex>

      <Separator size="4" />

      {/* Measurements */}
      <Flex direction="column" gap="2">
        <Heading size="2">Measurements</Heading>
        <DataList.Root size="1">
          <DataList.Item>
            <DataList.Label>Area</DataList.Label>
            <DataList.Value>{area.toFixed(2)} m²</DataList.Value>
          </DataList.Item>
        </DataList.Root>
      </Flex>

      <Separator size="4" />

      {/* Actions */}
      <Flex direction="column" gap="2">
        <Button color="red" size="1" onClick={handleRemoveOpening}>
          <TrashIcon />
          Remove Opening
        </Button>
      </Flex>
    </Flex>
  )
}
