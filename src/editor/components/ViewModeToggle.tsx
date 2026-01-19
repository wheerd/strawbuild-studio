import { useTranslation } from 'react-i18next'

import { Card } from '@/components/ui/card'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { useViewMode, useViewModeActions } from '@/editor/hooks/useViewMode'

export function ViewModeToggle(): React.JSX.Element {
  const { t } = useTranslation('common')
  const mode = useViewMode()
  const { setMode } = useViewModeActions()

  return (
    <div className="absolute top-2 left-2 z-10" data-testid="viewmode-toggle">
      <Card className="p-1 shadow-md">
        <SegmentedControl.Root
          size="sm"
          value={mode}
          onValueChange={value => {
            setMode(value)
          }}
        >
          <SegmentedControl.Item value="walls">{t($ => $.viewMode.walls)}</SegmentedControl.Item>
          <SegmentedControl.Item value="floors">{t($ => $.viewMode.floors)}</SegmentedControl.Item>
          <SegmentedControl.Item value="roofs">{t($ => $.viewMode.roofs)}</SegmentedControl.Item>
        </SegmentedControl.Root>
      </Card>
    </div>
  )
}
