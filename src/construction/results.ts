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

export interface ConstructionIssue {
  description: string
  elements: ConstructionElementId[]
  bounds?: Bounds3D
  /** Groups issues in UI - same groupKey shows as single item */
  groupKey?: string
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
export const yieldElement = (element: ConstructionElement): ConstructionResult => ({ type: 'element', element })

export const yieldError = (error: ConstructionIssue): ConstructionResult => ({ type: 'error', error })

export const yieldWarning = (warning: ConstructionIssue): ConstructionResult => ({ type: 'warning', warning })

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
  const aggregated: ConstructionIssue[] = []
  const grouped = new Map<string, ConstructionIssue>()

  for (const issue of issues) {
    if (!issue.groupKey) {
      aggregated.push(issue)
      continue
    }

    const existing = grouped.get(issue.groupKey)
    if (!existing) {
      const cloned: ConstructionIssue = {
        ...issue,
        elements: [...issue.elements]
      }
      grouped.set(issue.groupKey, cloned)
      aggregated.push(cloned)
      continue
    }

    mergeIssue(existing, issue)
  }

  return aggregated
}

function mergeIssue(target: ConstructionIssue, incoming: ConstructionIssue) {
  const existingIds = new Set(target.elements)
  for (const elementId of incoming.elements) {
    if (existingIds.has(elementId)) continue
    existingIds.add(elementId)
    target.elements.push(elementId)
  }

  if (target.bounds && incoming.bounds) {
    target.bounds = Bounds3D.merge(target.bounds, incoming.bounds)
  } else if (!target.bounds && incoming.bounds) {
    target.bounds = incoming.bounds
  }
}
