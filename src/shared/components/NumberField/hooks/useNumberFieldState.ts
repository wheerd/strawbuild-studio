import { useCallback, useEffect, useState } from 'react'

import type { NumberFieldOptions, NumberFieldState } from '@/shared/components/NumberField/types'
import {
  formatNumberForInputCompact,
  isCompleteLocaleNumber,
  isValidLocaleNumericInput,
  parseLocaleNumber
} from '@/shared/i18n/numberParsing'

/**
 * Clamp a number to min/max bounds.
 */
function clampNumber(value: number, min?: number, max?: number): number {
  if (min !== undefined && value < min) return min
  if (max !== undefined && value > max) return max
  return value
}

/**
 * Format a number for display in an input field.
 * Returns empty string for undefined values.
 */
function formatDisplayValue(value: number | undefined, precision: number, locale: string): string {
  if (value === undefined) return ''
  if (precision === 0) {
    return Math.round(value).toString()
  }
  return formatNumberForInputCompact(value, precision, locale)
}

/**
 * Core hook for managing NumberField state and behavior.
 *
 * This hook implements the following UX principles:
 * - Allow free editing while typing (no value manipulation)
 * - Fire onChange during typing for valid values (live feedback)
 * - Fire onCommit only on blur/enter with final processed value
 * - Show validation state for out-of-bounds values
 * - Maintain separate internal/external state with proper sync
 * - Support undefined values (empty input clears the value)
 */
export function useNumberFieldState(value: number | undefined, options: NumberFieldOptions = {}): NumberFieldState {
  const { step = 1, precision = 0, min, max, onChange, onCommit, locale = 'en' } = options

  // Local input state for immediate UI updates
  const [inputValue, setInputValue] = useState<string>('')
  const [isEditing, setIsEditing] = useState<boolean>(false)

  // Track the last committed value to prevent unnecessary commits
  const [lastCommittedValue, setLastCommittedValue] = useState<number | undefined>(value)

  // Sync input value with external value changes when not editing
  useEffect(() => {
    if (!isEditing) {
      setInputValue(formatDisplayValue(value, precision, locale))
      setLastCommittedValue(value)
    }
  }, [value, precision, locale, isEditing])

  // Initialize input value on mount
  useEffect(() => {
    setInputValue(formatDisplayValue(value, precision, locale))
    setLastCommittedValue(value)
  }, []) // Only run on mount

  const doCommit = useCallback(
    (newValue: number | undefined) => {
      if (onChange) {
        onChange(newValue)
      }
      if (onCommit && newValue !== lastCommittedValue) {
        onCommit(newValue)
      }
      setLastCommittedValue(newValue)
    },
    [onChange, onCommit, lastCommittedValue]
  )

  // Validation function for current input
  const validateInputValue = useCallback(
    (rawValue: string): boolean => {
      // Empty input is valid (represents undefined)
      if (rawValue.trim() === '') return true

      if (!isValidLocaleNumericInput(rawValue)) return false
      if (!isCompleteLocaleNumber(rawValue)) return true // Allow incomplete input while typing

      const number = parseLocaleNumber(rawValue)
      if (number === null) return false

      // Check bounds
      if (min !== undefined && number < min) return false
      if (max !== undefined && number > max) return false

      return true
    },
    [min, max]
  )

  // Handle input changes - allow free editing with live onChange
  const handleChange = useCallback(
    (newValue: string) => {
      // Allow empty input
      if (newValue === '' || isValidLocaleNumericInput(newValue)) {
        setInputValue(newValue)
        if (!isEditing) {
          setIsEditing(true)
        }

        // Fire onChange for empty input (undefined)
        if (onChange && newValue.trim() === '') {
          onChange(undefined)
          return
        }

        // Fire onChange for valid complete numbers during typing
        if (onChange && isCompleteLocaleNumber(newValue)) {
          const number = parseLocaleNumber(newValue)
          if (number !== null) {
            // Don't clamp for onChange - just validate bounds for visual feedback
            const isInBounds = (min === undefined || number >= min) && (max === undefined || number <= max)
            if (isInBounds) {
              onChange(number)
            }
          }
        }
      }
    },
    [isEditing, onChange, min, max]
  )

  // Handle blur - apply formatting, rounding, and bounds, then commit
  const handleBlur = useCallback(() => {
    if (!isEditing) return

    // Handle empty input - commit undefined
    if (inputValue.trim() === '') {
      doCommit(undefined)
      setInputValue('')
      setIsEditing(false)
      return
    }

    let finalValue = inputValue
    let finalNumber: number | undefined = value

    if (isCompleteLocaleNumber(inputValue)) {
      // Convert to number and apply bounds/rounding
      const number = parseLocaleNumber(inputValue)
      if (number !== null) {
        const clampedNumber = clampNumber(number, min, max)
        // Round to precision
        const roundedNumber =
          precision === 0
            ? Math.round(clampedNumber)
            : Math.round(clampedNumber * Math.pow(10, precision)) / Math.pow(10, precision)
        const formattedValue = formatDisplayValue(roundedNumber, precision, locale)

        finalNumber = roundedNumber
        finalValue = formattedValue
      }
    } else {
      // Invalid or incomplete input - revert to current value
      finalValue = formatDisplayValue(value, precision, locale)
      finalNumber = value
    }

    doCommit(finalNumber)
    setInputValue(finalValue)
    setIsEditing(false)
  }, [inputValue, isEditing, precision, locale, min, max, value, doCommit])

  // Get starting value for stepping (use min, then 0, then just step from nothing)
  const getBaseValue = useCallback((): number => {
    if (value !== undefined) return value
    if (min !== undefined) return min
    return 0
  }, [value, min])

  // Step up function
  const stepUp = useCallback(() => {
    const base = getBaseValue()
    const newValue = clampNumber(base + step, min, max)
    doCommit(newValue)
  }, [getBaseValue, step, min, max, doCommit])

  // Step down function
  const stepDown = useCallback(() => {
    const base = getBaseValue()
    const newValue = clampNumber(base - step, min, max)
    doCommit(newValue)
  }, [getBaseValue, step, min, max, doCommit])

  // Keyboard handler with arrow key support
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const base = getBaseValue()

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          if (e.shiftKey) {
            // Shift + Arrow: 10x step
            const largeStep = step * 10
            const newValue = clampNumber(base + largeStep, min, max)
            doCommit(newValue)
          } else if (e.ctrlKey || e.metaKey) {
            // Ctrl + Arrow: 0.1x step
            const smallStep = step * 0.1
            const newValue = clampNumber(base + smallStep, min, max)
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
            const newValue = clampNumber(base - largeStep, min, max)
            doCommit(newValue)
          } else if (e.ctrlKey || e.metaKey) {
            // Ctrl + Arrow: 0.1x step
            const smallStep = step * 0.1
            const newValue = clampNumber(base - smallStep, min, max)
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
          setInputValue(formatDisplayValue(value, precision, locale))
          setIsEditing(false)
          ;(e.target as HTMLInputElement).blur()
          break
      }
    },
    [getBaseValue, value, step, min, max, doCommit, stepUp, stepDown, handleBlur, precision, locale]
  )

  // Check if stepping is possible (always possible if value is undefined - will start from base)
  const canStepUp = value === undefined || max === undefined || value < max
  const canStepDown = value === undefined || min === undefined || value > min

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
