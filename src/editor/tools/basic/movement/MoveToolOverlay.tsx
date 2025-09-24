import type { ToolOverlayComponentProps } from '@/editor/tools/system/types'
import type { MoveTool } from './MoveTool'
import { Group } from 'react-konva/lib/ReactKonvaCore'
import { useReactiveTool } from '../../system/hooks/useReactiveTool'
import { SnappingLines } from '@/editor/overlays/SnappingLines'

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
    <Group>
      <SnappingLines snapResult={currentMovementState?.snapResult} />
      <PreviewComponent movementState={currentMovementState} isValid={isValid} context={context} />
    </Group>
  )
}
