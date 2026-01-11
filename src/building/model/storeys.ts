import { type Length } from '@/shared/geometry'

import type { FloorAssemblyId, StoreyId } from './ids'

export type StoreyLevel = number & { readonly brand: unique symbol }

export const createStoreyLevel = (value: number): StoreyLevel => {
  if (!Number.isInteger(value)) {
    throw new Error(`Storey level must be an integer, got ${value}`)
  }
  return value as StoreyLevel
}

export interface Storey {
  readonly id: StoreyId
  readonly name: string
  readonly useDefaultName: boolean
  readonly level: StoreyLevel // Floor level (0 = ground floor, 1 = first floor, etc.)
  readonly floorHeight: Length // Finished floor to finished floor
  readonly floorAssemblyId: FloorAssemblyId
}
