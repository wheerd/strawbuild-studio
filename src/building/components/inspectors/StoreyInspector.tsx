import React from 'react'
import { useTranslation } from 'react-i18next'

import { useStoreyName } from '@/building/hooks/useStoreyName'
import type { StoreyId } from '@/building/model/ids'
import { usePerimeters, useStoreyById } from '@/building/store'
import { Callout, CalloutText } from '@/components/ui/callout'
import { getPerimeterStats } from '@/construction/perimeters/stats'
import { getLevelColor } from '@/editor/status-bar/StoreySelector'
import { cn } from '@/lib/utils'
import { useFormatters } from '@/shared/i18n/useFormatters'

interface StoreyInspectorProps {
  selectedId: StoreyId
}

export function StoreyInspector({ selectedId }: StoreyInspectorProps): React.JSX.Element {
  const { t } = useTranslation('inspector')
  // Get storey data from model store
  const storey = useStoreyById(selectedId)
  const storeyName = useStoreyName(storey)
  const perimeters = Object.values(usePerimeters()).filter(perimeter => perimeter.storeyId === selectedId)
  const perimeterStats = perimeters.map(perimeter => getPerimeterStats(perimeter))
  const { formatArea, formatLength, formatVolume, formatPercentage, formatNumber } = useFormatters()
  const combinedStats = perimeterStats.reduce(
    (acc, stats) => ({
      footprint: acc.footprint + stats.footprint,
      totalFloorArea: acc.totalFloorArea + stats.totalFloorArea,
      totalConstructionWallArea: acc.totalConstructionWallArea + stats.totalConstructionWallArea,
      totalFinishedWallArea: acc.totalFinishedWallArea + stats.totalFinishedWallArea,
      totalExteriorWallArea: acc.totalExteriorWallArea + stats.totalExteriorWallArea,
      totalWindowArea: acc.totalWindowArea + stats.totalWindowArea,
      totalDoorArea: acc.totalDoorArea + stats.totalDoorArea,
      totalVolume: acc.totalVolume + stats.totalVolume,
      storeyHeight: Math.max(acc.storeyHeight, stats.storeyHeight),
      ceilingHeight: Math.max(acc.ceilingHeight, stats.ceilingHeight)
    }),
    {
      footprint: 0,
      totalFloorArea: 0,
      totalConstructionWallArea: 0,
      totalFinishedWallArea: 0,
      totalExteriorWallArea: 0,
      totalWindowArea: 0,
      totalDoorArea: 0,
      totalVolume: 0,
      storeyHeight: 0,
      ceilingHeight: 0
    }
  )

  // If storey not found, show error
  if (!storey) {
    return (
      <div className="p-2">
        <Callout className="text-destructive">
          <CalloutText>
            <span className="font-bold">{t($ => $.storey.notFound)}</span>
            <br />
            {t($ => $.storey.notFoundMessage, {
              id: selectedId
            })}
          </CalloutText>
        </Callout>
      </div>
    )
  }

  if (perimeterStats.length === 0) {
    return (
      <div className="p-2">
        <Callout color="yellow">
          <CalloutText>{t($ => $.storey.noPerimeters)}</CalloutText>
        </Callout>
      </div>
    )
  }

  return (
    <div className="p-2">
      <div className="flex flex-col gap-3">
        {/* Basic Information */}
        <h2 className="flex items-baseline gap-2 font-semibold">
          <span className={cn('font-mono text-sm font-bold', getLevelColor(storey.level))}>L{storey.level}</span>
          <span>{storeyName}</span>
        </h2>

        <div className="grid grid-cols-[auto_1fr] gap-x-1 gap-y-2 text-sm">
          <span className="text-muted-foreground font-medium">{t($ => $.storey.footprint)}</span>
          <span className="flex justify-end">{formatArea(combinedStats.footprint)}</span>

          <span className="text-muted-foreground font-medium">{t($ => $.storey.usableFloorArea)}</span>
          <span className="flex justify-end">{formatArea(combinedStats.totalFloorArea)}</span>

          <span className="text-muted-foreground font-medium">{t($ => $.storey.constructionWallArea)}</span>
          <span className="flex justify-end">{formatArea(combinedStats.totalConstructionWallArea)}</span>

          <span className="text-muted-foreground font-medium">{t($ => $.storey.finishedWallArea)}</span>
          <span className="flex justify-end">{formatArea(combinedStats.totalFinishedWallArea)}</span>

          <span className="text-muted-foreground font-medium">{t($ => $.storey.exteriorWallArea)}</span>
          <span className="flex justify-end">{formatArea(combinedStats.totalExteriorWallArea)}</span>

          <span className="text-muted-foreground font-medium">{t($ => $.storey.windowArea)}</span>
          <span className="flex justify-end">{formatArea(combinedStats.totalWindowArea)}</span>

          <span className="text-muted-foreground font-medium">{t($ => $.storey.wallToWindowRatio)}</span>
          <span className="flex justify-end">
            {formatPercentage((combinedStats.totalWindowArea / combinedStats.totalFinishedWallArea) * 100)}
          </span>

          <span className="text-muted-foreground font-medium">{t($ => $.storey.doorArea)}</span>
          <span className="flex justify-end">{formatArea(combinedStats.totalDoorArea)}</span>

          <span className="text-muted-foreground font-medium">{t($ => $.storey.totalVolume)}</span>
          <span className="flex justify-end">{formatVolume(combinedStats.totalVolume)}</span>

          <span className="text-muted-foreground font-medium">{t($ => $.storey.surfaceAreaToVolumeRatio)}</span>
          <span className="flex justify-end">
            {formatNumber((combinedStats.totalExteriorWallArea / combinedStats.totalVolume) * 1000, 2)}
          </span>

          <span className="text-muted-foreground font-medium">{t($ => $.storey.floorHeight)}</span>
          <span className="flex justify-end">{formatLength(combinedStats.storeyHeight)}</span>

          <span className="text-muted-foreground font-medium">{t($ => $.storey.ceilingHeight)}</span>
          <span className="flex justify-end">{formatLength(combinedStats.ceilingHeight)}</span>
        </div>
      </div>
    </div>
  )
}
