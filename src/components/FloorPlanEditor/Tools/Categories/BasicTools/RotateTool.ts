import type { Tool, ToolContext, ContextAction, CanvasEvent } from '@/components/FloorPlanEditor/Tools/ToolSystem/types'
import type { Vec2 } from '@/types/geometry'
import { UpdateIcon } from '@radix-ui/react-icons'

export interface RotateToolState {
  rotationStep: number // degrees
  rotationCenter: 'center' | 'custom'
  customCenter?: Vec2
  isRotating: boolean
  startAngle?: number
}

export class RotateTool implements Tool {
  id = 'basic.rotate'
  name = 'Rotate'
  icon = '↻'
  iconComponent = UpdateIcon
  hotkey = 'o'
  cursor = 'grab'
  category = 'basic'

  public state: RotateToolState = {
    rotationStep: 15, // 15 degree increments by default
    rotationCenter: 'center',
    isRotating: false
  }

  handleMouseDown(_event: CanvasEvent): boolean {
    // Disabled until entities are properly implemented
    return false
  }

  handleMouseMove(_event: CanvasEvent): boolean {
    return false
  }

  handleMouseUp(_event: CanvasEvent): boolean {
    return false
  }

  handleKeyDown(_event: CanvasEvent): boolean {
    return false
  }

  onActivate(): void {
    // Disabled
  }

  onDeactivate(): void {
    // Disabled
  }

  getContextActions(_context: ToolContext): ContextAction[] {
    return []
  }
}
