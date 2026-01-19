import React from 'react'

import { PlanOverlayControls } from '@/editor/plan-overlay/components/PlanOverlayControls'
import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher'

import { AutoSaveIndicator } from './AutoSaveIndicator'
import { GridSizeDisplay } from './GridSizeDisplay'
import { OfflineStatusIndicator } from './OfflineStatusIndicator'
import { PointerPositionDisplay } from './PointerPositionDisplay'
import { StoreySelector } from './StoreySelector'
import { ThemeToggle } from './ThemeToggle'

export function StatusBar(): React.JSX.Element {
  return (
    <div
      className="absolute z-5 pointer-events-none left-0 right-0 bottom-0 h-9 p-0 px-1 m-0 bg-card border-t border-border"
      data-testid="statusbar"
    >
      <div className="grid grid-cols-[1fr_1fr_2fr] items-center gap-4 p-0.5 pointer-events-auto">
        <div className="flex items-center gap-3 p-0">
          <OfflineStatusIndicator />
          <AutoSaveIndicator />
          <ThemeToggle />
          <LanguageSwitcher />
        </div>

        <div className="flex items-center justify-center gap-3">
          <StoreySelector />
        </div>

        <div className="flex items-center justify-end gap-3">
          <PointerPositionDisplay />
          <PlanOverlayControls />
          <GridSizeDisplay />
        </div>
      </div>
    </div>
  )
}
