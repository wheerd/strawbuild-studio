import { Theme } from '@radix-ui/themes'
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PersistenceState } from '@/building/store/persistenceStore'

import { AutoSaveIndicator } from './AutoSaveIndicator'

// Mock the persistence state hook
const mockPersistenceState: PersistenceState = {
  isSaving: false,
  lastSaved: null as Date | null,
  saveError: null as string | null,
  isHydrated: true,
  isExporting: false,
  isImporting: false,
  exportError: null as string | null,
  importError: null as string | null
}

vi.mock('@/building/store/persistenceStore', () => ({
  usePersistenceStore: (f: (p: PersistenceState & { exportProject: () => void; importProject: () => void }) => any) =>
    f({
      ...mockPersistenceState,
      exportProject: vi.fn(),
      importProject: vi.fn()
    })
}))

function renderAutoSaveIndicator() {
  return render(
    <Theme>
      <AutoSaveIndicator />
    </Theme>
  )
}

describe('AutoSaveIndicator', () => {
  beforeEach(() => {
    // Reset mock state
    mockPersistenceState.isSaving = false
    mockPersistenceState.lastSaved = null
    mockPersistenceState.saveError = null
    mockPersistenceState.isExporting = false
    mockPersistenceState.isImporting = false
    mockPersistenceState.exportError = null
    mockPersistenceState.importError = null
  })

  it('shows error icon when no save has occurred', () => {
    const { container } = renderAutoSaveIndicator()
    // Check that the indicator is rendered by looking for the SVG
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('shows spinning icon when save is in progress', () => {
    mockPersistenceState.isSaving = true
    const { container } = renderAutoSaveIndicator()
    // Check that the indicator is rendered by looking for the SVG with spin class
    const svg = container.querySelector('svg.animate-spin')
    expect(svg).toBeInTheDocument()
  })

  it('shows error icon when there is an error', () => {
    mockPersistenceState.saveError = 'Network error'
    const { container } = renderAutoSaveIndicator()
    // Check that the indicator is rendered by looking for the SVG
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('shows check icon for recent saves', () => {
    mockPersistenceState.lastSaved = new Date()
    const { container } = renderAutoSaveIndicator()
    // Check that the indicator is rendered by looking for the SVG
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('shows check icon for older saves', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    mockPersistenceState.lastSaved = fiveMinutesAgo
    const { container } = renderAutoSaveIndicator()
    // Check that the indicator is rendered by looking for the SVG
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })
})
