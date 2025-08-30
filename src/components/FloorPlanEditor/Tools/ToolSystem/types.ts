import type { Point2D } from '@/types/geometry'
import type { Wall, Room, Point, Corner } from '@/types/model'
import type { SnapResult } from '@/model/store/services/snapping/types'
import type Konva from 'konva'
import type { EntityId, FloorId, PointId, StoreActions } from '@/model'

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

  // Context actions
  getContextActions?(selectedEntity?: Entity): ContextAction[]
}

export interface ToolInspectorProps {
  tool: Tool
  onPropertyChange: (property: string, value: any) => void
}

export interface ContextAction {
  label: string
  action: () => void
  enabled?: () => boolean
  hotkey?: string
  icon?: string
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
}
