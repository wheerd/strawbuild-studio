// Main service export (primary interface)
export {
  lengthInputService,
  activateLengthInput,
  deactivateLengthInput,
  isLengthInputActive,
  showLengthInput,
  isLengthInputReady,
  updateLengthInputPosition
} from './LengthInputService'

// Service class for advanced usage
export type { LengthInputService } from './LengthInputService'

// Component for integration into editor
export { LengthInputComponent, useLengthInput } from './LengthInputComponent'

// Utilities
export { parseLength, parseLengthValue, isValidLengthInput } from './parseLength'

// Types
export type {
  LengthInputPosition,
  LengthInputCommitCallback,
  LengthInputCancelCallback,
  LengthInputConfig,
  LengthInputState
} from './types'

export type { ParseLengthResult } from './parseLength'
