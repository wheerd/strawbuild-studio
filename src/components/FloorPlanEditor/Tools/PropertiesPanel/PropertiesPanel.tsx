import { useCurrentSelection, useSelectionPath } from '@/components/FloorPlanEditor/hooks/useSelectionStore'
import { useActiveTool } from '../ToolSystem/ToolContext'
import {
  WallInspector,
  RoomInspector,
  CornerInspector,
  OuterWallInspector,
  WallSegmentInspector,
  OuterCornerInspector,
  OpeningInspector
} from './Inspectors'
import { WallToolInspector } from './ToolInspectors/WallToolInspector'
import { ActionButtons } from './ActionButtons'
import {
  isWallId,
  isRoomId,
  isPointId,
  isOuterWallId,
  isWallSegmentId,
  isOuterCornerId,
  isOpeningId,
  type WallSegmentId,
  type OuterWallId
} from '@/types/ids'

export function PropertiesPanel(): React.JSX.Element {
  const selectedId = useCurrentSelection()
  const selectionPath = useSelectionPath()
  const activeTool = useActiveTool()

  return (
    <div className="properties-panel">
      <div className="panel-header">
        <h2>Properties</h2>
      </div>

      <div className="panel-content">
        {/* Entity Inspector */}
        <div className="entity-section">
          {!selectedId && (
            <div className="no-selection">
              <p>No entity selected</p>
              <p className="help-text">Select a wall, room, or point to view its properties</p>
            </div>
          )}

          {/* Legacy wall entity */}
          {selectedId && isWallId(selectedId) && <WallInspector key={selectedId} selectedId={selectedId} />}

          {/* Room entity */}
          {selectedId && isRoomId(selectedId) && <RoomInspector key={selectedId} selectedId={selectedId} />}

          {/* Point entity (treat as corner) */}
          {selectedId && isPointId(selectedId) && <CornerInspector key={selectedId} selectedId={selectedId} />}

          {/* Outer wall entities */}
          {selectedId && isOuterWallId(selectedId) && <OuterWallInspector key={selectedId} selectedId={selectedId} />}

          {selectedId && isWallSegmentId(selectedId) && (
            <WallSegmentInspector
              key={selectedId}
              outerWallId={selectionPath[0] as OuterWallId}
              segmentId={selectedId}
            />
          )}

          {selectedId && isOuterCornerId(selectedId) && (
            <OuterCornerInspector
              key={selectedId}
              outerWallId={selectionPath[0] as OuterWallId}
              cornerId={selectedId}
            />
          )}

          {selectedId && isOpeningId(selectedId) && (
            <OpeningInspector
              key={selectedId}
              outerWallId={selectionPath[0] as OuterWallId}
              segmentId={selectionPath[1] as WallSegmentId}
              openingId={selectedId}
            />
          )}

          {/* Unknown entity type */}
          {selectedId &&
            !isWallId(selectedId) &&
            !isRoomId(selectedId) &&
            !isPointId(selectedId) &&
            !isOuterWallId(selectedId) &&
            !isWallSegmentId(selectedId) &&
            !isOuterCornerId(selectedId) &&
            !isOpeningId(selectedId) && (
              <div className="unknown-entity">
                <h3>Unknown Entity Type</h3>
                <p>Entity type not recognized: {typeof selectedId}</p>
              </div>
            )}
        </div>

        {/* Tool Inspector */}
        <div className="tool-section">
          {activeTool?.hasInspector && activeTool.category === 'walls' && (
            <WallToolInspector tool={activeTool as any} />
          )}
        </div>

        {/* Action Buttons */}
        <div className="actions-section">
          <ActionButtons tool={activeTool} />
        </div>
      </div>
    </div>
  )
}
