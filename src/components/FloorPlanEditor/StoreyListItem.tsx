import React, { useState, useCallback } from 'react'
import { ChevronUpIcon, ChevronDownIcon, CopyIcon, TrashIcon, HeightIcon } from '@radix-ui/react-icons'
import type { Storey } from '@/types/model'
import type { StoreyId } from '@/types/ids'
import { useModelActions } from '@/model/store'
import { defaultStoreyManagementService } from '@/model/store/services/StoreyManagementService'
import { getLevelColor } from '@/theme/colors'
import { useDebouncedNumericInput } from '@/components/FloorPlanEditor/hooks/useDebouncedInput'
import { createLength } from '@/types/geometry'
import { formatLength } from '@/utils/formatLength'

export interface StoreyListItemProps {
  storey: Storey
  isOnlyStorey: boolean
  lowestStorey: Storey
  highestStorey: Storey
  onDelete: (storeyId: StoreyId) => void
}

export function StoreyListItem({
  storey,
  isOnlyStorey,
  lowestStorey,
  highestStorey,
  onDelete
}: StoreyListItemProps): React.JSX.Element {
  const [editName, setEditName] = useState(storey.name)
  const [isEditing, setIsEditing] = useState(false)

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
    setIsEditing(false)
  }, [editName, storey.name, storey.id, updateStoreyName])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        handleNameSave()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        setEditName(storey.name)
        setIsEditing(false)
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
      defaultStoreyManagementService.duplicateStorey(storey.id)
    } catch (error) {
      console.error('Failed to duplicate storey:', error)
    }
  }, [storey.id])

  const handleDelete = useCallback(() => {
    if (window.confirm(`Are you sure you want to delete "${storey.name}"?`)) {
      onDelete(storey.id)
    }
  }, [storey.name, storey.id, onDelete])

  return (
    <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-white shadow-sm">
      {/* Level indicator */}
      <div className="w-16 text-center text-sm font-mono">
        <div className="font-semibold" style={{ color: getLevelColor(storey.level) }}>
          L{storey.level}
        </div>
        <div className="text-xs text-gray-500">
          {storey.level === 0 ? 'Ground' : storey.level > 0 ? `Floor ${storey.level}` : `B${Math.abs(storey.level)}`}
        </div>
      </div>

      {/* Editable name */}
      <input
        value={editName}
        onChange={handleNameChange}
        onBlur={handleNameSave}
        onFocus={() => setIsEditing(true)}
        onKeyDown={handleKeyDown}
        className={`flex-1 px-3 py-2 border rounded transition-colors ${
          isEditing
            ? 'border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
        }`}
        placeholder="Floor name"
      />

      {/* Height input */}
      <div className="flex items-center gap-1">
        <HeightIcon className="w-4 h-4 text-gray-800" />
        <div className="relative">
          <input
            type="number"
            value={heightInput.value}
            onChange={e => heightInput.handleChange(e.target.value)}
            onBlur={heightInput.handleBlur}
            onKeyDown={heightInput.handleKeyDown}
            min="1"
            max="10"
            step="0.1"
            className="w-20 pl-2 py-1.5 pr-6 bg-white border border-gray-300 rounded text-xs text-right hover:border-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200"
            title={`Floor height: ${formatLength(storey.height)}`}
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">m</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-1">
        <button
          onClick={handleMoveUp}
          disabled={!canMoveUp}
          className="p-2 text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
          title="Move up"
          type="button"
        >
          <ChevronUpIcon className="w-4 h-4" />
        </button>

        <button
          onClick={handleMoveDown}
          disabled={!canMoveDown}
          className="p-2 text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
          title="Move down"
          type="button"
        >
          <ChevronDownIcon className="w-4 h-4" />
        </button>

        <button
          onClick={handleDuplicate}
          className="p-2 text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors rounded focus:outline-none focus:ring-2 focus:ring-gray-300"
          title="Duplicate floor"
          type="button"
        >
          <CopyIcon className="w-4 h-4" />
        </button>

        <button
          onClick={handleDelete}
          disabled={isOnlyStorey}
          className="p-2 text-white bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors rounded focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1"
          title="Delete floor"
          type="button"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
