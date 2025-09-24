import type { Bounds2D, Vec2 } from '@/shared/geometry'
import type Konva from 'konva'
import type { StoreActions } from '@/building/store'
import type { StoreyId, EntityId, SelectableId } from '@/shared/types/ids'
import type React from 'react'
import type { EntityHitResult } from '../../canvas/services/EntityHitTestService'
import type { IconProps } from '@radix-ui/react-icons/dist/types'

export interface BaseTool {
  id: string
  name: string
  icon: string
  iconComponent?: React.ExoticComponent<IconProps>
  hotkey?: string
  category?: string
}

export interface ToolGroup extends BaseTool {
  tools: Tool[]
  defaultTool?: string
}

export interface Tool extends BaseTool {
  cursor?: string

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inspectorComponent?: React.ComponentType<ToolInspectorProps<any>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  overlayComponent?: React.ComponentType<ToolOverlayComponentProps<any>>
  onRenderNeeded?(listener: () => void): () => void

  // Event handlers
  handlePointerDown?(event: CanvasEvent): boolean
  handlePointerMove?(event: CanvasEvent): boolean
  handlePointerUp?(event: CanvasEvent): boolean
  handleKeyDown?(event: CanvasEvent): boolean
  handleKeyUp?(event: CanvasEvent): boolean

  // Lifecycle methods
  onActivate?(context?: ToolContext): void
  onDeactivate?(context?: ToolContext): void
}

export interface ToolInspectorProps<T extends Tool = Tool> {
  tool: T
}

export interface ToolOverlayComponentProps<T extends Tool = Tool> {
  tool: T
}

export interface ToolOverlayContext {
  toolContext: ToolContext
  currentPointerPos?: Vec2
}

// Keyboard shortcut system
export interface ShortcutDefinition {
  key: string // e.g., 'Delete', 'Escape', 'Ctrl+C', 'Shift+R'
  action: (context: ToolContext) => void
  condition?: (context: ToolContext) => boolean // When this shortcut is active
  priority: number // Higher priority wins conflicts
  scope: 'global' | 'selection' | 'tool'
  source: string // For debugging: 'builtin:delete' or 'tool:basic.select'
  label?: string // For UI display
}

export interface CanvasEvent {
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'wheel' | 'keydown' | 'keyup'
  originalEvent: PointerEvent | KeyboardEvent | WheelEvent
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  konvaEvent: Konva.KonvaEventObject<any>
  stageCoordinates: Vec2 // Transformed coordinates (accounting for pan/zoom)
  pointerCoordinates?: { x: number; y: number } // Original pointer coordinates for hit testing
  context: ToolContext
}
export interface ToolContext {
  // Coordinate conversion (viewport functionality)
  getStageCoordinates(event: { x: number; y: number }): Vec2
  getScreenCoordinates(point: Vec2): { x: number; y: number }

  // Entity discovery (on-demand) using original pointer coordinates
  findEntityAt(pointerCoordinates: { x: number; y: number }): EntityHitResult | null

  // Hierarchical selection management
  selectEntity(entityId: EntityId): void
  selectSubEntity(subEntityId: SelectableId): void
  popSelection(): void // Go up one level in hierarchy
  clearSelection(): void

  // Store access (tools use these directly)
  getModelStore(): StoreActions // Tools access model store directly
  getActiveStoreyId(): StoreyId

  // State access
  getActiveTool(): Tool | null
  getCurrentSelection(): SelectableId | null
  getSelectedEntityId(): EntityId | null // Backward compatibility
  getSelectionPath(): SelectableId[] // Full selection hierarchy path

  // Tool activation
  activateTool(toolId: string): boolean

  fitToView(bounds: Bounds2D): void
}
