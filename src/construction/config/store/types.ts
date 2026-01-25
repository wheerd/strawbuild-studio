import type { FloorAssembliesActions, FloorAssembliesState } from './slices/floors'
import type { OpeningAssembliesActions, OpeningAssembliesState } from './slices/openings'
import type { RingBeamAssembliesActions, RingBeamAssembliesState } from './slices/ringBeams'
import type { RoofAssembliesActions, RoofAssembliesState } from './slices/roofs'
import type { StrawActions, StrawState } from './slices/straw'
import type { TimestampsActions, TimestampsState } from './slices/timestampsSlice'
import type { WallAssembliesActions, WallAssembliesState } from './slices/walls'

export interface ConfigState
  extends
    StrawState,
    RingBeamAssembliesState,
    WallAssembliesState,
    FloorAssembliesState,
    RoofAssembliesState,
    OpeningAssembliesState,
    TimestampsState {}

export interface ConfigActions
  extends
    StrawActions,
    RingBeamAssembliesActions,
    WallAssembliesActions,
    FloorAssembliesActions,
    RoofAssembliesActions,
    OpeningAssembliesActions,
    TimestampsActions {
  reset: () => void
}

export type ConfigStore = ConfigState & { actions: ConfigActions }
