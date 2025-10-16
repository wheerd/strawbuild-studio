import { PlusIcon } from '@radix-ui/react-icons'
import { Button, Grid, Text } from '@radix-ui/themes'
import React, { useCallback } from 'react'

import { useModelActions, useStoreysOrderedByLevel } from '@/building/store'
import { useConfigActions } from '@/construction/config'
import { BaseModal } from '@/shared/components/BaseModal'

import { StoreyListItem } from './StoreyListItem'

export interface StoreyManagementModalProps {
  trigger: React.ReactNode
}
export function StoreyManagementModal({ trigger }: StoreyManagementModalProps): React.JSX.Element {
  const { addStorey, setActiveStoreyId } = useModelActions()
  const { getDefaultFloorAssemblyId } = useConfigActions()
  const storeysOrdered = useStoreysOrderedByLevel()
  const isOnlyStorey = storeysOrdered.length === 1
  const lowestStorey = storeysOrdered[0]
  const highestStorey = storeysOrdered[storeysOrdered.length - 1]

  const handleAddEmptyStorey = useCallback(() => {
    try {
      const floorAssemblyId = getDefaultFloorAssemblyId()
      const newStorey = addStorey('New Floor', undefined, floorAssemblyId)
      setActiveStoreyId(newStorey.id) // Switch to new storey
    } catch (error) {
      console.error('Failed to add new floor:', error)
    }
  }, [addStorey])

  // Display storeys highest to lowest for intuitive UI
  const storeysDisplayOrder = [...storeysOrdered].reverse()

  return (
    <BaseModal title="Manage Floors" trigger={trigger} width="60vw" maxWidth="90vw">
      <Grid columns="1fr" gap="2">
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
          <Text>No floors yet.</Text>
        )}

        <Button onClick={handleAddEmptyStorey}>
          <PlusIcon />
          Add New Floor
        </Button>
      </Grid>
    </BaseModal>
  )
}
