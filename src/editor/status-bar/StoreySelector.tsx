import { Pencil1Icon } from '@radix-ui/react-icons'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { StoreyManagementModal } from '@/building/components/StoreyManagementModal'
import { useStoreyName } from '@/building/hooks/useStoreyName'
import type { Storey } from '@/building/model'
import type { StoreyId } from '@/building/model/ids'
import { useActiveStoreyId, useModelActions, useStoreysOrderedByLevel } from '@/building/store'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { clearSelection } from '@/editor/hooks/useSelectionStore'
import { cn } from '@/lib/utils'

export function getLevelColor(level: number): string {
  if (level === 0) {
    return 'text-green-600 dark:text-green-400'
  } else if (level > 0) {
    return 'text-indigo-600 dark:text-indigo-400'
  } else {
    return 'text-amber-700 dark:text-amber-400'
  }
}

function StoreyName({ storey }: { storey: Storey }) {
  const name = useStoreyName(storey)
  return <span>{name}</span>
}

export function StoreySelector(): React.JSX.Element {
  const { t } = useTranslation('common')
  const storeysOrdered = useStoreysOrderedByLevel()
  const activeStoreyId = useActiveStoreyId()
  const { setActiveStoreyId } = useModelActions()

  // Display storeys in intuitive order (highest to lowest, like elevator buttons)
  const storeysDisplayOrder = [...storeysOrdered].reverse()

  const handleStoreyChange = useCallback(
    (newStoreyId: string) => {
      console.log('Changing active storey to', newStoreyId)
      setActiveStoreyId(newStoreyId as StoreyId)
      clearSelection()
    },
    [setActiveStoreyId]
  )

  return (
    <div className="flex items-center gap-2">
      <Select value={activeStoreyId} onValueChange={handleStoreyChange}>
        <SelectTrigger className="h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {storeysDisplayOrder.map(storey => (
            <SelectItem key={storey.id} value={storey.id}>
              <span className="flex items-center gap-2">
                <code className={cn('font-mono font-bold text-sm', getLevelColor(storey.level))}>L{storey.level}</code>
                <StoreyName storey={storey} />
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <StoreyManagementModal
        trigger={
          <Button
            size="icon"
            className="h-7 w-7"
            title={t($ => $.storeys.manageFloorsTooltip)}
            type="button"
            variant="secondary"
          >
            <Pencil1Icon className="h-4 w-4" />
          </Button>
        }
      />
    </div>
  )
}
