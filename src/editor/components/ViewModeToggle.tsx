import { useTranslation } from 'react-i18next'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { type ViewMode, useViewMode, useViewModeActions } from '@/editor/hooks/useViewMode'

export function ViewModeToggle(): React.JSX.Element {
  const { t } = useTranslation('common')
  const mode = useViewMode()
  const { setMode } = useViewModeActions()

  return (
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
      data-testid="viewmode-toggle"
      className="bg-card absolute top-2 left-2 z-10 border shadow-md"
    >
      <ToggleGroupItem value="walls">{t($ => $.viewMode.walls)}</ToggleGroupItem>
      <ToggleGroupItem value="floors">{t($ => $.viewMode.floors)}</ToggleGroupItem>
      <ToggleGroupItem value="roofs">{t($ => $.viewMode.roofs)}</ToggleGroupItem>
    </ToggleGroup>
  )
}
