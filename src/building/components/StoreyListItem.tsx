import { ChevronDownIcon, ChevronUpIcon, CopyIcon, EnterIcon, HeightIcon, TrashIcon } from '@radix-ui/react-icons'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useStoreyName } from '@/building/hooks/useStoreyName'
import type { Storey } from '@/building/model'
import { useActiveStoreyId, useModelActions } from '@/building/store'
import { defaultStoreyManagementService } from '@/building/store/services/StoreyManagementService'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { TextField } from '@/components/ui/text-field'
import { FloorAssemblySelectWithEdit } from '@/construction/config/components/FloorAssemblySelectWithEdit'
import { MeasurementInfo } from '@/editor/components/MeasurementInfo'
import { LengthField } from '@/shared/components/LengthField'
import { useFormatters } from '@/shared/i18n/useFormatters'

export function getLevelColor(level: number): string {
  if (level === 0) {
    return 'text-green-600'
  } else if (level > 0) {
    return 'text-indigo-600'
  } else {
    return 'text-amber-900'
  }
}

export interface StoreyListItemProps {
  storey: Storey
  isOnlyStorey: boolean
  lowestStorey: Storey
  highestStorey: Storey
}

export function StoreyListItem({
  storey,
  isOnlyStorey,
  lowestStorey,
  highestStorey
}: StoreyListItemProps): React.JSX.Element {
  const { t } = useTranslation('common')
  const { formatLength } = useFormatters()
  const activeStoreyId = useActiveStoreyId()
  const { setActiveStoreyId } = useModelActions()
  const storeyName = useStoreyName(storey)
  const [editName, setEditName] = useState(storeyName)

  const { updateStoreyName, updateStoreyFloorHeight, updateStoreyFloorAssembly } = useModelActions()

  // Calculate button states
  const isLowest = storey.id === lowestStorey.id
  const isHighest = storey.id === highestStorey.id

  const canMoveUp = !isOnlyStorey && !(isHighest && lowestStorey.level === 0)
  const canMoveDown = !isOnlyStorey && !(isLowest && highestStorey.level === 0)

  const handleNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setEditName(event.target.value)
  }, [])

  const handleNameSave = useCallback(() => {
    if (editName.trim() !== storeyName && editName.trim() !== '') {
      try {
        updateStoreyName(storey.id, editName.trim())
      } catch (error) {
        console.error('Failed to update storey name:', error)
        setEditName(storeyName) // Revert on error
      }
    } else {
      setEditName(storeyName) // Revert if empty or unchanged
    }
  }, [editName, storey.name, storey.id, updateStoreyName])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        handleNameSave()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        setEditName(storey.name)
      }
    },
    [storey.name, handleNameSave]
  )

  const handleMoveUp = useCallback(() => {
    try {
      defaultStoreyManagementService.moveStoreyUp(storey.id)
    } catch (error) {
      console.error('Failed to move storey up:', error)
    }
  }, [storey.id])

  const handleMoveDown = useCallback(() => {
    try {
      defaultStoreyManagementService.moveStoreyDown(storey.id)
    } catch (error) {
      console.error('Failed to move storey down:', error)
    }
  }, [storey.id])

  const handleDuplicate = useCallback(() => {
    try {
      const newStorey = defaultStoreyManagementService.duplicateStorey(storey.id)
      setActiveStoreyId(newStorey.id) // Switch to new storey
    } catch (error) {
      console.error('Failed to duplicate storey:', error)
    }
  }, [storey.id])

  const handleDelete = useCallback(() => {
    try {
      defaultStoreyManagementService.deleteStorey(storey.id)
    } catch (error) {
      console.error('Failed to delete storey:', error)
    }
  }, [storey.id])

  const isActive = storey.id === activeStoreyId

  // Auto-focus name field when it first is added to the DOM and is active storey
  const [focussedOnce, setFocussedOnce] = useState(false)
  const nameFieldRef = React.useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (nameFieldRef.current && !focussedOnce) {
      if (isActive) {
        nameFieldRef.current.focus()
        nameFieldRef.current.select()
      }
      setFocussedOnce(true)
    }
  }, [nameFieldRef.current, isActive, focussedOnce])

  useEffect(() => {
    if (storey.useDefaultName) setEditName(storeyName)
  }, [storeyName, storey.useDefaultName])

  return (
    <Card className="p-2" style={isActive ? { background: 'var(--color-primary-500)' } : {}}>
      <div className="flex items-center gap-2">
        {/* Level indicator */}
        <div className="flex flex-col items-center gap-0 w-20 font-mono p-2">
          <span className={`font-bold ${getLevelColor(storey.level)}`}>L{storey.level}</span>
          <span className="text-gray-600 font-mono text-xs">
            {storey.level === 0
              ? t($ => $.storeys.ground)
              : storey.level > 0
                ? t($ => $.storeys.floor, { level: storey.level })
                : t($ => $.storeys.basement, { level: Math.abs(storey.level) })}
          </span>
        </div>

        {/* Editable name */}
        <div className="flex flex-col gap-1 grow">
          <span className="text-sm font-medium text-gray-900">{t($ => $.storeys.name)}</span>
          <TextField.Root
            value={editName}
            onChange={handleNameChange}
            onBlur={handleNameSave}
            onKeyDown={handleKeyDown}
            placeholder={t($ => $.storeys.floorName)}
            style={{ minWidth: '150px', flexGrow: 1 }}
          >
            <TextField.Input ref={nameFieldRef} required />
          </TextField.Root>
        </div>

        {/* Floor height input */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-gray-900">{t($ => $.storeys.floorHeight)}</span>
            <MeasurementInfo highlightedMeasurement="storeyHeight" />
          </div>
          <LengthField
            min={1000}
            max={10000}
            precision={3}
            unit="m"
            step={100}
            style={{ width: '6.5rem' }}
            value={storey.floorHeight}
            onCommit={value => {
              updateStoreyFloorHeight(storey.id, value)
            }}
            title={`Floor height: ${formatLength(storey.floorHeight)}`}
          >
            <TextField.Slot side="left" className="pl-1 pr-0">
              <HeightIcon />
            </TextField.Slot>
          </LengthField>
        </div>

        {/* Floor Assembly Configuration */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-gray-900">{t($ => $.storeys.floorAssembly)}</span>
            <MeasurementInfo highlightedAssembly="floorAssembly" />
          </div>
          <FloorAssemblySelectWithEdit
            value={storey.floorAssemblyId}
            onValueChange={value => {
              updateStoreyFloorAssembly(storey.id, value)
            }}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-1 items-center">
          <div className="flex flex-col gap-1">
            <Button size="icon-sm" onClick={handleMoveUp} disabled={!canMoveUp} title={t($ => $.storeys.moveUp)}>
              <ChevronUpIcon />
            </Button>

            <Button size="icon-sm" onClick={handleMoveDown} disabled={!canMoveDown} title={t($ => $.storeys.moveDown)}>
              <ChevronDownIcon />
            </Button>
          </div>

          <Button size="icon" onClick={handleDuplicate} title={t($ => $.storeys.duplicateFloor)} variant="soft">
            <CopyIcon />
          </Button>

          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <Button size="icon" variant="destructive" disabled={isOnlyStorey} title={t($ => $.storeys.deleteFloor)}>
                <TrashIcon />
              </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
              <AlertDialog.Title>{t($ => $.storeys.deleteFloorTitle)}</AlertDialog.Title>
              <AlertDialog.Description>{t($ => $.storeys.deleteFloorConfirm)}</AlertDialog.Description>

              <div className="flex gap-3 justify-end">
                <AlertDialog.Cancel>
                  <Button variant="soft" className="text-gray-900">
                    {t($ => $.actions.cancel)}
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action onClick={handleDelete}>
                  <Button className="text-destructive">{t($ => $.storeys.deleteFloorTitle)}</Button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Root>

          <Button
            size="icon"
            onClick={() => {
              setActiveStoreyId(storey.id)
            }}
            disabled={isActive}
            title={t($ => $.storeys.switchToFloor)}
            color="green"
          >
            <EnterIcon />
          </Button>
        </div>
      </div>
    </Card>
  )
}
