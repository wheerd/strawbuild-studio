import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface ImportChoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultProjectName: string
  onChoice: (choice: 'current' | 'new', projectName?: string) => void
}

export function ImportChoiceDialog({
  open,
  onOpenChange,
  defaultProjectName,
  onChoice
}: ImportChoiceDialogProps): React.JSX.Element {
  const { t } = useTranslation('common')
  const [isImporting, setIsImporting] = useState(false)
  const [choice, setChoice] = useState<'current' | 'new'>('current')
  const [projectName, setProjectName] = useState(defaultProjectName)

  React.useEffect(() => {
    if (open) {
      setIsImporting(false)
      setChoice('current')
      setProjectName(defaultProjectName)
    }
  }, [open, defaultProjectName])

  const handleConfirm = () => {
    setIsImporting(true)
    try {
      if (choice === 'new') {
        const trimmedName = projectName.trim() || t($ => $.projectMenu.untitled)
        onChoice('new', trimmedName)
      } else {
        onChoice('current')
      }
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{t($ => $.projectMenu.importChoiceTitle)}</DialogTitle>
          <p className="text-muted-foreground text-sm">{t($ => $.projectMenu.importChoiceDescription)}</p>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup
            value={choice}
            onValueChange={value => {
              setChoice(value as 'current' | 'new')
            }}
          >
            <div className="space-y-3">
              <div className="flex items-start space-x-3 rounded-md border p-3">
                <RadioGroupItem value="current" id="current" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="current" className="cursor-pointer font-medium">
                    {t($ => $.projectMenu.importToCurrent)}
                  </Label>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {t($ => $.projectMenu.importToCurrentDescription)}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 rounded-md border p-3">
                <RadioGroupItem value="new" id="new" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="new" className="cursor-pointer font-medium">
                    {t($ => $.projectMenu.importToNew)}
                  </Label>
                  <p className="text-muted-foreground mt-1 text-sm">{t($ => $.projectMenu.importToNewDescription)}</p>
                </div>
              </div>
            </div>
          </RadioGroup>

          {choice === 'new' && (
            <div className="mt-4">
              <Label className="mb-2 block">{t($ => $.projectMenu.importProjectName)}</Label>
              <Input
                value={projectName}
                onChange={e => {
                  setProjectName(e.target.value)
                }}
                placeholder={t($ => $.projectMenu.importProjectNamePlaceholder)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
            disabled={isImporting}
          >
            {t($ => $.actions.cancel)}
          </Button>
          <Button onClick={handleConfirm} disabled={isImporting}>
            {t($ => $.projectMenu.import)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
