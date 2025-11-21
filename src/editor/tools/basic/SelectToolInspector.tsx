import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { Callout, Flex, Text } from '@radix-ui/themes'

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
import {
  type PerimeterId,
  type PerimeterWallId,
  type RoofId,
  isFloorAreaId,
  isFloorOpeningId,
  isOpeningId,
  isPerimeterCornerId,
  isPerimeterId,
  isPerimeterWallId,
  isRoofId,
  isRoofOverhangId
} from '@/building/model/ids'
import { useActiveStoreyId } from '@/building/store'
import { useCurrentSelection, useSelectionPath } from '@/editor/hooks/useSelectionStore'

export function SelectToolInspector(): React.JSX.Element {
  const selectedId = useCurrentSelection()
  const selectionPath = useSelectionPath()
  const storeyId = useActiveStoreyId()

  return (
    <Flex direction="column" p="2" gap="2">
      {!selectedId && <StoreyInspector key="storey" selectedId={storeyId} />}

      {/* Perimeter entities */}
      {selectedId && isPerimeterId(selectedId) && <PerimeterInspector key={selectedId} selectedId={selectedId} />}

      {selectedId && isPerimeterWallId(selectedId) && (
        <PerimeterWallInspector key={selectedId} perimeterId={selectionPath[0] as PerimeterId} wallId={selectedId} />
      )}

      {selectedId && isPerimeterCornerId(selectedId) && (
        <PerimeterCornerInspector
          key={selectedId}
          perimeterId={selectionPath[0] as PerimeterId}
          cornerId={selectedId}
        />
      )}

      {selectedId && isOpeningId(selectedId) && (
        <OpeningInspector
          key={selectedId}
          perimeterId={selectionPath[0] as PerimeterId}
          wallId={selectionPath[1] as PerimeterWallId}
          openingId={selectedId}
        />
      )}

      {selectedId && isFloorAreaId(selectedId) && <FloorAreaInspector key={selectedId} floorAreaId={selectedId} />}

      {selectedId && isFloorOpeningId(selectedId) && (
        <FloorOpeningInspector key={selectedId} floorOpeningId={selectedId} />
      )}

      {selectedId && isRoofId(selectedId) && <RoofInspector key={selectedId} roofId={selectedId} />}

      {selectedId && isRoofOverhangId(selectedId) && (
        <RoofOverhangInspector key={selectedId} roofId={selectionPath[0] as RoofId} overhangId={selectedId} />
      )}

      {/* Unknown entity type */}
      {selectedId &&
        !isPerimeterId(selectedId) &&
        !isPerimeterWallId(selectedId) &&
        !isPerimeterCornerId(selectedId) &&
        !isOpeningId(selectedId) &&
        !isFloorAreaId(selectedId) &&
        !isFloorOpeningId(selectedId) &&
        !isRoofId(selectedId) &&
        !isRoofOverhangId(selectedId) && (
          <Callout.Root color="amber">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>
              <Text weight="bold">Unknown Entity Type</Text>
              <br />
              Entity id not recognized: {selectedId}
            </Callout.Text>
          </Callout.Root>
        )}
    </Flex>
  )
}
