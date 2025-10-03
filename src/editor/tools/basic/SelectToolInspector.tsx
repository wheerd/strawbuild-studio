import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { Callout, Flex, Text } from '@radix-ui/themes'

import {
  OpeningInspector,
  PerimeterCornerInspector,
  PerimeterInspector,
  PerimeterWallInspector
} from '@/building/components/inspectors'
import {
  type PerimeterId,
  type PerimeterWallId,
  isOpeningId,
  isPerimeterCornerId,
  isPerimeterId,
  isPerimeterWallId
} from '@/building/model/ids'
import { useCurrentSelection, useSelectionPath } from '@/editor/hooks/useSelectionStore'

export function SelectToolInspector(): React.JSX.Element {
  const selectedId = useCurrentSelection()
  const selectionPath = useSelectionPath()

  return (
    <Flex direction="column" p="2" gap="2">
      {!selectedId && (
        <>
          <Text align="center" color="gray" mb="2">
            No entity selected
          </Text>
          <Text align="center" size="2" color="gray">
            Select a wall, room, or point to view its properties
          </Text>
        </>
      )}

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

      {/* Unknown entity type */}
      {selectedId &&
        !isPerimeterId(selectedId) &&
        !isPerimeterWallId(selectedId) &&
        !isPerimeterCornerId(selectedId) &&
        !isOpeningId(selectedId) && (
          <Callout.Root color="amber">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>
              <Text weight="bold">Unknown Entity Type</Text>
              <br />
              Entity type not recognized: {typeof selectedId}
            </Callout.Text>
          </Callout.Root>
        )}
    </Flex>
  )
}
