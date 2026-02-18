import type { Mock } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PartializedStoreState } from '@/building/store'
import { MODEL_STORE_VERSION, exportModelState, hydrateModelState } from '@/building/store'
import type { StoreState } from '@/building/store/types'
import type { ConfigState } from '@/construction/config/store'
import { CONFIG_STORE_VERSION, getConfigState, hydrateConfigState } from '@/construction/config/store'
import { MATERIALS_STORE_VERSION, getMaterialsState, hydrateMaterialsState } from '@/construction/materials/store'
import type { MaterialsState } from '@/construction/materials/store'
import type { PartializedPartsState } from '@/construction/parts/store'
import { PARTS_STORE_VERSION, exportPartsState, hydratePartsState } from '@/construction/parts/store'
import type { ExportedProjectMeta } from '@/projects/store'
import { PROJECTS_STORE_VERSION, exportProjectMeta, hydrateProjectMeta } from '@/projects/store'

import { LegacyProjectImportService } from './LegacyProjectImportService'
import type { ExportDataV2 } from './ProjectImportExportService'
import { ProjectImportExportService } from './ProjectImportExportService'

vi.mock('@/building/store', () => ({
  exportModelState: vi.fn(),
  hydrateModelState: vi.fn(),
  MODEL_STORE_VERSION: 5
}))

vi.mock('@/construction/config/store', () => ({
  getConfigState: vi.fn(),
  hydrateConfigState: vi.fn(),
  CONFIG_STORE_VERSION: 3
}))

vi.mock('@/construction/materials/store', () => ({
  getMaterialsState: vi.fn(),
  hydrateMaterialsState: vi.fn(),
  MATERIALS_STORE_VERSION: 2
}))

vi.mock('@/construction/parts/store', () => ({
  exportPartsState: vi.fn(),
  hydratePartsState: vi.fn(),
  PARTS_STORE_VERSION: 1
}))

vi.mock('@/projects/store', () => ({
  exportProjectMeta: vi.fn(),
  hydrateProjectMeta: vi.fn(),
  PROJECTS_STORE_VERSION: 1
}))

vi.mock('./LegacyProjectImportService', () => ({
  LegacyProjectImportService: {
    importFromString: vi.fn()
  }
}))

const mockExportModelState = exportModelState as Mock
const mockHydrateModelState = hydrateModelState as Mock
const mockGetConfigState = getConfigState as Mock
const mockHydrateConfigState = hydrateConfigState as Mock
const mockGetMaterialsState = getMaterialsState as Mock
const mockHydrateMaterialsState = hydrateMaterialsState as Mock
const mockExportPartsState = exportPartsState as Mock
const mockHydratePartsState = hydratePartsState as Mock
const mockExportProjectMeta = exportProjectMeta as Mock
const mockHydrateProjectMeta = hydrateProjectMeta as Mock
const mockLegacyImportFromString = LegacyProjectImportService.importFromString as Mock

function createMockExportData(): ExportDataV2 {
  return {
    version: '2.0.0',
    timestamp: '2024-01-15T10:30:00.000Z',
    stores: {
      project: {
        state: { name: 'Test Project' } as ExportedProjectMeta,
        version: 1
      },
      model: {
        state: { storeys: [] } as unknown as PartializedStoreState,
        version: 5
      },
      config: {
        state: { defaultWallAssemblyId: 'wall-1' } as unknown as ConfigState,
        version: 3
      },
      materials: {
        state: { materials: {} } as unknown as MaterialsState,
        version: 2
      },
      parts: {
        state: { parts: [] } as unknown as PartializedPartsState,
        version: 1
      }
    }
  }
}

describe('ProjectImportExportService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-20T14:30:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('exportToString', () => {
    it('should export valid JSON with V2 format', () => {
      mockExportProjectMeta.mockReturnValue({ name: 'Test Project' } as ExportedProjectMeta)
      mockExportModelState.mockReturnValue({ storeys: [] } as unknown as PartializedStoreState)
      mockGetConfigState.mockReturnValue({ defaultWallAssemblyId: 'wall-1' } as unknown as ConfigState)
      mockGetMaterialsState.mockReturnValue({ materials: {} } as unknown as MaterialsState)
      mockExportPartsState.mockReturnValue({ parts: [] } as unknown as PartializedPartsState)

      const result = ProjectImportExportService.exportToString()
      const parsed = JSON.parse(result) as ExportDataV2

      expect(parsed.version).toBe('2.0.0')
      expect(parsed.timestamp).toBe('2024-06-20T14:30:00.000Z')
    })

    it('should include current timestamp in ISO format', () => {
      mockExportProjectMeta.mockReturnValue({ name: 'Test' } as ExportedProjectMeta)
      mockExportModelState.mockReturnValue({} as unknown as PartializedStoreState)
      mockGetConfigState.mockReturnValue({} as unknown as ConfigState)
      mockGetMaterialsState.mockReturnValue({} as unknown as MaterialsState)
      mockExportPartsState.mockReturnValue({} as unknown as PartializedPartsState)

      const result = ProjectImportExportService.exportToString()
      const parsed = JSON.parse(result) as ExportDataV2

      expect(parsed.timestamp).toBe('2024-06-20T14:30:00.000Z')
    })

    it('should include all store states with correct versions', () => {
      const mockProjectMeta = { name: 'My Project' } as ExportedProjectMeta
      const mockModelState = { storeys: [{ id: 's1' }] } as unknown as PartializedStoreState
      const mockConfigState = { defaultWallAssemblyId: 'wall-assembly-1' } as unknown as ConfigState
      const mockMaterialsState = { materials: { m1: {} } } as unknown as MaterialsState
      const mockPartsState = { parts: [{ id: 'p1' }] } as unknown as PartializedPartsState

      mockExportProjectMeta.mockReturnValue(mockProjectMeta)
      mockExportModelState.mockReturnValue(mockModelState)
      mockGetConfigState.mockReturnValue(mockConfigState)
      mockGetMaterialsState.mockReturnValue(mockMaterialsState)
      mockExportPartsState.mockReturnValue(mockPartsState)

      const result = ProjectImportExportService.exportToString()
      const parsed = JSON.parse(result) as ExportDataV2

      expect(parsed.stores.project.state).toEqual(mockProjectMeta)
      expect(parsed.stores.project.version).toBe(PROJECTS_STORE_VERSION)
      expect(parsed.stores.model.state).toEqual(mockModelState)
      expect(parsed.stores.model.version).toBe(MODEL_STORE_VERSION)
      expect(parsed.stores.config.state).toEqual(mockConfigState)
      expect(parsed.stores.config.version).toBe(CONFIG_STORE_VERSION)
      expect(parsed.stores.materials.state).toEqual(mockMaterialsState)
      expect(parsed.stores.materials.version).toBe(MATERIALS_STORE_VERSION)
      expect(parsed.stores.parts.state).toEqual(mockPartsState)
      expect(parsed.stores.parts.version).toBe(PARTS_STORE_VERSION)
    })

    it('should call all export functions', () => {
      mockExportProjectMeta.mockReturnValue({} as ExportedProjectMeta)
      mockExportModelState.mockReturnValue({} as PartializedStoreState)
      mockGetConfigState.mockReturnValue({} as ConfigState)
      mockGetMaterialsState.mockReturnValue({} as MaterialsState)
      mockExportPartsState.mockReturnValue({} as PartializedPartsState)

      ProjectImportExportService.exportToString()

      expect(mockExportProjectMeta).toHaveBeenCalledOnce()
      expect(mockExportModelState).toHaveBeenCalledOnce()
      expect(mockGetConfigState).toHaveBeenCalledOnce()
      expect(mockGetMaterialsState).toHaveBeenCalledOnce()
      expect(mockExportPartsState).toHaveBeenCalledOnce()
    })
  })

  describe('importFromString', () => {
    describe('V2 format', () => {
      it('should parse and hydrate all stores', () => {
        const exportData = createMockExportData()
        const content = JSON.stringify(exportData)

        ProjectImportExportService.importFromString(content)

        expect(mockHydrateProjectMeta).toHaveBeenCalledWith(exportData.stores.project.state)
        expect(mockHydrateModelState).toHaveBeenCalledWith(
          exportData.stores.model.state,
          exportData.stores.model.version
        )
        expect(mockHydrateConfigState).toHaveBeenCalledWith(
          exportData.stores.config.state,
          exportData.stores.config.version
        )
        expect(mockHydrateMaterialsState).toHaveBeenCalledWith(
          exportData.stores.materials.state,
          exportData.stores.materials.version
        )
        expect(mockHydratePartsState).toHaveBeenCalledWith(
          exportData.stores.parts.state,
          exportData.stores.parts.version
        )
      })

      it('should pass correct versions to hydrate functions', () => {
        const exportData = createMockExportData()
        exportData.stores.model.version = 3
        exportData.stores.config.version = 2
        exportData.stores.materials.version = 1
        exportData.stores.parts.version = 4
        const content = JSON.stringify(exportData)

        ProjectImportExportService.importFromString(content)

        expect(mockHydrateModelState).toHaveBeenCalledWith(expect.anything(), 3)
        expect(mockHydrateConfigState).toHaveBeenCalledWith(expect.anything(), 2)
        expect(mockHydrateMaterialsState).toHaveBeenCalledWith(expect.anything(), 1)
        expect(mockHydratePartsState).toHaveBeenCalledWith(expect.anything(), 4)
      })

      it('should not call legacy import for V2 format', () => {
        const exportData = createMockExportData()
        const content = JSON.stringify(exportData)

        ProjectImportExportService.importFromString(content)

        expect(mockLegacyImportFromString).not.toHaveBeenCalled()
      })
    })

    describe('Legacy format', () => {
      it('should delegate to LegacyProjectImportService', () => {
        const legacyContent = JSON.stringify({
          version: '1.14.0',
          timestamp: '2023-01-01T00:00:00.000Z',
          modelStore: { storeys: [], minLevel: 0 },
          configStore: { wallAssemblyConfigs: {}, defaultWallAssemblyId: 'w1' }
        })

        mockLegacyImportFromString.mockReturnValue({ success: true, data: {} as never })

        ProjectImportExportService.importFromString(legacyContent)

        expect(mockLegacyImportFromString).toHaveBeenCalledWith(legacyContent)
      })

      it('should throw error when legacy import fails', () => {
        const legacyContent = JSON.stringify({
          version: '1.14.0',
          timestamp: '2023-01-01T00:00:00.000Z',
          modelStore: { storeys: [], minLevel: 0 },
          configStore: { wallAssemblyConfigs: {}, defaultWallAssemblyId: 'w1' }
        })

        mockLegacyImportFromString.mockReturnValue({
          success: false,
          error: 'Invalid file format'
        })

        expect(() => {
          ProjectImportExportService.importFromString(legacyContent)
        }).toThrow('Invalid file format')
      })

      it('should not call V2 hydrate functions for legacy format', () => {
        const legacyContent = JSON.stringify({
          version: '1.14.0',
          timestamp: '2023-01-01T00:00:00.000Z',
          modelStore: { storeys: [], minLevel: 0 },
          configStore: { wallAssemblyConfigs: {}, defaultWallAssemblyId: 'w1' }
        })

        mockLegacyImportFromString.mockReturnValue({ success: true, data: {} as never })

        ProjectImportExportService.importFromString(legacyContent)

        expect(mockHydrateProjectMeta).not.toHaveBeenCalled()
        expect(mockHydrateModelState).not.toHaveBeenCalled()
        expect(mockHydrateConfigState).not.toHaveBeenCalled()
        expect(mockHydrateMaterialsState).not.toHaveBeenCalled()
        expect(mockHydratePartsState).not.toHaveBeenCalled()
      })
    })
  })

  describe('round-trip', () => {
    it('should export data that can be imported again', () => {
      const mockProjectMeta = { name: 'Round Trip Test', id: 'proj-1' } as ExportedProjectMeta
      const mockModelState = { storeys: [{ id: 'storey-1', level: 0 }] } as unknown as PartializedStoreState
      const mockConfigState = {
        defaultWallAssemblyId: 'wall-1',
        wallAssemblyConfigs: {}
      } as unknown as ConfigState
      const mockMaterialsState = { materials: { mat1: { name: 'Straw' } } } as unknown as MaterialsState
      const mockPartsState = { parts: [{ id: 'part-1' }] } as unknown as PartializedPartsState

      mockExportProjectMeta.mockReturnValue(mockProjectMeta)
      mockExportModelState.mockReturnValue(mockModelState)
      mockGetConfigState.mockReturnValue(mockConfigState)
      mockGetMaterialsState.mockReturnValue(mockMaterialsState)
      mockExportPartsState.mockReturnValue(mockPartsState)

      const exported = ProjectImportExportService.exportToString()

      const hydrateCalls = {
        project: null as ExportedProjectMeta | null,
        model: { state: null as PartializedStoreState | null, version: null as number | null },
        config: { state: null as ConfigState | null, version: null as number | null },
        materials: { state: null as MaterialsState | null, version: null as number | null },
        parts: { state: null as PartializedPartsState | null, version: null as number | null }
      }

      mockHydrateProjectMeta.mockImplementation(state => {
        hydrateCalls.project = state
      })
      mockHydrateModelState.mockImplementation((state, version) => {
        hydrateCalls.model = { state: state as PartializedStoreState, version }
        return {} as StoreState
      })
      mockHydrateConfigState.mockImplementation((state, version) => {
        hydrateCalls.config = { state: state as ConfigState, version }
        return {} as ConfigState
      })
      mockHydrateMaterialsState.mockImplementation((state, version) => {
        hydrateCalls.materials = { state: state as MaterialsState, version }
        return {} as MaterialsState
      })
      mockHydratePartsState.mockImplementation((state, version) => {
        hydrateCalls.parts = { state: state as PartializedPartsState, version }
      })

      ProjectImportExportService.importFromString(exported)

      expect(hydrateCalls.project).toEqual(mockProjectMeta)
      expect(hydrateCalls.model.state).toEqual(mockModelState)
      expect(hydrateCalls.config.state).toEqual(mockConfigState)
      expect(hydrateCalls.materials.state).toEqual(mockMaterialsState)
      expect(hydrateCalls.parts.state).toEqual(mockPartsState)
    })

    it('should preserve store versions during round-trip', () => {
      mockExportProjectMeta.mockReturnValue({} as ExportedProjectMeta)
      mockExportModelState.mockReturnValue({} as PartializedStoreState)
      mockGetConfigState.mockReturnValue({} as ConfigState)
      mockGetMaterialsState.mockReturnValue({} as MaterialsState)
      mockExportPartsState.mockReturnValue({} as PartializedPartsState)

      const exported = ProjectImportExportService.exportToString()
      const parsed = JSON.parse(exported) as ExportDataV2

      const versionCalls = {
        model: null as number | null,
        config: null as number | null,
        materials: null as number | null,
        parts: null as number | null
      }

      mockHydrateProjectMeta.mockReturnValue(undefined)
      mockHydrateModelState.mockImplementation((_, version) => {
        versionCalls.model = version
        return {} as StoreState
      })
      mockHydrateConfigState.mockImplementation((_, version) => {
        versionCalls.config = version
        return {} as ConfigState
      })
      mockHydrateMaterialsState.mockImplementation((_, version) => {
        versionCalls.materials = version
        return {} as MaterialsState
      })
      mockHydratePartsState.mockImplementation((_, version) => {
        versionCalls.parts = version
      })

      ProjectImportExportService.importFromString(exported)

      expect(versionCalls.model).toBe(parsed.stores.model.version)
      expect(versionCalls.config).toBe(parsed.stores.config.version)
      expect(versionCalls.materials).toBe(parsed.stores.materials.version)
      expect(versionCalls.parts).toBe(parsed.stores.parts.version)
    })
  })
})
