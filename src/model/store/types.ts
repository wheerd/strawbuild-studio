import type { FloorsActions, FloorsState } from './slices/floorsSlice'
import type { OuterWallsActions, OuterWallsState } from './slices/outerWallsSlice'

export interface StoreState extends FloorsState, OuterWallsState {}

export interface StoreActions extends FloorsActions, OuterWallsActions {
  reset: () => void
}

export type Store = StoreState & StoreActions
