import React, { useCallback } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Cross2Icon } from '@radix-ui/react-icons'
import { useModelStore } from '@/model/store'
import { createStoreyLevel } from '@/types/model'
import type { StoreyId } from '@/types/ids'
import { StoreyListItem } from './StoreyListItem'
import { defaultStoreyManagementService } from '@/model/store/services/StoreyManagementService'

export interface StoreyManagementModalProps {
  trigger: React.ReactNode
}
export function StoreyManagementModal({ trigger }: StoreyManagementModalProps): React.JSX.Element {
  const addStorey = useModelStore(state => state.addStorey)
  const getStoreysOrderedByLevel = useModelStore(state => state.getStoreysOrderedByLevel)
  const storeysOrdered = getStoreysOrderedByLevel()
  const isOnlyStorey = storeysOrdered.length === 1
  const lowestStorey = storeysOrdered[0]
  const highestStorey = storeysOrdered[storeysOrdered.length - 1]

  const handleAddEmptyFloor = useCallback(() => {
    try {
      // Find the next available level (max + 1)
      const maxLevel = storeysOrdered.length > 0 ? Math.max(...storeysOrdered.map(s => s.level)) : -1
      const newLevel = createStoreyLevel(maxLevel + 1)

      addStorey(`Floor ${newLevel}`, newLevel)
    } catch (error) {
      console.error('Failed to add new floor:', error)
    }
  }, [storeysOrdered, addStorey])

  const handleDeleteStorey = useCallback((storeyId: StoreyId) => {
    try {
      defaultStoreyManagementService.deleteStorey(storeyId)
    } catch (error) {
      console.error('Failed to delete storey:', error)
    }
  }, [])

  // Display storeys highest to lowest for intuitive UI
  const storeysDisplayOrder = [...storeysOrdered].reverse()

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[100]" />
        <Dialog.Content className="fixed inset-4 bg-white rounded-lg shadow-xl z-[100] flex flex-col max-w-lg mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <Dialog.Title className="text-base font-medium text-gray-900">Manage Floors</Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded hover:bg-gray-100"
                type="button"
              >
                <Cross2Icon className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-4 space-y-3 max-h-96 overflow-y-auto">
            {/* Add new floor button */}
            <button
              onClick={handleAddEmptyFloor}
              className="w-full p-3 text-white bg-primary-600 hover:bg-primary-700 rounded transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              type="button"
            >
              <span className="text-lg">+</span>
              Add New Floor
            </button>

            {/* Storey list (ordered by level, highest first for intuitive display) */}
            {storeysDisplayOrder.length > 0 ? (
              storeysDisplayOrder.map(storey => (
                <StoreyListItem
                  key={storey.id}
                  storey={storey}
                  isOnlyStorey={isOnlyStorey}
                  lowestStorey={lowestStorey}
                  highestStorey={highestStorey}
                  onDelete={handleDeleteStorey}
                />
              ))
            ) : (
              <div className="text-center text-gray-500 py-8">
                <div className="text-lg mb-2">🏢</div>
                <div className="text-sm">No floors yet. Add your first floor above.</div>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
