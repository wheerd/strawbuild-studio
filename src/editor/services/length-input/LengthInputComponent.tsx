import { Box, TextField } from '@radix-ui/themes'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useStageHeight, useStageWidth } from '@/editor/hooks/useViewportStore'

import { lengthInputService } from './LengthInputService'
import type { LengthInputState } from './types'

/**
 * React component for the length input system.
 * Renders a floating input field that appears when activated by tools.
 */
export function LengthInputComponent(): React.JSX.Element | null {
  const [state, setState] = useState<LengthInputState>(lengthInputService.getState())
  const inputRef = useRef<HTMLInputElement>(null)

  // Get current viewport dimensions for bounds checking (must be at top level)
  const stageWidth = useStageWidth()
  const stageHeight = useStageHeight()

  // Subscribe to service state changes
  useEffect(() => {
    const unsubscribe = lengthInputService.subscribe(() => {
      setState(lengthInputService.getState())
    })
    return unsubscribe
  }, [])

  // Auto-focus and select all text when activated
  useEffect(() => {
    if (state.isActive && inputRef.current) {
      // Use setTimeout to ensure the input is rendered before focusing
      setTimeout(() => {
        inputRef.current?.focus()

        // If showImmediately was true (preset value), select all text
        // If triggered by typing (showImmediately was false), cursor goes to end
        if (state.config?.showImmediately) {
          inputRef.current?.select()
        } else {
          // Position cursor at the end (after any typed character)
          const length = state.inputValue.length
          inputRef.current?.setSelectionRange(length, length)
        }
      }, 0)
    }
  }, [state.isActive]) // Only depend on isActive, not inputValue

  // Global keyboard handler for capturing numeric input when ready but not shown
  const handleGlobalKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Only handle if we're ready (config exists) but not active (not shown)
      if (!state.config || state.isActive) return

      // Check if this is numeric input that should trigger the input
      if (isNumericInput(event.key)) {
        // Show the input and start with the typed character
        lengthInputService.show()
        lengthInputService.updateInputValue(event.key)
        event.preventDefault()
      }
    },
    [state.config, state.isActive]
  )

  // Install/remove global keyboard handler based on ready state
  useEffect(() => {
    // Only install handler when ready but not shown, and not set to show immediately
    const shouldInstallHandler = state.config && !state.isActive && !state.config.showImmediately

    if (shouldInstallHandler) {
      document.addEventListener('keydown', handleGlobalKeyDown)

      return () => {
        document.removeEventListener('keydown', handleGlobalKeyDown)
      }
    }
  }, [state.config, state.isActive, handleGlobalKeyDown])

  // Helper function to check if a key represents numeric input
  const isNumericInput = (key: string): boolean => {
    return /^[0-9.-]$/.test(key)
  }

  // Handle input changes
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const cursorPosition = input.selectionStart

    lengthInputService.updateInputValue(input.value)

    // Restore cursor position after React re-render
    setTimeout(() => {
      if (inputRef.current && cursorPosition !== null) {
        inputRef.current.setSelectionRange(cursorPosition, cursorPosition)
      }
    }, 0)
  }

  // Handle key events
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // Let the service handle Enter and Escape
    if (lengthInputService.handleKeyDown(event.nativeEvent)) {
      event.stopPropagation() // Prevent bubbling to parent elements
    }
  }

  // Handle blur events - cancel when input loses focus
  const handleBlur = () => {
    lengthInputService.cancel()
  }

  // Don't render if not active
  if (!state.isActive || !state.config) {
    return null
  }

  const { position, placeholder } = state.config

  // Constrain position to viewport bounds with appropriate margins
  const horizontalMargin = 150 // Space for input width
  const verticalMargin = 50 // Smaller margin since input is only ~40px tall

  const constrainedPosition = {
    x: Math.max(horizontalMargin, Math.min(stageWidth - horizontalMargin, position.x)),
    y: Math.max(verticalMargin, Math.min(stageHeight - verticalMargin, position.y))
  }

  return (
    <Box
      className="absolute z-[1000] pointer-events-auto"
      style={{
        left: constrainedPosition.x,
        top: constrainedPosition.y,
        transform: 'translate(-50%, -100%)'
      }}
    >
      <TextField.Root
        ref={inputRef}
        value={state.inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder || 'Enter length...'}
        size="3"
        variant="surface"
        color={state.isValid ? undefined : 'red'}
        className="w-20 text-center shadow-lg"
        style={{
          border: state.isValid ? '2px solid var(--accent-9)' : '2px solid var(--red-9)'
        }}
      />

      {/* Error message */}
      {!state.isValid && state.errorMessage && (
        <Box
          className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 text-white text-xs rounded whitespace-nowrap shadow-md"
          style={{
            backgroundColor: 'var(--red-9)'
          }}
        >
          {state.errorMessage}
        </Box>
      )}
    </Box>
  )
}

/**
 * Hook to use the length input service in React components
 */
export function useLengthInput() {
  const [state, setState] = useState<LengthInputState>(lengthInputService.getState())

  useEffect(() => {
    const unsubscribe = lengthInputService.subscribe(() => {
      setState(lengthInputService.getState())
    })
    return unsubscribe
  }, [])

  return {
    state,
    activate: lengthInputService.activate.bind(lengthInputService),
    deactivate: lengthInputService.deactivate.bind(lengthInputService),
    isActive: state.isActive
  }
}
