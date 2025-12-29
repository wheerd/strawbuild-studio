import { ExclamationTriangleIcon, ImageIcon } from '@radix-ui/react-icons'
import { AlertDialog, Button, DropdownMenu, Flex, IconButton, Text } from '@radix-ui/themes'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useActiveStoreyId, useStoreyById } from '@/building/store'
import { PlanImportModal } from '@/editor/plan-overlay/components/PlanImportModal'
import { useFloorPlanActions, useFloorPlanForStorey } from '@/editor/plan-overlay/store'
import type { FloorPlanPlacement } from '@/editor/plan-overlay/types'

export function PlanOverlayControls(): React.JSX.Element | null {
  const { t } = useTranslation('overlay')
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
              <IconButton size="1" variant="soft" aria-label={t('planControls.ariaLabel')}>
                <ImageIcon />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Label>{t('planControls.label')}</DropdownMenu.Label>
              <DropdownMenu.RadioGroup
                value={plan.placement}
                onValueChange={value => handlePlacementChange(value as FloorPlanPlacement)}
              >
                <DropdownMenu.RadioItem value="over">{t('planControls.placement.showOnTop')}</DropdownMenu.RadioItem>
                <DropdownMenu.RadioItem value="under">{t('planControls.placement.showUnder')}</DropdownMenu.RadioItem>
              </DropdownMenu.RadioGroup>
              <DropdownMenu.Separator />
              <DropdownMenu.Item onSelect={() => setModalOpen(true)}>{t('planControls.recalibrate')}</DropdownMenu.Item>
              <DropdownMenu.Item color="red" onSelect={() => setConfirmOpen(true)}>
                {t('planControls.removePlan')}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>

          <AlertDialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialog.Content maxWidth="400px">
              <Flex direction="column" gap="3">
                <AlertDialog.Title>
                  <Flex align="center" gap="2">
                    <ExclamationTriangleIcon />
                    <Text>{t('planControls.confirmRemove.title')}</Text>
                  </Flex>
                </AlertDialog.Title>
                <AlertDialog.Description>
                  {t('planControls.confirmRemove.description', { floor: storey?.name ?? 'this floor' })}
                </AlertDialog.Description>
                <Flex justify="end" gap="2">
                  <AlertDialog.Cancel>
                    <Button variant="soft" onClick={() => setConfirmOpen(false)}>
                      {t('planControls.confirmRemove.cancel')}
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
                      {t('planControls.confirmRemove.confirm')}
                    </Button>
                  </AlertDialog.Action>
                </Flex>
              </Flex>
            </AlertDialog.Content>
          </AlertDialog.Root>
        </>
      ) : (
        <IconButton size="1" variant="surface" onClick={() => setModalOpen(true)} title={t('planControls.importPlan')}>
          <ImageIcon />
        </IconButton>
      )}
    </Flex>
  )
}
