import type { Resources, SelectorFn, SelectorOptions } from 'i18next'

import type {
  FloorAssemblyId,
  InteriorWallAssemblyId,
  OpeningAssemblyId,
  PerimeterWallAssemblyId,
  RingBeamAssemblyId,
  RoofAssemblyId
} from '@/building/model'
import type {
  FilledFloorConfig,
  HangingJoistFloorConfig,
  JoistFloorConfig,
  MonolithicFloorConfig
} from '@/construction/assemblies/floors/types'
import type {
  EmptyOpeningConfig,
  PlankedOpeningConfig,
  PostOpeningConfig,
  SimpleOpeningConfig,
  ThresholdAssemblyConfig
} from '@/construction/assemblies/openings/types'
import type {
  BrickRingBeamConfig,
  DoubleRingBeamConfig,
  FullRingBeamConfig
} from '@/construction/assemblies/ringBeams/types'
import type { MonolithicRoofConfig, PurlinRoofConfig } from '@/construction/assemblies/roofs/types'
import type {
  InfillWallConfig,
  ModulesWallConfig,
  MonolithicStudWallConfig,
  MonolithicWallConfig,
  NonStrawbaleWallConfig,
  PlankedStudWallConfig,
  PrefabModulesWallConfig,
  StrawhengeWallConfig
} from '@/construction/assemblies/walls/types'

export type AssemblyNameKey = SelectorFn<Resources['config'], string, SelectorOptions<'config'>>

export interface NamedAssembly {
  name: string
  /** Optional translation key for default assemblies. If present, use t(nameKey) instead of name for display. Clear when user edits the name. */
  nameKey?: AssemblyNameKey
}

// Perimeter Walls

export interface PerimeterWallAssemblyIdPart extends NamedAssembly {
  id: PerimeterWallAssemblyId
}

export type InfillWallAssemblyConfig = InfillWallConfig & PerimeterWallAssemblyIdPart
export type ModulesWallAssemblyConfig = ModulesWallConfig & PerimeterWallAssemblyIdPart
export type StrawhengeWallAssemblyConfig = StrawhengeWallConfig & PerimeterWallAssemblyIdPart
export type NonStrawbaleWallAssemblyConfig = NonStrawbaleWallConfig & PerimeterWallAssemblyIdPart
export type PrefabModulesWallAssemblyConfig = PrefabModulesWallConfig & PerimeterWallAssemblyIdPart

export type PerimeterWallAssemblyConfig =
  | InfillWallAssemblyConfig
  | ModulesWallAssemblyConfig
  | StrawhengeWallAssemblyConfig
  | NonStrawbaleWallAssemblyConfig
  | PrefabModulesWallAssemblyConfig

// Interior Walls

export interface InteriorWallAssemblyIdPart extends NamedAssembly {
  id: InteriorWallAssemblyId
}

export type MonolithicWallAssemblyConfig = MonolithicWallConfig & InteriorWallAssemblyIdPart
export type PlankedStudWallAssemblyConfig = PlankedStudWallConfig & InteriorWallAssemblyIdPart
export type MonolithicStudWallAssemblyConfig = MonolithicStudWallConfig & InteriorWallAssemblyIdPart

export type InteriorWallAssemblyConfig =
  | MonolithicWallAssemblyConfig
  | PlankedStudWallAssemblyConfig
  | MonolithicStudWallAssemblyConfig

// Ring beams

export interface RingBeamAssemblyIdPart extends NamedAssembly {
  id: RingBeamAssemblyId
}

export type FullRingBeamAssemblyConfig = FullRingBeamConfig & RingBeamAssemblyIdPart
export type DoubleRingBeamAssemblyConfig = DoubleRingBeamConfig & RingBeamAssemblyIdPart
export type BrickRingBeamAssemblyConfig = BrickRingBeamConfig & RingBeamAssemblyIdPart

export type RingBeamAssemblyConfig =
  | FullRingBeamAssemblyConfig
  | DoubleRingBeamAssemblyConfig
  | BrickRingBeamAssemblyConfig

// Floors

export interface FloorAssemblyIdPart extends NamedAssembly {
  id: FloorAssemblyId
}

export type MonolithicFloorAssemblyConfig = MonolithicFloorConfig & FloorAssemblyIdPart
export type JoistFloorAssemblyConfig = JoistFloorConfig & FloorAssemblyIdPart
export type FilledFloorAssemblyConfig = FilledFloorConfig & FloorAssemblyIdPart
export type HangingJoistFloorAssemblyConfig = HangingJoistFloorConfig & FloorAssemblyIdPart

export type FloorAssemblyConfig =
  | MonolithicFloorAssemblyConfig
  | JoistFloorAssemblyConfig
  | FilledFloorAssemblyConfig
  | HangingJoistFloorAssemblyConfig

// Roofs

export interface RoofAssemblyIdPart extends NamedAssembly {
  id: RoofAssemblyId
}

export type MonolithicRoofAssemblyConfig = MonolithicRoofConfig & RoofAssemblyIdPart
export type PurlinRoofAssemblyConfig = PurlinRoofConfig & RoofAssemblyIdPart

export type RoofAssemblyConfig = MonolithicRoofAssemblyConfig | PurlinRoofAssemblyConfig

// Openings

export interface OpeningAssemblyIdPart extends NamedAssembly {
  id: OpeningAssemblyId
}

export type SimpleOpeningAssemblyConfig = SimpleOpeningConfig & OpeningAssemblyIdPart
export type EmptyOpeningAssemblyConfig = EmptyOpeningConfig & OpeningAssemblyIdPart
export type PostOpeningAssemblyConfig = PostOpeningConfig & OpeningAssemblyIdPart
export type PlankedOpeningAssemblyConfig = PlankedOpeningConfig & OpeningAssemblyIdPart
export type ThresholdOpeningAssemblyConfig = ThresholdAssemblyConfig & OpeningAssemblyIdPart

export type OpeningAssemblyConfig =
  | SimpleOpeningAssemblyConfig
  | EmptyOpeningAssemblyConfig
  | PostOpeningAssemblyConfig
  | PlankedOpeningAssemblyConfig
  | ThresholdOpeningAssemblyConfig
