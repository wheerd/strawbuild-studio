import * as Label from '@radix-ui/react-label'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import type { RoofOverhangId } from '@/building/model/ids'
import { useModelActions, useRoofOverhangById } from '@/building/store'
import { Button } from '@/components/ui/button'
import { Callout, CalloutText } from '@/components/ui/callout'
import { Separator } from '@/components/ui/separator'
import { useViewportActions } from '@/editor/hooks/useViewportStore'
import { FitToViewIcon } from '@/shared/components/Icons'
import { LengthField } from '@/shared/components/LengthField'
import { Bounds2D } from '@/shared/geometry'

export function RoofOverhangInspector({ overhangId }: { overhangId: RoofOverhangId }): React.JSX.Element {
  const { t } = useTranslation('inspector')
  const overhang = useRoofOverhangById(overhangId)
  const { updateRoofOverhangById } = useModelActions()
  const { fitToView } = useViewportActions()

  const handleFitToView = useCallback(() => {
    if (!overhang) return
    const bounds = Bounds2D.fromPoints(overhang.area.points)
    fitToView(bounds)
  }, [overhang, fitToView])

  if (!overhang) {
    return (
      <div className="p-2">
        <Callout className="text-destructive">
          <CalloutText>
            <span className="font-bold">{t($ => $.roofOverhang.notFound)}</span>
          </CalloutText>
        </Callout>
      </div>
    )
  }

  return (
    <div className="p-2">
      <div className="flex flex-col gap-3">
        <span className="text-base font-bold">
          {t($ => $.roofOverhang.title, {
            side: overhang.sideIndex + 1
          })}
        </span>

        <Separator />

        {/* Overhang Value */}
        <div className="items-center gap-2 justify-between">
          <Label.Root>
            <span className="text-sm font-medium text-gray-900">{t($ => $.roofOverhang.overhang)}</span>
          </Label.Root>
          <LengthField
            value={overhang.value}
            onCommit={value => updateRoofOverhangById(overhang.id, value)}
            min={0}
            max={2000}
            step={10}
            size="sm"
            unit="cm"
            style={{ width: '7em' }}
          />
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button size="icon" title={t($ => $.roofOverhang.fitToView)} onClick={handleFitToView}>
            <FitToViewIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}
