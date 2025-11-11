import { ExclamationTriangleIcon, ImageIcon, LayersIcon, TrashIcon } from '@radix-ui/react-icons'
import { AlertDialog, Button, Flex, IconButton, Text } from '@radix-ui/themes'
import React, { useMemo, useState } from 'react'

import { useActiveStoreyId, useStoreyById } from '@/building/store'
import { PlanImportModal } from '@/editor/plan-overlay/components/PlanImportModal'
import { useFloorPlanActions, useFloorPlanForStorey } from '@/editor/plan-overlay/store'

export function PlanOverlayControls(): React.JSX.Element | null {
  const activeStoreyId = useActiveStoreyId()
  const storey = useStoreyById(activeStoreyId)
  const plan = useFloorPlanForStorey(activeStoreyId)
  const { togglePlacement, clearPlan } = useFloorPlanActions()
  const [modalOpen, setModalOpen] = useState(false)

  if (!activeStoreyId) {
    return null
  }

  const placementLabel = useMemo(() => {
    if (!plan) return ''
    return plan.placement === 'over' ? 'Show underlay' : 'Show on top'
  }, [plan])

  return (
    <Flex align="center" gap="2">
      <PlanImportModal floorId={activeStoreyId} open={modalOpen} onOpenChange={setModalOpen} existingPlan={plan} />

      {plan ? (
        <>
          <IconButton size="1" variant="soft" onClick={() => togglePlacement(activeStoreyId)} title={placementLabel}>
            <LayersIcon />
          </IconButton>
          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <IconButton size="1" variant="outline" color="red" title="Remove plan image">
                <TrashIcon />
              </IconButton>
            </AlertDialog.Trigger>
            <AlertDialog.Content maxWidth="400px">
              <Flex direction="column" gap="3">
                <AlertDialog.Title>
                  <Flex align="center" gap="2">
                    <ExclamationTriangleIcon />
                    <Text>Remove plan image</Text>
                  </Flex>
                </AlertDialog.Title>
                <AlertDialog.Description>
                  Remove the plan image for {storey?.name ?? 'this floor'}? This cannot be undone.
                </AlertDialog.Description>
                <Flex justify="end" gap="2">
                  <AlertDialog.Cancel>
                    <Button variant="soft">Cancel</Button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action>
                    <Button color="red" onClick={() => clearPlan(activeStoreyId)}>
                      Remove
                    </Button>
                  </AlertDialog.Action>
                </Flex>
              </Flex>
            </AlertDialog.Content>
          </AlertDialog.Root>
        </>
      ) : (
        <IconButton size="1" variant="surface" onClick={() => setModalOpen(true)} title="Import plan image">
          <ImageIcon />
        </IconButton>
      )}
    </Flex>
  )
}
