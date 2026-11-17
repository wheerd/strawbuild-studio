import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/shared/ui/components/button'
import { ConstructionPlanIcon } from '@/shared/ui/icons'

import { usePartsListView } from './PartsListViewContext'

export function PartsListControls(): React.JSX.Element | null {
  const { t } = useTranslation('construction')
  const { focusId, focusType, clearFocus } = usePartsListView()
  const navigate = useNavigate()

  if (focusType === null) {
    return null
  }

  const focusLabel = (() => {
    switch (focusType) {
      case 'storey':
        return t($ => $.partsList.focus.storey)
      case 'perimeter':
        return t($ => $.partsList.focus.perimeter)
      case 'wall':
        return t($ => $.partsList.focus.wall)
      case 'interiorWall':
        return t($ => $.partsList.focus.interiorWall)
      case 'roof':
        return t($ => $.partsList.focus.roof)
      default:
        return ''
    }
  })()

  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        variant="secondary"
        onClick={clearFocus}
        title={t($ => $.partsList.clearFocus)}
        className="text-foreground flex h-9 items-center gap-1 bg-amber-200 p-0 px-3 shadow-none hover:bg-amber-300 dark:bg-amber-900 dark:hover:bg-amber-800"
      >
        <span className="text-sm font-medium">{focusLabel}</span>
        <X />
      </Button>

      <Button
        variant="outline"
        size="icon-sm"
        title={t($ => $.partsList.actions.viewInPlan)}
        onClick={() => {
          void navigate(`/plan/${focusId}`)
        }}
      >
        <ConstructionPlanIcon />
      </Button>
    </div>
  )
}
