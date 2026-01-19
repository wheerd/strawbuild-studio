import { ExclamationTriangleIcon, PinLeftIcon, PinRightIcon, TrashIcon } from '@radix-ui/react-icons'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { PerimeterCornerId } from '@/building/model/ids'
import { useModelActions, usePerimeterCornerById, usePerimeterWallById } from '@/building/store'
import { useConfigActions } from '@/construction/config/store'
import { popSelection } from '@/editor/hooks/useSelectionStore'
import { useViewportActions } from '@/editor/hooks/useViewportStore'
import { FitToViewIcon, SplitWallIcon } from '@/shared/components/Icons'
import { Bounds2D, midpoint } from '@/shared/geometry'

export function PerimeterCornerInspector({ cornerId }: { cornerId: PerimeterCornerId }): React.JSX.Element {
  const { t } = useTranslation('inspector')
  const {
    updatePerimeterCornerConstructedByWall: updateCornerConstructedByWall,
    removePerimeterCorner,
    canSwitchCornerConstructedByWall,
    canRemovePerimeterCorner
  } = useModelActions()
  const { getWallAssemblyById } = useConfigActions()
  const viewportActions = useViewportActions()

  const corner = usePerimeterCornerById(cornerId)
  const previousWall = usePerimeterWallById(corner.previousWallId)
  const nextWall = usePerimeterWallById(corner.nextWallId)

  const canSwitchWall = useMemo(() => canSwitchCornerConstructedByWall(cornerId), [cornerId])

  const handleToggleConstructedByWall = useCallback(() => {
    const newConstructedByWall = corner.constructedByWall === 'previous' ? 'next' : 'previous'
    updateCornerConstructedByWall(cornerId, newConstructedByWall)
  }, [cornerId, corner.constructedByWall])

  const handleDeleteCorner = useCallback(() => {
    if (removePerimeterCorner(cornerId)) {
      popSelection()
    }
  }, [removePerimeterCorner, cornerId])

  // Check if there are construction notes to display
  const hasConstructionNotes = useMemo(() => {
    const prevAssembly = getWallAssemblyById(previousWall.wallAssemblyId)
    const nextAssembly = getWallAssemblyById(nextWall.wallAssemblyId)
    const hasMixedAssembly = prevAssembly?.type !== nextAssembly?.type
    const hasThicknessDifference = Math.abs(previousWall.thickness - nextWall.thickness) > 5

    return hasMixedAssembly || hasThicknessDifference
  }, [previousWall, nextWall, getWallAssemblyById])

  const isNonStandardAngle = corner.interiorAngle % 90 !== 0

  const handleFitToView = useCallback(() => {
    // Calculate midpoints of adjacent walls
    const prevMidpoint = midpoint(previousWall.insideLine.start, previousWall.insideLine.end)
    const nextMidpoint = midpoint(nextWall.insideLine.start, nextWall.insideLine.end)

    const points = [corner.insidePoint, corner.outsidePoint, prevMidpoint, nextMidpoint]
    const bounds = Bounds2D.fromPoints(points)
    viewportActions.fitToView(bounds)
  }, [corner, previousWall, nextWall, viewportActions])

  const canDeleteCorner = useMemo(() => {
    const result = canRemovePerimeterCorner(cornerId)
    const reasonKey = result.reason
    return {
      canDelete: result.canRemove,
      reason: reasonKey ? (($ => $.perimeterCorner[reasonKey]) as Parameters<typeof t>[0]) : undefined
    }
  }, [canRemovePerimeterCorner, cornerId])

  return (
    <div className="flex flex-col gap-4">
      {/* Geometry Information */}
      <div className="flex flex-col gap-2">
        <h2>{t($ => $.perimeterCorner.geometry)}</h2>
        <DataList.Root>
          <DataList.Item>
            <DataList.Label minWidth="88px">{t($ => $.perimeterCorner.interiorAngle)}</DataList.Label>
            <DataList.Value>{corner.interiorAngle}°</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label minWidth="88px">{t($ => $.perimeterCorner.exteriorAngle)}</DataList.Label>
            <DataList.Value>{corner.exteriorAngle}°</DataList.Value>
          </DataList.Item>
        </DataList.Root>
      </div>
      {/* Non-standard angle warning */}
      {isNonStandardAngle && (
        <Callout color="amber">
          <CalloutIcon>
            <ExclamationTriangleIcon />
          </CalloutIcon>
          <CalloutText>
            <span className="font-bold">{t($ => $.perimeterCorner.nonRightAngleWarning)}</span>
            <br />
            <span className="text-sm">{t($ => $.perimeterCorner.nonRightAngleDescription)}</span>
          </CalloutText>
        </Callout>
      )}
      {/* Corner switching locked warning */}
      {!canSwitchWall && (
        <Callout color="blue">
          <CalloutIcon>
            <ExclamationTriangleIcon />
          </CalloutIcon>
          <CalloutText>
            <span className="font-bold">{t($ => $.perimeterCorner.cornerLockedWarning)}</span>
            <br />
            <span className="text-sm">{t($ => $.perimeterCorner.cornerLockedDescription)}</span>
          </CalloutText>
        </Callout>
      )}
      <Separator />
      {/* Actions */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-end gap-2">
          <Button
            size="icon"
            size="2"
            onClick={handleToggleConstructedByWall}
            disabled={!canSwitchWall}
            title={
              canSwitchWall ? t($ => $.perimeterCorner.switchMainWall) : t($ => $.perimeterCorner.cannotSwitchTooltip)
            }
          >
            {corner.constructedByWall === 'next' ? <PinLeftIcon /> : <PinRightIcon />}
          </Button>
          <Button size="icon" title={t($ => $.perimeterCorner.fitToView)} onClick={handleFitToView}>
            <FitToViewIcon />
          </Button>
          <Button
            size="icon"
            size="2"
            color={corner.interiorAngle === 180 ? undefined : 'red'}
            title={
              canDeleteCorner.reason
                ? t(canDeleteCorner.reason)
                : corner.interiorAngle === 180
                  ? t($ => $.perimeterCorner.mergeSplit)
                  : t($ => $.perimeterCorner.deleteCorner)
            }
            onClick={handleDeleteCorner}
            disabled={!canDeleteCorner.canDelete}
          >
            {corner.interiorAngle === 180 ? <SplitWallIcon /> : <TrashIcon />}
          </Button>
        </div>
      </div>
      <Separator />
      {/* Construction Notes */}
      {hasConstructionNotes && (
        <div className="flex flex-col gap-2">
          <h2>{t($ => $.perimeterCorner.constructionNotes)}</h2>

          {(() => {
            const prevAssembly = getWallAssemblyById(previousWall.wallAssemblyId)
            const nextAssembly = getWallAssemblyById(nextWall.wallAssemblyId)
            return prevAssembly?.type !== nextAssembly?.type
          })() && (
            <Callout color="amber">
              <CalloutText>
                <span className="font-bold">{t($ => $.perimeterCorner.mixedAssembliesWarning)}</span>
                <br />
                {t($ => $.perimeterCorner.mixedAssembliesDescription)}
              </CalloutText>
            </Callout>
          )}

          {Math.abs(previousWall.thickness - nextWall.thickness) > 5 && (
            <Callout color="amber">
              <CalloutText>
                <span className="font-bold">{t($ => $.perimeterCorner.thicknessDifferenceWarning)}</span>
                <br />
                {t($ => $.perimeterCorner.thicknessDifferenceDescription, {
                  difference: Math.abs(previousWall.thickness - nextWall.thickness)
                })}
              </CalloutText>
            </Callout>
          )}
        </div>
      )}
    </div>
  )
}
