import type { FloorAssembliesActions, FloorAssembliesState } from './slices/floors'
import type { RingBeamAssembliesActions, RingBeamAssembliesState } from './slices/ringBeams'
import type { RoofAssembliesActions, RoofAssembliesState } from './slices/roofs'
import type { StrawActions, StrawState } from './slices/straw'
import type { WallAssembliesActions, WallAssembliesState } from './slices/walls'

export interface ConfigState
  extends StrawState,
    RingBeamAssembliesState,
    WallAssembliesState,
    FloorAssembliesState,
    RoofAssembliesState {}

export interface ConfigActions
  extends StrawActions,
    RingBeamAssembliesActions,
    WallAssembliesActions,
    FloorAssembliesActions,
    RoofAssembliesActions {
  reset: () => void
}

export type ConfigStore = ConfigState & { actions: ConfigActions }
