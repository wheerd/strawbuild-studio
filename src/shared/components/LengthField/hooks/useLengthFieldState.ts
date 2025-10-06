import { useCallback, useEffect, useState } from 'react'

import type { LengthFieldOptions, LengthFieldState, LengthUnit } from '@/shared/components/LengthField/types'
import {
  clampLength,
  displayValueToLength,
  getDefaultPrecision,
  getDefaultStepSize,
  lengthToDisplayValue
} from '@/shared/components/LengthField/utils/lengthConversion'
import {
  formatDisplayValue,
  isCompleteNumber,
  isValidNumericInput
} from '@/shared/components/LengthField/utils/lengthFormatting'
import type { Length } from '@/shared/geometry'

/**
 * Core hook for managing LengthField state and behavior.
 *
 * This hook implements the following UX principles:
 * - Allow free editing while typing (no value manipulation)
 * - Only apply rounding and bounds on blur
 * - Show validation state for out-of-bounds values
 */
export function useLengthFieldState(
  value: Length,
  onChange: (value: Length) => void,
  unit: LengthUnit,
  options: LengthFieldOptions = {}
): LengthFieldState {
  const { step = getDefaultStepSize(unit), precision = getDefaultPrecision(unit), min, max } = options

  // Local input state for immediate UI updates
  const [inputValue, setInputValue] = useState<string>('')
  const [isEditing, setIsEditing] = useState<boolean>(false)

  // Sync input value with external value changes when not editing
  useEffect(() => {
    if (!isEditing) {
      setInputValue(lengthToDisplayValue(value, unit, precision))
    }
  }, [value, unit, precision, isEditing])

  // Initialize input value on mount
  useEffect(() => {
    setInputValue(lengthToDisplayValue(value, unit, precision))
  }, []) // Only run on mount

  // Validation function for current input
  const validateInputValue = useCallback(
    (rawValue: string): boolean => {
      if (!isValidNumericInput(rawValue)) return false
      if (!isCompleteNumber(rawValue)) return true // Allow incomplete input while typing

      const length = displayValueToLength(rawValue, unit)
      if (length === null) return false

      // Check bounds
      if (min !== undefined && length < min) return false
      if (max !== undefined && length > max) return false

      return true
    },
    [unit, min, max]
  )

  // Handle input changes - allow free editing
  const handleChange = useCallback(
    (newValue: string) => {
      if (isValidNumericInput(newValue)) {
        setInputValue(newValue)
        if (!isEditing) {
          setIsEditing(true)
        }
      }
    },
    [isEditing]
  )

  // Handle blur - apply formatting, rounding, and bounds
  const handleBlur = useCallback(() => {
    if (!isEditing) return

    let finalValue = inputValue

    if (isCompleteNumber(inputValue)) {
      // Apply formatting (remove trailing zeros, etc.)
      finalValue = formatDisplayValue(inputValue, unit, precision)

      // Convert to Length and apply bounds/rounding
      const length = displayValueToLength(finalValue, unit)
      if (length !== null) {
        const clampedLength = clampLength(length, min, max)
        const formattedValue = lengthToDisplayValue(clampedLength, unit, precision)

        // Update the external value if it changed
        if (clampedLength !== value) {
          onChange(clampedLength)
        }

        // Update input to show the final formatted value
        finalValue = formattedValue
      }
    } else {
      // Invalid or incomplete input - revert to current value
      finalValue = lengthToDisplayValue(value, unit, precision)
    }

    setInputValue(finalValue)
    setIsEditing(false)
  }, [inputValue, isEditing, unit, precision, min, max, value, onChange])

  // Step up function
  const stepUp = useCallback(() => {
    const newValue = clampLength((value + step) as Length, min, max)
    onChange(newValue)
  }, [value, step, min, max, onChange])

  // Step down function
  const stepDown = useCallback(() => {
    const newValue = clampLength((value - step) as Length, min, max)
    onChange(newValue)
  }, [value, step, min, max, onChange])

  // Keyboard handler with arrow key support
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          if (e.shiftKey) {
            // Shift + Arrow: 10x step
            const largeStep = (step * 10) as Length
            const newValue = clampLength((value + largeStep) as Length, min, max)
            onChange(newValue)
          } else if (e.ctrlKey || e.metaKey) {
            // Ctrl + Arrow: 0.1x step (minimum 1mm)
            const smallStep = Math.max(1, Math.round(step * 0.1)) as Length
            const newValue = clampLength((value + smallStep) as Length, min, max)
            onChange(newValue)
          } else {
            stepUp()
          }
          break
        case 'ArrowDown':
          e.preventDefault()
          if (e.shiftKey) {
            // Shift + Arrow: 10x step
            const largeStep = (step * 10) as Length
            const newValue = clampLength((value - largeStep) as Length, min, max)
            onChange(newValue)
          } else if (e.ctrlKey || e.metaKey) {
            // Ctrl + Arrow: 0.1x step (minimum 1mm)
            const smallStep = Math.max(1, Math.round(step * 0.1)) as Length
            const newValue = clampLength((value - smallStep) as Length, min, max)
            onChange(newValue)
          } else {
            stepDown()
          }
          break
        case 'Enter':
          e.preventDefault()
          handleBlur()
          ;(e.target as HTMLInputElement).blur()
          break
        case 'Escape':
          e.preventDefault()
          // Revert to external value
          setInputValue(lengthToDisplayValue(value, unit, precision))
          setIsEditing(false)
          ;(e.target as HTMLInputElement).blur()
          break
      }
    },
    [value, step, min, max, onChange, stepUp, stepDown, handleBlur, unit, precision]
  )

  // Check if stepping is possible
  const canStepUp = max === undefined || value < max
  const canStepDown = min === undefined || value > min

  // Determine validation state
  const isValid = validateInputValue(inputValue)

  return {
    displayValue: inputValue,
    handleChange,
    handleBlur,
    handleKeyDown,
    stepUp,
    stepDown,
    isValid,
    canStepUp,
    canStepDown
  }
}
