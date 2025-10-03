import type {
  PerimeterConstructionMethodId,
  PerimeterId,
  RingBeamConstructionMethodId,
  StoreyId
} from '@/building/model/ids'
import type { Perimeter, Storey } from '@/building/model/model'
import type { PerimeterConstructionMethod, RingBeamConstructionMethod } from '@/construction/config/types'

export interface ExportData {
  version: string
  timestamp: string
  modelStore: {
    storeys: Record<StoreyId, Storey>
    perimeters: Record<PerimeterId, Perimeter>
    activeStoreyId: StoreyId
  }
  configStore: {
    ringBeamConstructionMethods: Record<RingBeamConstructionMethodId, RingBeamConstructionMethod>
    perimeterConstructionMethods: Record<PerimeterConstructionMethodId, PerimeterConstructionMethod>
    defaultBaseRingBeamMethodId?: RingBeamConstructionMethodId
    defaultTopRingBeamMethodId?: RingBeamConstructionMethodId
    defaultPerimeterMethodId: PerimeterConstructionMethodId
  }
}

export interface ExportResult {
  success: true
  data: ExportData
  filename: string
}

export interface ExportError {
  success: false
  error: string
}

export interface ImportResult {
  success: true
  data: ExportData
}

export interface ImportError {
  success: false
  error: string
}

const CURRENT_VERSION = '1.0.0'

export function createExportData(
  modelState: ExportData['modelStore'],
  configState: ExportData['configStore']
): ExportData {
  return {
    version: CURRENT_VERSION,
    timestamp: new Date().toISOString(),
    modelStore: modelState,
    configStore: configState
  }
}

export function exportToJSON(
  modelState: ExportData['modelStore'],
  configState: ExportData['configStore']
): ExportResult | ExportError {
  try {
    const data = createExportData(modelState, configState)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
    const filename = `strawbaler-project-${timestamp}.json`

    return {
      success: true,
      data,
      filename
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export data'
    }
  }
}

export function validateImportData(data: unknown): data is ExportData {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const obj = data as Record<string, unknown>

  if (typeof obj.version !== 'string') {
    return false
  }

  if (typeof obj.timestamp !== 'string') {
    return false
  }

  if (typeof obj.modelStore !== 'object' || obj.modelStore === null) {
    return false
  }

  if (typeof obj.configStore !== 'object' || obj.configStore === null) {
    return false
  }

  const modelStore = obj.modelStore as Record<string, unknown>
  if (
    typeof modelStore.storeys !== 'object' ||
    typeof modelStore.perimeters !== 'object' ||
    typeof modelStore.activeStoreyId !== 'string'
  ) {
    return false
  }

  const configStore = obj.configStore as Record<string, unknown>
  if (
    typeof configStore.ringBeamConstructionMethods !== 'object' ||
    typeof configStore.perimeterConstructionMethods !== 'object' ||
    typeof configStore.defaultPerimeterMethodId !== 'string'
  ) {
    return false
  }

  return true
}

export function importFromJSON(jsonString: string): ImportResult | ImportError {
  try {
    const parsed = JSON.parse(jsonString)

    if (!validateImportData(parsed)) {
      return {
        success: false,
        error: 'Invalid file format. Please select a valid Strawbaler project file.'
      }
    }

    if (parsed.version !== CURRENT_VERSION) {
      return {
        success: false,
        error: `Unsupported file version ${parsed.version}. Expected version ${CURRENT_VERSION}.`
      }
    }

    return {
      success: true,
      data: parsed
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse file'
    }
  }
}

export function downloadFile(data: ExportData, filename: string): void {
  const jsonString = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function createFileInput(onFileLoaded: (content: string) => void): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.style.display = 'none'

  input.addEventListener('change', event => {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = e => {
      const content = e.target?.result
      if (typeof content === 'string') {
        onFileLoaded(content)
      }
    }
    reader.readAsText(file)
  })

  document.body.appendChild(input)
  input.click()
  document.body.removeChild(input)
}
