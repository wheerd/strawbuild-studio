import { describe, expect, it } from 'vitest'

import {
  type ConstructionIssue,
  type ConstructionIssueId,
  type ConstructionResult,
  aggregateResults
} from '@/construction/results'

const issueId = (suffix: string): ConstructionIssueId => `ci_${suffix}` as ConstructionIssueId

const createIssue = (overrides: Partial<ConstructionIssue> = {}): ConstructionIssue => ({
  id: issueId('default'),
  messageKey: 'test.issue' as any,
  severity: 'error',
  ...overrides
})

const buildError = (issue: ConstructionIssue): ConstructionResult => ({ type: 'error', error: issue })
const buildWarning = (issue: ConstructionIssue): ConstructionResult => ({ type: 'warning', warning: issue })

describe('aggregateResults', () => {
  it('deduplicates errors by id', () => {
    const results: ConstructionResult[] = [
      buildError(
        createIssue({
          id: issueId('duplicate'),
          messageKey: 'test.grouped' as any
        })
      ),
      buildError(
        createIssue({
          id: issueId('duplicate'),
          messageKey: 'test.grouped' as any
        })
      )
    ]

    const aggregated = aggregateResults(results)

    expect(aggregated.errors).toHaveLength(1)
    expect(aggregated.errors[0].id).toBe(issueId('duplicate'))
  })

  it('preserves distinct issues with different ids', () => {
    const results: ConstructionResult[] = [
      buildError(
        createIssue({
          id: issueId('A'),
          messageKey: 'test.first' as any
        })
      ),
      buildError(
        createIssue({
          id: issueId('B'),
          messageKey: 'test.second' as any
        })
      ),
      buildError(
        createIssue({
          id: issueId('C'),
          messageKey: 'test.third' as any
        })
      )
    ]

    const aggregated = aggregateResults(results)

    expect(aggregated.errors).toHaveLength(3)
    expect(aggregated.errors[0].id).toBe(issueId('A'))
    expect(aggregated.errors[1].id).toBe(issueId('B'))
    expect(aggregated.errors[2].id).toBe(issueId('C'))
  })

  it('keeps first occurrence when deduplicating', () => {
    const results: ConstructionResult[] = [
      buildError(
        createIssue({
          id: issueId('dup'),
          messageKey: 'test.firstDescription' as any
        })
      ),
      buildError(
        createIssue({
          id: issueId('dup'),
          messageKey: 'test.secondDescription' as any
        })
      )
    ]

    const aggregated = aggregateResults(results)

    expect(aggregated.errors).toHaveLength(1)
    expect(aggregated.errors[0].messageKey).toBe('test.firstDescription')
  })

  it('handles warnings separately from errors', () => {
    const results: ConstructionResult[] = [
      buildError(
        createIssue({
          id: issueId('1'),
          severity: 'error'
        })
      ),
      buildWarning(
        createIssue({
          id: issueId('2'),
          severity: 'warning'
        })
      )
    ]

    const aggregated = aggregateResults(results)

    expect(aggregated.errors).toHaveLength(1)
    expect(aggregated.warnings).toHaveLength(1)
    expect(aggregated.errors[0].severity).toBe('error')
    expect(aggregated.warnings[0].severity).toBe('warning')
  })
})
