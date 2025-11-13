import { vec3 } from 'gl-matrix'
import { describe, expect, it } from 'vitest'

import type { ConstructionElementId } from '@/construction/elements'
import { type ConstructionIssue, type ConstructionResult, aggregateResults } from '@/construction/results'
import { Bounds3D } from '@/shared/geometry'

const elementId = (suffix: string): ConstructionElementId => `ce_${suffix}` as ConstructionElementId

const createIssue = (overrides: Partial<ConstructionIssue> = {}): ConstructionIssue => ({
  description: 'issue',
  elements: [elementId('default')],
  ...overrides
})

const buildError = (issue: ConstructionIssue): ConstructionResult => ({ type: 'error', error: issue })
const buildWarning = (issue: ConstructionIssue): ConstructionResult => ({ type: 'warning', warning: issue })

describe('aggregateResults', () => {
  it('deduplicates errors by groupKey and collects element ids', () => {
    const results: ConstructionResult[] = [
      buildError(
        createIssue({
          description: 'grouped',
          groupKey: 'duplicate',
          elements: [elementId('1'), elementId('2')]
        })
      ),
      buildError(
        createIssue({
          description: 'grouped',
          groupKey: 'duplicate',
          elements: [elementId('2'), elementId('3')]
        })
      )
    ]

    const aggregated = aggregateResults(results)

    expect(aggregated.errors).toHaveLength(1)
    expect(aggregated.errors[0].elements).toEqual([elementId('1'), elementId('2'), elementId('3')])
  })

  it('preserves ordering between grouped and ungrouped issues', () => {
    const results: ConstructionResult[] = [
      buildError(
        createIssue({
          description: 'first grouped',
          groupKey: 'A',
          elements: [elementId('a')]
        })
      ),
      buildError(
        createIssue({
          description: 'ungrouped',
          elements: [elementId('b')]
        })
      ),
      buildError(
        createIssue({
          description: 'first grouped',
          groupKey: 'A',
          elements: [elementId('c')]
        })
      )
    ]

    const aggregated = aggregateResults(results)

    expect(aggregated.errors).toHaveLength(2)
    expect(aggregated.errors.map(issue => issue.description)).toEqual(['first grouped', 'ungrouped'])
  })

  it('keeps errors and warnings grouped independently', () => {
    const results: ConstructionResult[] = [
      buildError(
        createIssue({
          description: 'error grouped',
          groupKey: 'shared',
          elements: [elementId('error-1')]
        })
      ),
      buildWarning(
        createIssue({
          description: 'warning grouped',
          groupKey: 'shared',
          elements: [elementId('warning-1')]
        })
      ),
      buildWarning(
        createIssue({
          description: 'warning grouped',
          groupKey: 'shared',
          elements: [elementId('warning-2')]
        })
      )
    ]

    const aggregated = aggregateResults(results)

    expect(aggregated.errors).toHaveLength(1)
    expect(aggregated.errors[0].elements).toEqual([elementId('error-1')])
    expect(aggregated.warnings).toHaveLength(1)
    expect(aggregated.warnings[0].elements).toEqual([elementId('warning-1'), elementId('warning-2')])
  })

  it('merges bounds when grouping issues', () => {
    const boundsA = Bounds3D.fromMinMax(vec3.fromValues(0, 0, 0), vec3.fromValues(1, 1, 1))
    const boundsB = Bounds3D.fromMinMax(vec3.fromValues(1, 1, 1), vec3.fromValues(2, 2, 2))

    const results: ConstructionResult[] = [
      buildWarning(
        createIssue({
          description: 'grouped',
          groupKey: 'bounds',
          elements: [elementId('with-bounds-a')],
          bounds: boundsA
        })
      ),
      buildWarning(
        createIssue({
          description: 'grouped',
          groupKey: 'bounds',
          elements: [elementId('with-bounds-b')],
          bounds: boundsB
        })
      )
    ]

    const aggregated = aggregateResults(results)

    expect(aggregated.warnings).toHaveLength(1)
    expect(aggregated.warnings[0].bounds?.min).toEqual(vec3.fromValues(0, 0, 0))
    expect(aggregated.warnings[0].bounds?.max).toEqual(vec3.fromValues(2, 2, 2))
  })
})
