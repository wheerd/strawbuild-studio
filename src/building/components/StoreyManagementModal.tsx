import { Cross2Icon, PlusIcon } from '@radix-ui/react-icons'
import { Button, Dialog, Flex, IconButton, Text } from '@radix-ui/themes'
import React, { useCallback } from 'react'

import { useModelActions, useStoreysOrderedByLevel } from '@/building/store'

import { StoreyListItem } from './StoreyListItem'

export interface StoreyManagementModalProps {
  trigger: React.ReactNode
}
export function StoreyManagementModal({ trigger }: StoreyManagementModalProps): React.JSX.Element {
  const { addStorey, setActiveStoreyId } = useModelActions()
  const storeysOrdered = useStoreysOrderedByLevel()
  const isOnlyStorey = storeysOrdered.length === 1
  const lowestStorey = storeysOrdered[0]
  const highestStorey = storeysOrdered[storeysOrdered.length - 1]

  const handleAddEmptyFloor = useCallback(() => {
    try {
      const newStorey = addStorey('New Floor')
      setActiveStoreyId(newStorey.id) // Switch to new storey
    } catch (error) {
      console.error('Failed to add new floor:', error)
    }
  }, [addStorey])

  // Display storeys highest to lowest for intuitive UI
  const storeysDisplayOrder = [...storeysOrdered].reverse()

  return (
    <Dialog.Root>
      <Dialog.Trigger>{trigger}</Dialog.Trigger>
      <Dialog.Content
        onEscapeKeyDown={e => {
          e.stopPropagation()
        }}
      >
        <Dialog.Title>
          <Flex justify="between" align="center">
            Manage Floors
            <Dialog.Close>
              <IconButton variant="ghost" highContrast>
                <Cross2Icon className="w-5 h-5" />
              </IconButton>
            </Dialog.Close>
          </Flex>
        </Dialog.Title>

        <Flex direction="column" gap="2" align="end">
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

          <Button onClick={handleAddEmptyFloor}>
            <PlusIcon />
            Add New Floor
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
