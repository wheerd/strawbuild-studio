import { vec2 } from 'gl-matrix'

import type { StoreState } from '@/building/store/types'

export type MigrationState = Partial<StoreState> & Record<string, unknown>
export type Migration = (state: MigrationState) => void

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const toVec2 = (value: unknown): vec2 | null => {
  if (!Array.isArray(value) || value.length < 2) return null
  const [x, y] = value
  const numX = Number(x)
  const numY = Number(y)
  if (!Number.isFinite(numX) || !Number.isFinite(numY)) return null
  return vec2.fromValues(numX, numY)
}
