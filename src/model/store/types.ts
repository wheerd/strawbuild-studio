import type { FloorsActions, FloorsState } from './slices/floorsSlice'
import type { PerimetersActions, PerimetersState } from './slices/outerWallsSlice'

export interface StoreState extends FloorsState, PerimetersState {}

export interface StoreActions extends FloorsActions, PerimetersActions {
  reset: () => void
}

export type Store = StoreState & StoreActions
