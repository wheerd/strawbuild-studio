import { IDENTITY, type Transform } from '@/construction/geometry'
import type { PartInfo } from '@/construction/parts'
import type { Tag } from '@/construction/tags'
import { Bounds3D } from '@/shared/geometry'

import {
  type ConstructionElement,
  type ConstructionElementId,
  type GroupOrElement,
  createConstructionElementId
} from './elements'
import type { RawMeasurement } from './measurements'
import type { HighlightedArea } from './model'

export type ConstructionIssueId = string & { readonly brand: unique symbol }

export interface ConstructionIssue {
  /** Unique ID for this issue. If the same ID is used, issues are grouped/merged */
  id: ConstructionIssueId
  description: string
  severity: 'error' | 'warning'
}

export type ConstructionResult =
  | { type: 'element'; element: GroupOrElement }
  | { type: 'measurement'; measurement: RawMeasurement }
  | { type: 'error'; error: ConstructionIssue }
  | { type: 'warning'; warning: ConstructionIssue }
  | { type: 'area'; area: HighlightedArea }

export const aggregateResults = (results: ConstructionResult[]) => ({
  elements: results.filter(r => r.type === 'element').map(r => r.element),
  measurements: results.filter(r => r.type === 'measurement').map(r => r.measurement),
  errors: mergeConstructionIssues(results.filter(r => r.type === 'error').map(r => r.error)),
  warnings: mergeConstructionIssues(results.filter(r => r.type === 'warning').map(r => r.warning)),
  areas: results.filter(r => r.type === 'area').map(r => r.area)
})

// Helper functions for creating ConstructionResults
export function* yieldElement(element: ConstructionElement | null): Generator<ConstructionResult> {
  if (element) {
    yield { type: 'element', element }
  }
}

export const yieldError = (
  description: string,
  elements: (GroupOrElement | null)[],
  issueId?: string
): ConstructionResult => {
  const id = (issueId ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`) as ConstructionIssueId
  const filteredElements = elements.filter(e => e != null)

  // Attach issue ID to elements
  filteredElements.forEach(element => {
    if (!element.issueIds) {
      element.issueIds = []
    }
    if (!element.issueIds.includes(id)) {
      element.issueIds.push(id)
    }
  })

  return {
    type: 'error',
    error: {
      id,
      description,
      severity: 'error'
    }
  }
}

export const yieldWarning = (
  description: string,
  elements: (GroupOrElement | null)[],
  issueId?: string
): ConstructionResult => {
  const id = (issueId ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`) as ConstructionIssueId
  const filteredElements = elements.filter(e => e != null)

  // Attach issue ID to elements
  filteredElements.forEach(element => {
    if (!element.issueIds) {
      element.issueIds = []
    }
    if (!element.issueIds.includes(id)) {
      element.issueIds.push(id)
    }
  })

  return {
    type: 'warning',
    warning: {
      id,
      description,
      severity: 'warning'
    }
  }
}

export const yieldMeasurement = (measurement: RawMeasurement): ConstructionResult => ({
  type: 'measurement',
  measurement
})

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

// Helper to yield all results from a generator while collecting elements
export function* yieldAndCollectElements(
  generator: Generator<ConstructionResult>,
  elements: GroupOrElement[]
): Generator<ConstructionResult> {
  for (const result of generator) {
    if (result.type === 'element') {
      elements.push(result.element)
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

export function* yieldAndCollectBounds(
  generator: Generator<ConstructionResult>,
  boundsRef: [Bounds3D]
): Generator<ConstructionResult> {
  for (const result of generator) {
    if (result.type === 'element') {
      boundsRef[0] = boundsRef[0] ? Bounds3D.merge(boundsRef[0], result.element.bounds) : result.element.bounds
    }
    yield result
  }
}

export function* yieldAsGroup(
  generator: Generator<ConstructionResult>,
  tags?: Tag[],
  transform: Transform = IDENTITY,
  partInfo?: PartInfo
): Generator<ConstructionResult> {
  const children: GroupOrElement[] = []
  for (const result of generator) {
    if (result.type === 'element') {
      children.push(result.element)
    } else {
      yield result
    }
  }
  if (children.length === 0) {
    return
  }
  yield {
    type: 'element',
    element: {
      id: createConstructionElementId(),
      bounds: Bounds3D.merge(...children.map(c => c.bounds)),
      transform,
      tags,
      partInfo,
      children
    }
  }
}

export function mergeConstructionIssues(issues: ConstructionIssue[]): ConstructionIssue[] {
  const seen = new Map<ConstructionIssueId, ConstructionIssue>()

  for (const issue of issues) {
    if (!seen.has(issue.id)) {
      seen.set(issue.id, issue)
    }
    // If already seen, it's a duplicate - just keep the first one
  }

  return Array.from(seen.values())
}
