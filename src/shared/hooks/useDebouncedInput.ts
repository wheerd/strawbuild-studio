import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Hook for managing input fields with debounced updates to prevent focus loss
 * and provide immediate visual feedback while batching store updates.
 */
export function useDebouncedInput<T>(
  value: T,
  onUpdate: (value: T) => void,
  options: {
    debounceMs?: number
    transform?: (rawValue: string) => T
    validate?: (value: T) => boolean
  } = {}
) {
  const { debounceMs = 500, transform, validate } = options

  // Local state for immediate UI updates
  const [localValue, setLocalValue] = useState<string>(String(value))
  const [isDirty, setIsDirty] = useState(false)

  // Refs for cleanup
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastUpdateRef = useRef<T>(value)

  // Sync local state with external value changes (but only if not dirty)
  useEffect(() => {
    if (!isDirty && value !== lastUpdateRef.current) {
      setLocalValue(String(value))
      lastUpdateRef.current = value
    }
  }, [value, isDirty])

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Handle input changes with debounced updates
  const handleChange = useCallback(
    (rawValue: string) => {
      setLocalValue(rawValue)
      setIsDirty(true)

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Set up new debounced update
      timeoutRef.current = setTimeout(() => {
        try {
          const transformedValue = transform ? transform(rawValue) : (rawValue as unknown as T)

          // Only update if validation passes (if provided)
          if (!validate || validate(transformedValue)) {
            onUpdate(transformedValue)
            lastUpdateRef.current = transformedValue
          } else {
            // Revert to last valid value if validation fails
            setLocalValue(String(lastUpdateRef.current))
          }
        } catch (error) {
          // Revert to last valid value if transform fails
          console.warn('Input transform failed:', error)
          setLocalValue(String(lastUpdateRef.current))
        } finally {
          setIsDirty(false)
        }
      }, debounceMs)
    },
    [onUpdate, transform, validate, debounceMs]
  )

  // Handle immediate commit (e.g., on blur or enter)
  const commitValue = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    if (isDirty) {
      try {
        const transformedValue = transform ? transform(localValue) : (localValue as unknown as T)

        if (!validate || validate(transformedValue)) {
          onUpdate(transformedValue)
          lastUpdateRef.current = transformedValue
        } else {
          // Revert to last valid value
          setLocalValue(String(lastUpdateRef.current))
        }
      } catch (error) {
        // Revert to last valid value
        console.warn('Input transform failed:', error)
        setLocalValue(String(lastUpdateRef.current))
      } finally {
        setIsDirty(false)
      }
    }
  }, [localValue, onUpdate, transform, validate, isDirty])

  return {
    value: localValue,
    handleChange,
    handleBlur: commitValue,
    handleKeyDown: useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
          commitValue()
          ;(e.target as HTMLInputElement).blur()
        }
      },
      [commitValue]
    ),
    isDirty
  }
}

/**
 * Specialized hook for numeric inputs with clamping
 */
export function useDebouncedNumericInput(
  value: number,
  onUpdate: (value: number) => void,
  options: {
    debounceMs?: number
    min?: number
    max?: number
    step?: number
  } = {}
) {
  const { min, max, step, ...baseOptions } = options

  return useDebouncedInput(value, onUpdate, {
    ...baseOptions,
    transform: (rawValue: string) => {
      let numValue = parseFloat(rawValue)

      // Handle NaN
      if (isNaN(numValue)) {
        throw new Error('Invalid number')
      }

      // Apply step rounding if specified
      if (step !== undefined && step > 0) {
        numValue = Math.round(numValue / step) * step
      }

      // Apply clamping if specified
      if (min !== undefined) {
        numValue = Math.max(min, numValue)
      }
      if (max !== undefined) {
        numValue = Math.min(max, numValue)
      }

      return numValue
    },
    validate: (value: number) => {
      if (isNaN(value)) return false
      if (min !== undefined && value < min) return false
      if (max !== undefined && value > max) return false
      return true
    }
  })
}
