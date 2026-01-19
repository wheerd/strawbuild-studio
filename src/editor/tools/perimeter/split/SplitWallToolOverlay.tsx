import { useSelectionStore } from '@/editor/hooks/useSelectionStore'
import { useViewportActions } from '@/editor/hooks/useViewportStore'
import { activateLengthInput } from '@/editor/services/length-input'
import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolOverlayComponentProps } from '@/editor/tools/system/types'
import { ClickableLengthIndicator } from '@/editor/utils/ClickableLengthIndicator'
import { type Vec2, distVec2, midpoint, scaleAddVec2 } from '@/shared/geometry'

import type { SplitWallTool } from './SplitWallTool'

export function SplitWallToolOverlay({ tool }: ToolOverlayComponentProps<SplitWallTool>): React.JSX.Element | null {
  const { state } = useReactiveTool(tool)
  const { wall, startCorner, endCorner } = state
  const { worldToStage } = useViewportActions()
  const isCurrentSelection = useSelectionStore(s => s.isCurrentSelection)

  if (!wall || !startCorner || !endCorner) {
    return null
  }

  const handleMeasurementClick = (start: Vec2, end: Vec2, dir: 1 | -1) => () => {
    const worldPosition = midpoint(start, end)
    const stagePos = worldToStage(worldPosition)
    const dist = distVec2(start, end)
    activateLengthInput({
      showImmediately: true,
      position: { x: stagePos[0] + 20, y: stagePos[0] - 30 },
      initialValue: dist,
      onCommit: enteredValue => {
        const rawDelta = enteredValue - dist
        tool.moveDelta(rawDelta * dir)
      },
      onCancel: () => {
        // Nothing to do on cancel
      }
    })
  }

  const insideStart = startCorner.insidePoint
  const insideEnd = endCorner.insidePoint
  const insideSplit =
    state.targetPosition !== null ? scaleAddVec2(wall.insideLine.start, wall.direction, state.targetPosition) : null
  const outsideSplit =
    state.targetPosition !== null ? scaleAddVec2(wall.outsideLine.start, wall.direction, state.targetPosition) : null
  const outsideStart = startCorner.outsidePoint
  const outsideEnd = endCorner.outsidePoint

  const insideHover =
    state.hoverPosition !== null ? scaleAddVec2(wall.insideLine.start, wall.direction, state.hoverPosition) : null
  const outsideHover =
    state.hoverPosition !== null ? scaleAddVec2(wall.outsideLine.start, wall.direction, state.hoverPosition) : null

  // Colors based on validation state
  const isWallSelected = state.selectedWallId ? isCurrentSelection(state.selectedWallId) : false
  const hoverColor = state.isValidHover
    ? isWallSelected
      ? 'var(--color-gray-700)'
      : 'var(--color-blue-600)'
    : 'var(--color-red-600)'
  const splitColor = state.isValidSplit ? 'var(--color-green-600)' : 'var(--color-red-600)'

  return (
    <g pointerEvents="none">
      {/* Hover Line (perpendicular to wall) */}
      {insideHover && outsideHover ? (
        <line
          x1={insideHover[0]}
          y1={insideHover[1]}
          x2={outsideHover[0]}
          y2={outsideHover[1]}
          stroke={hoverColor}
          strokeWidth={20}
          strokeDasharray="50 50"
        />
      ) : null}

      {insideSplit && outsideSplit ? (
        <>
          {/* Split Line (perpendicular to wall) */}
          <line
            x1={insideSplit[0]}
            y1={insideSplit[1]}
            x2={outsideSplit[0]}
            y2={outsideSplit[1]}
            stroke={splitColor}
            strokeWidth={30}
          />

          {/* Clickable Distance Measurements */}
          <ClickableLengthIndicator
            startPoint={insideStart}
            endPoint={insideSplit}
            offset={-120}
            onClick={handleMeasurementClick(insideStart, insideSplit, 1)}
          />
          <ClickableLengthIndicator
            startPoint={insideEnd}
            endPoint={insideSplit}
            offset={120}
            onClick={handleMeasurementClick(insideEnd, insideSplit, -1)}
          />
          <ClickableLengthIndicator
            startPoint={outsideStart}
            endPoint={outsideSplit}
            offset={120}
            onClick={handleMeasurementClick(outsideStart, outsideSplit, 1)}
          />
          <ClickableLengthIndicator
            startPoint={outsideEnd}
            endPoint={outsideSplit}
            offset={-120}
            onClick={handleMeasurementClick(outsideEnd, outsideSplit, -1)}
          />
        </>
      ) : null}
    </g>
  )
}
