import type { FloorsActions, FloorsState } from '@/building/store/slices/floorsSlice'
import type { PerimetersState } from '@/building/store/slices/perimeterGeometry'
import type { PerimetersActions } from '@/building/store/slices/perimeterSlice'
import type { RoofsActions, RoofsState } from '@/building/store/slices/roofsSlice'
import type { StoreysActions, StoreysState } from '@/building/store/slices/storeysSlice'
import type { TimestampsActions, TimestampsState } from '@/building/store/slices/timestampsSlice'

export interface StoreState extends StoreysState, PerimetersState, FloorsState, RoofsState, TimestampsState {}

export interface StoreActions
  extends StoreysActions, PerimetersActions, FloorsActions, RoofsActions, TimestampsActions {
  reset: () => void
}

export type Store = StoreState & { actions: StoreActions }
