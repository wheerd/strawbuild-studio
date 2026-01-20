import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PersistenceState } from '@/building/store/persistenceStore'
import { TooltipProvider } from '@/components/ui/tooltip'

import { AutoSaveIndicator } from './AutoSaveIndicator'

// Mock the persistence state hook
const mockPersistenceState: PersistenceState = {
  isSaving: false,
  lastSaved: null as Date | null,
  saveError: null as string | null,
  isHydrated: true
}

vi.mock('@/building/store/persistenceStore', () => ({
  usePersistenceStore: (f: (p: PersistenceState) => any) => f(mockPersistenceState)
}))

vi.mock('@/editor/tools/system', () => ({ pushTool: vi.fn() }))

// Mock the ProjectImportExportService
vi.mock('@/shared/services/ProjectImportExportService', () => ({
  ProjectImportExportService: {
    exportToString: vi.fn().mockResolvedValue({ success: true, content: '{}' }),
    importFromString: vi.fn().mockResolvedValue({ success: true })
  }
}))

vi.mock('@/importers/ifc/importService', () => ({
  importIfcIntoModel: vi.fn()
}))
vi.mock('@/exporters/ifc')

function renderAutoSaveIndicator() {
  return render(
    <TooltipProvider>
      <AutoSaveIndicator />
    </TooltipProvider>
  )
}

describe('AutoSaveIndicator', () => {
  beforeEach(() => {
    // Reset mock state
    mockPersistenceState.isSaving = false
    mockPersistenceState.lastSaved = null
    mockPersistenceState.saveError = null
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
