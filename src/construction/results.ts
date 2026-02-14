import type { Resources, SelectorFn, SelectorOptions } from 'i18next'
import type { Manifold } from 'manifold-3d'

import { transformBounds } from '@/construction/geometry'
import { getBoundsFromManifold, transformManifold } from '@/construction/manifold/operations'
import type { PartInfo } from '@/construction/parts/types'
import type { Tag } from '@/construction/tags'
import { Bounds3D, IDENTITY, type Transform, invertTransform } from '@/shared/geometry'

import {
  type ConstructionElement,
  type ConstructionElementId,
  type ConstructionGroup,
  type GroupOrElement,
  createConstructionElementId
} from './elements'
import type { RawMeasurement } from './measurements'
import type { ConstructionModel, HighlightedArea } from './model'

export type ConstructionIssueId = string & { readonly brand: unique symbol }

export type IssueMessageKey = SelectorFn<Resources['errors'], string, SelectorOptions<'errors'>>

export interface ConstructionIssue {
  /** Unique ID for this issue. If the same ID is used, issues are grouped/merged */
  id: ConstructionIssueId
  /** i18n translation key for the issue message */
  messageKey: IssueMessageKey
  params?: Record<string, unknown>
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

export function assignDeterministicIdsToResults(results: ConstructionResult[], idPrefix: string): void {
  for (const result of results) {
    if (result.type === 'element') {
      assignDeterministicIds(result.element, idPrefix)
    }
  }
}
export function* yieldWithDeterministicIds(
  results: Generator<ConstructionResult>,
  idPrefix: string
): Generator<ConstructionResult> {
  for (const result of results) {
    if (result.type === 'element') {
      assignDeterministicIds(result.element, idPrefix)
    }
    yield result
  }
}

export function assignDeterministicIdsToModel(model: ConstructionModel, idPrefix: string): void {
  for (const element of model.elements) {
    assignDeterministicIds(element, idPrefix)
  }
}

function assignDeterministicIds(element: GroupOrElement, idPrefix: string): void {
  if ('children' in element) {
    for (const child of element.children) {
      assignDeterministicIds(child, idPrefix)
    }
  } else {
    const { min, max } = element.bounds
    const bbox = [min[0], min[1], min[2], max[0], max[1], max[2]].map(v => Math.round(v)).join('_')
    element.id = `ce_${idPrefix}_${bbox}` as ConstructionElementId
  }
}

export const resultsToModel = (results: ConstructionResult[], bounds?: Bounds3D): ConstructionModel => {
  const aggregatedResults = aggregateResults(results)
  return {
    elements: aggregatedResults.elements,
    areas: aggregatedResults.areas,
    bounds: bounds ?? Bounds3D.merge(...aggregatedResults.elements.map(e => transformBounds(e.bounds, e.transform))),
    errors: aggregatedResults.errors,
    measurements: aggregatedResults.measurements,
    warnings: aggregatedResults.warnings
  }
}

// Helper functions for creating ConstructionResults

export function* mergeResults(...generators: Generator<ConstructionResult>[]): Generator<ConstructionResult> {
  for (const gen of generators) {
    yield* gen
  }
}

export function* yieldElement(element: ConstructionElement | ConstructionGroup | null): Generator<ConstructionResult> {
  if (element) {
    yield { type: 'element', element }
  }
}

export const yieldError = (
  messageKey: IssueMessageKey,
  params: Record<string, unknown> | undefined,
  elements: (GroupOrElement | null)[],
  issueId?: string
): ConstructionResult => {
  const id = (issueId ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`) as ConstructionIssueId
  const filteredElements = elements.filter(e => e != null)

  // Attach issue ID to elements
  filteredElements.forEach(element => {
    element.issueIds ??= []
    if (!element.issueIds.includes(id)) {
      element.issueIds.push(id)
    }
  })

  return {
    type: 'error',
    error: {
      id,
      messageKey,
      params,
      severity: 'error'
    }
  }
}

export const yieldWarning = (
  messageKey: IssueMessageKey,
  params: Record<string, unknown> | undefined,
  elements: (GroupOrElement | null)[],
  issueId?: string
): ConstructionResult => {
  const id = (issueId ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`) as ConstructionIssueId
  const filteredElements = elements.filter(e => e != null)

  // Attach issue ID to elements
  filteredElements.forEach(element => {
    element.issueIds ??= []
    if (!element.issueIds.includes(id)) {
      element.issueIds.push(id)
    }
  })

  return {
    type: 'warning',
    warning: {
      id,
      messageKey,
      params,
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

export function* yieldAndClip(
  results: Generator<ConstructionResult>,
  clipping: (m: Manifold) => Manifold
): Generator<ConstructionResult> {
  for (const result of results) {
    if (result.type === 'element') {
      const item = result.element
      for (const element of withClipping(item, clipping)) {
        yield { type: 'element', element }
      }
    } else {
      yield result
    }
  }
}

export function* withClipping(item: GroupOrElement, clipping: (m: Manifold) => Manifold): Generator<GroupOrElement> {
  if ('shape' in item) {
    // This is an element - apply clipping
    const invertedTransform = invertTransform(item.transform)
    const clippedManifold = invertedTransform
      ? transformManifold(clipping(transformManifold(item.shape.manifold, item.transform)), invertedTransform)
      : clipping(item.shape.manifold)

    const decomposed = clippedManifold.decompose()
    if (decomposed.length === 1) {
      if (item.shape.manifold.subtract(decomposed[0]).isEmpty()) {
        yield item
        return
      }
    }

    for (const manifold of decomposed) {
      if (!manifold.isEmpty()) {
        const bounds = getBoundsFromManifold(clippedManifold)
        yield {
          ...item,
          partInfo: item.partInfo ? { ...item.partInfo } : undefined,
          shape: { ...item.shape, manifold, bounds },
          bounds,
          id: createConstructionElementId()
        }
      }
    }
  } else if ('children' in item) {
    const children = item.children.flatMap(c => Array.from(withClipping(c, clipping)))
    const bounds = Bounds3D.merge(...children.map(c => transformBounds(c.bounds, item.transform)))
    yield {
      ...item,
      children,
      bounds
    } satisfies ConstructionGroup
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
