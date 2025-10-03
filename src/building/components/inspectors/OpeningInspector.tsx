import { InfoCircledIcon, TrashIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import {
  Box,
  Button,
  Callout,
  Flex,
  Grid,
  SegmentedControl,
  Separator,
  Text,
  TextField,
  Tooltip
} from '@radix-ui/themes'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type { OpeningId, PerimeterId, PerimeterWallId } from '@/building/model/ids'
import type { OpeningType } from '@/building/model/model'
import { useModelActions, usePerimeterById } from '@/building/store'
import { usePerimeterConstructionMethodById } from '@/construction/config/store'
import { useSelectionStore } from '@/editor/hooks/useSelectionStore'
import { DoorIcon, PassageIcon, WindowIcon } from '@/shared/components/OpeningIcons'
import { createLength } from '@/shared/geometry'
import { useDebouncedNumericInput } from '@/shared/hooks/useDebouncedInput'
import { formatLength } from '@/shared/utils/formatLength'

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
  const constructionMethod = wall?.constructionMethodId && usePerimeterConstructionMethodById(wall.constructionMethodId)

  // Preview state
  const [highlightMode, setHighlightMode] = useState<'fitting' | 'finished'>('fitting')
  const [focusedField, setFocusedField] = useState<'width' | 'height' | 'sillHeight' | 'topHeight' | undefined>()

  // Dimension input mode - whether user is inputting fitting or finished dimensions
  const [dimensionInputMode, setDimensionInputMode] = useState<'fitting' | 'finished'>('fitting')

  // Sync dimension input mode with highlight mode
  useEffect(() => {
    setHighlightMode(dimensionInputMode)
  }, [dimensionInputMode])

  // Helper functions for dimension conversion
  const getDisplayValue = useCallback(
    (fittingValue: number, type: 'width' | 'height' | 'sillHeight' | 'topHeight') => {
      if (!constructionMethod) return fittingValue
      const padding = constructionMethod.config.openings.padding

      if (dimensionInputMode === 'fitting') {
        return fittingValue
      } else {
        // Convert to finished dimensions
        if (type === 'sillHeight') {
          // Sill height: finished = fitting + padding (sill sits on padding)
          return fittingValue > 0 ? fittingValue + padding : 0
        } else if (type === 'topHeight') {
          // Top height: same as fitting since it's a floor-to-top measurement
          return fittingValue
        } else {
          // Width/Height: finished = fitting - 2×padding
          return Math.max(0, fittingValue - 2 * padding)
        }
      }
    },
    [constructionMethod, dimensionInputMode]
  )

  const convertToFittingValue = useCallback(
    (inputValue: number, type: 'width' | 'height' | 'sillHeight' | 'topHeight') => {
      if (!constructionMethod) return inputValue
      const padding = constructionMethod.config.openings.padding

      if (dimensionInputMode === 'fitting') {
        return inputValue
      } else {
        // Convert from finished to fitting dimensions
        if (type === 'sillHeight') {
          // Sill height: fitting = finished - padding (remove padding offset)
          return Math.max(0, inputValue - padding)
        } else if (type === 'topHeight') {
          // Top height: same as fitting since it's a floor-to-top measurement
          return inputValue
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

  // Calculate top height (sill height + opening height)
  const currentTopHeight = (opening?.sillHeight || 0) + (opening?.height || 0)

  const topHeightInput = useDebouncedNumericInput(
    getDisplayValue(currentTopHeight, 'topHeight'),
    useCallback(
      (value: number) => {
        const fittingTopHeight = convertToFittingValue(value, 'topHeight')
        const currentSillHeight = opening?.sillHeight || 0
        const newOpeningHeight = Math.max(100, fittingTopHeight - currentSillHeight)
        updateOpening(perimeterId, wallId, openingId, { height: createLength(newOpeningHeight) })
      },
      [updateOpening, perimeterId, wallId, openingId, convertToFittingValue, opening?.sillHeight]
    ),
    {
      debounceMs: 300,
      min: Math.max(opening?.sillHeight || 0, 100), // Cannot be less than sill height, minimum 100
      max: 5000,
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
            size="2"
          >
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

        {/* Dimension Input Mode Toggle - Compact Layout */}
        <Flex align="center" justify="between" gap="2">
          <Flex align="center" gap="1">
            <Text size="1" weight="medium" color="gray">
              Dimension Mode
            </Text>
            <Tooltip
              content={
                dimensionInputMode === 'fitting'
                  ? 'Raw opening size (construction)'
                  : 'Actual opening size (with fitted frame)'
              }
            >
              <InfoCircledIcon cursor="help" width={12} height={12} style={{ color: 'var(--gray-9)' }} />
            </Tooltip>
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
        <Flex align="center" justify="between" gap="1">
          <Text size="1" weight="medium" color="gray">
            Padding
          </Text>
          <Text size="1" color="gray">
            {constructionMethod
              ? `${formatLength(constructionMethod?.config.openings.padding)} (configured by ${constructionMethod.name})`
              : '???'}
          </Text>
        </Flex>

        {/* Dimension inputs in Radix Grid layout */}
        <Grid columns="auto min-content auto min-content" rows="2" gap="2" gapX="3" align="center" flexGrow="1">
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
            min={Math.max(opening?.sillHeight || 0, 100)}
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
