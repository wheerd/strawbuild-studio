import { viewportState } from '@/editor/hooks/useViewportStore'
import type { Length } from '@/shared/geometry'
import { formatLength } from '@/shared/utils/formatLength'

import { parseLength } from './parseLength'
import type { LengthInputConfig, LengthInputPosition, LengthInputState } from './types'

/**
 * Global service for managing the length input system.
 * Provides centralized state management and coordination between tools and the UI component.
 */
export class LengthInputService {
  private state: LengthInputState = {
    isActive: false,
    config: null,
    inputValue: '',
    isValid: true
  }

  private listeners = new Set<() => void>()

  /**
   * Get the current state of the length input system
   */
  getState(): Readonly<LengthInputState> {
    return { ...this.state }
  }

  /**
   * Subscribe to state changes
   * @param listener - Function to call when state changes
   * @returns Unsubscribe function
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Constrain position to viewport bounds with appropriate margins
   * @param position - Raw position to constrain
   * @returns Position constrained to viewport bounds
   */
  private constrainToViewport(position: LengthInputPosition): LengthInputPosition {
    const viewport = viewportState()
    const horizontalMargin = 150 // Space for input width
    const verticalMargin = 50 // Smaller margin since input is only ~40px tall

    return {
      x: Math.max(horizontalMargin, Math.min(viewport.stageWidth - horizontalMargin, position.x)),
      y: Math.max(verticalMargin, Math.min(viewport.stageHeight - verticalMargin, position.y))
    }
  }

  /**
   * Activate the length input with the given configuration
   * @param config - Configuration for the length input
   */
  activate(config: LengthInputConfig): void {
    // If already active, deactivate first
    if (this.state.isActive) {
      this.deactivate()
    }

    const initialValue = config.initialValue !== undefined ? this.formatInitialValue(config.initialValue) : ''

    // Auto-constrain position to viewport bounds
    const constrainedConfig = {
      ...config,
      position: this.constrainToViewport(config.position)
    }

    this.state = {
      isActive: config.showImmediately ?? false, // Only show immediately if explicitly requested
      config: constrainedConfig,
      inputValue: initialValue,
      isValid: true,
      errorMessage: undefined
    }

    this.notifyListeners()
  }

  /**
   * Show the input if it's been activated but not yet visible
   * This is called when the user starts typing
   */
  show(): void {
    if (this.state.config && !this.state.isActive) {
      this.state = {
        ...this.state,
        isActive: true
      }
      this.notifyListeners()
    }
  }

  /**
   * Check if the input is ready to be shown (activated but not visible)
   */
  isReady(): boolean {
    return this.state.config !== null && !this.state.isActive
  }

  /**
   * Update the position of the length input if it's currently active or ready
   * @param position - New position for the input
   */
  updatePosition(position: LengthInputPosition): void {
    if (!this.state.config) return

    this.state = {
      ...this.state,
      config: {
        ...this.state.config,
        position
      }
    }

    this.notifyListeners()
  }

  /**
   * Deactivate the length input
   */
  deactivate(): void {
    if (!this.state.isActive && !this.state.config) return

    this.state = {
      isActive: false,
      config: null,
      inputValue: '',
      isValid: true,
      errorMessage: undefined
    }

    this.notifyListeners()
  }

  /**
   * Update the input value and validate it
   * @param value - New input value
   */
  updateInputValue(value: string): void {
    if (!this.state.isActive) return

    const parseResult = parseLength(value)

    this.state = {
      ...this.state,
      inputValue: value,
      isValid: parseResult.success,
      errorMessage: parseResult.error
    }

    this.notifyListeners()
  }

  /**
   * Commit the current input value
   */
  commit(): void {
    if (!this.state.isActive || !this.state.config) return

    const parseResult = parseLength(this.state.inputValue)
    if (!parseResult.success || parseResult.value === null) {
      // Don't commit invalid values
      return
    }

    const { onCommit } = this.state.config
    const value = parseResult.value

    // Deactivate before calling callback to prevent re-entrance
    this.deactivate()

    // Call the commit callback
    onCommit(value)
  }

  /**
   * Cancel the current input
   */
  cancel(): void {
    if (!this.state.isActive || !this.state.config) return

    const { onCancel } = this.state.config

    // Deactivate before calling callback to prevent re-entrance
    this.deactivate()

    // Call the cancel callback if provided
    if (onCancel) {
      onCancel()
    }
  }

  /**
   * Handle keyboard input when the length input is active
   * @param event - Keyboard event
   * @returns true if the event was handled, false otherwise
   */
  handleKeyDown(event: KeyboardEvent): boolean {
    if (!this.state.isActive) return false

    switch (event.key) {
      case 'Enter':
        event.preventDefault()
        this.commit()
        return true

      case 'Escape':
        event.preventDefault()
        this.cancel()
        return true

      default:
        // Let other keys pass through to the input element
        return false
    }
  }

  /**
   * Check if the length input should capture keyboard events
   * This is used by the main editor to determine if tool shortcuts should be disabled
   */
  shouldCaptureKeyboard(): boolean {
    return this.state.isActive
  }

  private formatInitialValue(length: Length): string {
    // Use the standard formatLength to include units
    // This ensures consistency and prevents unit confusion
    return formatLength(length)
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener()
      } catch (error) {
        console.error('Error in length input listener:', error)
      }
    })
  }
}

// Global singleton instance
export const lengthInputService = new LengthInputService()

// Convenience functions for common operations
export function activateLengthInput(config: LengthInputConfig): void {
  lengthInputService.activate(config)
}

export function deactivateLengthInput(): void {
  lengthInputService.deactivate()
}

export function isLengthInputActive(): boolean {
  return lengthInputService.getState().isActive
}

export function showLengthInput(): void {
  lengthInputService.show()
}

export function isLengthInputReady(): boolean {
  return lengthInputService.isReady()
}

export function updateLengthInputPosition(position: LengthInputPosition): void {
  lengthInputService.updatePosition(position)
}
