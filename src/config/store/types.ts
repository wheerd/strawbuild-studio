import type { FloorAssembliesActions, FloorAssembliesState } from './slices/floors'
import type { InteriorWallAssembliesActions, InteriorWallAssembliesState } from './slices/interiorWalls'
import type { LayerSetsActions, LayerSetsState } from './slices/layers'
import type { OpeningAssembliesActions, OpeningAssembliesState } from './slices/openings'
import type { PerimeterWallAssembliesActions, PerimeterWallAssembliesState } from './slices/perimeterWalls'
import type { RingBeamAssembliesActions, RingBeamAssembliesState } from './slices/ringBeams'
import type { RoofAssembliesActions, RoofAssembliesState } from './slices/roofs'
import type { StrawActions, StrawState } from './slices/straw'
import type { TimestampsActions, TimestampsState } from './slices/timestampsSlice'

export interface ConfigState
  extends
    StrawState,
    RingBeamAssembliesState,
    PerimeterWallAssembliesState,
    InteriorWallAssembliesState,
    FloorAssembliesState,
    RoofAssembliesState,
    OpeningAssembliesState,
    LayerSetsState,
    TimestampsState {}

export interface ConfigActions
  extends
    StrawActions,
    RingBeamAssembliesActions,
    PerimeterWallAssembliesActions,
    InteriorWallAssembliesActions,
    FloorAssembliesActions,
    RoofAssembliesActions,
    OpeningAssembliesActions,
    LayerSetsActions,
    TimestampsActions {
  reset: () => void
}

export type ConfigStore = ConfigState & { actions: ConfigActions }
