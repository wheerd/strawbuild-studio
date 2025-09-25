import type { ConstructionElement, ConstructionElementId } from './elements'
import type { Measurement } from './measurements'

export interface ConstructionIssue {
  description: string
  elements: ConstructionElementId[]
}

export type ConstructionResult =
  | { type: 'element'; element: ConstructionElement }
  | { type: 'measurement'; measurement: Measurement }
  | { type: 'error'; error: ConstructionIssue }
  | { type: 'warning'; warning: ConstructionIssue }

export const aggregateResults = (results: ConstructionResult[]) => ({
  elements: results.filter(r => r.type === 'element').map(r => r.element),
  measurements: results.filter(r => r.type === 'measurement').map(r => r.measurement),
  errors: results.filter(r => r.type === 'error').map(r => r.error),
  warnings: results.filter(r => r.type === 'warning').map(r => r.warning)
})

// Helper functions for creating ConstructionResults
export const yieldElement = (element: ConstructionElement): ConstructionResult => ({ type: 'element', element })

export const yieldError = (error: ConstructionIssue): ConstructionResult => ({ type: 'error', error })

export const yieldWarning = (warning: ConstructionIssue): ConstructionResult => ({ type: 'warning', warning })

export const yieldMeasurement = (measurement: Measurement): ConstructionResult => ({ type: 'measurement', measurement })

// Helper to yield all results from a generator while collecting element IDs
export function* yieldAndCollectElementIds(
  generator: Generator<ConstructionResult>,
  elementIds: ConstructionElementId[]
): Generator<ConstructionResult> {
  for (const result of generator) {
    if (result.type === 'element') {
      elementIds.push(result.element.id)
    }
    yield result
  }
}

export interface WithIssues<T> {
  it: T
  errors: ConstructionIssue[]
  warnings: ConstructionIssue[]
}
