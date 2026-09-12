import * as Label from '@radix-ui/react-label'
import { Trash } from 'lucide-react'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import type { IntermediateWallId } from '@/building/model/ids'
import { useIntermediateWallById, useModelActions } from '@/building/store'
import { InteriorWallAssemblySelectWithEdit } from '@/config/ui/interior-wall-assembly/InteriorWallAssemblySelectWithEdit'
import { useViewportActions } from '@/editor/canvas/state/viewportStore'
import { Bounds2D } from '@/shared/geometry'
import { useFormatters } from '@/shared/i18n/useFormatters'
import { LengthField } from '@/shared/ui/LengthField'
import { Button } from '@/shared/ui/components/button'
import { DataList } from '@/shared/ui/components/data-list'
import { Separator } from '@/shared/ui/components/separator'
import { FitToViewIcon } from '@/shared/ui/icons'

export function IntermediateWallInspector({ wallId }: { wallId: IntermediateWallId }): React.JSX.Element {
  const { t } = useTranslation('inspector')
  const { formatLength } = useFormatters()
  const wall = useIntermediateWallById(wallId)
  const { removeIntermediateWall, updateIntermediateWallAssembly, updateIntermediateWallThickness } = useModelActions()
  const { fitToView } = useViewportActions()

  const handleFitToView = useCallback(() => {
    const bounds = Bounds2D.fromPoints(wall.boundary.points)
    fitToView(bounds)
  }, [wall, fitToView])

  const handleDelete = useCallback(() => {
    removeIntermediateWall(wallId)
  }, [removeIntermediateWall, wallId])

  return (
    <div className="p-2">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.intermediateWall.wallAssembly)}</span>
          </Label.Root>
          <InteriorWallAssemblySelectWithEdit
            value={wall.wallAssemblyId}
            onValueChange={assemblyId => {
              updateIntermediateWallAssembly(wallId, assemblyId)
            }}
            placeholder={t($ => $.intermediateWall.selectAssemblyPlaceholder)}
            size="sm"
          />

          <Label.Root htmlFor="intermediate-wall-thickness">
            <span className="text-sm font-medium">{t($ => $.intermediateWall.thickness)}</span>
          </Label.Root>
          <LengthField
            id="intermediate-wall-thickness"
            value={wall.thickness}
            onCommit={value => {
              updateIntermediateWallThickness(wallId, value)
            }}
            min={1}
            step={10}
            size="sm"
            unit="cm"
            className="w-20 grow"
          />
        </div>

        <DataList.Root>
          <DataList.Item>
            <DataList.Label>{t($ => $.intermediateWall.wallLength)}</DataList.Label>
            <DataList.Value>{formatLength(wall.wallLength)}</DataList.Value>
          </DataList.Item>
        </DataList.Root>

        <Separator />

        <div className="flex justify-end gap-2">
          <Button size="icon" title={t($ => $.intermediateWall.fitToView)} onClick={handleFitToView}>
            <FitToViewIcon />
          </Button>
          <Button
            size="icon"
            variant="destructive"
            title={t($ => $.intermediateWall.deleteWall)}
            onClick={handleDelete}
          >
            <Trash />
          </Button>
        </div>
      </div>
    </div>
  )
}
