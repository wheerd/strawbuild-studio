import { ExclamationTriangleIcon, ImageIcon } from '@radix-ui/react-icons'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useActiveStoreyId, useStoreyById } from '@/building/store'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
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

  const handlePlacementChange = (placement: FloorPlanPlacement) => {
    setPlacement(activeStoreyId, placement)
  }

  return (
    <div className="flex items-center gap-2">
      <PlanImportModal floorId={activeStoreyId} open={modalOpen} onOpenChange={setModalOpen} existingPlan={plan} />
      {plan ? (
        <>
          <DropdownMenu>
            <DropdownMenu.Trigger>
              <Button
                size="icon-sm"
                className="size-7"
                variant="secondary"
                aria-label={t($ => $.planControls.ariaLabel)}
              >
                <ImageIcon />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Label>{t($ => $.planControls.label)}</DropdownMenu.Label>
              <DropdownMenu.RadioGroup
                value={plan.placement}
                onValueChange={value => {
                  handlePlacementChange(value as FloorPlanPlacement)
                }}
              >
                <DropdownMenu.RadioItem value="over">
                  {t($ => $.planControls.placement.showOnTop)}
                </DropdownMenu.RadioItem>
                <DropdownMenu.RadioItem value="under">
                  {t($ => $.planControls.placement.showUnder)}
                </DropdownMenu.RadioItem>
              </DropdownMenu.RadioGroup>
              <DropdownMenu.Separator />
              <DropdownMenu.Item
                onSelect={() => {
                  setModalOpen(true)
                }}
              >
                {t($ => $.planControls.recalibrate)}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="text-destructive"
                onSelect={() => {
                  setConfirmOpen(true)
                }}
              >
                {t($ => $.planControls.removePlan)}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>

          <AlertDialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialog.Content>
              <div className="flex flex-col gap-3">
                <AlertDialog.Title>
                  <div className="flex items-center gap-2">
                    <ExclamationTriangleIcon />
                    <span>{t($ => $.planControls.confirmRemove.title)}</span>
                  </div>
                </AlertDialog.Title>
                <AlertDialog.Description>
                  {t($ => $.planControls.confirmRemove.description, {
                    floor: storey?.name ?? 'this floor'
                  })}
                </AlertDialog.Description>
                <div className="justify-end gap-2">
                  <AlertDialog.Cancel>
                    <Button
                      variant="soft"
                      onClick={() => {
                        setConfirmOpen(false)
                      }}
                    >
                      {t($ => $.planControls.confirmRemove.cancel)}
                    </Button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        clearPlan(activeStoreyId)
                        setConfirmOpen(false)
                      }}
                    >
                      {t($ => $.planControls.confirmRemove.confirm)}
                    </Button>
                  </AlertDialog.Action>
                </div>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Root>
        </>
      ) : (
        <Button
          size="icon-sm"
          className="size-7"
          variant="secondary"
          onClick={() => {
            setModalOpen(true)
          }}
          title={t($ => $.planControls.importPlan)}
        >
          <ImageIcon />
        </Button>
      )}
    </div>
  )
}
