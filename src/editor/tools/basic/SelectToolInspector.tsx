import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { Callout, Flex, Text } from '@radix-ui/themes'
import { useTranslation } from 'react-i18next'

import {
  FloorAreaInspector,
  FloorOpeningInspector,
  OpeningInspector,
  PerimeterCornerInspector,
  PerimeterInspector,
  PerimeterWallInspector,
  RoofInspector,
  RoofOverhangInspector
} from '@/building/components/inspectors'
import { StoreyInspector } from '@/building/components/inspectors/StoreyInspector'
import { WallPostInspector } from '@/building/components/inspectors/WallPostInspector'
import {
  isFloorAreaId,
  isFloorOpeningId,
  isOpeningId,
  isPerimeterCornerId,
  isPerimeterId,
  isPerimeterWallId,
  isRoofId,
  isRoofOverhangId,
  isWallPostId
} from '@/building/model/ids'
import { useActiveStoreyId } from '@/building/store'
import { useCurrentSelection } from '@/editor/hooks/useSelectionStore'

export function SelectToolInspector(): React.JSX.Element {
  const { t } = useTranslation('tool')
  const selectedId = useCurrentSelection()
  const storeyId = useActiveStoreyId()

  return (
    <Flex direction="column" p="2" gap="2">
      {!selectedId && <StoreyInspector key="storey" selectedId={storeyId} />}

      {/* Perimeter entities */}
      {selectedId && isPerimeterId(selectedId) && <PerimeterInspector key={selectedId} selectedId={selectedId} />}
      {selectedId && isPerimeterWallId(selectedId) && <PerimeterWallInspector key={selectedId} wallId={selectedId} />}
      {selectedId && isPerimeterCornerId(selectedId) && (
        <PerimeterCornerInspector key={selectedId} cornerId={selectedId} />
      )}
      {selectedId && isOpeningId(selectedId) && <OpeningInspector key={selectedId} openingId={selectedId} />}
      {selectedId && isWallPostId(selectedId) && <WallPostInspector key={selectedId} postId={selectedId} />}
      {selectedId && isFloorAreaId(selectedId) && <FloorAreaInspector key={selectedId} floorAreaId={selectedId} />}
      {selectedId && isFloorOpeningId(selectedId) && (
        <FloorOpeningInspector key={selectedId} floorOpeningId={selectedId} />
      )}
      {selectedId && isRoofId(selectedId) && <RoofInspector key={selectedId} roofId={selectedId} />}
      {selectedId && isRoofOverhangId(selectedId) && <RoofOverhangInspector key={selectedId} overhangId={selectedId} />}

      {/* Unknown entity type */}
      {selectedId &&
        !isPerimeterId(selectedId) &&
        !isPerimeterWallId(selectedId) &&
        !isPerimeterCornerId(selectedId) &&
        !isOpeningId(selectedId) &&
        !isWallPostId(selectedId) &&
        !isFloorAreaId(selectedId) &&
        !isFloorOpeningId(selectedId) &&
        !isRoofId(selectedId) &&
        !isRoofOverhangId(selectedId) && (
          <Callout.Root color="amber">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>
              <Text weight="bold">{t($ => $.select.unknownEntityType)}</Text>
              <br />
              {t($ => $.select.unknownEntityMessage, {
                id: selectedId
              })}
            </Callout.Text>
          </Callout.Root>
        )}
    </Flex>
  )
}
