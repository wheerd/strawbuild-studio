import { describe, expect, it } from 'vitest'

import { createExportData, exportToJSON, importFromJSON, validateImportData } from './exportImport'

const mockModelState = {
  storeys: [
    {
      name: 'Ground Floor',
      level: 0,
      height: 2500,
      perimeters: [
        {
          corners: [
            { insideX: 0, insideY: 0, constuctedByWall: 'next' as const },
            { insideX: 100, insideY: 0, constuctedByWall: 'next' as const },
            { insideX: 100, insideY: 100, constuctedByWall: 'next' as const },
            { insideX: 0, insideY: 100, constuctedByWall: 'next' as const }
          ],
          walls: [
            { thickness: 200, constructionMethodId: 'method_1', openings: [] },
            { thickness: 200, constructionMethodId: 'method_1', openings: [] },
            { thickness: 200, constructionMethodId: 'method_1', openings: [] },
            { thickness: 200, constructionMethodId: 'method_1', openings: [] }
          ],
          baseRingBeamMethodId: 'beam_1',
          topRingBeamMethodId: 'beam_1'
        }
      ]
    }
  ]
}

const mockConfigState = {
  ringBeamConstructionMethods: {
    method_1: {
      id: 'method_1',
      name: 'Test Method',
      config: { type: 'full' as const }
    }
  },
  perimeterConstructionMethods: {
    pmethod_1: {
      id: 'pmethod_1',
      name: 'Test Perimeter Method',
      config: { type: 'infill' as const },
      layers: { insideThickness: { value: 30, unit: 'mm' as const } }
    }
  },
  defaultPerimeterMethodId: 'pmethod_1' as any
}

describe('exportImport', () => {
  describe('createExportData', () => {
    it('creates export data with version and timestamp', () => {
      const result = createExportData(mockModelState, mockConfigState)

      expect(result.version).toBe('1.0.0')
      expect(result.timestamp).toBeDefined()
      expect(result.modelStore).toEqual(mockModelState)
      expect(result.configStore).toEqual(mockConfigState)
    })
  })

  describe('exportToJSON', () => {
    it('successfully exports data', () => {
      const result = exportToJSON(mockModelState, mockConfigState)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.version).toBe('1.0.0')
        expect(result.filename).toMatch(/strawbaler-project-.*\.json/)
      }
    })
  })

  describe('validateImportData', () => {
    it('validates correct data structure', () => {
      const validData = {
        version: '1.0.0',
        timestamp: '2023-01-01T00:00:00.000Z',
        modelStore: {
          storeys: []
        },
        configStore: {
          ringBeamConstructionMethods: {},
          perimeterConstructionMethods: {},
          defaultPerimeterMethodId: 'test'
        }
      }

      expect(validateImportData(validData)).toBe(true)
    })

    it('rejects invalid data structure', () => {
      expect(validateImportData(null)).toBe(false)
      expect(validateImportData({})).toBe(false)
      expect(validateImportData({ version: '1.0.0' })).toBe(false)
    })
  })

  describe('importFromJSON', () => {
    it('successfully imports valid JSON', () => {
      const exportData = createExportData(mockModelState, mockConfigState)
      const jsonString = JSON.stringify(exportData)

      const result = importFromJSON(jsonString)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.modelStore).toEqual(mockModelState)
        expect(result.data.configStore).toEqual(mockConfigState)
      }
    })

    it('rejects invalid JSON', () => {
      const result = importFromJSON('invalid json')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Unexpected token')
      }
    })

    it('rejects unsupported version', () => {
      const invalidData = {
        version: '2.0.0',
        timestamp: '2023-01-01T00:00:00.000Z',
        modelStore: mockModelState,
        configStore: mockConfigState
      }

      const result = importFromJSON(JSON.stringify(invalidData))

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Unsupported file version')
      }
    })
  })
})
