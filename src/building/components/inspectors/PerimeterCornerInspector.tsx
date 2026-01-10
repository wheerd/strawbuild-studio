import { ExclamationTriangleIcon, PinLeftIcon, PinRightIcon, TrashIcon } from '@radix-ui/react-icons'
import { Callout, DataList, Flex, Heading, IconButton, Separator, Text } from '@radix-ui/themes'
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
    <Flex direction="column" gap="4">
      {/* Geometry Information */}
      <Flex direction="column" gap="2">
        <Heading size="2">{t($ => $.perimeterCorner.geometry)}</Heading>
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
      </Flex>
      {/* Non-standard angle warning */}
      {isNonStandardAngle && (
        <Callout.Root color="amber">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            <Text weight="bold">{t($ => $.perimeterCorner.nonRightAngleWarning)}</Text>
            <br />
            <Text size="1">{t($ => $.perimeterCorner.nonRightAngleDescription)}</Text>
          </Callout.Text>
        </Callout.Root>
      )}
      {/* Corner switching locked warning */}
      {!canSwitchWall && (
        <Callout.Root color="blue">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            <Text weight="bold">{t($ => $.perimeterCorner.cornerLockedWarning)}</Text>
            <br />
            <Text size="1">{t($ => $.perimeterCorner.cornerLockedDescription)}</Text>
          </Callout.Text>
        </Callout.Root>
      )}
      <Separator size="4" />
      {/* Actions */}
      <Flex direction="column" gap="2">
        <Flex gap="2" justify="end">
          <IconButton
            size="2"
            onClick={handleToggleConstructedByWall}
            disabled={!canSwitchWall}
            title={
              canSwitchWall ? t($ => $.perimeterCorner.switchMainWall) : t($ => $.perimeterCorner.cannotSwitchTooltip)
            }
          >
            {corner.constructedByWall === 'next' ? <PinLeftIcon /> : <PinRightIcon />}
          </IconButton>
          <IconButton size="2" title={t($ => $.perimeterCorner.fitToView)} onClick={handleFitToView}>
            <FitToViewIcon />
          </IconButton>
          <IconButton
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
          </IconButton>
        </Flex>
      </Flex>
      <Separator size="4" />
      {/* Construction Notes */}
      {hasConstructionNotes && (
        <Flex direction="column" gap="2">
          <Heading size="2">{t($ => $.perimeterCorner.constructionNotes)}</Heading>

          {(() => {
            const prevAssembly = getWallAssemblyById(previousWall.wallAssemblyId)
            const nextAssembly = getWallAssemblyById(nextWall.wallAssemblyId)
            return prevAssembly?.type !== nextAssembly?.type
          })() && (
            <Callout.Root color="amber">
              <Callout.Text>
                <Text weight="bold">{t($ => $.perimeterCorner.mixedAssembliesWarning)}</Text>
                <br />
                {t($ => $.perimeterCorner.mixedAssembliesDescription)}
              </Callout.Text>
            </Callout.Root>
          )}

          {Math.abs(previousWall.thickness - nextWall.thickness) > 5 && (
            <Callout.Root color="amber">
              <Callout.Text>
                <Text weight="bold">{t($ => $.perimeterCorner.thicknessDifferenceWarning)}</Text>
                <br />
                {t($ => $.perimeterCorner.thicknessDifferenceDescription, {
                  difference: Math.abs(previousWall.thickness - nextWall.thickness)
                })}
              </Callout.Text>
            </Callout.Root>
          )}
        </Flex>
      )}
    </Flex>
  )
}
