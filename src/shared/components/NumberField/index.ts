import { NumberField } from './NumberField'

export { NumberField }
export type { NumberFieldProps, NumberFieldOptions, NumberFieldState } from './types'
export { useNumberFieldState } from './hooks/useNumberFieldState'

// Re-export compound component parts for convenience
export const NumberFieldRoot = NumberField.Root
export const NumberFieldInput = NumberField.Input
export const NumberFieldSlot = NumberField.Slot
export const NumberFieldSpinner = NumberField.Spinner
