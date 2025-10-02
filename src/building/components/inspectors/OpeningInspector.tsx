import { TrashIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import { Box, Button, Callout, DataList, Flex, Heading, Select, Separator, Text, TextField } from '@radix-ui/themes'
import { useCallback, useMemo, useState } from 'react'

import type { OpeningId, PerimeterId, PerimeterWallId } from '@/building/model/ids'
import type { OpeningType } from '@/building/model/model'
import { useModelActions, usePerimeterById } from '@/building/store'
import { usePerimeterConstructionMethodById } from '@/construction/config/store'
import { useSelectionStore } from '@/editor/hooks/useSelectionStore'
import { createLength } from '@/shared/geometry'
import { useDebouncedNumericInput } from '@/shared/hooks/useDebouncedInput'

import { OpeningPreview } from './OpeningPreview'

interface OpeningInspectorProps {
  perimeterId: PerimeterId
  wallId: PerimeterWallId
  openingId: OpeningId
}

// Opening type options - moved outside component to avoid recreation
const OPENING_TYPE_OPTIONS: { value: OpeningType; label: string }[] = [
  { value: 'door', label: 'Door' },
  { value: 'window', label: 'Window' },
  { value: 'passage', label: 'Passage' }
]

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

  // Debounced input handlers for numeric values
  const widthInput = useDebouncedNumericInput(
    opening?.width || 0,
    useCallback(
      (value: number) => {
        updateOpening(perimeterId, wallId, openingId, { width: createLength(value) })
      },
      [updateOpening, perimeterId, wallId, openingId]
    ),
    {
      debounceMs: 300,
      min: 100,
      max: 5000,
      step: 10
    }
  )

  const heightInput = useDebouncedNumericInput(
    opening?.height || 0,
    useCallback(
      (value: number) => {
        updateOpening(perimeterId, wallId, openingId, { height: createLength(value) })
      },
      [updateOpening, perimeterId, wallId, openingId]
    ),
    {
      debounceMs: 300,
      min: 100,
      max: 4000,
      step: 10
    }
  )

  const sillHeightInput = useDebouncedNumericInput(
    opening?.sillHeight || 0,
    useCallback(
      (value: number) => {
        updateOpening(perimeterId, wallId, openingId, {
          sillHeight: value === 0 ? undefined : createLength(value)
        })
      },
      [updateOpening, perimeterId, wallId, openingId]
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
      {/* Basic Properties */}
      <Flex direction="column" gap="3">
        <Flex align="center" justify="between" gap="3">
          <Text size="1" weight="medium" color="gray">
            Type
          </Text>
          <Select.Root
            value={opening.type}
            onValueChange={(value: OpeningType) =>
              handleTypeChange({ target: { value } } as React.ChangeEvent<HTMLSelectElement>)
            }
            size="1"
          >
            <Select.Trigger style={{ flex: 1, minWidth: 0 }} />
            <Select.Content>
              {OPENING_TYPE_OPTIONS.map(option => (
                <Select.Item key={option.value} value={option.value}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
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

        {opening.type === 'window' && (
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
            <Text size="1" color="gray">
              Height of window sill above floor level
            </Text>
          </Flex>
        )}
      </Flex>

      <Separator size="4" />

      {/* Preview */}
      {opening && storey && constructionMethod && (
        <Flex direction="column" gap="2">
          <Flex align="center" justify="between">
            <Heading size="2">Preview</Heading>
            <Flex gap="1">
              <Button
                size="1"
                variant={highlightMode === 'fitting' ? 'solid' : 'outline'}
                onClick={() => setHighlightMode('fitting')}
              >
                Fitting
              </Button>
              <Button
                size="1"
                variant={highlightMode === 'finished' ? 'solid' : 'outline'}
                onClick={() => setHighlightMode('finished')}
              >
                Finished
              </Button>
            </Flex>
          </Flex>
          <OpeningPreview
            opening={opening}
            wallHeight={storey.height}
            padding={constructionMethod.config.openings.padding}
            highlightMode={highlightMode}
            focusedField={focusedField}
          />
        </Flex>
      )}

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
