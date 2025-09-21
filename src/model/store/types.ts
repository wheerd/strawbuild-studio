import type { StoreysActions, StoreysState } from './slices/storeysSlice'
import type { PerimetersActions, PerimetersState } from './slices/perimeterSlice'

export interface StoreState extends StoreysState, PerimetersState {}

export interface StoreActions extends StoreysActions, PerimetersActions {
  reset: () => void
}

export type Store = StoreState & { actions: StoreActions }
