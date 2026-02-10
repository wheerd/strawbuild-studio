import type { ConstraintsActions, ConstraintsState } from './slices/constraintsSlice'
import type { FloorsActions, FloorsState } from './slices/floorsSlice'
import type { PerimetersActions, PerimetersState } from './slices/perimeterSlice'
import type { RoofsActions, RoofsState } from './slices/roofsSlice'
import type { StoreysActions, StoreysState } from './slices/storeysSlice'
import type { TimestampsActions, TimestampsState } from './slices/timestampsSlice'

export interface StoreState
  extends StoreysState, PerimetersState, FloorsState, RoofsState, TimestampsState, ConstraintsState {}

export interface StoreActions
  extends StoreysActions, PerimetersActions, FloorsActions, RoofsActions, TimestampsActions, ConstraintsActions {
  reset: () => void
}

export type Store = StoreState & { actions: StoreActions }
