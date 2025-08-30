import type { Point2D } from '@/types/geometry'
import type { Wall, Room, Point, Corner } from '@/types/model'
import type { SnapResult } from '@/model/store/services/snapping/types'
import type Konva from 'konva'
import type { EntityId, FloorId, PointId, StoreActions } from '@/model'
import type React from 'react'

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
  currentMousePos?: Point2D
  snapResult?: SnapResult
  snapTarget?: Point2D

  // Utility functions for common overlay calculations
  worldToStage: (worldPos: Point2D) => Point2D
  stageToWorld: (stagePos: Point2D) => Point2D
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
  stageCoordinates: Point2D
  target: any
  context: ToolContext
}

export type Entity = Wall | Room | Point | Corner

export interface ToolContext {
  // Coordinate conversion (viewport functionality)
  getStageCoordinates(event: { x: number; y: number }): Point2D
  getScreenCoordinates(point: Point2D): { x: number; y: number }

  // Snapping functionality
  findSnapPoint(point: Point2D): SnapResult | null
  updateSnapReference(fromPoint: Point2D | null, fromPointId: PointId | null): void
  updateSnapTarget(target: Point2D): void
  clearSnapState(): void

  // Single selection management (much simpler!)
  selectEntity(entityId: EntityId): void
  clearSelection(): void

  // Store access (tools use these directly)
  getModelStore(): StoreActions // Tools access model store directly
  getActiveFloorId(): FloorId

  // State access
  getActiveTool(): Tool | null
  getSelectedEntityId(): EntityId | null
  getViewport(): { zoom: number; panX: number; panY: number; stageWidth: number; stageHeight: number }

  // Tool activation
  activateTool(toolId: string): boolean
}
