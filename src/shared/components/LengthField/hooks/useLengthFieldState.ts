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
 * - Fire onChange during typing for valid values (live feedback)
 * - Fire onCommit only on blur/enter with final processed value
 * - Show validation state for out-of-bounds values
 * - Maintain separate internal/external state with proper sync
 */
export function useLengthFieldState(
  value: Length,
  unit: LengthUnit,
  options: LengthFieldOptions = {}
): LengthFieldState {
  const {
    step = getDefaultStepSize(unit),
    precision = getDefaultPrecision(unit),
    min,
    max,
    onChange,
    onCommit,
    locale = 'en'
  } = options

  // Local input state for immediate UI updates
  const [inputValue, setInputValue] = useState<string>('')
  const [isEditing, setIsEditing] = useState<boolean>(false)

  // Track the last committed value to prevent unnecessary commits
  const [lastCommittedValue, setLastCommittedValue] = useState<Length>(value)

  // Sync input value with external value changes when not editing
  useEffect(() => {
    if (!isEditing) {
      setInputValue(lengthToDisplayValue(value, unit, precision, locale))
      setLastCommittedValue(value)
    }
  }, [value, unit, precision, locale, isEditing])

  // Initialize input value on mount
  useEffect(() => {
    setInputValue(lengthToDisplayValue(value, unit, precision, locale))
    setLastCommittedValue(value)
  }, []) // Only run on mount

  const doCommit = useCallback(
    (value: Length) => {
      if (onChange) {
        onChange(value)
      }
      if (onCommit && value !== lastCommittedValue) {
        onCommit(value)
      }
      setLastCommittedValue(value)
    },
    [onChange, onCommit, lastCommittedValue]
  )

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

  // Handle input changes - allow free editing with live onChange
  const handleChange = useCallback(
    (newValue: string) => {
      if (isValidNumericInput(newValue)) {
        setInputValue(newValue)
        if (!isEditing) {
          setIsEditing(true)
        }

        // Fire onChange for valid complete numbers during typing
        if (onChange && isCompleteNumber(newValue)) {
          const length = displayValueToLength(newValue, unit)
          if (length !== null) {
            // Don't clamp for onChange - just validate bounds for visual feedback
            const isInBounds = (min === undefined || length >= min) && (max === undefined || length <= max)
            if (isInBounds) {
              onChange(length)
            }
          }
        }
      }
    },
    [isEditing, onChange, unit, min, max]
  )

  // Handle blur - apply formatting, rounding, and bounds, then commit
  const handleBlur = useCallback(() => {
    if (!isEditing) return

    let finalValue = inputValue
    let finalLength = value

    if (isCompleteNumber(inputValue)) {
      // Apply formatting (remove trailing zeros, etc.)
      finalValue = formatDisplayValue(inputValue, unit, precision, locale)

      // Convert to Length and apply bounds/rounding
      const length = displayValueToLength(finalValue, unit)
      if (length !== null) {
        const clampedLength = clampLength(length, min, max)
        const formattedValue = lengthToDisplayValue(clampedLength, unit, precision, locale)

        finalLength = clampedLength
        finalValue = formattedValue
      }
    } else {
      // Invalid or incomplete input - revert to current value
      finalValue = lengthToDisplayValue(value, unit, precision, locale)
      finalLength = value
    }

    doCommit(finalLength)
    setInputValue(finalValue)
    setIsEditing(false)
  }, [inputValue, isEditing, unit, precision, locale, min, max, value, doCommit])

  // Step up function
  const stepUp = useCallback(() => {
    const newValue = clampLength(value + step, min, max)
    doCommit(newValue)
  }, [value, step, min, max, doCommit])

  // Step down function
  const stepDown = useCallback(() => {
    const newValue = clampLength(value - step, min, max)
    doCommit(newValue)
  }, [value, step, min, max, doCommit])

  // Keyboard handler with arrow key support
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          if (e.shiftKey) {
            // Shift + Arrow: 10x step
            const largeStep = step * 10
            const newValue = clampLength(value + largeStep, min, max)
            doCommit(newValue)
          } else if (e.ctrlKey || e.metaKey) {
            // Ctrl + Arrow: 0.1x step (minimum 1mm)
            const smallStep = Math.max(1, Math.round(step * 0.1))
            const newValue = clampLength(value + smallStep, min, max)
            doCommit(newValue)
          } else {
            stepUp()
          }
          break
        case 'ArrowDown':
          e.preventDefault()
          if (e.shiftKey) {
            // Shift + Arrow: 10x step
            const largeStep = step * 10
            const newValue = clampLength(value - largeStep, min, max)
            doCommit(newValue)
          } else if (e.ctrlKey || e.metaKey) {
            // Ctrl + Arrow: 0.1x step (minimum 1mm)
            const smallStep = Math.max(1, Math.round(step * 0.1))
            const newValue = clampLength(value - smallStep, min, max)
            doCommit(newValue)
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
          setInputValue(lengthToDisplayValue(value, unit, precision, locale))
          setIsEditing(false)
          ;(e.target as HTMLInputElement).blur()
          break
      }
    },
    [value, step, min, max, doCommit, stepUp, stepDown, handleBlur, unit, precision, locale]
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
