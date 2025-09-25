import { UpdateIcon } from '@radix-ui/react-icons'

import type { CanvasEvent, Tool } from '@/editor/tools/system/types'
import type { Vec2 } from '@/shared/geometry'

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

  handlePointerDown(_event: CanvasEvent): boolean {
    // Disabled until entities are properly implemented
    return false
  }

  handlePointerMove(_event: CanvasEvent): boolean {
    return false
  }

  handlePointerUp(_event: CanvasEvent): boolean {
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
}
