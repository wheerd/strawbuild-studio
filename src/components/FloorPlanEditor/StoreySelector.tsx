import React, { useCallback } from 'react'
import { Pencil1Icon } from '@radix-ui/react-icons'
import { useModelStore } from '@/model/store'
import { useEditorStore } from './hooks/useEditorStore'
import { StoreyManagementModal } from './StoreyManagementModal'
import type { StoreyId } from '@/types/ids'

export function StoreySelector(): React.JSX.Element {
  const getStoreysOrderedByLevel = useModelStore(state => state.getStoreysOrderedByLevel)
  const activeStoreyId = useEditorStore(state => state.activeStoreyId)
  const setActiveStorey = useEditorStore(state => state.setActiveStorey)

  const storeysOrdered = getStoreysOrderedByLevel()

  const handleStoreyChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const newStoreyId = event.target.value as StoreyId
      setActiveStorey(newStoreyId)
    },
    [setActiveStorey]
  )

  // Don't render if no storeys exist
  if (storeysOrdered.length === 0) {
    return <></>
  }

  return (
    <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-white border border-gray-200 rounded shadow-sm p-2 z-10">
      <select
        value={activeStoreyId}
        onChange={handleStoreyChange}
        className="text-sm border-none bg-transparent focus:outline-none pr-1 min-w-0"
      >
        {storeysOrdered.map(storey => (
          <option key={storey.id} value={storey.id}>
            Level {storey.level}: {storey.name}
          </option>
        ))}
      </select>

      <StoreyManagementModal
        trigger={
          <button
            className="p-1 text-gray-600 hover:text-gray-800 transition-colors rounded hover:bg-gray-100"
            title="Manage floors"
            type="button"
          >
            <Pencil1Icon className="w-4 h-4" />
          </button>
        }
      />
    </div>
  )
}
