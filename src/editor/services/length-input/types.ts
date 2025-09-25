import type { Length } from '@/shared/geometry'

/**
 * Position for the length input component on screen
 */
export interface LengthInputPosition {
  /** X coordinate in pixels relative to the canvas */
  x: number
  /** Y coordinate in pixels relative to the canvas */
  y: number
}

/**
 * Callback function when user commits a length value
 */
export type LengthInputCommitCallback = (value: Length) => void

/**
 * Callback function when user cancels length input
 */
export type LengthInputCancelCallback = () => void

/**
 * Configuration for activating the length input
 */
export interface LengthInputConfig {
  /** Position where the input should appear */
  position: LengthInputPosition
  /** Initial value to display (optional) */
  initialValue?: Length
  /** Placeholder text (optional) */
  placeholder?: string
  /** Whether to show immediately or wait for user typing */
  showImmediately?: boolean
  /** Callback when user commits a value */
  onCommit: LengthInputCommitCallback
  /** Callback when user cancels (optional) */
  onCancel?: LengthInputCancelCallback
}

/**
 * State of the length input system
 */
export interface LengthInputState {
  /** Whether the input is currently active */
  isActive: boolean
  /** Current configuration if active */
  config: LengthInputConfig | null
  /** Current input text value */
  inputValue: string
  /** Whether the current input is valid */
  isValid: boolean
  /** Error message if input is invalid */
  errorMessage?: string
}
