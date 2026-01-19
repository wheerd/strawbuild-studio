import { Cross2Icon } from '@radix-ui/react-icons'
import { useTranslation } from 'react-i18next'

import { usePlanHighlight } from './PlanHighlightContext'

export function PartHighlightPanel() {
  const { t } = useTranslation('construction')
  const { highlightedPartId, setHighlightedPartId } = usePlanHighlight()

  if (!highlightedPartId) return null

  return (
    <div className="absolute bottom-3 left-3 z-10">
      <Card size="1" variant="surface" className="shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-base">{t($ => $.planModal.partHighlight.partHighlighted)}</span>
          <Button
            variant="icon"
            size="sm"
            variant="ghost"
            onClick={() => {
              setHighlightedPartId(null)
            }}
            title={t($ => $.planModal.partHighlight.clearHighlight)}
          >
            <Cross2Icon />
          </Button>
        </div>
      </Card>
    </div>
  )
}
