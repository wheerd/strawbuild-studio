import React, { useState, useCallback, useEffect } from 'react'
import { ChevronUpIcon, ChevronDownIcon, CopyIcon, TrashIcon, HeightIcon, EnterIcon } from '@radix-ui/react-icons'
import type { Storey } from '@/types/model'
import { useModelActions, useActiveStoreyId } from '@/model/store'
import { defaultStoreyManagementService } from '@/model/store/services/StoreyManagementService'
import { useDebouncedNumericInput } from '@/components/FloorPlanEditor/hooks/useDebouncedInput'
import { createLength } from '@/types/geometry'
import { formatLength } from '@/utils/formatLength'
import { Card, Flex, IconButton, TextField, Code, AlertDialog, Button } from '@radix-ui/themes'

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
  const activeStoreyId = useActiveStoreyId()
  const { setActiveStorey } = useModelActions()
  const [editName, setEditName] = useState(storey.name)

  const { updateStoreyName, updateStoreyHeight } = useModelActions()

  // Debounced height input handler (UI in meters, store in millimeters)
  const heightInput = useDebouncedNumericInput(
    storey.height / 1000, // Convert mm to meters for UI
    useCallback(
      (value: number) => {
        updateStoreyHeight(storey.id, createLength(value * 1000)) // Convert meters to mm for store
      },
      [updateStoreyHeight, storey.id]
    ),
    {
      debounceMs: 300,
      min: 1, // Minimum 1m height
      max: 10, // Maximum 10m height
      step: 0.1 // 0.1m (10cm) increments
    }
  )

  // Calculate button states
  const isLowest = storey.id === lowestStorey.id
  const isHighest = storey.id === highestStorey.id

  const canMoveUp = !isOnlyStorey && !(isHighest && lowestStorey.level === 0)
  const canMoveDown = !isOnlyStorey && !(isLowest && highestStorey.level === 0)

  const handleNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setEditName(event.target.value)
  }, [])

  const handleNameSave = useCallback(() => {
    if (editName.trim() !== storey.name && editName.trim() !== '') {
      try {
        updateStoreyName(storey.id, editName.trim())
      } catch (error) {
        console.error('Failed to update storey name:', error)
        setEditName(storey.name) // Revert on error
      }
    } else {
      setEditName(storey.name) // Revert if empty or unchanged
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
      setActiveStorey(newStorey.id) // Switch to new storey
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

  return (
    <Card style={isActive ? { background: 'var(--accent-5)' } : {}}>
      <Flex align="center" gap="2">
        {/* Level indicator */}
        <Flex direction="column" align="center" gap="0" width="4rem">
          <Code variant="ghost" size="2" color={getLevelColor(storey.level)} weight="bold">
            L{storey.level}
          </Code>
          <Code variant="ghost" size="1" color="gray">
            {storey.level === 0 ? 'Ground' : storey.level > 0 ? `Floor ${storey.level}` : `B${Math.abs(storey.level)}`}
          </Code>
        </Flex>

        {/* Editable name */}
        <TextField.Root
          ref={nameFieldRef}
          size="3"
          value={editName}
          onChange={handleNameChange}
          onBlur={handleNameSave}
          onKeyDown={handleKeyDown}
          placeholder="Floor name"
          required
        />

        {/* Height input */}
        <TextField.Root
          type="number"
          min="1"
          max="10"
          step="0.1"
          style={{ width: '5rem', textAlign: 'right' }}
          value={heightInput.value}
          onChange={e => heightInput.handleChange(e.target.value)}
          onBlur={heightInput.handleBlur}
          onKeyDown={heightInput.handleKeyDown}
          title={`Floor height: ${formatLength(storey.height)}`}
        >
          <TextField.Slot side="left">
            <HeightIcon />
          </TextField.Slot>
          <TextField.Slot side="right" pl="1">
            m
          </TextField.Slot>
        </TextField.Root>

        {/* Action buttons */}
        <Flex gap="1">
          <IconButton onClick={handleMoveUp} disabled={!canMoveUp} title="Move up">
            <ChevronUpIcon />
          </IconButton>

          <IconButton onClick={handleMoveDown} disabled={!canMoveDown} title="Move down">
            <ChevronDownIcon />
          </IconButton>

          <IconButton onClick={handleDuplicate} title="Duplicate floor" variant="soft">
            <CopyIcon />
          </IconButton>

          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <IconButton disabled={isOnlyStorey} title="Delete floor" color="red">
                <TrashIcon />
              </IconButton>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
              <AlertDialog.Title>Delete Floor</AlertDialog.Title>
              <AlertDialog.Description size="2">Are you sure you want to delete the floor?</AlertDialog.Description>

              <Flex gap="3" justify="end">
                <AlertDialog.Cancel>
                  <Button variant="soft" color="gray">
                    Cancel
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action onClick={handleDelete}>
                  <Button color="red">Delete Floor</Button>
                </AlertDialog.Action>
              </Flex>
            </AlertDialog.Content>
          </AlertDialog.Root>

          <IconButton
            onClick={() => setActiveStorey(storey.id)}
            disabled={isActive}
            title="Switch to floor"
            color="green"
          >
            <EnterIcon />
          </IconButton>
        </Flex>
      </Flex>
    </Card>
  )
}
