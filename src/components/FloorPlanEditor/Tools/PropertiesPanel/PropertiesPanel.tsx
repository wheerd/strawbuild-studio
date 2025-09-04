import { useCurrentSelection, useSelectionPath } from '@/components/FloorPlanEditor/hooks/useSelectionStore'
import { useActiveTool } from '../ToolSystem/ToolContext'
import { OuterWallInspector, WallSegmentInspector, OuterCornerInspector, OpeningInspector } from './Inspectors'
import { ActionButtons } from './ActionButtons'
import {
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

        {/* Tool Inspector - disabled until wall tools are implemented */}
        <div className="tool-section">{/* Tool inspectors would go here */}</div>

        {/* Action Buttons */}
        <div className="actions-section">
          <ActionButtons tool={activeTool} />
        </div>
      </div>
    </div>
  )
}
