/**
 * Error thrown when an entity is not found in the store
 */
export class NotFoundError extends Error {
  entityType: string
  entityId: string

  constructor(entityType: string, entityId: string) {
    super(`${entityType} with id "${entityId}" not found`)
    this.name = 'NotFoundError'
    this.entityType = entityType
    this.entityId = entityId

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if ('captureStackTrace' in Error) {
      Error.captureStackTrace(this, NotFoundError)
    }
  }
}

/**
 * Error thrown when an entity operation is invalid
 */
export class InvalidOperationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidOperationError'

    if ('captureStackTrace' in Error) {
      Error.captureStackTrace(this, InvalidOperationError)
    }
  }
}
