import type { Vec2 } from '@/types/geometry'
import type { Wall, Room, Point, Corner } from '@/types/model'
import type { SnapResult } from '@/model/store/services/snapping/types'
import type Konva from 'konva'
import type { EntityId, SelectableId, FloorId, PointId, StoreActions } from '@/model'
import type React from 'react'
import type { EntityHitResult } from '@/components/FloorPlanEditor/services/EntityHitTestService'

export interface BaseTool {
  id: string
  name: string
  icon: string
  hotkey?: string
  category?: string
}

export interface ToolGroup extends BaseTool {
  tools: Tool[]
  defaultTool?: string
}

export interface Tool extends BaseTool {
  cursor?: string
  hasInspector?: boolean
  inspectorComponent?: React.ComponentType<ToolInspectorProps>

  // Event handlers
  handleMouseDown?(event: CanvasEvent): boolean
  handleMouseMove?(event: CanvasEvent): boolean
  handleMouseUp?(event: CanvasEvent): boolean
  handleKeyDown?(event: CanvasEvent): boolean
  handleKeyUp?(event: CanvasEvent): boolean

  // Lifecycle methods
  onActivate?(): void
  onDeactivate?(): void

  // Context actions - tools can get selected entity from context if needed
  getContextActions?(context: ToolContext): ContextAction[]

  // Overlay rendering - tools can render custom preview overlays
  renderOverlay?(context: ToolOverlayContext): React.ReactNode
  onRenderNeeded?(listener: () => void): () => void
}

export interface ToolInspectorProps {
  tool: Tool
  onPropertyChange: (property: string, value: any) => void
}

export interface ToolOverlayContext {
  // Tool context for accessing model and state
  toolContext: ToolContext

  // Viewport information for coordinate calculations
  viewport: {
    zoom: number
    panX: number
    panY: number
    stageWidth: number
    stageHeight: number
  }

  // Current mouse/snap state
  currentMousePos?: Vec2
  snapResult?: SnapResult
  snapTarget?: Vec2

  // Utility functions for common overlay calculations
  worldToStage: (worldPos: Vec2) => Vec2
  stageToWorld: (stagePos: Vec2) => Vec2
  getInfiniteLineExtent: () => number // For snap lines that span the canvas
}

export interface ContextAction {
  label: string
  action: () => void
  enabled?: () => boolean
  hotkey?: string
  icon?: string
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
  type: 'mousedown' | 'mousemove' | 'mouseup' | 'wheel' | 'keydown' | 'keyup'
  originalEvent: MouseEvent | KeyboardEvent | WheelEvent
  konvaEvent: Konva.KonvaEventObject<any>
  stageCoordinates: Vec2 // Transformed coordinates (accounting for pan/zoom)
  pointerCoordinates?: { x: number; y: number } // Original pointer coordinates for hit testing
  target: any
  context: ToolContext
}

export type Entity = Wall | Room | Point | Corner

export interface ToolContext {
  // Coordinate conversion (viewport functionality)
  getStageCoordinates(event: { x: number; y: number }): Vec2
  getScreenCoordinates(point: Vec2): { x: number; y: number }

  // Snapping functionality
  findSnapPoint(point: Vec2): SnapResult | null
  updateSnapReference(fromPoint: Vec2 | null, fromPointId: PointId | null): void
  updateSnapTarget(target: Vec2): void
  clearSnapState(): void

  // Entity discovery (on-demand) using original pointer coordinates
  findEntityAt(pointerCoordinates: { x: number; y: number }): EntityHitResult | null

  // Hierarchical selection management
  selectEntity(entityId: EntityId): void
  selectSubEntity(subEntityId: SelectableId): void
  popSelection(): void // Go up one level in hierarchy
  clearSelection(): void

  // Store access (tools use these directly)
  getModelStore(): StoreActions // Tools access model store directly
  getActiveFloorId(): FloorId

  // State access
  getActiveTool(): Tool | null
  getCurrentSelection(): SelectableId | null
  getSelectedEntityId(): EntityId | null // Backward compatibility
  getSelectionPath(): SelectableId[] // Full selection hierarchy path
  getViewport(): { zoom: number; panX: number; panY: number; stageWidth: number; stageHeight: number }

  // Tool activation
  activateTool(toolId: string): boolean
}
