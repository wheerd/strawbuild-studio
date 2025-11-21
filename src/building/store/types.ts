import type { FloorsActions, FloorsState } from './slices/floorsSlice'
import type { PerimetersActions, PerimetersState } from './slices/perimeterSlice'
import type { RoofsActions, RoofsState } from './slices/roofsSlice'
import type { StoreysActions, StoreysState } from './slices/storeysSlice'

export interface StoreState extends StoreysState, PerimetersState, FloorsState, RoofsState {}

export interface StoreActions extends StoreysActions, PerimetersActions, FloorsActions, RoofsActions {
  reset: () => void
}

export type Store = StoreState & { actions: StoreActions }
