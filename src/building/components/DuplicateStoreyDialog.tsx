import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { DuplicateStoreyOptions } from '@/building/store/services/StoreyManagementService'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'

export interface DuplicateStoreyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (options: DuplicateStoreyOptions) => void
  children: ReactNode
}

export function DuplicateStoreyDialog({ open, onOpenChange, onConfirm, children }: DuplicateStoreyDialogProps) {
  const { t } = useTranslation('common')
  const [options, setOptions] = useState<DuplicateStoreyOptions>({
    copyOpenings: true,
    copyWallPosts: true,
    copyFloorOpenings: true,
    copyConstraints: true
  })

  const handleConfirm = useCallback(() => {
    onConfirm(options)
  }, [options, onConfirm])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t($ => $.storeys.duplicateTitle)}</DialogTitle>
          <DialogDescription>{t($ => $.storeys.duplicateDescription)}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-4">
          <label className="flex items-center gap-2">
            <Checkbox
              checked={options.copyOpenings}
              onCheckedChange={checked => {
                setOptions((prev: DuplicateStoreyOptions) => {
                  return { ...prev, copyOpenings: checked === true }
                })
              }}
            />
            <span>{t($ => $.storeys.copyOpenings)}</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={options.copyWallPosts}
              onCheckedChange={checked => {
                setOptions((prev: DuplicateStoreyOptions) => {
                  return { ...prev, copyWallPosts: checked === true }
                })
              }}
            />
            <span>{t($ => $.storeys.copyWallPosts)}</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={options.copyFloorOpenings}
              onCheckedChange={checked => {
                setOptions((prev: DuplicateStoreyOptions) => {
                  return { ...prev, copyFloorOpenings: checked === true }
                })
              }}
            />
            <span>{t($ => $.storeys.copyFloorOpenings)}</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={options.copyConstraints}
              onCheckedChange={checked => {
                setOptions((prev: DuplicateStoreyOptions) => {
                  return { ...prev, copyConstraints: checked === true }
                })
              }}
            />
            <span>{t($ => $.storeys.copyConstraints)}</span>
          </label>
        </div>
        <DialogFooter>
          <Button
            variant="soft"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t($ => $.actions.cancel)}
          </Button>
          <Button onClick={handleConfirm}>{t($ => $.storeys.duplicateConfirm)}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
