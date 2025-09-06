import type { ToolOverlayComponentProps } from '@/components/FloorPlanEditor/Tools/ToolSystem/types'
import type { MoveTool } from '../MoveTool'
import { Group } from 'react-konva'
import { useReactiveTool } from '../../../hooks/useReactiveTool'

export function MoveToolOverlay({ tool }: ToolOverlayComponentProps<MoveTool>) {
  useReactiveTool(tool)
  const toolState = tool.getToolState()

  if (!toolState.isMoving || !toolState.currentMovementState) {
    return null
  }

  const { behavior, context, currentMovementState, isValid } = toolState
  if (!behavior || !context) return null

  const previewElements = behavior.generatePreview(currentMovementState, isValid, context)

  return <Group>{previewElements}</Group>
}
