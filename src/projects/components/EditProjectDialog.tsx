import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useProjectDescription, useProjectName, useProjectsActions } from '@/projects/store'

interface EditProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditProjectDialog({ open, onOpenChange }: EditProjectDialogProps): React.JSX.Element {
  const { t } = useTranslation('common')
  const currentName = useProjectName()
  const currentDescription = useProjectDescription()
  const { setProjectName, setProjectDescription } = useProjectsActions()

  const [name, setName] = useState(currentName)
  const [description, setDescription] = useState(currentDescription ?? '')

  React.useEffect(() => {
    if (open) {
      setName(currentName)
      setDescription(currentDescription ?? '')
    }
  }, [open, currentName, currentDescription])

  const handleSave = () => {
    const trimmedName = name.trim() || t($ => $.projectMenu.untitled)
    setProjectName(trimmedName)
    setProjectDescription(description.trim() || undefined)
    onOpenChange(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t($ => $.projectMenu.editProject)}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-4">
          <Label className="grid grid-cols-4 items-center gap-4 text-right">
            {t($ => $.projectMenu.projectName)}
            <Input
              value={name}
              onChange={e => {
                setName(e.target.value)
              }}
              onKeyDown={handleKeyDown}
              className="col-span-3"
              required
            />
          </Label>
          <Label className="grid grid-cols-4 items-start gap-4 pt-2 text-right">
            {t($ => $.projectMenu.description)}
            <Textarea
              value={description}
              onChange={e => {
                setDescription(e.target.value)
              }}
              placeholder={t($ => $.projectMenu.descriptionPlaceholder)}
              className="col-span-3 min-h-[80px]"
            />
          </Label>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t($ => $.actions.cancel)}
          </Button>
          <Button onClick={handleSave}>{t($ => $.projectMenu.save)}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
