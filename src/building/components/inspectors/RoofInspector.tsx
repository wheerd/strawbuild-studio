import { ExclamationTriangleIcon, ReloadIcon, SquareIcon, TrashIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { RoofPreview } from '@/building/components/inspectors/RoofPreview'
import type { RoofOverhang } from '@/building/model'
import type { RoofId } from '@/building/model/ids'
import { useModelActions, useRoofById, useRoofOverhangsByRoof } from '@/building/store'
import { Button } from '@/components/ui/button'
import { DataList } from '@/components/ui/data-list'
import { Separator } from '@/components/ui/separator'
import { Tooltip } from '@/components/ui/tooltip'
import { ConstructionPlanModal } from '@/construction/components/ConstructionPlanModal'
import { FRONT_VIEW, LEFT_VIEW, TOP_VIEW } from '@/construction/components/plan/ConstructionPlan'
import { RoofAssemblySelectWithEdit } from '@/construction/config/components/RoofAssemblySelectWithEdit'
import { useDefaultRoofAssemblyId } from '@/construction/config/store'
import { constructRoof } from '@/construction/roofs'
import { TAG_DECKING } from '@/construction/tags'
import { ConstructionViewer3DModal } from '@/construction/viewer3d/ConstructionViewer3DModal'
import { popSelection, replaceSelection } from '@/editor/hooks/useSelectionStore'
import { useViewModeActions } from '@/editor/hooks/useViewMode'
import { useViewportActions } from '@/editor/hooks/useViewportStore'
import { ConstructionPlanIcon, FitToViewIcon, Model3DIcon } from '@/shared/components/Icons'
import { LengthField } from '@/shared/components/LengthField'
import { NumberField } from '@/shared/components/NumberField'
import {
  Bounds2D,
  type Length,
  calculatePolygonArea,
  degreesToRadians,
  polygonPerimeter,
  radiansToDegrees
} from '@/shared/geometry'
import { useFormatters } from '@/shared/i18n/useFormatters'

interface RoofInspectorProps {
  roofId: RoofId
}

interface MixedState<T> {
  isMixed: boolean
  value: T | null
}

function detectMixedOverhangs(overhangs: RoofOverhang[]): MixedState<Length> {
  if (overhangs.length === 0) return { isMixed: false, value: null }

  const firstValue = overhangs[0].value
  const allSame = overhangs.every(o => o.value === firstValue)

  return {
    isMixed: !allSame,
    value: allSame ? firstValue : null
  }
}

function MixedStateIndicator({ tooltip }: { tooltip: string }) {
  return (
    <Tooltip content={tooltip}>
      <ExclamationTriangleIcon width={14} height={14} style={{ color: 'var(--color-orange-900)' }} />
    </Tooltip>
  )
}

export function RoofInspector({ roofId }: RoofInspectorProps): React.JSX.Element | null {
  const { t } = useTranslation('inspector')
  const { formatArea, formatLength } = useFormatters()
  const roof = useRoofById(roofId)
  const overhangs = useRoofOverhangsByRoof(roofId)
  const { removeRoof, updateRoofProperties, setAllRoofOverhangs, cycleRoofMainSide } = useModelActions()
  const { fitToView } = useViewportActions()
  const { setMode } = useViewModeActions()
  const defaultAssemblyId = useDefaultRoofAssemblyId()

  const perimeterLength = useMemo(() => {
    if (!roof) return 0
    return polygonPerimeter(roof.overhangPolygon)
  }, [roof])

  const area = useMemo(() => {
    if (!roof) return 0
    return calculatePolygonArea(roof.overhangPolygon)
  }, [roof])

  const overhangState = useMemo(() => detectMixedOverhangs(overhangs), [overhangs])

  const handleNavigateToPerimeter = useCallback(() => {
    if (!roof?.referencePerimeter) return
    setMode('walls')
    replaceSelection([roof.referencePerimeter])
  }, [roof?.referencePerimeter, setMode])

  const handleFitToView = useCallback(() => {
    if (!roof) return
    const bounds = Bounds2D.fromPoints(roof.overhangPolygon.points)
    fitToView(bounds)
  }, [roof, fitToView])

  const handleSlopeChange = useCallback(
    (value: number) => {
      if (roof && value >= 0 && value <= 90) {
        updateRoofProperties(roof.id, { slope: value })
      }
    },
    [roof, updateRoofProperties]
  )

  const handleVerticalOffsetChange = useCallback(
    (value: number) => {
      if (roof) {
        updateRoofProperties(roof.id, { verticalOffset: value })
      }
    },
    [roof, updateRoofProperties]
  )

  if (!roof) {
    return (
      <div className="p-2">
        <span className="text-sm font-bold text-red-800">{t($ => $.roof.notFound)}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-center">
        <RoofPreview slope={roof.slope} type={roof.type} />
      </div>

      {/* Basic Information */}
      <DataList.Root>
        <DataList.Item>
          <DataList.Label>{t($ => $.roof.type)}</DataList.Label>
          <DataList.Value>{roof.type === 'gable' ? t($ => $.roof.typeGable) : t($ => $.roof.typeShed)}</DataList.Value>
        </DataList.Item>
        <DataList.Item>
          <DataList.Label>{t($ => $.roof.perimeter)}</DataList.Label>
          <DataList.Value>{formatLength(perimeterLength)}</DataList.Value>
        </DataList.Item>
        <DataList.Item>
          <DataList.Label>{t($ => $.roof.area)}</DataList.Label>
          <DataList.Value>{formatArea(area)}</DataList.Value>
        </DataList.Item>
      </DataList.Root>

      <Separator />

      {/* Editable Properties */}
      <div className="flex flex-col gap-2">
        {/* Assembly */}
        <div className="flex justify-between gap-1">
          <Label.Root>
            <span className="text-sm font-medium">{t($ => $.roof.assembly)}</span>
          </Label.Root>
          <RoofAssemblySelectWithEdit
            value={roof.assemblyId}
            onValueChange={assemblyId => updateRoofProperties(roof.id, { assemblyId })}
            showDefaultIndicator
            defaultAssemblyId={defaultAssemblyId}
            size="sm"
          />
        </div>

        {/* Slope */}
        <div className="flex items-center justify-between gap-2">
          <Label.Root htmlFor="roof-slope">
            <span className="text-sm font-medium">{t($ => $.roof.slope)}</span>
          </Label.Root>

          <div className="flex items-center gap-2">
            <NumberField.Root
              value={roof.slope}
              onChange={value => {
                if (value != null && value >= 0 && value <= 90) {
                  handleSlopeChange(value)
                }
              }}
              size="sm"
              precision={2}
            >
              <NumberField.Input id="roof-slope" className="w-10" min={0} max={90} />
              <NumberField.Slot side="right">°</NumberField.Slot>
              <NumberField.Spinner />
            </NumberField.Root>

            <NumberField.Root
              value={Math.tan(degreesToRadians(roof.slope)) * 100}
              onChange={value => {
                if (value != null) {
                  handleSlopeChange(radiansToDegrees(Math.atan(value / 100)))
                }
              }}
              size="sm"
              precision={2}
            >
              <NumberField.Input className="w-10" min={0} max={100} step={1} />
              <NumberField.Slot side="right">%</NumberField.Slot>
              <NumberField.Spinner />
            </NumberField.Root>
          </div>
        </div>

        {/* Vertical Offset */}
        <div className="flex items-center justify-between gap-2">
          <Label.Root htmlFor="vertical-offset">
            <span className="text-sm font-medium">{t($ => $.roof.verticalOffset)}</span>
          </Label.Root>
          <LengthField
            id="vertical-offset"
            value={roof.verticalOffset}
            onCommit={handleVerticalOffsetChange}
            min={-10000}
            max={10000}
            size="sm"
            unit="cm"
            style={{ width: '7em' }}
          />
        </div>

        {/* Global Overhang with MixedState */}
        <div className="flex items-center justify-between gap-2">
          <Label.Root htmlFor="roof-overhang">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium">{t($ => $.roof.overhang)}</span>
              {overhangState.isMixed && <MixedStateIndicator tooltip={t($ => $.roof.mixedValuesTooltip)} />}
            </div>
          </Label.Root>
          <LengthField
            id="roof-overhang"
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            value={overhangState.value!}
            onCommit={value => setAllRoofOverhangs(roof.id, value)}
            placeholder={overhangState.isMixed ? t($ => $.roof.mixedPlaceholder) : undefined}
            min={0}
            max={2000}
            step={10}
            size="sm"
            unit="cm"
            style={{ width: '7em' }}
          />
        </div>

        {overhangState.isMixed && <span className="text-sm">{t($ => $.roof.mixedWarning)}</span>}
      </div>

      <Separator />

      {/* Construction Views */}
      <div className="flex flex-row items-center justify-center gap-3 pt-1">
        <ConstructionPlanModal
          title={t($ => $.roof.constructionPlanTitle)}
          constructionModelFactory={() => Promise.resolve(constructRoof(roof))}
          midCutActiveDefault={false}
          views={[
            { view: TOP_VIEW, label: t($ => $.roof.viewTop), toggleHideTags: [TAG_DECKING.id] },
            { view: FRONT_VIEW, label: t($ => $.roof.viewFront) },
            { view: LEFT_VIEW, label: t($ => $.roof.viewLeft) }
          ]}
          defaultHiddenTags={['roof-layer']}
          refreshKey={roof}
          trigger={
            <Button size="icon" title={t($ => $.roof.viewConstructionPlan)}>
              <ConstructionPlanIcon width={24} height={24} />
            </Button>
          }
        />
        <ConstructionViewer3DModal
          constructionModelFactory={() => Promise.resolve(constructRoof(roof))}
          refreshKey={roof}
          trigger={
            <Button size="icon" title={t($ => $.roof.view3DConstruction)} variant="outline">
              <Model3DIcon width={24} height={24} />
            </Button>
          }
        />
      </div>

      <Separator />

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        {roof.referencePerimeter && (
          <Button size="icon" title={t($ => $.roof.viewAssociatedPerimeter)} onClick={handleNavigateToPerimeter}>
            <SquareIcon />
          </Button>
        )}
        <Tooltip content={t($ => $.roof.cycleMainSide)}>
          <Button size="icon" onClick={() => cycleRoofMainSide(roofId)}>
            <ReloadIcon />
          </Button>
        </Tooltip>
        <Button size="icon" title={t($ => $.roof.fitToView)} onClick={handleFitToView}>
          <FitToViewIcon />
        </Button>
        <Button
          size="icon"
          variant="destructive"
          title={t($ => $.roof.removeRoof)}
          onClick={() => {
            removeRoof(roof.id)
            popSelection()
          }}
        >
          <TrashIcon />
        </Button>
      </div>
    </div>
  )
}
