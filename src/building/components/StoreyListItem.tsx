import { ChevronDownIcon, ChevronUpIcon, CopyIcon, EnterIcon, HeightIcon, TrashIcon } from '@radix-ui/react-icons'
import { AlertDialog, Button, Card, Code, IconButton, TextField } from '@radix-ui/themes'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useStoreyName } from '@/building/hooks/useStoreyName'
import type { Storey } from '@/building/model'
import { useActiveStoreyId, useModelActions } from '@/building/store'
import { defaultStoreyManagementService } from '@/building/store/services/StoreyManagementService'
import { FloorAssemblySelectWithEdit } from '@/construction/config/components/FloorAssemblySelectWithEdit'
import { MeasurementInfo } from '@/editor/components/MeasurementInfo'
import { LengthField } from '@/shared/components/LengthField'
import { useFormatters } from '@/shared/i18n/useFormatters'

export function getLevelColor(level: number): 'grass' | 'indigo' | 'brown' {
  if (level === 0) {
    return 'grass'
  } else if (level > 0) {
    return 'indigo'
  } else {
    return 'brown'
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
    <Card style={isActive ? { background: 'var(--accent-5)' } : {}}>
      <div className="flex items-center gap-2">
        {/* Level indicator */}
        <div className="flex-col items-center gap-0 w-[4rem]">
          <Code variant="ghost" size="2" color={getLevelColor(storey.level)} font-bold>
            L{storey.level}
          </Code>
          <Code variant="ghost" size="1" text-gray-900>
            {storey.level === 0
              ? t($ => $.storeys.ground)
              : storey.level > 0
                ? t($ => $.storeys.floor, { level: storey.level })
                : t($ => $.storeys.basement, { level: Math.abs(storey.level) })}
          </Code>
        </div>

        {/* Editable name */}
        <div className="flex-col gap-1 grow-1">
          <span className="text-sm font-medium text-gray-900">{t($ => $.storeys.name)}</span>
          <TextField.Root
            ref={nameFieldRef}
            value={editName}
            onChange={handleNameChange}
            onBlur={handleNameSave}
            onKeyDown={handleKeyDown}
            placeholder={t($ => $.storeys.floorName)}
            required
            style={{ minWidth: '150px', flexGrow: 1 }}
          />
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
            size="2"
          />
        </div>

        {/* Action buttons */}
        <div className="gap-1 items-center">
          <div className="flex flex-col gap-1">
            <IconButton size="1" onClick={handleMoveUp} disabled={!canMoveUp} title={t($ => $.storeys.moveUp)}>
              <ChevronUpIcon />
            </IconButton>

            <IconButton size="1" onClick={handleMoveDown} disabled={!canMoveDown} title={t($ => $.storeys.moveDown)}>
              <ChevronDownIcon />
            </IconButton>
          </div>

          <IconButton onClick={handleDuplicate} title={t($ => $.storeys.duplicateFloor)} variant="soft">
            <CopyIcon />
          </IconButton>

          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <IconButton disabled={isOnlyStorey} title={t($ => $.storeys.deleteFloor)} color="red">
                <TrashIcon />
              </IconButton>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
              <AlertDialog.Title>{t($ => $.storeys.deleteFloorTitle)}</AlertDialog.Title>
              <AlertDialog.Description size="2">{t($ => $.storeys.deleteFloorConfirm)}</AlertDialog.Description>

              <div className="gap-3 justify-end">
                <AlertDialog.Cancel>
                  <Button variant="soft" text-gray-900>
                    {t($ => $.actions.cancel)}
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action onClick={handleDelete}>
                  <Button color="red">{t($ => $.storeys.deleteFloorTitle)}</Button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Root>

          <IconButton
            onClick={() => {
              setActiveStoreyId(storey.id)
            }}
            disabled={isActive}
            title={t($ => $.storeys.switchToFloor)}
            color="green"
          >
            <EnterIcon />
          </IconButton>
        </div>
      </div>
    </Card>
  )
}
