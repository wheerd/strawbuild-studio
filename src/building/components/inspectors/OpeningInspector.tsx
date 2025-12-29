import { InfoCircledIcon, TrashIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import { Box, Callout, Flex, Grid, IconButton, Kbd, SegmentedControl, Separator, Text, Tooltip } from '@radix-ui/themes'
import { useCallback, useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import type { OpeningAssemblyId, OpeningId, PerimeterId, PerimeterWallId } from '@/building/model/ids'
import type { OpeningType } from '@/building/model/model'
import { useModelActions, usePerimeterById } from '@/building/store'
import { OpeningAssemblySelectWithEdit } from '@/construction/config/components/OpeningAssemblySelectWithEdit'
import { useWallAssemblyById } from '@/construction/config/store'
import { resolveOpeningConfig } from '@/construction/openings/resolver'
import { createWallStoreyContext } from '@/construction/storeys/context'
import { useSelectionStore } from '@/editor/hooks/useSelectionStore'
import { useViewportActions } from '@/editor/hooks/useViewportStore'
import { FitToViewIcon } from '@/shared/components/Icons'
import { LengthField } from '@/shared/components/LengthField'
import { DoorIcon, PassageIcon, WindowIcon } from '@/shared/components/OpeningIcons'
import { Bounds2D, type Polygon2D, addVec2, offsetPolygon, scaleAddVec2, scaleVec2 } from '@/shared/geometry'
import { useFormatters } from '@/shared/i18n/useFormatters'

import { OpeningPreview } from './OpeningPreview'

interface OpeningInspectorProps {
  perimeterId: PerimeterId
  wallId: PerimeterWallId
  openingId: OpeningId
}

export function OpeningInspector({ perimeterId, wallId, openingId }: OpeningInspectorProps): React.JSX.Element {
  const { t } = useTranslation('inspector')
  const { formatLength } = useFormatters()
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

  // Get assembly for padding config
  const wallAssembly = wall?.wallAssemblyId && useWallAssemblyById(wall.wallAssemblyId)

  const openingConfig = useMemo(
    () => resolveOpeningConfig(opening, wallAssembly ?? undefined),
    [opening?.openingAssemblyId, wallAssembly?.openingAssemblyId]
  )

  const viewportActions = useViewportActions()

  const wallHeight = useMemo(() => {
    if (!storey) return null
    const context = createWallStoreyContext(storey.id, [])
    return context.finishedCeilingBottom - context.finishedFloorTop
  }, [storey])

  // Preview state
  const [focusedField, setFocusedField] = useState<'width' | 'height' | 'sillHeight' | 'topHeight' | undefined>()

  // Dimension input mode - whether user is inputting fitting or finished dimensions
  const [dimensionInputMode, setDimensionInputMode] = useState<'fitting' | 'finished'>('fitting')

  // Helper functions for dimension conversion
  // Model stores FITTED dimensions, UI displays user's choice (finished or fitting)
  const getDisplayValue = useCallback(
    (fittingValue: number, type: 'width' | 'height' | 'sillHeight') => {
      const padding = openingConfig.padding

      if (dimensionInputMode === 'finished') {
        // User wants to see finished dimensions - convert fitting to finished
        if (type === 'width' || type === 'height') {
          return Math.max(10, fittingValue - 2 * padding)
        }
        // Sill: fitting is lower, finished is higher
        return fittingValue + padding
      }

      // User wants to see fitting dimensions - return as-is (model is fitting)
      return fittingValue
    },
    [openingConfig, dimensionInputMode]
  )

  const convertToFittedValue = useCallback(
    (inputValue: number, type: 'width' | 'height' | 'sillHeight') => {
      const padding = openingConfig.padding

      if (dimensionInputMode === 'finished') {
        // User entered finished dimensions - convert to fitting for model
        if (type === 'width' || type === 'height') {
          return inputValue + 2 * padding
        }
        // Sill: finished is higher, fitting is lower
        return Math.max(0, inputValue - padding)
      }

      // User entered fitting dimensions - use as-is (model is fitting)
      return inputValue
    },
    [openingConfig, dimensionInputMode]
  )

  const getTopHeightDisplayValue = useCallback(() => {
    const sill = opening?.sillHeight ?? 0
    const height = opening?.height ?? 0
    if (dimensionInputMode === 'fitting') {
      return sill + height
    }
    return sill + height - openingConfig.padding
  }, [opening?.sillHeight, opening?.height, openingConfig, dimensionInputMode])

  const convertTopHeightInput = useCallback(
    (value: number) => {
      if (dimensionInputMode === 'fitting') {
        return value
      }
      return value + openingConfig.padding
    },
    [openingConfig, dimensionInputMode]
  )

  // If opening not found, show error
  if (!opening || !wall || !perimeter || !perimeterId || !wallId) {
    return (
      <Box p="2">
        <Callout.Root color="red">
          <Callout.Text>
            <Text weight="bold">{t($ => $.opening.notFound)}</Text>
            <br />
            {t($ => $.opening.notFoundMessage, {
              id: openingId
            })}
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
    if (confirm(t($ => $.opening.confirmDelete))) {
      select.popSelection()
      removeOpeningFromOuterWall(perimeterId, wallId, openingId)
    }
  }, [removeOpeningFromOuterWall, perimeterId, wallId, openingId, select, t])

  const handleFitToView = useCallback(() => {
    if (!wall || !opening) return

    // Calculate opening polygon (same as OpeningShape.tsx)
    const insideStart = wall.insideLine.start
    const outsideStart = wall.outsideLine.start
    const wallVector = wall.direction
    const leftEdge = opening.centerOffsetFromWallStart - opening.width / 2
    const offsetStart = scaleVec2(wallVector, leftEdge)
    const offsetEnd = scaleAddVec2(offsetStart, wallVector, opening.width)

    const insideOpeningStart = addVec2(insideStart, offsetStart)
    const insideOpeningEnd = addVec2(insideStart, offsetEnd)
    const outsideOpeningStart = addVec2(outsideStart, offsetStart)
    const outsideOpeningEnd = addVec2(outsideStart, offsetEnd)

    const openingPolygon: Polygon2D = {
      points: [insideOpeningStart, insideOpeningEnd, outsideOpeningEnd, outsideOpeningStart]
    }

    // Expand the polygon by 1.5x on each side (3x total area)
    const expandAmount = Math.max(opening.width, wall.thickness) * 1.5
    const expandedPolygon = offsetPolygon(openingPolygon, expandAmount)

    // Calculate bounds from expanded polygon
    const bounds = Bounds2D.fromPoints(expandedPolygon.points)

    viewportActions.fitToView(bounds)
  }, [wall, opening, viewportActions])

  return (
    <Flex direction="column" gap="4">
      {/* Preview */}
      {storey && wallHeight !== null && (
        <Flex direction="column" align="center">
          <OpeningPreview
            opening={opening}
            wallHeight={wallHeight}
            padding={openingConfig.padding}
            highlightMode={dimensionInputMode}
            focusedField={focusedField}
          />
        </Flex>
      )}
      {/* Basic Properties */}
      <Flex direction="column" gap="3">
        <Flex align="center" justify="between" gap="2">
          <Flex gap="1" align="center">
            <Text size="1" weight="medium" color="gray">
              {t($ => $.opening.type)}
            </Text>
            <Tooltip content={t($ => $.opening.typeTooltip)}>
              <InfoCircledIcon cursor="help" width={12} height={12} style={{ color: 'var(--gray-9)' }} />
            </Tooltip>
          </Flex>
          <SegmentedControl.Root
            value={opening.type}
            onValueChange={(value: OpeningType) =>
              handleTypeChange({ target: { value } } as React.ChangeEvent<HTMLSelectElement>)
            }
            size="2"
          >
            <SegmentedControl.Item value="door">
              <Tooltip content={t($ => $.opening.typeDoorTooltip)}>
                <Box>
                  <DoorIcon width={20} height={20} />
                </Box>
              </Tooltip>
            </SegmentedControl.Item>

            <SegmentedControl.Item value="window">
              <Tooltip content={t($ => $.opening.typeWindowTooltip)}>
                <Box>
                  <WindowIcon width={20} height={20} />
                </Box>
              </Tooltip>
            </SegmentedControl.Item>

            <SegmentedControl.Item value="passage">
              <Tooltip content={t($ => $.opening.typePassageTooltip)}>
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
              {t($ => $.opening.dimensionMode)}
            </Text>
            <Tooltip
              content={
                dimensionInputMode === 'fitting'
                  ? t($ => $.opening.dimensionModeFittingTooltip)
                  : t($ => $.opening.dimensionModeFinishedTooltip)
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
            <SegmentedControl.Item value="fitting">{t($ => $.opening.dimensionModeFitting)}</SegmentedControl.Item>
            <SegmentedControl.Item value="finished">{t($ => $.opening.dimensionModeFinished)}</SegmentedControl.Item>
          </SegmentedControl.Root>
        </Flex>
        <Flex align="center" justify="between" gap="1">
          <Text size="1" weight="medium" color="gray">
            {t($ => $.opening.padding)}
          </Text>
          <Text size="1" color="gray">
            {formatLength(openingConfig.padding)}
          </Text>
        </Flex>

        {/* Dimension inputs in Radix Grid layout */}
        <Grid columns="auto min-content auto min-content" rows="2" gap="2" gapX="3" align="center" flexGrow="1">
          {/* Row 1, Column 1: Width Label */}
          <Label.Root htmlFor="opening-width">
            <Text size="1" weight="medium" color="gray">
              {t($ => $.opening.width)}
            </Text>
          </Label.Root>

          {/* Row 1, Column 2: Width Input */}
          <LengthField
            value={getDisplayValue(opening?.width || 0, 'width')}
            onCommit={value => {
              const fittingValue = convertToFittedValue(value, 'width')
              updateOpening(perimeterId, wallId, openingId, { width: fittingValue })
            }}
            unit="cm"
            min={dimensionInputMode === 'fitting' ? 100 : 50}
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
              {t($ => $.opening.height)}
            </Text>
          </Label.Root>

          {/* Row 1, Column 4: Height Input */}
          <LengthField
            value={getDisplayValue(opening?.height || 0, 'height')}
            onCommit={value => {
              const fittingValue = convertToFittedValue(value, 'height')
              updateOpening(perimeterId, wallId, openingId, { height: fittingValue })
            }}
            unit="cm"
            min={dimensionInputMode === 'fitting' ? 100 : 50}
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
              {t($ => $.opening.sill)}
            </Text>
          </Label.Root>

          {/* Row 2, Column 2: Sill Height Input */}
          <LengthField
            value={getDisplayValue(opening?.sillHeight || 0, 'sillHeight')}
            onCommit={value => {
              const fittingValue = convertToFittedValue(value, 'sillHeight')
              updateOpening(perimeterId, wallId, openingId, {
                sillHeight: fittingValue === 0 ? undefined : fittingValue
              })
            }}
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
              {t($ => $.opening.top)}
            </Text>
          </Label.Root>

          {/* Row 2, Column 4: Top Height Input */}
          <LengthField
            value={getTopHeightDisplayValue()}
            onCommit={value => {
              const finishedTopHeight = convertTopHeightInput(value)
              const currentSillHeight = opening?.sillHeight || 0
              const newOpeningHeight = Math.max(100, finishedTopHeight - currentSillHeight)
              updateOpening(perimeterId, wallId, openingId, { height: newOpeningHeight })
            }}
            unit="cm"
            min={Math.max(opening?.sillHeight || 0, 100)}
            max={5000}
            step={100}
            size="1"
            style={{ width: '80px' }}
            onFocus={() => setFocusedField('topHeight')}
            onBlur={() => setFocusedField(undefined)}
          />
        </Grid>
      </Flex>
      {/* Opening Assembly Override */}
      <Flex direction="column" gap="1">
        <Flex gap="1" align="center">
          <Label.Root>
            <Text size="1" weight="medium" color="gray">
              {t($ => $.opening.openingAssembly)}
            </Text>
          </Label.Root>
          <Tooltip content={t($ => $.opening.openingAssemblyTooltip)}>
            <InfoCircledIcon cursor="help" width={12} height={12} style={{ color: 'var(--gray-9)' }} />
          </Tooltip>
        </Flex>
        <OpeningAssemblySelectWithEdit
          value={opening.openingAssemblyId}
          onValueChange={value => {
            updateOpening(perimeterId, wallId, openingId, {
              openingAssemblyId: value as OpeningAssemblyId | undefined
            })
          }}
          allowDefault
          showDefaultIndicator
          size="1"
        />
      </Flex>
      <Separator size="4" />
      {/* Action Buttons */}
      <Flex gap="2" justify="end">
        <IconButton size="2" title={t($ => $.opening.fitToView)} onClick={handleFitToView}>
          <FitToViewIcon />
        </IconButton>
        <IconButton size="2" color="red" title={t($ => $.opening.deleteOpening)} onClick={handleRemoveOpening}>
          <TrashIcon />
        </IconButton>
      </Flex>
      <Callout.Root color="blue">
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>
          <Text size="1">
            <Trans t={t} i18nKey={$ => $.opening.moveInstructions} components={{ kbd: <Kbd /> }}>
              To move the opening, you can use the Move Tool{' '}
              <Kbd>
                <>{{ hotkey: 'M' }}</>
              </Kbd>{' '}
              or click any of the distance measurements shown in the editor to adjust them.
            </Trans>
          </Text>
        </Callout.Text>
      </Callout.Root>
    </Flex>
  )
}
