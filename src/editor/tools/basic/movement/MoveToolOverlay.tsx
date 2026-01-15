import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolOverlayComponentProps } from '@/editor/tools/system/types'

import type { MoveTool } from './MoveTool'

export function MoveToolOverlay({ tool }: ToolOverlayComponentProps<MoveTool>) {
  useReactiveTool(tool)
  const toolState = tool.getToolState()

  if (!toolState.isMoving || !toolState.currentMovementState) {
    return null
  }

  const { behavior, context, currentMovementState, isValid } = toolState
  if (!behavior || !context) return null

  const PreviewComponent = behavior.previewComponent

  return (
    <g>
      <PreviewComponent movementState={currentMovementState} isValid={isValid} context={context} />
    </g>
  )
}
