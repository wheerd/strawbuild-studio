import { TrashIcon } from '@radix-ui/react-icons'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { FloorOpeningId } from '@/building/model/ids'
import { useFloorOpeningById, useModelActions } from '@/building/store'
import { popSelection } from '@/editor/hooks/useSelectionStore'
import { useViewportActions } from '@/editor/hooks/useViewportStore'
import { FitToViewIcon } from '@/shared/components/Icons'
import { Bounds2D, calculatePolygonArea, polygonPerimeter } from '@/shared/geometry'
import { useFormatters } from '@/shared/i18n/useFormatters'

interface FloorOpeningInspectorProps {
  floorOpeningId: FloorOpeningId
}

export function FloorOpeningInspector({ floorOpeningId }: FloorOpeningInspectorProps): React.JSX.Element | null {
  const { t } = useTranslation('inspector')
  const { formatArea, formatLength } = useFormatters()
  const opening = useFloorOpeningById(floorOpeningId)
  const { removeFloorOpening } = useModelActions()
  const { fitToView } = useViewportActions()

  const perimeterLength = useMemo(() => {
    if (!opening) return 0
    return polygonPerimeter(opening.area)
  }, [opening])

  const area = useMemo(() => {
    if (!opening) return 0
    return calculatePolygonArea(opening.area)
  }, [opening])

  const handleFitToView = useCallback(() => {
    if (!opening) return
    const bounds = Bounds2D.fromPoints(opening.area.points)
    fitToView(bounds)
  }, [opening, fitToView])

  if (!opening) {
    return (
      <div className="p-2">
        <span className="text-sm text-red-800 font-bold">{t($ => $.floorOpening.notFound)}</span>
      </div>
    )
  }

  return (
    <div className="p-2">
      <div className="flex flex-col gap-3">
        <DataList.Root size="1">
          <DataList.Item>
            <DataList.Label>{t($ => $.floorOpening.perimeter)}</DataList.Label>
            <DataList.Value>{formatLength(perimeterLength)}</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>{t($ => $.floorOpening.area)}</DataList.Label>
            <DataList.Value>{formatArea(area)}</DataList.Value>
          </DataList.Item>
        </DataList.Root>

        <Separator />

        <div className="flex justify-end gap-2">
          <Button variant="icon" title={t($ => $.floorOpening.fitToView)} onClick={handleFitToView}>
            <FitToViewIcon />
          </Button>
          <Button
            variant="icon"
            color="red"
            title={t($ => $.floorOpening.removeFloorOpening)}
            onClick={() => {
              removeFloorOpening(opening.id)
              popSelection()
            }}
          >
            <TrashIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}
