import type { Tool, ToolContext, ContextAction, CanvasEvent } from '../../ToolSystem/types'

export class MoveTool implements Tool {
  id = 'basic.move'
  name = 'Move'
  icon = '↔'
  hotkey = 'm'
  cursor = 'move'
  category = 'basic'

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
