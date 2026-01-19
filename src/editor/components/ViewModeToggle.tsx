import { useTranslation } from 'react-i18next'

import { Card } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { type ViewMode, useViewMode, useViewModeActions } from '@/editor/hooks/useViewMode'

export function ViewModeToggle(): React.JSX.Element {
  const { t } = useTranslation('common')
  const mode = useViewMode()
  const { setMode } = useViewModeActions()

  return (
    <div className="absolute top-2 left-2 z-10" data-testid="viewmode-toggle">
      <Card className="p-1 shadow-md">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={mode}
          onValueChange={value => {
            if (value) {
              setMode(value as ViewMode)
            }
          }}
        >
          <ToggleGroupItem value="walls">{t($ => $.viewMode.walls)}</ToggleGroupItem>
          <ToggleGroupItem value="floors">{t($ => $.viewMode.floors)}</ToggleGroupItem>
          <ToggleGroupItem value="roofs">{t($ => $.viewMode.roofs)}</ToggleGroupItem>
        </ToggleGroup>
      </Card>
    </div>
  )
}
