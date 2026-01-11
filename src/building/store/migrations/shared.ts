import type { FloorAssemblyId, OpeningAssemblyId, WallAssemblyId } from '@/building/model/ids'
import type { StoreState } from '@/building/store/types'
import type { FloorAssemblyConfig, OpeningAssemblyConfig, WallAssemblyConfig } from '@/construction/config/types'
import { type Vec2, newVec2 } from '@/shared/geometry'

export type MigrationState = Partial<StoreState> & Record<string, unknown>
export type Migration = (state: MigrationState) => void

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const toVec2 = (value: unknown): Vec2 | null => {
  if (Array.isArray(value)) {
    if (value.length !== 2) return null
    const [x, y] = value as [unknown, unknown]
    const numX = Number(x)
    const numY = Number(y)
    if (!Number.isFinite(numX) || !Number.isFinite(numY)) return null
    return newVec2(numX, numY)
  }
  if (isRecord(value) && 0 in value && 1 in value) {
    const numX = Number(value[0])
    const numY = Number(value[1])
    if (!Number.isFinite(numX) || !Number.isFinite(numY)) return null
    return newVec2(numX, numY)
  }
  return null
}

const CONFIG_STORAGE_KEY = 'strawbaler-config'

export interface PersistedConfigStoreState {
  floorAssemblyConfigs?: Record<FloorAssemblyId, FloorAssemblyConfig>
  wallAssemblyConfigs?: Record<WallAssemblyId, WallAssemblyConfig>
  openingAssemblyConfigs?: Record<OpeningAssemblyId, OpeningAssemblyConfig>
  defaultOpeningAssemblyId?: OpeningAssemblyId
}

export const getPersistedConfigStoreState = (): PersistedConfigStoreState | null => {
  const storage = (globalThis as { localStorage?: Storage }).localStorage
  if (!storage) {
    return null
  }

  try {
    const raw = storage.getItem(CONFIG_STORAGE_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as unknown
    if (!isRecord(parsed)) {
      return null
    }
    const state = parsed.state
    if (!isRecord(state)) {
      return null
    }
    return state as PersistedConfigStoreState
  } catch {
    return null
  }
}
