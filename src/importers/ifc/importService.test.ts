import clipperWasmUrl from 'clipper2-wasm/dist/es/clipper2z.wasm?url'
import fs, { readFile } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import type { Storey } from '@/building/model'
import { clearPersistence, getModelActions } from '@/building/store'
import { importIfcIntoModel } from '@/importers/ifc/importService'
import { ensureClipperModule } from '@/shared/geometry/clipperInstance'

vi.unmock('@/shared/geometry/clipperInstance')

const IFC_SAMPLE_PATH = path.resolve(process.cwd(), 'src', 'test', 'strawbaler-export.ifc')

describe('IFC import service', () => {
  beforeAll(async () => {
    const clipperPath = resolveBundledAssetPath(clipperWasmUrl)
    const clipperBinary = await fs.readFile(clipperPath)
    await ensureClipperModule({ wasmBinary: clipperBinary })
  })

  beforeEach(() => {
    const actions = getModelActions()
    clearPersistence()
    actions.reset()
  })

  afterEach(() => {
    const actions = getModelActions()
    actions.reset()
  })

  test('imports storeys and perimeters into the model store', async () => {
    const fileBuffer = await readFile(IFC_SAMPLE_PATH)
    const result = await importIfcIntoModel(fileBuffer)
    expect(result.success).toBe(true)

    const actions = getModelActions()
    const storeys: Storey[] = actions.getStoreysOrderedByLevel()

    expect(storeys.length).toBe(3)

    const firstStorey = storeys[0]
    const perimeters = actions.getPerimetersByStorey(firstStorey.id)
    expect(perimeters.length).toBe(1)

    const perimeter = perimeters[0]
    expect(perimeter.wallIds.length).toBe(5)
    const walls = actions.getPerimeterWallsById(perimeter.id)
    expect(walls.map(wall => wall.thickness)).toEqual([400, 420, 420, 420, 400])

    const floorAreas = actions.getFloorAreasByStorey(firstStorey.id)
    expect(floorAreas.length).toBeGreaterThan(0)
  })
})

function resolveBundledAssetPath(assetUrl: string): string {
  const normalized = assetUrl.startsWith('/') ? assetUrl.slice(1) : assetUrl
  return path.resolve(process.cwd(), normalized)
}
