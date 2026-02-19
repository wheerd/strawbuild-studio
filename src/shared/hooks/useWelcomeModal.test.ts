import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useWelcomeModal } from './useWelcomeModal'

describe('useWelcomeModal', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('opens modal on first visit', () => {
    const { result } = renderHook(() => useWelcomeModal())

    expect(result.current.isOpen).toBe(true)
    expect(result.current.mode).toBe('first-visit')
  })

  it('does not open modal if already accepted', () => {
    localStorage.setItem(
      'strawbuild-welcome-state',
      JSON.stringify({
        accepted: true,
        acceptedAt: new Date().toISOString(),
        version: '0.2'
      })
    )

    const { result } = renderHook(() => useWelcomeModal())

    expect(result.current.isOpen).toBe(false)
  })

  it('opens modal if version is outdated', () => {
    localStorage.setItem(
      'strawbuild-welcome-state',
      JSON.stringify({
        accepted: true,
        acceptedAt: new Date().toISOString(),
        version: '0.9'
      })
    )

    const { result } = renderHook(() => useWelcomeModal())

    expect(result.current.isOpen).toBe(true)
    expect(result.current.mode).toBe('first-visit')
  })

  it('saves state to localStorage on accept', () => {
    const { result } = renderHook(() => useWelcomeModal())

    expect(result.current.isOpen).toBe(true)

    act(() => {
      result.current.handleAccept()
    })

    expect(result.current.isOpen).toBe(false)

    const stored = JSON.parse(localStorage.getItem('strawbuild-welcome-state')!)
    expect(stored.accepted).toBe(true)
    expect(stored.version).toBe('0.2')
    expect(stored.acceptedAt).toBeDefined()
  })

  it('opens modal manually in manual mode', () => {
    localStorage.setItem(
      'strawbuild-welcome-state',
      JSON.stringify({
        accepted: true,
        acceptedAt: new Date().toISOString(),
        version: '0.2'
      })
    )

    const { result } = renderHook(() => useWelcomeModal())

    expect(result.current.isOpen).toBe(false)

    act(() => {
      result.current.openManually()
    })

    expect(result.current.isOpen).toBe(true)
    expect(result.current.mode).toBe('manual')
  })

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem('strawbuild-welcome-state', 'invalid json')

    const { result } = renderHook(() => useWelcomeModal())

    expect(result.current.isOpen).toBe(true)
    expect(result.current.mode).toBe('first-visit')
  })
})
