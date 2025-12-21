import type { IconProps } from '@radix-ui/react-icons/dist/types'
import type Konva from 'konva'
import React from 'react'

import { type Vec2 } from '@/shared/geometry'

export type ToolId =
  | 'basic.select'
  | 'basic.move'
  | 'basic.fit-to-view'
  | 'floors.add-area'
  | 'floors.add-opening'
  | 'perimeter.add'
  | 'perimeter.preset'
  | 'perimeter.add-opening'
  | 'perimeter.add-post'
  | 'perimeter.split-wall'
  | 'roofs.add-roof'
  | 'test.data'

export type CursorStyle =
  | 'default'
  | 'pointer'
  | 'crosshair'
  | 'move'
  | 'grab'
  | 'grabbing'
  | 'not-allowed'
  | 'text'
  | 'wait'
  | 'help'
  | string

export interface ToolMetadata {
  name: string
  iconComponent: React.ComponentType<IconProps>
  hotkey?: string
}

export interface ToolGroup {
  name: string
  tools: ToolId[]
}

export interface ToolImplementation {
  id: ToolId

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inspectorComponent: React.ComponentType<ToolInspectorProps<any>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  overlayComponent?: React.ComponentType<ToolOverlayComponentProps<any>>
  onRenderNeeded?(listener: () => void): () => void

  // Event handlers
  handlePointerDown?(event: CanvasEvent): boolean
  handlePointerMove?(event: CanvasEvent): boolean
  handlePointerUp?(event: CanvasEvent): boolean
  handleKeyDown?(event: KeyboardEvent): boolean
  handleKeyUp?(event: KeyboardEvent): boolean

  // Lifecycle methods
  onActivate?(): void
  onDeactivate?(): void

  // Cursor
  getCursor?(): CursorStyle
}

export interface ToolInspectorProps<T extends ToolImplementation = ToolImplementation> {
  tool: T
}

export interface ToolOverlayComponentProps<T extends ToolImplementation = ToolImplementation> {
  tool: T
}

export function DummyToolInspector<TTool extends ToolImplementation>(
  _props: ToolInspectorProps<TTool>
): React.JSX.Element | undefined {
  return undefined
}

// Keyboard shortcut system
export interface ShortcutDefinition {
  key: string // e.g., 'Delete', 'Escape', 'Ctrl+C', 'Shift+R'
  action: () => void
  condition?: () => boolean // When this shortcut is active
  priority: number // Higher priority wins conflicts
  scope: 'global' | 'selection' | 'tool'
  source: string // For debugging: 'builtin:delete' or 'tool:basic.select'
  label?: string // For UI display
}

export interface CanvasEvent {
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'wheel'
  originalEvent: PointerEvent | WheelEvent
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  konvaEvent: Konva.KonvaEventObject<any>
  stageCoordinates: Vec2 // Transformed coordinates (accounting for pan/zoom)
  pointerCoordinates?: { x: number; y: number } // Original pointer coordinates for hit testing
}
