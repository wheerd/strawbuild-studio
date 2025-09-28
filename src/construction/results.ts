import type { ConstructionElement, ConstructionElementId, GroupOrElement } from './elements'
import type { Measurement } from './measurements'
import type { HighlightedArea } from './model'

export interface ConstructionIssue {
  description: string
  elements: ConstructionElementId[]
  /** Groups issues in UI - same groupKey shows as single item */
  groupKey?: string
}

export type ConstructionResult =
  | { type: 'element'; element: GroupOrElement }
  | { type: 'measurement'; measurement: Measurement }
  | { type: 'error'; error: ConstructionIssue }
  | { type: 'warning'; warning: ConstructionIssue }
  | { type: 'area'; area: HighlightedArea }

export const aggregateResults = (results: ConstructionResult[]) => ({
  elements: results.filter(r => r.type === 'element').map(r => r.element),
  measurements: results.filter(r => r.type === 'measurement').map(r => r.measurement),
  errors: results.filter(r => r.type === 'error').map(r => r.error),
  warnings: results.filter(r => r.type === 'warning').map(r => r.warning),
  areas: results.filter(r => r.type === 'area').map(r => r.area)
})

// Helper functions for creating ConstructionResults
export const yieldElement = (element: ConstructionElement): ConstructionResult => ({ type: 'element', element })

export const yieldError = (error: ConstructionIssue): ConstructionResult => ({ type: 'error', error })

export const yieldWarning = (warning: ConstructionIssue): ConstructionResult => ({ type: 'warning', warning })

export const yieldMeasurement = (measurement: Measurement): ConstructionResult => ({ type: 'measurement', measurement })

export const yieldArea = (area: HighlightedArea): ConstructionResult => ({ type: 'area', area })

// Helper to yield all results from a generator while collecting element IDs
export function* yieldAndCollectElementIds(
  generator: Generator<ConstructionResult>,
  elementIds: ConstructionElementId[]
): Generator<ConstructionResult> {
  for (const result of generator) {
    if (result.type === 'element') {
      collectElementIds(result.element, elementIds)
    }
    yield result
  }
}
export function collectElementIds(element: GroupOrElement, elementIds: ConstructionElementId[]) {
  if ('children' in element) {
    for (const child of element.children) {
      collectElementIds(child, elementIds)
    }
  } else {
    elementIds.push(element.id)
  }
}
