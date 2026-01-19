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
      className="bg-card border-border pointer-events-none absolute right-0 bottom-0 left-0 z-5 m-0 h-9 border-t p-0 px-1"
      data-testid="statusbar"
    >
      <div className="pointer-events-auto grid grid-cols-[1fr_1fr_2fr] items-center gap-4 p-0.5">
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
