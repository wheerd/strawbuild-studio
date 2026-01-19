import { InfoCircledIcon, TrashIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import { useCallback, useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import type { OpeningType } from '@/building/model'
import type { OpeningId } from '@/building/model/ids'
import {
  useModelActions,
  usePerimeterById,
  usePerimeterWallById,
  useStoreyById,
  useWallOpeningById
} from '@/building/store'
import { Button } from '@/components/ui/button'
import { Callout, CalloutIcon, CalloutText } from '@/components/ui/callout'
import { Kbd } from '@/components/ui/kbd'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Separator } from '@/components/ui/separator'
import { Tooltip } from '@/components/ui/tooltip'
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

export function OpeningInspector({ openingId }: { openingId: OpeningId }): React.JSX.Element {
  const { t } = useTranslation('inspector')
  const { formatLength } = useFormatters()
  // Get model store functions - use specific selectors for stable references
  const select = useSelectionStore()
  const { updateWallOpening, removeWallOpening } = useModelActions()

  // Get perimeter from store
  const opening = useWallOpeningById(openingId)
  const wall = usePerimeterWallById(opening.wallId)
  const perimeter = usePerimeterById(wall.perimeterId)
  const storey = useStoreyById(perimeter.storeyId)

  // Get assembly for padding config
  const wallAssembly = useWallAssemblyById(wall.wallAssemblyId)

  const openingConfig = useMemo(
    () => resolveOpeningConfig(opening, wallAssembly ?? undefined),
    [opening.openingAssemblyId, wallAssembly?.openingAssemblyId]
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
    const sill = opening.sillHeight ?? 0
    const height = opening.height
    if (dimensionInputMode === 'fitting') {
      return sill + height
    }
    return sill + height - openingConfig.padding
  }, [opening.sillHeight, opening.height, openingConfig, dimensionInputMode])

  const convertTopHeightInput = useCallback(
    (value: number) => {
      if (dimensionInputMode === 'fitting') {
        return value
      }
      return value + openingConfig.padding
    },
    [openingConfig, dimensionInputMode]
  )

  // Event handlers with stable references
  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newType = e.target.value as OpeningType
      // Selects can update immediately since they don't have focus issues
      updateWallOpening(openingId, { openingType: newType })
    },
    [updateWallOpening, openingId]
  )

  const handleRemoveOpening = useCallback(() => {
    if (confirm(t($ => $.opening.confirmDelete))) {
      select.popSelection()
      removeWallOpening(openingId)
    }
  }, [removeWallOpening, openingId, select, t])

  const handleFitToView = useCallback(() => {
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
    <div className="flex flex-col gap-4">
      {/* Preview */}
      {storey && wallHeight !== null && (
        <div className="flex flex-col items-center">
          <OpeningPreview
            opening={opening}
            wallHeight={wallHeight}
            padding={openingConfig.padding}
            highlightMode={dimensionInputMode}
            focusedField={focusedField}
          />
        </div>
      )}
      {/* Basic Properties */}
      <div className="flex flex-col gap-3">
        <div className="items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-gray-900">{t($ => $.opening.type)}</span>
            <Tooltip content={t($ => $.opening.typeTooltip)}>
              <InfoCircledIcon cursor="help" width={12} height={12} style={{ color: 'var(--color-gray-900)' }} />
            </Tooltip>
          </div>
          <SegmentedControl.Root
            value={opening.openingType}
            onValueChange={(value: OpeningType) => {
              handleTypeChange({ target: { value } } as React.ChangeEvent<HTMLSelectElement>)
            }}
          >
            <SegmentedControl.Item value="door">
              <Tooltip content={t($ => $.opening.typeDoorTooltip)}>
                <div>
                  <DoorIcon width={20} height={20} />
                </div>
              </Tooltip>
            </SegmentedControl.Item>

            <SegmentedControl.Item value="window">
              <Tooltip content={t($ => $.opening.typeWindowTooltip)}>
                <div>
                  <WindowIcon width={20} height={20} />
                </div>
              </Tooltip>
            </SegmentedControl.Item>

            <SegmentedControl.Item value="passage">
              <Tooltip content={t($ => $.opening.typePassageTooltip)}>
                <div>
                  <PassageIcon width={20} height={20} />
                </div>
              </Tooltip>
            </SegmentedControl.Item>
          </SegmentedControl.Root>
        </div>

        {/* Dimension Input Mode Toggle - Compact Layout */}
        <div className="items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-gray-900">{t($ => $.opening.dimensionMode)}</span>
            <Tooltip
              content={
                dimensionInputMode === 'fitting'
                  ? t($ => $.opening.dimensionModeFittingTooltip)
                  : t($ => $.opening.dimensionModeFinishedTooltip)
              }
            >
              <InfoCircledIcon cursor="help" width={12} height={12} style={{ color: 'var(--color-gray-900)' }} />
            </Tooltip>
          </div>
          <SegmentedControl.Root
            value={dimensionInputMode}
            onValueChange={(value: 'fitting' | 'finished') => {
              setDimensionInputMode(value)
            }}
            size="sm"
          >
            <SegmentedControl.Item value="fitting">{t($ => $.opening.dimensionModeFitting)}</SegmentedControl.Item>
            <SegmentedControl.Item value="finished">{t($ => $.opening.dimensionModeFinished)}</SegmentedControl.Item>
          </SegmentedControl.Root>
        </div>
        <div className="items-center justify-between gap-1">
          <span className="text-sm font-medium text-gray-900">{t($ => $.opening.padding)}</span>
          <span className="text-sm text-gray-900">{formatLength(openingConfig.padding)}</span>
        </div>

        {/* Dimension inputs in Radix Grid layout */}
        <div className="grid grow grid-cols-[auto_min-content_auto_min-content] grid-rows-2 items-center gap-2 gap-x-3">
          {/* Row 1, Column 1: Width Label */}
          <Label.Root htmlFor="opening-width">
            <span className="text-sm font-medium text-gray-900">{t($ => $.opening.width)}</span>
          </Label.Root>

          {/* Row 1, Column 2: Width Input */}
          <LengthField
            value={getDisplayValue(opening.width || 0, 'width')}
            onCommit={value => {
              const fittingValue = convertToFittedValue(value, 'width')
              updateWallOpening(openingId, { width: fittingValue })
            }}
            unit="cm"
            min={dimensionInputMode === 'fitting' ? 100 : 50}
            max={5000}
            step={100}
            size="sm"
            style={{ width: '80px' }}
            onFocus={() => {
              setFocusedField('width')
            }}
            onBlur={() => {
              setFocusedField(undefined)
            }}
          />

          {/* Row 1, Column 3: Height Label */}
          <Label.Root htmlFor="opening-height">
            <span className="text-sm font-medium text-gray-900">{t($ => $.opening.height)}</span>
          </Label.Root>

          {/* Row 1, Column 4: Height Input */}
          <LengthField
            value={getDisplayValue(opening.height || 0, 'height')}
            onCommit={value => {
              const fittingValue = convertToFittedValue(value, 'height')
              updateWallOpening(openingId, { height: fittingValue })
            }}
            unit="cm"
            min={dimensionInputMode === 'fitting' ? 100 : 50}
            max={4000}
            step={100}
            size="sm"
            style={{ width: '80px' }}
            onFocus={() => {
              setFocusedField('height')
            }}
            onBlur={() => {
              setFocusedField(undefined)
            }}
          />

          {/* Row 2, Column 1: Sill Height Label */}
          <Label.Root htmlFor="opening-sill-height">
            <span className="text-sm font-medium text-gray-900">{t($ => $.opening.sill)}</span>
          </Label.Root>

          {/* Row 2, Column 2: Sill Height Input */}
          <LengthField
            value={getDisplayValue(opening.sillHeight ?? 0, 'sillHeight')}
            onCommit={value => {
              const fittingValue = convertToFittedValue(value, 'sillHeight')
              updateWallOpening(openingId, {
                sillHeight: fittingValue === 0 ? undefined : fittingValue
              })
            }}
            unit="cm"
            min={0}
            max={2000}
            step={100}
            size="sm"
            style={{ width: '80px' }}
            onFocus={() => {
              setFocusedField('sillHeight')
            }}
            onBlur={() => {
              setFocusedField(undefined)
            }}
          />

          {/* Row 2, Column 3: Top Height Label */}
          <Label.Root htmlFor="opening-top-height">
            <span className="text-sm font-medium text-gray-900">{t($ => $.opening.top)}</span>
          </Label.Root>

          {/* Row 2, Column 4: Top Height Input */}
          <LengthField
            value={getTopHeightDisplayValue()}
            onCommit={value => {
              const finishedTopHeight = convertTopHeightInput(value)
              const currentSillHeight = opening.sillHeight ?? 0
              const newOpeningHeight = Math.max(100, finishedTopHeight - currentSillHeight)
              updateWallOpening(openingId, { height: newOpeningHeight })
            }}
            unit="cm"
            min={Math.max(opening.sillHeight ?? 0, 100)}
            max={5000}
            step={100}
            size="sm"
            style={{ width: '80px' }}
            onFocus={() => {
              setFocusedField('topHeight')
            }}
            onBlur={() => {
              setFocusedField(undefined)
            }}
          />
        </div>
      </div>
      {/* Opening Assembly Override */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <Label.Root>
            <span className="text-sm font-medium text-gray-900">{t($ => $.opening.openingAssembly)}</span>
          </Label.Root>
          <Tooltip content={t($ => $.opening.openingAssemblyTooltip)}>
            <InfoCircledIcon cursor="help" width={12} height={12} style={{ color: 'var(--color-gray-900)' }} />
          </Tooltip>
        </div>
        <OpeningAssemblySelectWithEdit
          value={opening.openingAssemblyId}
          onValueChange={value => {
            updateWallOpening(openingId, {
              openingAssemblyId: value
            })
          }}
          allowDefault
          showDefaultIndicator
          size="sm"
        />
      </div>
      <Separator />
      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button size="icon" title={t($ => $.opening.fitToView)} onClick={handleFitToView}>
          <FitToViewIcon />
        </Button>
        <Button
          size="icon"
          className="text-destructive"
          title={t($ => $.opening.deleteOpening)}
          onClick={handleRemoveOpening}
        >
          <TrashIcon />
        </Button>
      </div>
      <Callout color="blue">
        <CalloutIcon>
          <InfoCircledIcon />
        </CalloutIcon>
        <CalloutText>
          <span className="text-sm">
            <Trans t={t} i18nKey={$ => $.opening.moveInstructions} components={{ kbd: <Kbd /> }}>
              To move the opening, you can use the Move Tool{' '}
              <Kbd>
                <>{{ hotkey: 'M' }}</>
              </Kbd>{' '}
              or click any of the distance measurements shown in the editor to adjust them.
            </Trans>
          </span>
        </CalloutText>
      </Callout>
    </div>
  )
}
