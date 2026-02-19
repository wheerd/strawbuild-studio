import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

import { usePlanHighlight } from './PlanHighlightContext'

export function PartHighlightPanel() {
  const { t } = useTranslation('construction')
  const { highlightedPartId, setHighlightedPartId } = usePlanHighlight()

  if (!highlightedPartId) return null

  return (
    <div className="absolute bottom-3 left-3 z-10">
      <Card size="sm" variant="soft" className="shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-base">{t($ => $.planModal.partHighlight.partHighlighted)}</span>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              setHighlightedPartId(null)
            }}
            title={t($ => $.planModal.partHighlight.clearHighlight)}
          >
            <X />
          </Button>
        </div>
      </Card>
    </div>
  )
}
