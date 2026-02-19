import type { Resources } from 'i18next'
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

type ToolNameKey = keyof Resources['toolbar']['tools']

export interface ToolMetadata {
  nameKey: ToolNameKey
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  iconComponent: React.ComponentType<any>
  hotkey?: string
}

type ToolGroupNameKey = keyof Resources['toolbar']['groups']

export interface ToolGroup {
  nameKey: ToolGroupNameKey
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
  handlePointerDown?(event: EditorEvent): boolean
  handlePointerMove?(event: EditorEvent): boolean
  handlePointerUp?(event: EditorEvent): boolean
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

export interface EditorEvent {
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'wheel'
  originalEvent: PointerEvent | WheelEvent
  worldCoordinates: Vec2 // Transformed coordinates (accounting for pan/zoom)
  stageCoordinates: Vec2
}
