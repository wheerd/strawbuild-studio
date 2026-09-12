import React from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router-dom'

import { cn } from '@/shared/ui/utils'

import type { ConfigTab } from './useConfigNavigation'

const tabs: ConfigTab[] = [
  'materials',
  'layers',
  'ringbeams',
  'perimeter-walls',
  'interior-walls',
  'openings',
  'floors',
  'roofs'
]

export function ConfigLayout(): React.JSX.Element {
  const { t } = useTranslation('config')

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="shrink-0 border-b px-4">
        <nav data-testid="config-tabs" className="flex gap-1">
          {tabs.map(tab => (
            <NavLink
              key={tab}
              to={`/config/${tab}`}
              className={({ isActive }) =>
                cn(
                  'ring-offset-background inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                  isActive && 'bg-background text-foreground shadow-sm'
                )
              }
            >
              {t($ =>
                tab === 'perimeter-walls'
                  ? $.tabs.perimeterWalls
                  : tab === 'interior-walls'
                    ? $.tabs.interiorWalls
                    : $.tabs[tab as keyof typeof $.tabs]
              )}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        <Outlet />
      </div>
    </div>
  )
}
