import { Group, Line } from 'react-konva/lib/ReactKonvaCore'

import { ClickableLengthIndicator } from '@/editor/canvas/utils/ClickableLengthIndicator'
import { useSelectionStore } from '@/editor/hooks/useSelectionStore'
import { useViewportActions } from '@/editor/hooks/useViewportStore'
import { activateLengthInput } from '@/editor/services/length-input'
import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolOverlayComponentProps } from '@/editor/tools/system/types'
import { type Vec2, distVec2, midpoint, scaleAddVec2 } from '@/shared/geometry'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'

import type { SplitWallTool } from './SplitWallTool'

export function SplitWallToolOverlay({ tool }: ToolOverlayComponentProps<SplitWallTool>): React.JSX.Element | null {
  const { state } = useReactiveTool(tool)
  const theme = useCanvasTheme()
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
      position: { x: stagePos.x + 20, y: stagePos.y - 30 },
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
  const hoverColor = state.isValidHover ? (isWallSelected ? theme.secondary : 'var(--color-primary)') : theme.danger
  const splitColor = state.isValidSplit ? theme.success : theme.danger

  return (
    <Group>
      {/* Hover Line (perpendicular to wall) */}
      {insideHover && outsideHover ? (
        <Line
          points={[insideHover[0], insideHover[1], outsideHover[0], outsideHover[1]]}
          stroke={hoverColor}
          strokeWidth={20}
          dash={[50, 50]}
          listening={false}
        />
      ) : null}

      {insideSplit && outsideSplit ? (
        <>
          {/* Split Line (perpendicular to wall) */}
          <Line
            points={[insideSplit[0], insideSplit[1], outsideSplit[0], outsideSplit[1]]}
            stroke={splitColor}
            strokeWidth={30}
            listening={false}
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
    </Group>
  )
}
