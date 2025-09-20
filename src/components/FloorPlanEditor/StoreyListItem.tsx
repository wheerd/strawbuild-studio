import React, { useState, useCallback } from 'react'
import { ChevronUpIcon, ChevronDownIcon, CopyIcon, TrashIcon } from '@radix-ui/react-icons'
import type { Storey } from '@/types/model'
import type { StoreyId } from '@/types/ids'
import { useModelStore } from '@/model/store'

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

  const updateStoreyName = useModelStore(state => state.updateStoreyName)
  const moveStoreyUp = useModelStore(state => state.moveStoreyUp)
  const moveStoreyDown = useModelStore(state => state.moveStoreyDown)
  const duplicateStorey = useModelStore(state => state.duplicateStorey)

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
      moveStoreyUp(storey.id)
    } catch (error) {
      console.error('Failed to move storey up:', error)
    }
  }, [storey.id, moveStoreyUp])

  const handleMoveDown = useCallback(() => {
    try {
      moveStoreyDown(storey.id)
    } catch (error) {
      console.error('Failed to move storey down:', error)
    }
  }, [storey.id, moveStoreyDown])

  const handleDuplicate = useCallback(() => {
    try {
      duplicateStorey(storey.id)
    } catch (error) {
      console.error('Failed to duplicate storey:', error)
    }
  }, [storey.id, duplicateStorey])

  const handleDelete = useCallback(() => {
    if (window.confirm(`Are you sure you want to delete "${storey.name}"?`)) {
      onDelete(storey.id)
    }
  }, [storey.name, storey.id, onDelete])

  return (
    <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-white shadow-sm">
      {/* Level indicator */}
      <div className="w-16 text-center text-sm font-mono">
        <div
          className={`font-semibold ${
            storey.level === 0 ? 'text-green-600' : storey.level > 0 ? 'text-blue-600' : 'text-orange-600'
          }`}
        >
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

      {/* Action buttons */}
      <div className="flex gap-1">
        <button
          onClick={handleMoveUp}
          disabled={!canMoveUp}
          className="p-2 text-gray-600 hover:text-gray-800 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors rounded hover:bg-gray-100 disabled:hover:bg-transparent"
          title="Move up"
          type="button"
        >
          <ChevronUpIcon className="w-4 h-4" />
        </button>

        <button
          onClick={handleMoveDown}
          disabled={!canMoveDown}
          className="p-2 text-gray-600 hover:text-gray-800 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors rounded hover:bg-gray-100 disabled:hover:bg-transparent"
          title="Move down"
          type="button"
        >
          <ChevronDownIcon className="w-4 h-4" />
        </button>

        <button
          onClick={handleDuplicate}
          className="p-2 text-gray-600 hover:text-gray-800 transition-colors rounded hover:bg-gray-100"
          title="Duplicate floor"
          type="button"
        >
          <CopyIcon className="w-4 h-4" />
        </button>

        <button
          onClick={handleDelete}
          disabled={isOnlyStorey}
          className="p-2 text-red-600 hover:text-red-800 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors rounded hover:bg-red-50 disabled:hover:bg-transparent"
          title="Delete floor"
          type="button"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
