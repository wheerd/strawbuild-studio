import { Plus } from 'lucide-react'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { useModelActions, useStoreysOrderedByLevel } from '@/building/store'
import { Button } from '@/components/ui/button'
import { useConfigActions } from '@/construction/config/store'
import { BaseModal } from '@/shared/components/BaseModal'

import { StoreyListItem } from './StoreyListItem'

export interface StoreyManagementModalProps {
  trigger: React.ReactNode
}
export function StoreyManagementModal({ trigger }: StoreyManagementModalProps): React.JSX.Element {
  const { t } = useTranslation('common')
  const { addStorey, setActiveStoreyId } = useModelActions()
  const { getDefaultFloorAssemblyId } = useConfigActions()
  const storeysOrdered = useStoreysOrderedByLevel()
  const isOnlyStorey = storeysOrdered.length === 1
  const lowestStorey = storeysOrdered[0]
  const highestStorey = storeysOrdered[storeysOrdered.length - 1]

  const handleAddEmptyStorey = useCallback(() => {
    try {
      const floorAssemblyId = getDefaultFloorAssemblyId()
      const newStorey = addStorey(undefined, floorAssemblyId)
      setActiveStoreyId(newStorey.id) // Switch to new storey
    } catch (error) {
      console.error('Failed to add new floor:', error)
    }
  }, [addStorey, t])

  // Display storeys highest to lowest for intuitive UI
  const storeysDisplayOrder = [...storeysOrdered].reverse()

  return (
    <BaseModal title={t($ => $.storeys.manageFloors)} trigger={trigger} width="60vw" maxWidth="90vw">
      <div className="grid grid-cols-1 gap-2">
        {storeysDisplayOrder.length > 0 ? (
          storeysDisplayOrder.map(storey => (
            <StoreyListItem
              key={storey.id}
              storey={storey}
              isOnlyStorey={isOnlyStorey}
              lowestStorey={lowestStorey}
              highestStorey={highestStorey}
            />
          ))
        ) : (
          <span>{t($ => $.storeys.noFloorsYet)}</span>
        )}

        <Button onClick={handleAddEmptyStorey}>
          <Plus />
          {t($ => $.storeys.addNewFloor)}
        </Button>
      </div>
    </BaseModal>
  )
}
