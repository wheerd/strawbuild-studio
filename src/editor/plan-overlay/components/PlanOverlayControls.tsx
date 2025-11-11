import { ExclamationTriangleIcon, ImageIcon } from '@radix-ui/react-icons'
import { AlertDialog, Button, DropdownMenu, Flex, IconButton, Text } from '@radix-ui/themes'
import React, { useState } from 'react'

import { useActiveStoreyId, useStoreyById } from '@/building/store'
import { PlanImportModal } from '@/editor/plan-overlay/components/PlanImportModal'
import { useFloorPlanActions, useFloorPlanForStorey } from '@/editor/plan-overlay/store'
import type { FloorPlanPlacement } from '@/editor/plan-overlay/types'

export function PlanOverlayControls(): React.JSX.Element | null {
  const activeStoreyId = useActiveStoreyId()
  const storey = useStoreyById(activeStoreyId)
  const plan = useFloorPlanForStorey(activeStoreyId)
  const { setPlacement, clearPlan } = useFloorPlanActions()
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (!activeStoreyId) {
    return null
  }

  const handlePlacementChange = (placement: FloorPlanPlacement) => {
    setPlacement(activeStoreyId, placement)
  }

  return (
    <Flex align="center" gap="2">
      <PlanImportModal floorId={activeStoreyId} open={modalOpen} onOpenChange={setModalOpen} existingPlan={plan} />

      {plan ? (
        <>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <IconButton size="1" variant="soft" aria-label="Plan Overlay">
                <ImageIcon />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Label>Plan Overlay</DropdownMenu.Label>
              <DropdownMenu.RadioGroup
                value={plan.placement}
                onValueChange={value => handlePlacementChange(value as FloorPlanPlacement)}
              >
                <DropdownMenu.RadioItem value="over">Show on top</DropdownMenu.RadioItem>
                <DropdownMenu.RadioItem value="under">Show under layout</DropdownMenu.RadioItem>
              </DropdownMenu.RadioGroup>
              <DropdownMenu.Separator />
              <DropdownMenu.Item onSelect={() => setModalOpen(true)}>Recalibrate</DropdownMenu.Item>
              <DropdownMenu.Item color="red" onSelect={() => setConfirmOpen(true)}>
                Remove plan
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>

          <AlertDialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
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
                    <Button variant="soft" onClick={() => setConfirmOpen(false)}>
                      Cancel
                    </Button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action>
                    <Button
                      color="red"
                      onClick={() => {
                        clearPlan(activeStoreyId)
                        setConfirmOpen(false)
                      }}
                    >
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
