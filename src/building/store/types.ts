import type { FloorsActions, FloorsState } from './slices/floorsSlice'
import type { PerimetersActions, PerimetersState } from './slices/perimeterSlice'
import type { StoreysActions, StoreysState } from './slices/storeysSlice'

export interface StoreState extends StoreysState, PerimetersState, FloorsState {}

export interface StoreActions extends StoreysActions, PerimetersActions, FloorsActions {
  reset: () => void
}

export type Store = StoreState & { actions: StoreActions }
