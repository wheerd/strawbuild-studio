import React, { useCallback } from 'react'
import { Pencil1Icon, ChevronDownIcon } from '@radix-ui/react-icons'
import * as Select from '@radix-ui/react-select'
import { useModelStore } from '@/model/store'
import { useEditorStore } from './hooks/useEditorStore'
import { StoreyManagementModal } from './StoreyManagementModal'
import type { StoreyId } from '@/types/ids'
import { getLevelColor } from '@/theme/colors'

export function StoreySelector(): React.JSX.Element {
  const getStoreysOrderedByLevel = useModelStore(state => state.getStoreysOrderedByLevel)
  const activeStoreyId = useEditorStore(state => state.activeStoreyId)
  const setActiveStorey = useEditorStore(state => state.setActiveStorey)

  const storeysOrdered = getStoreysOrderedByLevel()
  const activeStorey = storeysOrdered.find(s => s.id === activeStoreyId)
  // Display storeys in intuitive order (highest to lowest, like elevator buttons)
  const storeysDisplayOrder = [...storeysOrdered].reverse()

  const handleStoreyChange = useCallback(
    (newStoreyId: string) => {
      setActiveStorey(newStoreyId as StoreyId)
    },
    [setActiveStorey]
  )

  // Don't render if no storeys exist
  if (storeysOrdered.length === 0) {
    return <></>
  }

  return (
    <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-white border border-gray-200 rounded shadow-sm p-2 z-10">
      <Select.Root value={activeStoreyId} onValueChange={handleStoreyChange}>
        <Select.Trigger className="flex items-center justify-between px-2 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-800 hover:border-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200 min-w-0">
          <Select.Value placeholder="Select floor">
            {activeStorey && (
              <div className="flex items-center gap-2">
                <div className="text-xs font-mono">
                  <span className="font-semibold" style={{ color: getLevelColor(activeStorey.level) }}>
                    L{activeStorey.level}
                  </span>
                </div>
                <span>{activeStorey.name}</span>
              </div>
            )}
          </Select.Value>
          <Select.Icon>
            <ChevronDownIcon />
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content className="bg-white border border-gray-300 rounded-md shadow-lg z-50 overflow-hidden min-w-[200px]">
            <Select.Viewport className="p-1">
              {storeysDisplayOrder.map(storey => (
                <Select.Item
                  key={storey.id}
                  value={storey.id}
                  className="text-sm px-3 py-2 text-gray-800 hover:bg-gray-100 focus:bg-gray-100 cursor-pointer rounded outline-none"
                >
                  <Select.ItemText>
                    <div className="flex items-center gap-3">
                      {/* Level indicator */}
                      <div className="w-12 text-center text-xs font-mono">
                        <div className="font-semibold" style={{ color: getLevelColor(storey.level) }}>
                          L{storey.level}
                        </div>
                        <div className="text-xs text-gray-500 leading-none">
                          {storey.level === 0
                            ? 'Ground'
                            : storey.level > 0
                              ? `Floor ${storey.level}`
                              : `B${Math.abs(storey.level)}`}
                        </div>
                      </div>

                      {/* Storey name */}
                      <span className="flex-1">{storey.name}</span>
                    </div>
                  </Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>

      <StoreyManagementModal
        trigger={
          <button
            className="p-1 text-gray-900 bg-gray-300 hover:bg-gray-400 transition-colors rounded"
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
